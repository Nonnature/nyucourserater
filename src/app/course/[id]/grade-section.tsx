"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import GradeReportForm from "./grade-report-form";

interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface UserReport {
  id: string;
  grade: string;
  semester: string;
}

interface GradeSectionProps {
  courseId: string;
  gradeCount: number;
}

const BAR_COLORS: Record<string, string> = {
  A: "bg-green-500",
  "A-": "bg-green-400",
  "B+": "bg-lime-500",
  B: "bg-lime-400",
  "B-": "bg-yellow-400",
  "C+": "bg-yellow-500",
  C: "bg-orange-400",
  "C-": "bg-orange-500",
  "D+": "bg-red-300",
  D: "bg-red-400",
  F: "bg-red-600",
  W: "bg-gray-400",
  P: "bg-blue-400",
  INC: "bg-gray-300",
};

function GradeBar({
  grade,
  count,
  percentage,
  maxPercentage,
}: {
  grade: string;
  count: number;
  percentage: number;
  maxPercentage: number;
}) {
  const width = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-8 text-right font-medium text-gray-700">{grade}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
        <div
          className={`h-full rounded ${BAR_COLORS[grade] || "bg-gray-400"} transition-all duration-300`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-16 text-right text-gray-500">
        {percentage}% ({count})
      </span>
    </div>
  );
}

export default function GradeSection({
  courseId,
  gradeCount: initialCount,
}: GradeSectionProps) {
  const { data: session, status } = useSession();
  const [distribution, setDistribution] = useState<GradeDistribution[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [userReport, setUserReport] = useState<UserReport[] | null>(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchGrades = useCallback(
    async (semester?: string, instructor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (semester) params.set("semester", semester);
        if (instructor) params.set("instructor", instructor);
        const qs = params.toString();

        const res = await fetch(
          `/api/courses/${courseId}/grades${qs ? `?${qs}` : ""}`
        );

        if (res.status === 403) {
          const data = await res.json();
          setRestricted(true);
          setRestrictionMessage(data.message || "Access restricted");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setDistribution(data.distribution);
          setTotal(data.total);
          setSemesters(data.semesters);
          setInstructors(data.instructors);
          setUserReport(data.userReport);
          setRestricted(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    if (status !== "loading") {
      fetchGrades();
    }
  }, [status, fetchGrades]);

  function handleFilterChange(semester: string, instructor: string) {
    setSelectedSemester(semester);
    setSelectedInstructor(instructor);
    fetchGrades(semester || undefined, instructor || undefined);
  }

  function handleReportSaved() {
    setShowForm(false);
    fetchGrades(
      selectedSemester || undefined,
      selectedInstructor || undefined
    );
  }

  const maxPercentage = Math.max(...distribution.map((d) => d.percentage), 0);

  if (loading && status === "loading") {
    return (
      <section className="mb-8 rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 rounded bg-gray-200" />
          <div className="h-48 rounded bg-gray-200" />
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Grade Distribution
        </h2>
        {status === "authenticated" && session?.user?.isVerified && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-purple-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-800 transition-colors"
          >
            Report Grade
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <GradeReportForm
            courseId={courseId}
            existingReport={userReport?.[0] ?? null}
            onSaved={handleReportSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {restricted && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">{restrictionMessage}</p>
          {status === "unauthenticated" && (
            <Link
              href="/login"
              className="text-sm text-purple-700 hover:underline"
            >
              Sign in to view grade distributions
            </Link>
          )}
          {status === "authenticated" && !session?.user?.isVerified && (
            <Link
              href="/verify-email"
              className="text-sm text-purple-700 hover:underline"
            >
              Verify your email to view grade distributions
            </Link>
          )}
          {status === "authenticated" && session?.user?.isVerified && (
            <p className="text-sm text-gray-500">
              Upload at least one grade report to unlock grade distributions
            </p>
          )}
        </div>
      )}

      {!restricted && !loading && total === 0 && !showForm && (
        <p className="text-sm text-gray-400">
          No grade data yet. Be the first to report!
        </p>
      )}

      {!restricted && loading && (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 rounded bg-gray-100" />
          ))}
        </div>
      )}

      {!restricted && !loading && total > 0 && (
        <>
          {/* Filters */}
          {(semesters.length > 1 || instructors.length > 0) && (
            <div className="flex flex-wrap gap-3 mb-4">
              {semesters.length > 1 && (
                <select
                  value={selectedSemester}
                  onChange={(e) =>
                    handleFilterChange(e.target.value, selectedInstructor)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">All Semesters</option>
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
              {instructors.length > 0 && (
                <select
                  value={selectedInstructor}
                  onChange={(e) =>
                    handleFilterChange(selectedSemester, e.target.value)
                  }
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">All Instructors</option>
                  {instructors.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Bar chart */}
          <div className="space-y-1.5">
            {distribution.map((d) => (
              <GradeBar
                key={d.grade}
                grade={d.grade}
                count={d.count}
                percentage={d.percentage}
                maxPercentage={maxPercentage}
              />
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Based on {total} report{total !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </section>
  );
}
