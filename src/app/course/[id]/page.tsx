import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { groupOfferingsBySemester } from "@/lib/offerings";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

async function getCourse(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      department: {
        select: { code: true, name: true, school: { select: { name: true } } },
      },
      _count: { select: { reviews: true, gradeReports: true } },
      reviews: {
        select: {
          rating: true,
          difficulty: true,
          workload: true,
          wouldRecommend: true,
        },
      },
    },
  });
}

async function getOfferings(courseId: string) {
  const offerings = await prisma.courseOffering.findMany({
    where: { courseId },
    include: {
      instructor: { select: { name: true } },
    },
    orderBy: [{ semester: "desc" }, { sectionCode: "asc" }],
  });

  return groupOfferingsBySemester(offerings);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-green-100 text-green-700",
    closed: "bg-red-100 text-red-700",
    waitlist: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;
  const [course, semesters] = await Promise.all([
    getCourse(id),
    getOfferings(id),
  ]);

  if (!course) notFound();

  const reviewCount = course._count.reviews;
  const avgRating =
    reviewCount > 0
      ? Math.round(
          (course.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10
        ) / 10
      : null;
  const avgDifficulty =
    reviewCount > 0
      ? Math.round(
          (course.reviews.reduce((s, r) => s + r.difficulty, 0) / reviewCount) *
            10
        ) / 10
      : null;
  const avgWorkload =
    reviewCount > 0
      ? Math.round(
          (course.reviews.reduce((s, r) => s + r.workload, 0) / reviewCount) *
            10
        ) / 10
      : null;
  const recommendRate =
    reviewCount > 0
      ? Math.round(
          (course.reviews.filter((r) => r.wouldRecommend).length /
            reviewCount) *
            100
        )
      : null;

  const units =
    course.minUnits === course.maxUnits
      ? course.minUnits
      : `${course.minUnits}-${course.maxUnits}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-purple-700">
          Home
        </Link>
        {" / "}
        <Link
          href={`/search?department=${course.department.code}`}
          className="hover:text-purple-700"
        >
          {course.department.code}
        </Link>
        {" / "}
        <span className="text-gray-900">{course.code}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          <span className="text-purple-700">{course.code}</span>{" "}
          {course.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>{course.department.school.name}</span>
          <span>·</span>
          <span>{course.department.name}</span>
          {units && (
            <>
              <span>·</span>
              <span>{units} credits</span>
            </>
          )}
        </div>

        {/* Stats row */}
        {reviewCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-6">
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {avgRating}
                <span className="text-sm font-normal text-gray-400"> / 5</span>
              </p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {avgDifficulty}
                <span className="text-sm font-normal text-gray-400"> / 5</span>
              </p>
              <p className="text-xs text-gray-500">Difficulty</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {avgWorkload}
                <span className="text-sm font-normal text-gray-400"> / 5</span>
              </p>
              <p className="text-xs text-gray-500">Workload</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {recommendRate}%
              </p>
              <p className="text-xs text-gray-500">Recommend</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{reviewCount}</p>
              <p className="text-xs text-gray-500">Reviews</p>
            </div>
          </div>
        )}

        {course.description && (
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">
            {course.description}
          </p>
        )}
      </header>

      {/* Grade Distribution placeholder */}
      <section className="mb-8 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Grade Distribution
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {course._count.gradeReports > 0
            ? `Based on ${course._count.gradeReports} reports`
            : "No grade data yet. Be the first to report!"}
        </p>
      </section>

      {/* Reviews placeholder */}
      <section className="mb-8 rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Reviews ({reviewCount})
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {reviewCount > 0
            ? "Reviews will be displayed here."
            : "No reviews yet. Be the first to write one!"}
        </p>
      </section>

      {/* Offerings by semester */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Course Sections ({semesters.reduce((s, sem) => s + sem.sections.length, 0)})
        </h2>

        {semesters.length === 0 ? (
          <p className="text-sm text-gray-400">No sections found.</p>
        ) : (
          <div className="space-y-6">
            {semesters.map((sem) => (
              <div key={sem.semester}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {sem.semesterName}{" "}
                  <span className="font-normal text-gray-400">
                    ({sem.sections.length} sections)
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                        <th className="pb-2 pr-4 font-medium">Section</th>
                        <th className="pb-2 pr-4 font-medium">Type</th>
                        <th className="pb-2 pr-4 font-medium">Instructor</th>
                        <th className="pb-2 pr-4 font-medium">Schedule</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.sections.map((section) => (
                        <tr
                          key={section.id}
                          className="border-b border-gray-100"
                        >
                          <td className="py-2 pr-4 font-medium text-gray-900">
                            {section.sectionCode}
                          </td>
                          <td className="py-2 pr-4 text-gray-500">
                            {section.scheduleType}
                          </td>
                          <td className="py-2 pr-4 text-gray-700">
                            {section.instructor?.name || "TBA"}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">
                            {section.meets || "TBA"}
                          </td>
                          <td className="py-2">
                            <StatusBadge status={section.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
