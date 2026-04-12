/**
 * Course data sync — fetches from FOSE API and upserts into the database.
 */

import { PrismaClient } from "@/generated/prisma/client";
import {
  fetchAllCourses,
  getActiveSemesters,
  parseSrcdb,
  type FoseResult,
  type SemesterInfo,
} from "./fose-client";

// ── Types ──────────────────────────────────────────────

interface ParsedCode {
  deptCode: string; // e.g. "CSCI-UA"
  courseNumber: string; // e.g. "101"
  schoolCode: string; // e.g. "UA"
}

interface SyncStats {
  semester: string;
  coursesCreated: number;
  coursesExisting: number;
  offeringsCreated: number;
  offeringsUpdated: number;
  instructorsCreated: number;
}

// ── Helpers ────────────────────────────────────────────

/**
 * Parse a FOSE course code like "CSCI-UA 101" into its parts.
 */
export function parseCourseCode(code: string): ParsedCode | null {
  const lastSpace = code.lastIndexOf(" ");
  if (lastSpace === -1) return null;

  const deptCode = code.substring(0, lastSpace).trim();
  const courseNumber = code.substring(lastSpace + 1).trim();
  if (!deptCode || !courseNumber) return null;

  const lastHyphen = deptCode.lastIndexOf("-");
  const schoolCode = lastHyphen !== -1 ? deptCode.substring(lastHyphen + 1) : "";

  return { deptCode, courseNumber, schoolCode };
}

/**
 * Map FOSE status field to our status string.
 */
export function mapStatus(stat: string, isCancelled: string): string {
  if (isCancelled) return "closed";
  switch (stat.toUpperCase()) {
    case "A":
      return "open";
    case "C":
      return "closed";
    case "W":
      return "waitlist";
    default:
      return "open";
  }
}

/**
 * Parse hours string like "4" or "1 - 4" into min/max units.
 */
export function parseHours(hours: string): { min: number; max: number } | null {
  if (!hours || !hours.trim()) return null;
  const cleaned = hours.replace(/\s/g, "");
  if (cleaned.includes("-")) {
    const [minStr, maxStr] = cleaned.split("-");
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (!isNaN(min) && !isNaN(max)) return { min, max };
  } else {
    const val = parseFloat(cleaned);
    if (!isNaN(val)) return { min: val, max: val };
  }
  return null;
}

/**
 * Safely parse meetingTimes JSON string.
 */
