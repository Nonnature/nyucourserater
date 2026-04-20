import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canViewReviews } from "@/lib/access";
import { GRADE_ORDER } from "@/lib/grades";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: courseId } = await params;
  const session = await getSession();

  // Access control: same as reviews
  const user = session?.user
    ? {
        id: session.user.id,
        isVerified: session.user.isVerified,
        enrollmentSemester: session.user.enrollmentSemester ?? null,
      }
    : null;

  const hasAccess = await canViewReviews(user);
  if (!hasAccess) {
    return NextResponse.json(
      { restricted: true, message: "You don't have access to view grade distributions" },
      { status: 403 }
    );
  }

  // Verify course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const semester = searchParams.get("semester");
  const instructor = searchParams.get("instructor");

  // Build where clause with optional filters
  const where: Record<string, unknown> = { courseId };
  if (semester) {
    where.semester = semester;
  }
  if (instructor) {
    where.offering = { instructor: { name: instructor } };
  }

  const reports = await prisma.gradeReport.findMany({
    where,
    select: { grade: true, semester: true },
  });

  // Aggregate by grade
  const gradeCounts: Record<string, number> = {};
  for (const r of reports) {
    gradeCounts[r.grade] = (gradeCounts[r.grade] || 0) + 1;
  }

  const total = reports.length;
  const distribution = Object.entries(gradeCounts)
    .sort(([a], [b]) => (GRADE_ORDER[a] ?? 99) - (GRADE_ORDER[b] ?? 99))
    .map(([grade, count]) => ({
      grade,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

  // Get available semesters for filter dropdown
  const semesters = await prisma.gradeReport.findMany({
    where: { courseId },
    select: { semester: true },
    distinct: ["semester"],
    orderBy: { semester: "desc" },
  });

  // Get available instructors for filter dropdown
  const instructors = await prisma.gradeReport.findMany({
    where: {
      courseId,
      offering: { instructorId: { not: null } },
    },
    select: {
      offering: {
        select: { instructor: { select: { name: true } } },
      },
    },
    distinct: ["offeringId"],
  });

  const uniqueInstructors = [
    ...new Set(
      instructors
        .map((r) => r.offering?.instructor?.name)
        .filter((n): n is string => !!n)
    ),
  ].sort();

  // Check if current user has already reported for this course
  let userReport = null;
  if (session?.user) {
    const existing = await prisma.gradeReport.findMany({
      where: { courseId, userId: session.user.id },
      select: { id: true, grade: true, semester: true },
    });
    if (existing.length > 0) {
      userReport = existing;
    }
  }

  return NextResponse.json({
    distribution,
    total,
    semesters: semesters.map((s) => s.semester),
    instructors: uniqueInstructors,
    userReport,
  });
}
