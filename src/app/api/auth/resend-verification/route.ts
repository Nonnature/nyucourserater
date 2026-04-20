import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  generateVerificationToken,
  getVerificationExpiry,
  sendVerificationEmail,
} from "@/lib/email";

export async function POST() {
  const session = await getSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.isVerified) {
    return NextResponse.json(
      { error: "Email is already verified" },
      { status: 400 }
    );
  }

  // Rate limit: reject if token was set less than 2 minutes ago
  if (user.verificationTokenExpires) {
    const tokenSetAt =
      user.verificationTokenExpires.getTime() - 24 * 60 * 60 * 1000;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    if (tokenSetAt > twoMinutesAgo) {
      return NextResponse.json(
        { error: "Please wait before requesting another verification email" },
        { status: 429 }
      );
    }
  }

  const verificationToken = generateVerificationToken();
  const verificationTokenExpires = getVerificationExpiry();

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken, verificationTokenExpires },
  });

  await sendVerificationEmail(
    user.email,
    verificationToken,
    user.name || "User"
  );

  return NextResponse.json({ message: "Verification email sent" });
}
