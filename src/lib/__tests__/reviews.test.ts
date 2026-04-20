import { validateReviewInput } from "../reviews";

describe("validateReviewInput", () => {
  const validInput = {
    courseId: "course-123",
    rating: 4,
    difficulty: 3,
    workload: 3,
    comment: "Great course, learned a lot!",
    wouldRecommend: true,
    semesterTaken: "Fall 2025",
  };

  it("returns no errors for valid input", () => {
    expect(validateReviewInput(validInput)).toEqual([]);
  });

  it("requires courseId", () => {
    const errors = validateReviewInput({ ...validInput, courseId: undefined });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "courseId" })
    );
  });

  it("rejects rating outside 1-5", () => {
    expect(validateReviewInput({ ...validInput, rating: 0 })).toContainEqual(
      expect.objectContaining({ field: "rating" })
    );
    expect(validateReviewInput({ ...validInput, rating: 6 })).toContainEqual(
      expect.objectContaining({ field: "rating" })
    );
    expect(
      validateReviewInput({ ...validInput, rating: 2.5 })
    ).toContainEqual(expect.objectContaining({ field: "rating" }));
  });

  it("rejects difficulty outside 1-5", () => {
    expect(
      validateReviewInput({ ...validInput, difficulty: 0 })
    ).toContainEqual(expect.objectContaining({ field: "difficulty" }));
  });

  it("rejects workload outside 1-5", () => {
    expect(
      validateReviewInput({ ...validInput, workload: 6 })
    ).toContainEqual(expect.objectContaining({ field: "workload" }));
  });

  it("rejects comment shorter than 5 characters", () => {
    expect(
      validateReviewInput({ ...validInput, comment: "bad" })
    ).toContainEqual(expect.objectContaining({ field: "comment" }));
    expect(
      validateReviewInput({ ...validInput, comment: "    " })
    ).toContainEqual(expect.objectContaining({ field: "comment" }));
  });

  it("accepts comment with exactly 5 characters", () => {
    expect(
      validateReviewInput({ ...validInput, comment: "hello" })
    ).toEqual([]);
  });

  it("requires wouldRecommend to be boolean", () => {
    expect(
      validateReviewInput({ ...validInput, wouldRecommend: undefined })
    ).toContainEqual(expect.objectContaining({ field: "wouldRecommend" }));
  });

  it("rejects invalid semesterTaken format", () => {
    expect(
      validateReviewInput({ ...validInput, semesterTaken: "2025 Fall" })
    ).toContainEqual(expect.objectContaining({ field: "semesterTaken" }));
    expect(
      validateReviewInput({ ...validInput, semesterTaken: "January 2025" })
    ).toContainEqual(expect.objectContaining({ field: "semesterTaken" }));
  });

  it("accepts Summer semester format", () => {
    expect(
      validateReviewInput({ ...validInput, semesterTaken: "Summer 2025" })
    ).toEqual([]);
  });

  it("returns multiple errors for multiple invalid fields", () => {
    const errors = validateReviewInput({});
    expect(errors.length).toBeGreaterThanOrEqual(6);
  });
});
