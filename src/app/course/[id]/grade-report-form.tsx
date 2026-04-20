"use client";

import { useState } from "react";
import { VALID_GRADES } from "@/lib/grades";

interface GradeReportFormProps {
  courseId: string;
  existingReport: {
    id: string;
    grade: string;
    semester: string;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function GradeReportForm({
  courseId,
  existingReport,
  onSaved,
  onCancel,
}: GradeReportFormProps) {
  const [grade, setGrade] = useState(existingReport?.grade || "");
  const [semester, setSemester] = useState(existingReport?.semester || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!grade) {
      setError("Please select a grade");
      return;
    }

    if (!semester) {
      setError("Please select the semester");
      return;
    }

    setLoading(true);

    try {
      let res: Response;

      if (existingReport) {
        res = await fetch(`/api/grades/${existingReport.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade }),
        });
      } else {
        res = await fetch("/api/grades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, grade, semester }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error || data.errors?.[0]?.message || "Failed to save grade"
        );
        setLoading(false);
        return;
      }

      onSaved();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Generate semester options: last 6 semesters
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const semesterOptions: string[] = [];
  let year = currentYear;
  let started = false;

  for (let i = 0; i < 4 && semesterOptions.length < 6; i++) {
    const y = year - i;
    if (!started) {
      if (currentMonth >= 9) {
        semesterOptions.push(`Fall ${y}`);
        semesterOptions.push(`Summer ${y}`);
        semesterOptions.push(`Spring ${y}`);
      } else if (currentMonth >= 5) {
        semesterOptions.push(`Summer ${y}`);
        semesterOptions.push(`Spring ${y}`);
        semesterOptions.push(`Fall ${y - 1}`);
      } else {
        semesterOptions.push(`Spring ${y}`);
        semesterOptions.push(`Fall ${y - 1}`);
        semesterOptions.push(`Summer ${y - 1}`);
      }
      started = true;
    } else {
      // Add remaining past semesters
      if (semesterOptions.length < 6) semesterOptions.push(`Spring ${y}`);
      if (semesterOptions.length < 6) semesterOptions.push(`Fall ${y - 1}`);
    }
  }

  // Deduplicate and take first 6
  const uniqueSemesters = [...new Set(semesterOptions)].slice(0, 6);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-900">
        {existingReport ? "Update Grade Report" : "Report Your Grade"}
      </h3>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="grade"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Grade Received
          </label>
          <select
            id="grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            <option value="">Select grade...</option>
            {VALID_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {!existingReport && (
          <div>
            <label
              htmlFor="semester"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Semester
            </label>
            <select
              id="semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            >
              <option value="">Select semester...</option>
              {uniqueSemesters.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-purple-700 px-6 py-2 text-sm font-medium text-white hover:bg-purple-800 transition-colors disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : existingReport
              ? "Update Grade"
              : "Submit Grade"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
