import {
  parseEnrollmentSemester,
  getCurrentPeriod,
  computeCurrentSemester,
  getEnrollmentSemesterOptions,
} from "../semester";

describe("parseEnrollmentSemester", () => {
  it("parses Fall semester", () => {
    expect(parseEnrollmentSemester("Fall 2025")).toEqual({
      season: "Fall",
      year: 2025,
    });
  });

  it("parses Spring semester", () => {
    expect(parseEnrollmentSemester("Spring 2026")).toEqual({
      season: "Spring",
      year: 2026,
    });
  });

  it("returns null for invalid input", () => {
    expect(parseEnrollmentSemester("Summer 2025")).toBeNull();
    expect(parseEnrollmentSemester("Fall")).toBeNull();
    expect(parseEnrollmentSemester("2025")).toBeNull();
    expect(parseEnrollmentSemester("")).toBeNull();
    expect(parseEnrollmentSemester("fall 2025")).toBeNull();
  });
});

describe("getCurrentPeriod", () => {
  it("returns Spring+Summer for January", () => {
    expect(getCurrentPeriod(new Date("2026-01-15"))).toEqual({
      period: "Spring+Summer",
      year: 2026,
    });
  });

  it("returns Spring+Summer for May", () => {
    expect(getCurrentPeriod(new Date("2026-05-15"))).toEqual({
      period: "Spring+Summer",
      year: 2026,
    });
  });

  it("returns Spring+Summer for August", () => {
    expect(getCurrentPeriod(new Date("2026-08-15"))).toEqual({
      period: "Spring+Summer",
      year: 2026,
    });
  });

  it("returns Fall for September", () => {
    expect(getCurrentPeriod(new Date("2026-09-15"))).toEqual({
      period: "Fall",
      year: 2026,
    });
  });

  it("returns Fall for December", () => {
    expect(getCurrentPeriod(new Date("2026-12-15"))).toEqual({
      period: "Fall",
      year: 2026,
    });
  });
});

describe("computeCurrentSemester", () => {
  // Enrolled Fall 2025
  it("Fall enrollment, same Fall → semester 1", () => {
    const result = computeCurrentSemester("Fall 2025", new Date("2025-10-15"));
    expect(result).toEqual({ currentSemesterNumber: 1, isFirstSemester: true });
  });

  it("Fall enrollment, next Spring → semester 2", () => {
    const result = computeCurrentSemester("Fall 2025", new Date("2026-03-15"));
    expect(result).toEqual({ currentSemesterNumber: 2, isFirstSemester: false });
  });

  it("Fall enrollment, next Summer (still Spring+Summer) → semester 2", () => {
    const result = computeCurrentSemester("Fall 2025", new Date("2026-07-15"));
    expect(result).toEqual({ currentSemesterNumber: 2, isFirstSemester: false });
  });

  it("Fall enrollment, next Fall → semester 3", () => {
    const result = computeCurrentSemester("Fall 2025", new Date("2026-10-15"));
    expect(result).toEqual({ currentSemesterNumber: 3, isFirstSemester: false });
  });

  it("Fall enrollment, two years later → semester 5", () => {
    const result = computeCurrentSemester("Fall 2025", new Date("2027-10-15"));
    expect(result).toEqual({ currentSemesterNumber: 5, isFirstSemester: false });
  });

  // Enrolled Spring 2025
  it("Spring enrollment, same Spring → semester 1", () => {
    const result = computeCurrentSemester("Spring 2025", new Date("2025-02-15"));
    expect(result).toEqual({ currentSemesterNumber: 1, isFirstSemester: true });
  });

  it("Spring enrollment, same Summer (still Spring+Summer) → semester 1", () => {
    const result = computeCurrentSemester("Spring 2025", new Date("2025-07-15"));
    expect(result).toEqual({ currentSemesterNumber: 1, isFirstSemester: true });
  });

  it("Spring enrollment, next Fall → semester 2", () => {
    const result = computeCurrentSemester("Spring 2025", new Date("2025-10-15"));
    expect(result).toEqual({ currentSemesterNumber: 2, isFirstSemester: false });
  });

  it("Spring enrollment, next Spring → semester 3", () => {
    const result = computeCurrentSemester("Spring 2025", new Date("2026-03-15"));
    expect(result).toEqual({ currentSemesterNumber: 3, isFirstSemester: false });
  });

  // Edge case: invalid enrollment
  it("invalid enrollment string → defaults to semester 1", () => {
    const result = computeCurrentSemester("invalid", new Date("2025-10-15"));
    expect(result).toEqual({ currentSemesterNumber: 1, isFirstSemester: true });
  });
});

describe("getEnrollmentSemesterOptions", () => {
  it("returns 6 options starting from current semester", () => {
    // October 2025 → current is Fall 2025
    const options = getEnrollmentSemesterOptions(new Date("2025-10-15"));
    expect(options).toEqual([
      "Fall 2025",
      "Spring 2025",
      "Fall 2024",
      "Spring 2024",
      "Fall 2023",
      "Spring 2023",
    ]);
  });

  it("returns Spring first when in Spring period", () => {
    // March 2026 → current is Spring 2026
    const options = getEnrollmentSemesterOptions(new Date("2026-03-15"));
    expect(options).toEqual([
      "Spring 2026",
      "Fall 2025",
      "Spring 2025",
      "Fall 2024",
      "Spring 2024",
      "Fall 2023",
    ]);
  });

  it("returns 6 items", () => {
    const options = getEnrollmentSemesterOptions(new Date("2025-01-01"));
    expect(options).toHaveLength(6);
  });
});
