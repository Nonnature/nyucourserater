import { groupOfferingsBySemester } from "../offerings";

describe("groupOfferingsBySemester", () => {
  it("groups sections by semester", () => {
    // Simulate CSCI-UA 101 offerings across Spring 2026 (1264) and Summer 2026 (1266)
    const offerings = [
      { semester: "1264", semesterName: "Spring 2026", sectionCode: "001", scheduleType: "LEC" },
      { semester: "1264", semesterName: "Spring 2026", sectionCode: "002", scheduleType: "LEC" },
      { semester: "1264", semesterName: "Spring 2026", sectionCode: "003", scheduleType: "REC" },
      { semester: "1266", semesterName: "Summer 2026", sectionCode: "001", scheduleType: "LEC" },
    ];

    const result = groupOfferingsBySemester(offerings);
    expect(result).toHaveLength(2);

    const spring = result.find((s) => s.semester === "1264")!;
    expect(spring.semesterName).toBe("Spring 2026");
    expect(spring.sections).toHaveLength(3);

    const summer = result.find((s) => s.semester === "1266")!;
    expect(summer.semesterName).toBe("Summer 2026");
    expect(summer.sections).toHaveLength(1);
  });

  it("returns empty array for no offerings", () => {
    expect(groupOfferingsBySemester([])).toEqual([]);
  });

  it("returns single group when all offerings are same semester", () => {
    const offerings = [
      { semester: "1268", semesterName: "Fall 2026", sectionCode: "001" },
      { semester: "1268", semesterName: "Fall 2026", sectionCode: "002" },
    ];
    const result = groupOfferingsBySemester(offerings);
    expect(result).toHaveLength(1);
    expect(result[0].sections).toHaveLength(2);
  });

  it("preserves order of first occurrence", () => {
    // If offerings come sorted desc by semester, groups should preserve that order
    const offerings = [
      { semester: "1266", semesterName: "Summer 2026" },
      { semester: "1264", semesterName: "Spring 2026" },
      { semester: "1266", semesterName: "Summer 2026" },
    ];
    const result = groupOfferingsBySemester(offerings);
    expect(result[0].semester).toBe("1266");
    expect(result[1].semester).toBe("1264");
  });
});
