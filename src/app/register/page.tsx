"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { getEnrollmentSemesterOptions } from "@/lib/semester";

const semesterOptions = getEnrollmentSemesterOptions();

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [programLevel, setProgramLevel] = useState("");
  const [enrollmentSemester, setEnrollmentSemester] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side NYU email check
    if (!email.toLowerCase().trim().endsWith("@nyu.edu")) {
      setError("Only @nyu.edu email addresses are accepted");
      return;
    }

    if (!programLevel) {
      setError("Please select your program level");
      return;
    }

    if (!enrollmentSemester) {
      setError("Please select your enrollment semester");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          programLevel,
          enrollmentSemester,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto sign in then redirect to verify-email page
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      window.location.href = "/verify-email";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">
        Create Account
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Display Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="Your name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="you@nyu.edu"
          />
          <p className="mt-1 text-xs text-gray-500">
            Only @nyu.edu emails are accepted
          </p>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label
            htmlFor="programLevel"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Program Level
          </label>
          <select
            id="programLevel"
            required
            value={programLevel}
            onChange={(e) => setProgramLevel(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="">Select program...</option>
            <option value="UNDERGRADUATE">Undergraduate</option>
            <option value="MASTERS">Masters</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="enrollmentSemester"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enrollment Semester
          </label>
          <select
            id="enrollmentSemester"
            required
            value={enrollmentSemester}
            onChange={(e) => setEnrollmentSemester(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="">Select semester...</option>
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            The semester you first enrolled at NYU. You can change this once if needed.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-purple-700 py-2.5 text-sm font-medium text-white hover:bg-purple-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <>
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Continue with Google
          </button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-purple-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
