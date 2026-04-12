// Mock Prisma client before any imports that pull it in
jest.mock("@/generated/prisma/client", () => ({
  PrismaClient: jest.fn(),
}));

// Mock fose-client to avoid its imports
jest.mock("../fose-client", () => ({
  fetchAllCourses: jest.fn(),
  getActiveSemesters: jest.fn(),
  parseSrcdb: jest.fn(),
}));

import {
  parseCourseCode,
  mapStatus,
  parseHours,
  parseMeetingTimes,
} from "../sync";

// ─── parseCourseCode ────────────────────────────────────
// design.md §4.3: code field e.g. "CSCI-UA 101"
// design.md §8: "从 code 字段解析出院系和课程编号（如 CSCI-UA 101 → dept=CSCI-UA, number=101）"

describe("parseCourseCode", () => {
  it("parses 'CSCI-UA 101' → dept=CSCI-UA, number=101, school=UA", () => {
    // Primary example from design.md
    expect(parseCourseCode("CSCI-UA 101")).toEqual({
      deptCode: "CSCI-UA",
      courseNumber: "101",
      schoolCode: "UA",
    });
  });

  it("parses 'BE-GY 873X' (Tandon engineering)", () => {
    // From actual sync output — Tandon school code "GY"
    expect(parseCourseCode("BE-GY 873X")).toEqual({
      deptCode: "BE-GY",
      courseNumber: "873X",
      schoolCode: "GY",
    });
  });

  it("parses 'WRCI-UF 102' (freshman writing)", () => {
    expect(parseCourseCode("WRCI-UF 102")).toEqual({
      deptCode: "WRCI-UF",
      courseNumber: "102",
      schoolCode: "UF",
    });
  });

  it("parses 'CHEM-UA 126' (CAS chemistry)", () => {
    expect(parseCourseCode("CHEM-UA 126")).toEqual({
      deptCode: "CHEM-UA",
      courseNumber: "126",
      schoolCode: "UA",
    });
  });

  it("parses 'EG-UY 1004' (4-digit course number)", () => {
    expect(parseCourseCode("EG-UY 1004")).toEqual({
      deptCode: "EG-UY",
      courseNumber: "1004",
      schoolCode: "UY",
    });
  });

  it("parses 'ACCT-GB 6103' (Stern graduate)", () => {
    expect(parseCourseCode("ACCT-GB 6103")).toEqual({
      deptCode: "ACCT-GB",
      courseNumber: "6103",
      schoolCode: "GB",
    });
  });

  it("returns null for empty string", () => {
    expect(parseCourseCode("")).toBeNull();
  });

  it("returns null for code with no space", () => {
    expect(parseCourseCode("CSCI101")).toBeNull();
  });
});

// ─── mapStatus ──────────────────────────────────────────
// design.md §3: stat field: "A" = Active, "C" = Closed
// design.md §4.4: status: open / closed / waitlist

describe("mapStatus", () => {
  it("maps 'A' (Active) → 'open'", () => {
    // design.md response example: "stat": "A"
    expect(mapStatus("A", "")).toBe("open");
  });

  it("maps 'C' → 'closed'", () => {
    expect(mapStatus("C", "")).toBe("closed");
  });

  it("maps 'W' → 'waitlist'", () => {
    expect(mapStatus("W", "")).toBe("waitlist");
  });

  it("maps cancelled course to 'closed' regardless of stat", () => {
    expect(mapStatus("A", "Y")).toBe("closed");
    expect(mapStatus("A", "true")).toBe("closed");
  });

  it("handles lowercase stat", () => {
    expect(mapStatus("a", "")).toBe("open");
    expect(mapStatus("c", "")).toBe("closed");
  });

  it("defaults unknown stat to 'open'", () => {
    expect(mapStatus("X", "")).toBe("open");
  });
});

// ─── parseHours ─────────────────────────────────────────
// design.md §4.3: min_units / max_units
// FOSE response: hours field e.g. "4" or "1 - 4"

describe("parseHours", () => {
  it("parses '4' → min=4, max=4", () => {
    // Most common: fixed credit course like CSCI-UA 101 (4 credits)
    expect(parseHours("4")).toEqual({ min: 4, max: 4 });
  });

  it("parses '1 - 4' → min=1, max=4", () => {
    // Variable credit courses
    expect(parseHours("1 - 4")).toEqual({ min: 1, max: 4 });
  });

  it("parses '1-6' without spaces", () => {
    expect(parseHours("1-6")).toEqual({ min: 1, max: 6 });
  });

  it("parses '3.5' as fractional credits", () => {
    expect(parseHours("3.5")).toEqual({ min: 3.5, max: 3.5 });
  });

  it("returns null for empty string", () => {
    expect(parseHours("")).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    expect(parseHours("   ")).toBeNull();
  });
});

// ─── parseMeetingTimes ──────────────────────────────────
// design.md §3 response format:
// "meetingTimes": "[{\"meet_day\":\"1\",\"start_time\":\"800\",\"end_time\":\"915\"}]"

describe("parseMeetingTimes", () => {
  it("parses the design.md example meeting time", () => {
    const raw =
      '[{"meet_day":"1","start_time":"800","end_time":"915"}]';
    const result = parseMeetingTimes(raw);
    expect(result).toEqual([
      { meet_day: "1", start_time: "800", end_time: "915" },
    ]);
  });

  it("parses multiple meeting times", () => {
    const raw =
      '[{"meet_day":"1","start_time":"800","end_time":"915"},{"meet_day":"3","start_time":"800","end_time":"915"}]';
    const result = parseMeetingTimes(raw) as unknown[];
    expect(result).toHaveLength(2);
  });

  it("returns null for empty string", () => {
    expect(parseMeetingTimes("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseMeetingTimes("not json")).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    expect(parseMeetingTimes("  ")).toBeNull();
  });
});
