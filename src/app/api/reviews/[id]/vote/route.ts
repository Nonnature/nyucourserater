import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getVoteCounts(reviewId: string, userId?: string) {
  const votes = await prisma.reviewVote.findMany({
    where: { reviewId },
    select: { userId: true, vote: true },
  });

  const upvotes = votes.filter((v) => v.vote === "UP").length;
  const downvotes = votes.filter((v) => v.vote === "DOWN").length;
  const userVote = userId
    ? votes.find((v) => v.userId === userId)?.vote ?? null
    : null;

  return { upvotes, downvotes, netScore: upvotes - downvotes, userVote };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: reviewId } = await params;
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { vote } = body as { vote?: string };

  if (vote !== "UP" && vote !== "DOWN") {
    return NextResponse.json(
      { error: "Vote must be UP or DOWN" },
      { status: 400 }
    );
  }

  // Verify review exists
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Can't vote on own review
  if (review.userId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot vote on your own review" },
      { status: 400 }
    );
  }

  // Upsert: create or update vote
  await prisma.reviewVote.upsert({
    where: {
      userId_reviewId: {
        userId: session.user.id,
        reviewId,
      },
    },
    create: {
      userId: session.user.id,
      reviewId,
      vote,
    },
    update: { vote },
  });

  const counts = await getVoteCounts(reviewId, session.user.id);
  return NextResponse.json(counts);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: reviewId } = await params;
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete vote if it exists
  await prisma.reviewVote.deleteMany({
    where: {
      userId: session.user.id,
      reviewId,
    },
  });

  const counts = await getVoteCounts(reviewId, session.user.id);
  return NextResponse.json(counts);
}
