"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function VerifyEmailPage() {
  const { data: session, status } = useSession();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleResend() {
    setSending(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to resend email");
      } else {
        setMessage("Verification email sent! Check your inbox.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 mx-auto rounded bg-gray-200 mb-4" />
          <div className="h-4 w-64 mx-auto rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Please sign in
        </h1>
        <p className="text-gray-500">
          You need to be signed in to verify your email.
        </p>
      </div>
    );
  }

  if (session?.user?.isVerified) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Email Verified
        </h1>
        <p className="text-gray-500">
          Your email has been verified. You&apos;re all set!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
        <svg
          className="h-6 w-6 text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Check Your Email
      </h1>
      <p className="text-gray-500 mb-1">
        We sent a verification link to
      </p>
      <p className="font-medium text-gray-900 mb-6">
        {session?.user?.email}
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Click the link in the email to verify your account. The link expires in
        24 hours.
      </p>

      {message && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={sending}
        className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {sending ? "Sending..." : "Resend Verification Email"}
      </button>
    </div>
  );
}
