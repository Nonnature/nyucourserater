import {
  normalizeQuery,
  parsePagination,
  buildCourseWhere,
  mapCourseToResponse,
  buildPaginationMeta,
} from "../courses";

// ─── normalizeQuery ─────────────────────────────────────────────────

describe("normalizeQuery", () => {
  it("inserts space for 'CSCI-GA3033' → includes 'CSCI-GA 3033'", () => {
    const variants = normalizeQuery("CSCI-GA3033");
    expect(variants).toContain("CSCI-GA3033");
    expect(variants).toContain("CSCI-GA 3033");
  });

  it("inserts space for 'csci-ua101' → includes 'csci-ua 101'", () => {
    const variants = normalizeQuery("csci-ua101");
    expect(variants).toContain("csci-ua101");
    expect(variants).toContain("csci-ua 101");
  });

  it("handles 'BE-GY873X' → includes 'BE-GY 873X'", () => {
    const variants = normalizeQuery("BE-GY873X");
    expect(variants).toContain("BE-GY 873X");
  });

  it("handles 'EG-UY1004' → includes 'EG-UY 1004'", () => {
    const variants = normalizeQuery("EG-UY1004");
    expect(variants).toContain("EG-UY 1004");
  });

  it("returns original only for plain text queries", () => {
    const variants = normalizeQuery("computer science");
    expect(variants).toEqual(["computer science"]);
  });

  it("returns original only for already-spaced course codes", () => {
    const variants = normalizeQuery("CSCI-UA 101");
    expect(variants).toEqual(["CSCI-UA 101"]);
  });

  it("returns original only when no hyphen in dept code", () => {
    // No hyphen → not a course code pattern
    const variants = normalizeQuery("CSCI3033");
    expect(variants).toEqual(["CSCI3033"]);
  });

  it("does not duplicate when original equals normalized", () => {
    // Already has space, no normalization needed
    const variants = normalizeQuery("CSCI-GA 3033");
    expect(variants).toHaveLength(1);
  });
});

// ─── parsePagination ────────────────────────────────────────────────

describe("parsePagination", () => {
  it("returns defaults when no params provided", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("parses valid page and limit", () => {
    expect(parsePagination({ page: "3", limit: "10" })).toEqual({
      page: 3,
      limit: 10,
      offset: 20,
    });
  });

  it("clamps page to minimum of 1", () => {
    expect(parsePagination({ page: "0" })).toMatchObject({ page: 1 });
    expect(parsePagination({ page: "-5" })).toMatchObject({ page: 1 });
  });

  it("clamps limit to 1..50", () => {
    expect(parsePagination({ limit: "0" })).toMatchObject({ limit: 1 });
    expect(parsePagination({ limit: "100" })).toMatchObject({ limit: 50 });
    expect(parsePagination({ limit: "-1" })).toMatchObject({ limit: 1 });
  });

  it("handles NaN gracefully (defaults)", () => {
    expect(parsePagination({ page: "abc", limit: "xyz" })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });
  });

  it("computes offset correctly for page 2 with limit 20", () => {
    const result = parsePagination({ page: "2", limit: "20" });
    expect(result.offset).toBe(20);
  });
});

// ─── buildCourseWhere ───────────────────────────────────────────────

describe("buildCourseWhere", () => {
  it("returns empty where when no params", () => {
    expect(buildCourseWhere({})).toEqual({});
  });

  it("builds keyword search for course code 'CSCI-UA 101'", () => {
    // design.md example: search by code "CSCI-UA 101"
    const where = buildCourseWhere({ q: "CSCI-UA 101" });
    expect(where.OR).toEqual([
      { code: { contains: "CSCI-UA 101", mode: "insensitive" } },
      { name: { contains: "CSCI-UA 101", mode: "insensitive" } },
    ]);
  });

  it("builds keyword search for course name 'computer science'", () => {
    const where = buildCourseWhere({ q: "computer science" });
    expect(where.OR).toEqual([
      { code: { contains: "computer science", mode: "insensitive" } },
      { name: { contains: "computer science", mode: "insensitive" } },
    ]);
  });

  it("filters by department code (case insensitive)", () => {
    // design.md: department code e.g. "CSCI-UA"
    const where = buildCourseWhere({ department: "CSCI-UA" });
    expect(where.department).toEqual({
      code: { equals: "CSCI-UA", mode: "insensitive" },
    });
  });

  it("filters by semester srcdb code", () => {
    // design.md: srcdb "1264" = Spring 2026
    const where = buildCourseWhere({ semester: "1264" });
    expect(where.offerings).toEqual({ some: { semester: "1264" } });
  });

  it("combines all filters", () => {
    const where = buildCourseWhere({
      q: "Intro",
      department: "CSCI-UA",
      semester: "1268",
    });
    expect(where.OR).toBeDefined();
    expect(where.department).toBeDefined();
    expect(where.offerings).toBeDefined();
  });

  it("does not set OR when q is empty/undefined", () => {
    expect(buildCourseWhere({ q: "" })).toEqual({});
    expect(buildCourseWhere({ q: undefined })).toEqual({});
  });

  it("generates fuzzy OR conditions for 'CSCI-GA3033'", () => {
    const where = buildCourseWhere({ q: "CSCI-GA3033" });
    const orConditions = where.OR as unknown[];
    // Should have 4 conditions: original code + original name + normalized code + normalized name
    expect(orConditions).toHaveLength(4);
    expect(orConditions).toContainEqual({
      code: { contains: "CSCI-GA 3033", mode: "insensitive" },
    });
  });
});

