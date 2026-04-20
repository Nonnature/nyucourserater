import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canViewReviews } from "@/lib/access";
import { validateReviewInput } from "@/lib/reviews";
import { canWrite } from "@/lib/access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: courseId } = await params;
  const session = await getSession();

  // Access control: check if user can view reviews
  const user = session?.user
    ? {
        id: session.user.id,
        isVerified: session.user.isVerified,
        enrollmentSemester: session.user.enrollmentSemester ?? null,
      }
    : null;

  const hasAccess = await canViewReviews(user);
  if (!hasAccess) {
    return NextResponse.json(
      { restricted: true, message: "You don't have access to view reviews" },
      { status: 403 }
    );
  }

  // Verify course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const reviews = await prisma.review.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true, isVerified: true } },
      votes: { select: { userId: true, vote: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map reviews with vote counts and current user's vote
  const mapped = reviews
    .map((r) => {
      const upvotes = r.votes.filter((v) => v.vote === "UP").length;
      const downvotes = r.votes.filter((v) => v.vote === "DOWN").length;
      const userVote = session?.user
        ? r.votes.find((v) => v.userId === session.user.id)?.vote ?? null
        : null;

      return {
        id: r.id,
        rating: r.rating,
        difficulty: r.difficulty,
        workload: r.workload,
        comment: r.comment,
        wouldRecommend: r.wouldRecommend,
        semesterTaken: r.semesterTaken,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        user: {
          id: r.user.id,
          name: r.user.name,
          isVerified: r.user.isVerified,
        },
        upvotes,
        downvotes,
        netScore: upvotes - downvotes,
        userVote,
        isOwner: session?.user?.id === r.user.id,
      };
    })
    // Sort by net score descending, then by createdAt descending
    .sort((a, b) => b.netScore - a.netScore || b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json({ reviews: mapped });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: courseId } = await params;
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = {
    id: session.user.id,
    isVerified: session.user.isVerified,
    enrollmentSemester: session.user.enrollmentSemester ?? null,
  };

  if (!canWrite(user)) {
    return NextResponse.json(
      { error: "You must verify your email before writing reviews" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const input = { ...body, courseId };

  const errors = validateReviewInput(input);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Verify course exists
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Check for duplicate
  const existing = await prisma.review.findUnique({
    where: {
      userId_courseId_semesterTaken: {
        userId: session.user.id,
        courseId,
        semesterTaken: input.semesterTaken,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already reviewed this course for this semester" },
      { status: 409 }
    );
  }

  const review = await prisma.review.create({
    data: {
      userId: session.user.id,
      courseId,
      offeringId: input.offeringId || null,
      rating: input.rating,
      difficulty: input.difficulty,
      workload: input.workload,
      comment: input.comment.trim(),
      wouldRecommend: input.wouldRecommend,
      semesterTaken: input.semesterTaken,
    },
    include: {
      user: { select: { id: true, name: true, isVerified: true } },
    },
  });

  return NextResponse.json(
    {
      id: review.id,
      rating: review.rating,
      difficulty: review.difficulty,
      workload: review.workload,
      comment: review.comment,
      wouldRecommend: review.wouldRecommend,
      semesterTaken: review.semesterTaken,
      createdAt: review.createdAt,
      user: review.user,
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      userVote: null,
      isOwner: true,
    },
    { status: 201 }
  );
}
