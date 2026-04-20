import { validateGradeInput, VALID_GRADES, GRADE_ORDER } from "../grades";

describe("validateGradeInput", () => {
  const validInput = {
    courseId: "course-123",
    grade: "A",
    semester: "Fall 2025",
  };

  it("returns no errors for valid input", () => {
    expect(validateGradeInput(validInput)).toEqual([]);
  });

  it("requires courseId", () => {
    const errors = validateGradeInput({ ...validInput, courseId: undefined });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "courseId" })
    );
  });

  it("requires grade", () => {
    const errors = validateGradeInput({ ...validInput, grade: undefined });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "grade" })
    );
  });

  it("rejects invalid grade values", () => {
    const errors = validateGradeInput({ ...validInput, grade: "A+" });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "grade" })
    );
  });

  it("accepts all valid grade values", () => {
    for (const grade of VALID_GRADES) {
      expect(validateGradeInput({ ...validInput, grade })).toEqual([]);
    }
  });

  it("requires semester", () => {
    const errors = validateGradeInput({ ...validInput, semester: undefined });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "semester" })
    );
  });

  it("rejects invalid semester format", () => {
    expect(
      validateGradeInput({ ...validInput, semester: "2025 Fall" })
    ).toContainEqual(expect.objectContaining({ field: "semester" }));
    expect(
      validateGradeInput({ ...validInput, semester: "January 2025" })
    ).toContainEqual(expect.objectContaining({ field: "semester" }));
  });

  it("accepts Summer semester format", () => {
    expect(
      validateGradeInput({ ...validInput, semester: "Summer 2025" })
    ).toEqual([]);
  });

  it("returns multiple errors for empty input", () => {
    const errors = validateGradeInput({});
    expect(errors.length).toBe(3);
  });
});

describe("GRADE_ORDER", () => {
  it("orders A before F", () => {
    expect(GRADE_ORDER["A"]).toBeLessThan(GRADE_ORDER["F"]);
  });

  it("orders letter grades before special grades", () => {
    expect(GRADE_ORDER["F"]).toBeLessThan(GRADE_ORDER["W"]);
    expect(GRADE_ORDER["W"]).toBeLessThan(GRADE_ORDER["P"]);
    expect(GRADE_ORDER["P"]).toBeLessThan(GRADE_ORDER["INC"]);
  });

  it("has entries for all valid grades", () => {
    for (const grade of VALID_GRADES) {
      expect(GRADE_ORDER[grade]).toBeDefined();
    }
  });
});
