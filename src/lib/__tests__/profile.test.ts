import { mapMyReview, mapMyGrade } from "../profile";

describe("mapMyReview", () => {
  const base = {
    id: "rev-1",
    rating: 4,
    difficulty: 3,
    workload: 3,
    comment: "Great course, learned a lot!",
    wouldRecommend: true,
    semesterTaken: "Fall 2025",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-02-01T12:00:00Z"),
    course: {
      id: "course-1",
      code: "CSCI-UA 101",
      name: "Intro to Computer Science",
      department: { code: "CSCI-UA", name: "Computer Science" },
    },
    votes: [],
  };

  it("flattens course + department into plain fields", () => {
    const out = mapMyReview(base);
    expect(out.course).toEqual({
      id: "course-1",
      code: "CSCI-UA 101",
      name: "Intro to Computer Science",
      departmentCode: "CSCI-UA",
      departmentName: "Computer Science",
    });
  });

  it("serializes dates as ISO strings", () => {
    const out = mapMyReview(base);
    expect(out.createdAt).toBe("2026-01-15T10:00:00.000Z");
    expect(out.updatedAt).toBe("2026-02-01T12:00:00.000Z");
  });

  it("computes netScore from UP/DOWN votes", () => {
    const out = mapMyReview({
      ...base,
      votes: [
        { vote: "UP" },
        { vote: "UP" },
        { vote: "UP" },
        { vote: "DOWN" },
      ],
    });
    expect(out.netScore).toBe(2);
  });

  it("netScore is 0 when no votes", () => {
    expect(mapMyReview(base).netScore).toBe(0);
  });

  it("netScore is negative when downvotes exceed upvotes", () => {
    const out = mapMyReview({
      ...base,
      votes: [{ vote: "DOWN" }, { vote: "DOWN" }, { vote: "UP" }],
    });
    expect(out.netScore).toBe(-1);
  });

  it("preserves all review fields", () => {
    const out = mapMyReview(base);
    expect(out).toMatchObject({
      id: "rev-1",
      rating: 4,
      difficulty: 3,
      workload: 3,
      comment: "Great course, learned a lot!",
      wouldRecommend: true,
      semesterTaken: "Fall 2025",
    });
  });
});

describe("mapMyGrade", () => {
  const base = {
    id: "grade-1",
    grade: "A",
    semester: "Fall 2025",
    createdAt: new Date("2026-01-10T08:00:00Z"),
    course: {
      id: "course-1",
      code: "CSCI-UA 101",
      name: "Intro to Computer Science",
      department: { code: "CSCI-UA", name: "Computer Science" },
    },
  };

  it("flattens course + department", () => {
    const out = mapMyGrade(base);
    expect(out.course).toEqual({
      id: "course-1",
      code: "CSCI-UA 101",
      name: "Intro to Computer Science",
      departmentCode: "CSCI-UA",
      departmentName: "Computer Science",
    });
  });

  it("serializes createdAt as ISO string", () => {
    expect(mapMyGrade(base).createdAt).toBe("2026-01-10T08:00:00.000Z");
  });

  it("preserves grade and semester", () => {
    const out = mapMyGrade(base);
    expect(out.grade).toBe("A");
    expect(out.semester).toBe("Fall 2025");
  });
});
