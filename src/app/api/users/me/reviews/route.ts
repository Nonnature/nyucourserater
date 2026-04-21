import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { mapMyReview } from "@/lib/profile";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviews = await prisma.review.findMany({
    where: { userId: session.user.id },
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
  });

  return NextResponse.json({ reviews: reviews.map(mapMyReview) });
}
