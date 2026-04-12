/**
 * Group offerings by semester.
 */
export function groupOfferingsBySemester<
  T extends { semester: string; semesterName: string },
>(offerings: T[]): { semester: string; semesterName: string; sections: T[] }[] {
  const map = new Map<
    string,
    { semester: string; semesterName: string; sections: T[] }
  >();

  for (const o of offerings) {
    let group = map.get(o.semester);
    if (!group) {
      group = {
        semester: o.semester,
        semesterName: o.semesterName,
        sections: [],
      };
      map.set(o.semester, group);
    }
    group.sections.push(o);
  }

  return [...map.values()];
}
