import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { mapMyGrade } from "@/lib/profile";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.gradeReport.findMany({
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
    },
  });

  return NextResponse.json({ grades: reports.map(mapMyGrade) });
}
