export interface ReviewInput {
  courseId: string;
  offeringId?: string | null;
  rating: number;
  difficulty: number;
  workload: number;
  comment: string;
  wouldRecommend: boolean;
  semesterTaken: string;
}

export interface ReviewValidationError {
  field: string;
  message: string;
}

const SEMESTER_PATTERN = /^(Fall|Spring|Summer)\s+\d{4}$/;

export function validateReviewInput(
  input: Partial<ReviewInput>
): ReviewValidationError[] {
  const errors: ReviewValidationError[] = [];

  if (!input.courseId) {
    errors.push({ field: "courseId", message: "Course ID is required" });
  }

  if (input.rating == null || input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
    errors.push({ field: "rating", message: "Rating must be an integer between 1 and 5" });
  }

  if (input.difficulty == null || input.difficulty < 1 || input.difficulty > 5 || !Number.isInteger(input.difficulty)) {
    errors.push({ field: "difficulty", message: "Difficulty must be an integer between 1 and 5" });
  }

  if (input.workload == null || input.workload < 1 || input.workload > 5 || !Number.isInteger(input.workload)) {
    errors.push({ field: "workload", message: "Workload must be an integer between 1 and 5" });
  }

  if (!input.comment || input.comment.trim().length < 5) {
    errors.push({ field: "comment", message: "Comment must be at least 5 characters" });
  }

  if (input.wouldRecommend == null || typeof input.wouldRecommend !== "boolean") {
    errors.push({ field: "wouldRecommend", message: "Would recommend is required" });
  }

  if (!input.semesterTaken || !SEMESTER_PATTERN.test(input.semesterTaken)) {
    errors.push({ field: "semesterTaken", message: "Semester taken must be in format 'Fall 2025', 'Spring 2026', or 'Summer 2026'" });
  }

  return errors;
}
