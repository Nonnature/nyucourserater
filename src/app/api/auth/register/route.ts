import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isNyuEmail } from "@/lib/auth";
import {
  generateVerificationToken,
  getVerificationExpiry,
  sendVerificationEmail,
} from "@/lib/email";

const VALID_PROGRAM_LEVELS = ["UNDERGRADUATE", "MASTERS"] as const;
const ENROLLMENT_PATTERN = /^(Fall|Spring)\s+\d{4}$/;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, name, programLevel, enrollmentSemester } = body as {
    email?: string;
    password?: string;
    name?: string;
    programLevel?: string;
    enrollmentSemester?: string;
  };

  if (!email || !password || !name || !programLevel || !enrollmentSemester) {
    return NextResponse.json(
      { error: "All fields are required: email, password, name, programLevel, enrollmentSemester" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Only @nyu.edu emails allowed
  if (!isNyuEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Only @nyu.edu email addresses are accepted" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
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

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = generateVerificationToken();
  const verificationTokenExpires = getVerificationExpiry();

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      isVerified: false,
      programLevel: programLevel as "UNDERGRADUATE" | "MASTERS",
      enrollmentSemester,
      verificationToken,
      verificationTokenExpires,
    },
  });

  // Send verification email (non-blocking — don't fail registration if email fails)
  try {
    await sendVerificationEmail(normalizedEmail, verificationToken, name.trim());
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
    },
    { status: 201 }
  );
}
