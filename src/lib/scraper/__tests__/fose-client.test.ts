import { computeSrcdb, parseSrcdb, getActiveSemesters } from "../fose-client";

// ─── computeSrcdb ───────────────────────────────────────
// Encoding rule from design.md: srcdb = 1200 + (year - 2020) * 10 + termOffset
// Term offsets: january=2, spring=4, summer=6, fall=8

describe("computeSrcdb", () => {
  it("computes Fall 2024 → 1248", () => {
    // design.md table: Fall 2024 = 1248
    expect(computeSrcdb(2024, "fall")).toBe("1248");
  });

  it("computes Spring 2025 → 1254", () => {
    // design.md table: Spring 2025 = 1254
    expect(computeSrcdb(2025, "spring")).toBe("1254");
  });

  it("computes Summer 2025 → 1256", () => {
    // design.md table: Summer 2025 = 1256
    expect(computeSrcdb(2025, "summer")).toBe("1256");
  });

  it("computes Fall 2025 → 1258", () => {
    // design.md table: Fall 2025 = 1258
    expect(computeSrcdb(2025, "fall")).toBe("1258");
  });

  it("computes January 2026 → 1262", () => {
    // design.md table: January 2026 = 1262
    expect(computeSrcdb(2026, "january")).toBe("1262");
  });

  it("computes Spring 2026 → 1264", () => {
    // design.md table: Spring 2026 = 1264
    expect(computeSrcdb(2026, "spring")).toBe("1264");
  });

  it("computes Summer 2026 → 1266", () => {
    // design.md table: Summer 2026 = 1266
    expect(computeSrcdb(2026, "summer")).toBe("1266");
  });

  it("computes Fall 2026 → 1268", () => {
    // design.md table: Fall 2026 = 1268
    expect(computeSrcdb(2026, "fall")).toBe("1268");
  });

  it("computes January 2025 → 1252", () => {
    // design.md table: January 2025 = 1252
    expect(computeSrcdb(2025, "january")).toBe("1252");
  });
});

// ─── parseSrcdb ─────────────────────────────────────────

describe("parseSrcdb", () => {
  it("parses 1268 → Fall 2026", () => {
    const result = parseSrcdb("1268");
    expect(result).toEqual({
      srcdb: "1268",
      name: "Fall 2026",
      year: 2026,
      term: "fall",
    });
  });

  it("parses 1264 → Spring 2026", () => {
    const result = parseSrcdb("1264");
    expect(result).toEqual({
      srcdb: "1264",
      name: "Spring 2026",
      year: 2026,
      term: "spring",
    });
  });

  it("parses 1266 → Summer 2026", () => {
    const result = parseSrcdb("1266");
    expect(result).toEqual({
      srcdb: "1266",
      name: "Summer 2026",
      year: 2026,
      term: "summer",
    });
  });

  it("parses 1262 → January 2026", () => {
    const result = parseSrcdb("1262");
    expect(result).toEqual({
      srcdb: "1262",
      name: "January 2026",
      year: 2026,
      term: "january",
    });
  });

  it("parses 1248 → Fall 2024", () => {
    const result = parseSrcdb("1248");
    expect(result).toEqual({
      srcdb: "1248",
      name: "Fall 2024",
      year: 2024,
      term: "fall",
    });
  });

  it("roundtrips: computeSrcdb → parseSrcdb", () => {
    const srcdb = computeSrcdb(2025, "spring");
    const info = parseSrcdb(srcdb);
    expect(info.year).toBe(2025);
    expect(info.term).toBe("spring");
    expect(info.name).toBe("Spring 2025");
  });

  it("throws on unknown offset", () => {
    // srcdb ending in 0 is not a valid term
    expect(() => parseSrcdb("1260")).toThrow("Unknown srcdb offset");
  });
});

// ─── getActiveSemesters ─────────────────────────────────
// design.md §8: "根据当前日期计算当前学期和下一学期"

describe("getActiveSemesters", () => {
  it("Jan → January term + Spring", () => {
    const date = new Date("2026-01-15");
    const semesters = getActiveSemesters(date);
    expect(semesters).toHaveLength(2);
    expect(semesters[0].term).toBe("january");
    expect(semesters[0].name).toBe("January 2026");
    expect(semesters[1].term).toBe("spring");
    expect(semesters[1].name).toBe("Spring 2026");
  });

  it("Mar (Feb-Apr) → Spring + Summer", () => {
    const date = new Date("2026-03-15");
    const semesters = getActiveSemesters(date);
    expect(semesters).toHaveLength(2);
    expect(semesters[0].term).toBe("spring");
    expect(semesters[0].srcdb).toBe("1264");
    expect(semesters[1].term).toBe("summer");
    expect(semesters[1].srcdb).toBe("1266");
  });

  it("Jul (May-Aug) → Summer + Fall", () => {
    const date = new Date("2026-07-01");
    const semesters = getActiveSemesters(date);
    expect(semesters).toHaveLength(2);
    expect(semesters[0].term).toBe("summer");
    expect(semesters[0].srcdb).toBe("1266");
    expect(semesters[1].term).toBe("fall");
    expect(semesters[1].srcdb).toBe("1268");
  });

  it("Oct (Sep-Dec) → Fall + next Spring", () => {
    const date = new Date("2026-10-15");
    const semesters = getActiveSemesters(date);
    expect(semesters).toHaveLength(2);
    expect(semesters[0].term).toBe("fall");
    expect(semesters[0].srcdb).toBe("1268");
    expect(semesters[1].term).toBe("spring");
    expect(semesters[1].year).toBe(2027);
  });

  it("Apr 12 2026 (current date) → Spring 2026 + Summer 2026", () => {
    // This matches what the sync script actually ran
    const date = new Date("2026-04-12");
    const semesters = getActiveSemesters(date);
    expect(semesters[0].srcdb).toBe("1264");
    expect(semesters[0].name).toBe("Spring 2026");
    expect(semesters[1].srcdb).toBe("1266");
    expect(semesters[1].name).toBe("Summer 2026");
  });
});
