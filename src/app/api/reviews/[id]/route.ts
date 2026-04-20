import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateReviewInput } from "@/lib/reviews";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const review = await prisma.review.findUnique({
    where: { id },
    select: { userId: true, courseId: true },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.userId !== session.user.id) {
    return NextResponse.json(
      { error: "You can only edit your own reviews" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const input = { ...body, courseId: review.courseId };

  const errors = validateReviewInput(input);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
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

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const review = await prisma.review.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.userId !== session.user.id) {
    return NextResponse.json(
      { error: "You can only delete your own reviews" },
      { status: 403 }
    );
  }

  await prisma.review.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
