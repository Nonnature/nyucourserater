/**
 * FOSE (Faculty/Online Search Engine) API client
 * for NYU Bulletins class search.
 */

// ── Types ──────────────────────────────────────────────

export interface FoseResult {
  key: string;
  code: string; // e.g. "CSCI-UA 101"
  title: string; // e.g. "Intro to Computer Science"
  crn: string; // Albert registration number
  no: string; // Section number e.g. "002"
  total: string; // Total sections for this course
  schd: string; // Schedule type: LEC / SEM / LAB / IND
  stat: string; // Status: A = Active
  isCancelled: string; // "" or truthy
  meets: string; // Human-readable schedule e.g. "TR 8-9:15a"
  meetingTimes: string; // JSON string: [{meet_day, start_time, end_time}]
  instr: string; // Instructor name (may be empty)
  hours: string; // Credit hours e.g. "4" or "1 - 4"
  start_date: string;
  end_date: string;
  srcdb: string;
}

export interface FoseResponse {
  srcdb: string;
  count: number;
  results: FoseResult[];
}

export type Term = "january" | "spring" | "summer" | "fall";

export interface SemesterInfo {
  srcdb: string;
  name: string; // e.g. "Fall 2026"
  year: number;
  term: Term;
}

// ── Constants ──────────────────────────────────────────

const FOSE_ENDPOINT =
  "https://bulletins.nyu.edu/class-search/api/?page=fose&route=search";

const TERM_OFFSETS: Record<Term, number> = {
  january: 2,
  spring: 4,
  summer: 6,
  fall: 8,
};

const OFFSET_TO_TERM: Record<number, Term> = {
  2: "january",
  4: "spring",
  6: "summer",
  8: "fall",
};

const TERM_DISPLAY: Record<Term, string> = {
  january: "January",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

const FETCH_COLUMNS = [
  "to_be_announced",
  "terms",
  "class_name",
  "title",
  "section_name",
  "crn",
  "hours",
  "status",
  "meets",
  "instr",
].join(",");

// ── Semester helpers ───────────────────────────────────

/**
 * Compute srcdb code from year and term.
 *
 * Encoding rule (from NYU Bulletins):
 *   srcdb = 1200 + (year - 2020) * 10 + termOffset
 *
 * Examples:
 *   Fall 2024  → 1200 + 40 + 8 = 1248
 *   Spring 2025 → 1200 + 50 + 4 = 1254
 *   Fall 2026  → 1200 + 60 + 8 = 1268
 */
export function computeSrcdb(year: number, term: Term): string {
  return String(1200 + (year - 2020) * 10 + TERM_OFFSETS[term]);
}

/**
 * Parse a srcdb code back into year, term, and display name.
 */
export function parseSrcdb(srcdb: string): SemesterInfo {
  const num = parseInt(srcdb, 10);
  const diff = num - 1200;
  const year = Math.floor(diff / 10) + 2020;
  const offset = diff % 10;
  const term = OFFSET_TO_TERM[offset];
  if (!term) {
    throw new Error(`Unknown srcdb offset ${offset} in srcdb=${srcdb}`);
  }
  return {
    srcdb,
    name: `${TERM_DISPLAY[term]} ${year}`,
    year,
    term,
  };
}

/**
 * Determine which semesters are "active" (current + upcoming)
 * based on the given date.
 */
export function getActiveSemesters(date: Date = new Date()): SemesterInfo[] {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  if (month >= 9) {
    // Sep–Dec: Fall is active, next Spring is upcoming
    return [
      parseSrcdb(computeSrcdb(year, "fall")),
      parseSrcdb(computeSrcdb(year + 1, "spring")),
    ];
  } else if (month >= 5) {
    // May–Aug: Summer is active, Fall is upcoming
    return [
      parseSrcdb(computeSrcdb(year, "summer")),
      parseSrcdb(computeSrcdb(year, "fall")),
    ];
  } else if (month >= 2) {
    // Feb–Apr: Spring is active, Summer is upcoming
    return [
      parseSrcdb(computeSrcdb(year, "spring")),
      parseSrcdb(computeSrcdb(year, "summer")),
    ];
  } else {
    // Jan: January term active, Spring upcoming
    return [
      parseSrcdb(computeSrcdb(year, "january")),
      parseSrcdb(computeSrcdb(year, "spring")),
    ];
  }
}

// ── API fetch ──────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all courses for a given semester from the FOSE API.
 * Retries up to `maxRetries` times with exponential backoff on failure.
 */
export async function fetchAllCourses(
  srcdb: string,
  maxRetries = 3
): Promise<FoseResult[]> {
  const payload = {
    other: { srcdb },
    criteria: [],
    columns: FETCH_COLUMNS,
  };

  // FOSE expects URL-encoded JSON as the raw body
  const body = encodeURIComponent(JSON.stringify(payload));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(FOSE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://bulletins.nyu.edu/class-search/",
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as FoseResponse;
      return data.results ?? [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.warn(
          `  [attempt ${attempt}/${maxRetries}] Failed: ${message}. Retrying in ${delay / 1000}s...`
        );
        await sleep(delay);
      } else {
        throw new Error(
          `FOSE API failed after ${maxRetries} attempts for srcdb=${srcdb}: ${message}`
        );
      }
    }
  }

  return []; // unreachable
}
