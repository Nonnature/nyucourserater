import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { VALID_GRADES, ValidGrade } from "@/lib/grades";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gradeReport = await prisma.gradeReport.findUnique({
    where: { id },
  });

  if (!gradeReport) {
    return NextResponse.json({ error: "Grade report not found" }, { status: 404 });
  }

  if (gradeReport.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.grade || !VALID_GRADES.includes(body.grade as ValidGrade)) {
    return NextResponse.json(
      { error: `Invalid grade. Must be one of: ${VALID_GRADES.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await prisma.gradeReport.update({
    where: { id },
    data: { grade: body.grade },
  });

  return NextResponse.json({
    id: updated.id,
    grade: updated.grade,
    semester: updated.semester,
    courseId: updated.courseId,
    createdAt: updated.createdAt,
  });
}
