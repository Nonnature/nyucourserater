"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getEnrollmentSemesterOptions } from "@/lib/semester";

const semesterOptions = getEnrollmentSemesterOptions();

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [programLevel, setProgramLevel] = useState("");
  const [enrollmentSemester, setEnrollmentSemester] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!programLevel || !enrollmentSemester) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/me/enrollment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programLevel, enrollmentSemester }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save enrollment info");
        setLoading(false);
        return;
      }

      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
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
          You need to be signed in to complete onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
        Welcome, {session?.user?.name}!
      </h1>
      <p className="text-center text-gray-500 mb-8">
        Tell us about your enrollment to get started.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

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
            The semester you first enrolled at NYU. You can change this once if
            needed.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-purple-700 py-2.5 text-sm font-medium text-white hover:bg-purple-800 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
