import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canWrite } from "@/lib/access";
import { validateGradeInput } from "@/lib/grades";

export async function POST(request: NextRequest) {
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
      { error: "You must verify your email before reporting grades" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const errors = validateGradeInput(body);
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Verify course exists
  const course = await prisma.course.findUnique({
    where: { id: body.courseId },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Check for duplicate
  const existing = await prisma.gradeReport.findUnique({
    where: {
      userId_courseId_semester: {
        userId: session.user.id,
        courseId: body.courseId,
        semester: body.semester,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already reported a grade for this course and semester" },
      { status: 409 }
    );
  }

  const gradeReport = await prisma.gradeReport.create({
    data: {
      userId: session.user.id,
      courseId: body.courseId,
      grade: body.grade,
      semester: body.semester,
    },
  });

  return NextResponse.json(
    {
      id: gradeReport.id,
      grade: gradeReport.grade,
      semester: gradeReport.semester,
      courseId: gradeReport.courseId,
      createdAt: gradeReport.createdAt,
    },
    { status: 201 }
  );
}
