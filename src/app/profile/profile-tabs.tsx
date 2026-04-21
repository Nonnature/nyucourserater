"use client";

import { useState } from "react";
import Link from "next/link";
import type { MyReviewResponse, MyGradeResponse } from "@/lib/profile";

interface Props {
  reviews: MyReviewResponse[];
  grades: MyGradeResponse[];
}

type Tab = "reviews" | "grades";

export default function ProfileTabs({ reviews, grades }: Props) {
  const [tab, setTab] = useState<Tab>("reviews");

  return (
    <div>
      <div className="mb-6 border-b border-gray-200 flex gap-6">
        <TabButton
          active={tab === "reviews"}
          onClick={() => setTab("reviews")}
          label={`My Reviews (${reviews.length})`}
        />
        <TabButton
          active={tab === "grades"}
          onClick={() => setTab("grades")}
          label={`My Grades (${grades.length})`}
        />
      </div>

      {tab === "reviews" ? (
        <ReviewsList reviews={reviews} />
      ) : (
        <GradesList grades={grades} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-purple-700 text-purple-700"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function ReviewsList({ reviews }: { reviews: MyReviewResponse[] }) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        You haven&apos;t written any reviews yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-gray-200 p-4 hover:border-purple-300 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Link
                href={`/course/${r.course.id}`}
                className="inline-block font-medium text-gray-900 hover:text-purple-700"
              >
                <span className="text-purple-700">{r.course.code}</span>{" "}
                {r.course.name}
              </Link>
              <p className="mt-0.5 text-xs text-gray-500">
                {r.course.departmentName} · {r.semesterTaken}
              </p>
            </div>
            <div className="flex items-center gap-1 text-yellow-500">
              {"★".repeat(r.rating)}
              <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
            {r.comment}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>Difficulty: {r.difficulty}/5</span>
            <span>Workload: {r.workload}/5</span>
            <span>
              {r.wouldRecommend ? "Would recommend" : "Would not recommend"}
            </span>
            <span>Score: {r.netScore >= 0 ? `+${r.netScore}` : r.netScore}</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Updated {new Date(r.updatedAt).toLocaleDateString()}
            </span>
            <Link
              href={`/course/${r.course.id}#reviews`}
              className="text-purple-700 hover:text-purple-900 font-medium"
            >
              Edit / Delete →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function GradesList({ grades }: { grades: MyGradeResponse[] }) {
  if (grades.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        You haven&apos;t reported any grades yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {grades.map((g) => (
        <li
          key={g.id}
          className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 hover:border-purple-300 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <Link
              href={`/course/${g.course.id}`}
              className="inline-block font-medium text-gray-900 hover:text-purple-700"
            >
              <span className="text-purple-700">{g.course.code}</span>{" "}
              {g.course.name}
            </Link>
            <p className="mt-0.5 text-xs text-gray-500">
              {g.course.departmentName} · {g.semester}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded bg-purple-100 px-3 py-1 text-lg font-bold text-purple-700">
              {g.grade}
            </span>
            <Link
              href={`/course/${g.course.id}#grades`}
              className="text-xs text-purple-700 hover:text-purple-900 font-medium"
            >
              Edit →
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
