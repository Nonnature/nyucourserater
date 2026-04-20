import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getVerificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  name: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "NYU Course Rater <noreply@nyucourserater.com>",
    to,
    subject: "Verify your NYU Course Rater account",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">NYU Course Rater</h2>
        <p>Hi ${name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">
          This link expires in 24 hours. If you didn't create an account, you can ignore this email.
        </p>
        <p style="color: #999; font-size: 12px;">
          Or copy this URL: ${verifyUrl}
        </p>
      </div>
    `,
  });
}
