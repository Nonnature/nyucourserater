/**
 * Pure semester computation functions.
 * No external dependencies — fully testable.
 *
 * Counting rules:
 *   Fall = one semester period
 *   Spring + Summer = one semester period
 *   Two increments per academic year
 *
 * Example (enrolled Fall 2025):
 *   Fall 2025           → semester 1
 *   Spring+Summer 2026  → semester 2
 *   Fall 2026           → semester 3
 */

export interface SemesterInfo {
  currentSemesterNumber: number;
  isFirstSemester: boolean;
}

export function parseEnrollmentSemester(
  enrollment: string
): { season: "Fall" | "Spring"; year: number } | null {
  const match = enrollment.match(/^(Fall|Spring)\s+(\d{4})$/);
  if (!match) return null;
  return { season: match[1] as "Fall" | "Spring", year: parseInt(match[2], 10) };
}

/**
 * Determine the current academic period.
 * Jan–Aug  → Spring+Summer of that year
 * Sep–Dec  → Fall of that year
 */
export function getCurrentPeriod(
  now: Date = new Date()
): { period: "Fall" | "Spring+Summer"; year: number } {
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  if (month <= 7) {
    // Jan (0) through Aug (7)
    return { period: "Spring+Summer", year };
  }
  return { period: "Fall", year };
}

/**
 * Compute the current semester number for a user based on their enrollment
 * semester and the current date.
 */
export function computeCurrentSemester(
  enrollmentSemester: string,
  now: Date = new Date()
): SemesterInfo {
  const parsed = parseEnrollmentSemester(enrollmentSemester);
  if (!parsed) {
    return { currentSemesterNumber: 1, isFirstSemester: true };
  }

  const current = getCurrentPeriod(now);

  let semesterCount = 1;
  let walkYear = parsed.year;
  let walkPeriod: "Fall" | "Spring+Summer" =
    parsed.season === "Fall" ? "Fall" : "Spring+Summer";

  // Walk forward from enrollment period to current period
  while (semesterCount <= 20) {
    if (walkPeriod === current.period && walkYear === current.year) {
      break;
    }
    // Advance to next period
    if (walkPeriod === "Fall") {
      walkPeriod = "Spring+Summer";
      walkYear += 1;
    } else {
      walkPeriod = "Fall";
      // Same year: Spring+Summer 2026 → Fall 2026
    }
    semesterCount++;
  }

  return {
    currentSemesterNumber: semesterCount,
    isFirstSemester: semesterCount === 1,
  };
}

/**
 * Generate a list of recent enrollment semester options for the registration
 * dropdown. Returns most recent semesters first (Fall and Spring only).
 */
export function getEnrollmentSemesterOptions(
  now: Date = new Date()
): string[] {
  const options: string[] = [];
  const year = now.getFullYear();
  const month = now.getMonth();

  // Start from the current or most recent semester
  let curYear = year;
  let curSeason: "Fall" | "Spring" = month >= 8 ? "Fall" : "Spring";

  for (let i = 0; i < 6; i++) {
    options.push(`${curSeason} ${curYear}`);
    // Go back one period
    if (curSeason === "Spring") {
      curSeason = "Fall";
      curYear -= 1;
    } else {
      curSeason = "Spring";
    }
  }

  return options;
}
