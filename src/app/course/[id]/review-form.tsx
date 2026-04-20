"use client";

import { useState } from "react";

interface ReviewFormProps {
  courseId: string;
  editingReview: {
    id: string;
    rating: number;
    difficulty: number;
    workload: number;
    comment: string;
    wouldRecommend: boolean;
    semesterTaken: string;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
              n <= value
                ? "bg-purple-700 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewForm({
  courseId,
  editingReview,
  onSaved,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(editingReview?.rating || 0);
  const [difficulty, setDifficulty] = useState(editingReview?.difficulty || 0);
  const [workload, setWorkload] = useState(editingReview?.workload || 0);
  const [comment, setComment] = useState(editingReview?.comment || "");
  const [wouldRecommend, setWouldRecommend] = useState(
    editingReview?.wouldRecommend ?? true
  );
  const [semesterTaken, setSemesterTaken] = useState(
    editingReview?.semesterTaken || ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (rating === 0 || difficulty === 0 || workload === 0) {
      setError("Please rate all fields");
      return;
    }

    if (comment.trim().length < 5) {
      setError("Comment must be at least 5 characters");
      return;
    }

    if (!semesterTaken) {
      setError("Please select the semester you took this course");
      return;
    }

    setLoading(true);

    try {
      const body = {
        rating,
        difficulty,
        workload,
        comment: comment.trim(),
        wouldRecommend,
        semesterTaken,
      };

      let res: Response;

      if (editingReview) {
        res = await fetch(`/api/reviews/${editingReview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/courses/${courseId}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error || data.errors?.[0]?.message || "Failed to save review"
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-gray-900">
        {editingReview ? "Edit Review" : "Write a Review"}
      </h3>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RatingInput label="Overall Rating" value={rating} onChange={setRating} />
        <RatingInput label="Difficulty" value={difficulty} onChange={setDifficulty} />
        <RatingInput label="Workload" value={workload} onChange={setWorkload} />
      </div>

      <div>
        <label
          htmlFor="semesterTaken"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Semester Taken
        </label>
        <input
          id="semesterTaken"
          type="text"
          required
          placeholder="e.g. Fall 2025"
          value={semesterTaken}
          onChange={(e) => setSemesterTaken(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your Review
        </label>
        <textarea
          id="comment"
          required
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this course (at least 5 characters)..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <p className="mt-1 text-xs text-gray-400">
          {comment.trim().length} / 5 minimum characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Would you recommend this course?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              wouldRecommend
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !wouldRecommend
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            No
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-purple-700 px-6 py-2 text-sm font-medium text-white hover:bg-purple-800 transition-colors disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : editingReview
              ? "Update Review"
              : "Submit Review"}
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
