import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Verification token is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_token", request.url)
    );
  }

  if (
    user.verificationTokenExpires &&
    user.verificationTokenExpires < new Date()
  ) {
    return NextResponse.redirect(
      new URL("/login?error=token_expired", request.url)
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpires: null,
    },
  });

  return NextResponse.redirect(new URL("/?verified=true", request.url));
}
