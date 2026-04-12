import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getPopularCourses() {
  const courses = await prisma.course.findMany({
    include: {
      department: { select: { code: true, name: true } },
      _count: { select: { reviews: true, offerings: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { offerings: { _count: "desc" } },
    take: 8,
  });

  return courses.map((c) => {
    const reviewCount = c._count.reviews;
    const avgRating =
      reviewCount > 0
        ? Math.round(
            (c.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10
          ) / 10
        : null;
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      reviewCount,
      offeringCount: c._count.offerings,
      avgRating,
    };
  });
}

async function getStats() {
  const [courses, offerings] = await Promise.all([
    prisma.course.count(),
    prisma.courseOffering.count(),
  ]);
  return { courses, offerings };
}

export default async function Home() {
  const [popular, stats] = await Promise.all([
    getPopularCourses(),
    getStats(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero + Search */}
      <section className="py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          NYU Course Rater
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          Search {stats.courses.toLocaleString()} courses and{" "}
          {stats.offerings.toLocaleString()} sections across NYU
        </p>

        <form action="/search" method="get" className="mt-8 mx-auto max-w-xl">
          <div className="flex gap-2">
            <input
              name="q"
              type="text"
              placeholder="Search courses, e.g. &quot;CSCI-UA 101&quot; or &quot;Intro to Computer Science&quot;"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              type="submit"
              className="rounded-lg bg-purple-700 px-6 py-3 text-white font-medium hover:bg-purple-800 transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      {/* Popular Courses */}
      <section className="pb-16">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Popular Courses
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popular.map((course) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="block rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-medium text-purple-700">
                {course.code}
              </p>
              <p className="mt-1 text-sm text-gray-900 font-medium line-clamp-2">
                {course.name}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {course.department.name}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>{course.offeringCount} sections</span>
                {course.avgRating !== null && (
                  <span className="text-yellow-600">
                    {course.avgRating} / 5
                  </span>
                )}
                {course.reviewCount > 0 && (
                  <span>{course.reviewCount} reviews</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