// ─── mapCourseToResponse ────────────────────────────────────────────

describe("mapCourseToResponse", () => {
  // Using design.md example: CSCI-UA 101 - Intro to Computer Science
  const baseCourse = {
    id: "test-uuid-csci-101",
    code: "CSCI-UA 101",
    name: "Intro to Computer Science",
    department: { code: "CSCI-UA", name: "Computer Science" },
    minUnits: 4,
    maxUnits: 4,
    _count: { reviews: 0, offerings: 11 },
    reviews: [] as { rating: number; difficulty: number; workload: number }[],
  };

  it("maps course with no reviews (CSCI-UA 101 from design.md)", () => {
    const result = mapCourseToResponse(baseCourse);
    expect(result).toEqual({
      id: "test-uuid-csci-101",
      code: "CSCI-UA 101",
      name: "Intro to Computer Science",
      department: { code: "CSCI-UA", name: "Computer Science" },
      units: 4,
      offeringCount: 11,
      reviewCount: 0,
      avgRating: null,
      avgDifficulty: null,
    });
  });

  it("computes average rating and difficulty from reviews", () => {
    // design.md example: Avg Rating 4.2, Difficulty 3.1
    const course = {
      ...baseCourse,
      _count: { reviews: 5, offerings: 11 },
      reviews: [
        { rating: 5, difficulty: 3, workload: 4 },
        { rating: 4, difficulty: 3, workload: 5 },
        { rating: 4, difficulty: 4, workload: 3 },
        { rating: 4, difficulty: 3, workload: 4 },
        { rating: 4, difficulty: 2, workload: 3 },
      ],
    };
    // avg rating = (5+4+4+4+4)/5 = 4.2, avg difficulty = (3+3+4+3+2)/5 = 3.0
    const result = mapCourseToResponse(course);
    expect(result.avgRating).toBe(4.2);
    expect(result.avgDifficulty).toBe(3);
    expect(result.reviewCount).toBe(5);
  });

  it("rounds averages to 1 decimal place", () => {
    const course = {
      ...baseCourse,
      _count: { reviews: 3, offerings: 5 },
      reviews: [
        { rating: 5, difficulty: 4, workload: 3 },
        { rating: 4, difficulty: 3, workload: 4 },
        { rating: 3, difficulty: 2, workload: 5 },
      ],
    };
    // avg rating = 12/3 = 4.0, avg difficulty = 9/3 = 3.0
    const result = mapCourseToResponse(course);
    expect(result.avgRating).toBe(4);
    expect(result.avgDifficulty).toBe(3);
  });

  it("shows units as range when min != max", () => {
    const course = {
      ...baseCourse,
      minUnits: 1,
      maxUnits: 6,
    };
    const result = mapCourseToResponse(course);
    expect(result.units).toBe("1-6");
  });

  it("shows null units when both are null", () => {
    const course = {
      ...baseCourse,
      minUnits: null,
      maxUnits: null,
    };
    const result = mapCourseToResponse(course);
    expect(result.units).toBeNull();
  });
});

// ─── buildPaginationMeta ────────────────────────────────────────────

describe("buildPaginationMeta", () => {
  it("computes totalPages for exact division", () => {
    // 100 courses, 20 per page = 5 pages
    expect(buildPaginationMeta(1, 20, 100)).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
    });
  });

  it("rounds up totalPages for remainder", () => {
    // 25 courses found (from "computer science" search), 20 per page = 2 pages
    expect(buildPaginationMeta(1, 20, 25)).toEqual({
      page: 1,
      limit: 20,
      total: 25,
      totalPages: 2,
    });
  });

  it("returns 0 totalPages for 0 results", () => {
    // "xyznotexist" search, no results
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("handles single result", () => {
    // Exact search "CSCI-UA 101" = 1 result
    expect(buildPaginationMeta(1, 20, 1)).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("works with ~15000 courses (full catalog from design.md)", () => {
    // design.md: ~15,000 course offerings per semester
    const meta = buildPaginationMeta(1, 20, 15000);
    expect(meta.totalPages).toBe(750);
  });
});
