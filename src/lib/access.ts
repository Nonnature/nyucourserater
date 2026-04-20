import { prisma } from "@/lib/prisma";
import { computeCurrentSemester } from "@/lib/semester";

export type AccessDeniedReason =
  | "sign_in_required"
  | "verification_required"
  | "enrollment_required"
  | "grade_report_required";

export interface AccessUser {
  id: string;
  isVerified: boolean;
  enrollmentSemester: string | null;
}

/**
 * Check if a user can view reviews and grade distributions.
 *
 * Rules:
 * - Not logged in → false
 * - Not email-verified → false
 * - No enrollment semester set → false
 * - First semester (computed) → true (exempt)
 * - Has >= 1 grade report → true
 * - Else → false
 */
export async function canViewReviews(
  user: AccessUser | null
): Promise<boolean> {
  if (!user) return false;
  if (!user.isVerified) return false;
  if (!user.enrollmentSemester) return false;

  const { isFirstSemester } = computeCurrentSemester(user.enrollmentSemester);
  if (isFirstSemester) return true;

  const gradeCount = await prisma.gradeReport.count({
    where: { userId: user.id },
  });
  return gradeCount >= 1;
}

/**
 * Check if a user can write reviews or upload grade reports.
 * Requires: logged in + verified email.
 */
export function canWrite(user: AccessUser | null): boolean {
  if (!user) return false;
  return user.isVerified;
}

/**
 * Get the reason a user can't view reviews (for UI messaging).
 * Returns null if the user has access.
 */
export async function getAccessDeniedReason(
  user: AccessUser | null
): Promise<AccessDeniedReason | null> {
  if (!user) return "sign_in_required";
  if (!user.isVerified) return "verification_required";
  if (!user.enrollmentSemester) return "enrollment_required";

  const { isFirstSemester } = computeCurrentSemester(user.enrollmentSemester);
  if (isFirstSemester) return null;

  const gradeCount = await prisma.gradeReport.count({
    where: { userId: user.id },
  });
  if (gradeCount >= 1) return null;
  return "grade_report_required";
}
