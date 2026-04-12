import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buildCourseWhere } from "@/lib/courses";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function getFilters() {
  const [departments, semesters] = await Promise.all([
    prisma.department.findMany({
      where: { courses: { some: {} } },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.courseOffering.findMany({
      select: { semester: true, semesterName: true },
      distinct: ["semester"],
      orderBy: { semester: "desc" },
    }),
  ]);
  return { departments, semesters };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const department = params.department || "";
  const semester = params.semester || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = buildCourseWhere({ q, department, semester });

  const [courses, total, filters] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        department: { select: { code: true, name: true } },
        _count: { select: { reviews: true, offerings: true } },
        reviews: { select: { rating: true, difficulty: true } },
      },
      orderBy: [{ code: "asc" }],
      skip: offset,
      take: limit,
    }),
    prisma.course.count({ where }),
    getFilters(),
  ]);

  const totalPages = Math.ceil(total / limit);

  const results = courses.map((c) => {
    const reviewCount = c._count.reviews;
    const avgRating =
      reviewCount > 0
        ? Math.round(
            (c.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10
          ) / 10
        : null;
    const avgDifficulty =
      reviewCount > 0
        ? Math.round(
            (c.reviews.reduce((s, r) => s + r.difficulty, 0) / reviewCount) * 10
          ) / 10
        : null;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      units: c.minUnits === c.maxUnits ? c.minUnits : `${c.minUnits}-${c.maxUnits}`,
      reviewCount,
      offeringCount: c._count.offerings,
      avgRating,
      avgDifficulty,
    };
  });

  function buildUrl(overrides: Record<string, string>) {
    const base: Record<string, string> = {};
    if (q) base.q = q;
    if (department) base.department = department;
    if (semester) base.semester = semester;
    const merged = { ...base, ...overrides };
    // Remove empty values
    Object.keys(merged).forEach((k) => {
      if (!merged[k]) delete merged[k];
    });
    // Reset page when filters change (unless explicitly setting page)
    if (!overrides.page) delete merged.page;
    const sp = new URLSearchParams(merged);
    return `/search?${sp.toString()}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Search bar */}
      <form action="/search" method="get" className="mb-6">
        <div className="flex gap-2">
          <input
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Search courses..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
          {department && (
            <input type="hidden" name="department" value={department} />
          )}
          {semester && (
            <input type="hidden" name="semester" value={semester} />
          )}
          <button
            type="submit"
            className="rounded-lg bg-purple-700 px-5 py-2.5 text-white font-medium hover:bg-purple-800 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden md:block w-56 shrink-0">
          {/* Department filter */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Department
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              <Link
                href={buildUrl({ department: "" })}
                className={`block text-sm px-2 py-1 rounded ${
                  !department
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All departments
              </Link>
              {filters.departments.map((d) => (
                <Link
                  key={d.code}
                  href={buildUrl({ department: d.code })}
                  className={`block text-sm px-2 py-1 rounded truncate ${
                    department === d.code
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title={d.name}
                >
                  {d.code}
                </Link>
              ))}
            </div>
          </div>

          {/* Semester filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Semester
            </h3>
            <div className="space-y-1">
              <Link
                href={buildUrl({ semester: "" })}
                className={`block text-sm px-2 py-1 rounded ${
                  !semester
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All semesters
              </Link>
              {filters.semesters.map((s) => (
                <Link
                  key={s.semester}
                  href={buildUrl({ semester: s.semester })}
                  className={`block text-sm px-2 py-1 rounded ${
                    semester === s.semester
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {s.semesterName}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-4">
            {total === 0
              ? "No courses found"
              : `${total.toLocaleString()} course${total !== 1 ? "s" : ""} found`}
            {q && (
              <>
                {" "}
                for &quot;<span className="font-medium">{q}</span>&quot;
              </>
            )}
          </p>

          {results.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No courses match your search.</p>
              <p className="mt-2 text-sm">
                Try a different keyword or remove some filters.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-purple-700">
                        {course.code}
                      </span>
                      {course.units && (
                        <span className="text-xs text-gray-400">
                          {course.units} units
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-base text-gray-900 font-medium">
                      {course.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {course.department.name} ({course.department.code})
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {course.avgRating !== null && (
                      <p className="text-sm font-medium text-yellow-600">
                        {course.avgRating} / 5
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {course.reviewCount} review{course.reviewCount !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {course.offeringCount} section{course.offeringCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
