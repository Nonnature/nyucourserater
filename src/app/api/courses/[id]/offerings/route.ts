import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { groupOfferingsBySemester } from "@/lib/offerings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const offerings = await prisma.courseOffering.findMany({
    where: { courseId: id },
    include: {
      instructor: { select: { name: true } },
    },
    orderBy: [{ semester: "desc" }, { sectionCode: "asc" }],
  });

  return NextResponse.json({
    courseId: id,
    semesters: groupOfferingsBySemester(offerings),
  });
}
