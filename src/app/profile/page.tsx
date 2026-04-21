import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { mapMyReview, mapMyGrade } from "@/lib/profile";
import ProfileTabs from "./profile-tabs";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const userId = session.user.id;

  const [user, reviews, grades] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        isVerified: true,
        programLevel: true,
        enrollmentSemester: true,
      },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            department: { select: { code: true, name: true } },
          },
        },
        votes: { select: { vote: true } },
      },
    }),
    prisma.gradeReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            department: { select: { code: true, name: true } },
          },
        },
      },
    }),
  ]);

  if (!user) {
    redirect("/login?callbackUrl=/profile");
  }

  const initials =
    user.name
      ?.split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || user.email?.[0].toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center gap-4">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name || "avatar"}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-lg font-semibold text-purple-700">
            {initials}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {user.name || "Unnamed user"}
            {user.isVerified ? (
              <span className="ml-2 inline-block rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 align-middle">
                NYU Verified
              </span>
            ) : (
              <Link
                href="/verify-email"
                className="ml-2 inline-block rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 align-middle hover:bg-yellow-200"
              >
                Verify Email
              </Link>
            )}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.enrollmentSemester && (
            <p className="mt-1 text-xs text-gray-500">
              {user.programLevel === "MASTERS" ? "Masters" : "Undergraduate"} ·
              Enrolled {user.enrollmentSemester}
            </p>
          )}
        </div>
      </header>

      <ProfileTabs
        reviews={reviews.map(mapMyReview)}
        grades={grades.map(mapMyGrade)}
      />
    </div>
  );
}
