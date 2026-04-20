import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const VALID_PROGRAM_LEVELS = ["UNDERGRADUATE", "MASTERS"] as const;
const ENROLLMENT_PATTERN = /^(Fall|Spring)\s+\d{4}$/;

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { programLevel, enrollmentSemester } = body as {
    programLevel?: string;
    enrollmentSemester?: string;
  };

  if (!programLevel || !enrollmentSemester) {
    return NextResponse.json(
      { error: "programLevel and enrollmentSemester are required" },
      { status: 400 }
    );
  }

  if (
    !VALID_PROGRAM_LEVELS.includes(
      programLevel as (typeof VALID_PROGRAM_LEVELS)[number]
    )
  ) {
    return NextResponse.json(
      { error: "Program level must be UNDERGRADUATE or MASTERS" },
      { status: 400 }
    );
  }

  if (!ENROLLMENT_PATTERN.test(enrollmentSemester)) {
    return NextResponse.json(
      { error: "Enrollment semester must be in format 'Fall 2025' or 'Spring 2026'" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { enrollmentEditsRemaining: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.enrollmentEditsRemaining <= 0) {
    return NextResponse.json(
      { error: "No enrollment edits remaining" },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      programLevel: programLevel as "UNDERGRADUATE" | "MASTERS",
      enrollmentSemester,
      enrollmentEditsRemaining: { decrement: 1 },
    },
    select: {
      programLevel: true,
      enrollmentSemester: true,
      enrollmentEditsRemaining: true,
    },
  });

  return NextResponse.json(updated);
}