export function parseMeetingTimes(raw: string): unknown | null {
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Sync logic ─────────────────────────────────────────

/**
 * Sync all courses for a single semester.
 */
async function syncSemester(
  prisma: PrismaClient,
  semester: SemesterInfo,
  results: FoseResult[]
): Promise<SyncStats> {
  const stats: SyncStats = {
    semester: semester.name,
    coursesCreated: 0,
    coursesExisting: 0,
    offeringsCreated: 0,
    offeringsUpdated: 0,
    instructorsCreated: 0,
  };

  // Cache lookups to avoid repeated DB queries within this batch
  const schoolCache = new Map<string, string>(); // schoolCode → id
  const deptCache = new Map<string, string>(); // deptCode → id
  const courseCache = new Map<string, string>(); // "deptId:courseNumber" → id
  const instructorCache = new Map<string, string>(); // name → id

  // Pre-load all schools
  const schools = await prisma.school.findMany();
  for (const s of schools) {
    schoolCache.set(s.code, s.id);
  }

  // Pre-load existing offerings for this semester to detect create vs update
  const existingOfferings = await prisma.courseOffering.findMany({
    where: { semester: semester.srcdb },
    select: { id: true, semester: true, crn: true },
  });
  const existingOfferingKeys = new Set(
    existingOfferings.map((o) => `${o.semester}:${o.crn}`)
  );

  for (const result of results) {
    // Skip cancelled courses
    if (result.isCancelled) continue;

    // Parse course code
    const parsed = parseCourseCode(result.code);
    if (!parsed) {
      console.warn(`  Skipping unparseable code: "${result.code}"`);
      continue;
    }

    const { deptCode, courseNumber, schoolCode } = parsed;

    // ── Resolve School ──
    let schoolId = schoolCache.get(schoolCode);
    if (!schoolId && schoolCode) {
      // School not in seed data; create it with code as placeholder name
      const school = await prisma.school.upsert({
        where: { code: schoolCode },
        update: {},
        create: { code: schoolCode, name: schoolCode },
      });
      schoolId = school.id;
      schoolCache.set(schoolCode, schoolId);
    }
    if (!schoolId) {
      console.warn(`  Skipping "${result.code}": no school code found`);
      continue;
    }

    // ── Resolve Department ──
    let deptId = deptCache.get(deptCode);
    if (!deptId) {
      const dept = await prisma.department.upsert({
        where: { schoolId_code: { schoolId, code: deptCode } },
        update: {},
        create: { schoolId, code: deptCode, name: deptCode },
      });
      deptId = dept.id;
      deptCache.set(deptCode, deptId);
    }

    // ── Resolve Course ──
    const courseKey = `${deptId}:${courseNumber}`;
    let courseId = courseCache.get(courseKey);
    if (!courseId) {
      const hours = parseHours(result.hours);
      const course = await prisma.course.upsert({
        where: { departmentId_courseNumber: { departmentId: deptId, courseNumber } },
        update: {
          name: result.title,
          ...(hours && { minUnits: hours.min, maxUnits: hours.max }),
        },
        create: {
          departmentId: deptId,
          code: result.code.replace(/\s+\d+$/, ` ${courseNumber}`), // normalize
          courseNumber,
          name: result.title,
          ...(hours && { minUnits: hours.min, maxUnits: hours.max }),
        },
      });
      courseId = course.id;

      // Check if this was a new creation by seeing if we found it before
      if (!courseCache.has(courseKey)) {
        // We can't distinguish create vs update from upsert, but the first
        // time we see a course in this sync run we count it
        stats.coursesCreated++;
      }
      courseCache.set(courseKey, courseId);
    } else {
      stats.coursesExisting++;
    }

    // ── Resolve Instructor ──
    let instructorId: string | null = null;
    const instrName = result.instr?.trim();
    if (instrName) {
      if (instructorCache.has(instrName)) {
        instructorId = instructorCache.get(instrName)!;
      } else {
        const instructor = await prisma.instructor.upsert({
          where: { name: instrName },
          update: {},
          create: { name: instrName },
        });
        instructorId = instructor.id;
        instructorCache.set(instrName, instructorId);
        stats.instructorsCreated++;
      }
    }

    // ── Upsert CourseOffering ──
    const offeringKey = `${semester.srcdb}:${result.crn}`;
    const isExisting = existingOfferingKeys.has(offeringKey);
    const meetingTimes = parseMeetingTimes(result.meetingTimes);

    await prisma.courseOffering.upsert({
      where: {
        semester_crn: {
          semester: semester.srcdb,
          crn: result.crn,
        },
      },
      update: {
        instructorId,
        status: mapStatus(result.stat, result.isCancelled),
        scheduleType: result.schd || "LEC",
        meets: result.meets || null,
        meetingTimes: meetingTimes ?? undefined,
        startDate: result.start_date || null,
        endDate: result.end_date || null,
        syncedAt: new Date(),
      },
      create: {
        courseId: courseId!,
        instructorId,
        semester: semester.srcdb,
        semesterName: semester.name,
        sectionCode: result.no || "001",
        crn: result.crn,
        status: mapStatus(result.stat, result.isCancelled),
        scheduleType: result.schd || "LEC",
        meets: result.meets || null,
        meetingTimes: meetingTimes ?? undefined,
        startDate: result.start_date || null,
        endDate: result.end_date || null,
      },
    });

    if (isExisting) {
      stats.offeringsUpdated++;
    } else {
      stats.offeringsCreated++;
    }
  }

  return stats;
}

// ── Main entry point ───────────────────────────────────

export async function syncAll(date?: Date): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const semesters = getActiveSemesters(date);
    console.log(
      `Syncing ${semesters.length} active semester(s): ${semesters.map((s) => s.name).join(", ")}`
    );

    for (let i = 0; i < semesters.length; i++) {
      const semester = semesters[i];
      console.log(`\n[${i + 1}/${semesters.length}] Fetching ${semester.name} (srcdb=${semester.srcdb})...`);

      const results = await fetchAllCourses(semester.srcdb);
      console.log(`  Received ${results.length} sections from API`);

      if (results.length === 0) {
        console.log("  No data — skipping");
        continue;
      }

      console.log("  Syncing to database...");
      const stats = await syncSemester(prisma, semester, results);

      console.log(`  Done: ${stats.coursesCreated} new courses, ${stats.coursesExisting} existing courses`);
      console.log(`        ${stats.offeringsCreated} new offerings, ${stats.offeringsUpdated} updated offerings`);
      console.log(`        ${stats.instructorsCreated} new instructors`);

      // Rate limit: 2s between semester requests
      if (i < semesters.length - 1) {
        console.log("  Waiting 2s before next semester...");
        await sleep(2000);
      }
    }

    console.log("\nSync complete.");
  } finally {
    await prisma.$disconnect();
  }
}
