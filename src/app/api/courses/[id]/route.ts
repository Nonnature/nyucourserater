import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      department: {
        select: { code: true, name: true, school: { select: { name: true } } },
      },
      _count: { select: { reviews: true, offerings: true, gradeReports: true } },
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

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

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

  return NextResponse.json({
    id: course.id,
    code: course.code,
    name: course.name,
    description: course.description,
    department: course.department,
    units:
      course.minUnits === course.maxUnits
        ? course.minUnits
        : `${course.minUnits}-${course.maxUnits}`,
    stats: {
      reviewCount,
      offeringCount: course._count.offerings,
      gradeReportCount: course._count.gradeReports,
      avgRating,
      avgDifficulty,
      avgWorkload,
      recommendRate,
    },
  });
}
