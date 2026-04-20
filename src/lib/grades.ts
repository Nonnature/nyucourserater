export const VALID_GRADES = [
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W", "P", "INC",
] as const;

export type ValidGrade = (typeof VALID_GRADES)[number];

/** Canonical display order for grade distribution charts */
export const GRADE_ORDER: Record<string, number> = Object.fromEntries(
  VALID_GRADES.map((g, i) => [g, i])
);

const SEMESTER_PATTERN = /^(Fall|Spring|Summer)\s+\d{4}$/;

export interface GradeInput {
  courseId?: string;
  grade?: string;
  semester?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateGradeInput(input: GradeInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.courseId) {
    errors.push({ field: "courseId", message: "Course ID is required" });
  }

  if (!input.grade) {
    errors.push({ field: "grade", message: "Grade is required" });
  } else if (!VALID_GRADES.includes(input.grade as ValidGrade)) {
    errors.push({
      field: "grade",
      message: `Invalid grade. Must be one of: ${VALID_GRADES.join(", ")}`,
    });
  }

  if (!input.semester) {
    errors.push({ field: "semester", message: "Semester is required" });
  } else if (!SEMESTER_PATTERN.test(input.semester)) {
    errors.push({
      field: "semester",
      message: "Semester must be in format 'Fall 2025', 'Spring 2025', or 'Summer 2025'",
    });
  }

  return errors;
}
