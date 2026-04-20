"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ReviewForm from "./review-form";

interface Review {
  id: string;
  rating: number;
  difficulty: number;
  workload: number;
  comment: string;
  wouldRecommend: boolean;
  semesterTaken: string;
  createdAt: string;
  user: { id: string; name: string | null; isVerified: boolean };
  upvotes: number;
  downvotes: number;
  netScore: number;
  userVote: "UP" | "DOWN" | null;
  isOwner: boolean;
}

interface ReviewsSectionProps {
  courseId: string;
  reviewCount: number;
}

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="text-sm text-yellow-500">
      {"★".repeat(value)}
      {"☆".repeat(max - value)}
    </span>
  );
}

function VoteButtons({
  reviewId,
  upvotes,
  downvotes,
  userVote,
  onVoteChange,
}: {
  reviewId: string;
  upvotes: number;
  downvotes: number;
  userVote: "UP" | "DOWN" | null;
  onVoteChange: (
    reviewId: string,
    data: { upvotes: number; downvotes: number; netScore: number; userVote: "UP" | "DOWN" | null }
  ) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleVote(vote: "UP" | "DOWN") {
    setLoading(true);
    try {
      if (userVote === vote) {
        // Remove vote
        const res = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "DELETE",
        });
        if (res.ok) {
          const data = await res.json();
          onVoteChange(reviewId, data);
        }
      } else {
        // Cast or change vote
        const res = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote }),
        });
        if (res.ok) {
          const data = await res.json();
          onVoteChange(reviewId, data);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote("UP")}
        disabled={loading}
        className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
          userVote === "UP"
            ? "bg-green-100 text-green-700 font-medium"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
        }`}
      >
        ▲ {upvotes}
      </button>
      <button
        onClick={() => handleVote("DOWN")}
        disabled={loading}
        className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
          userVote === "DOWN"
            ? "bg-red-100 text-red-700 font-medium"
            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
        }`}
      >
        ▼ {downvotes}
      </button>
    </div>
  );
}

function ReviewCard({
  review,
  onVoteChange,
  onDelete,
  onEdit,
}: {
  review: Review;
  onVoteChange: (
    reviewId: string,
    data: { upvotes: number; downvotes: number; netScore: number; userVote: "UP" | "DOWN" | null }
  ) => void;
  onDelete: (reviewId: string) => void;
  onEdit: (review: Review) => void;
}) {
  const { status } = useSession();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(review.id);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StarDisplay value={review.rating} />
            <span className="text-xs text-gray-400">
              {review.semesterTaken}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <span>{review.user.name || "Anonymous"}</span>
            {review.user.isVerified && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                NYU
              </span>
            )}
          </div>
        </div>
        {status === "authenticated" && !review.isOwner && (
          <VoteButtons
            reviewId={review.id}
            upvotes={review.upvotes}
            downvotes={review.downvotes}
            userVote={review.userVote}
            onVoteChange={onVoteChange}
          />
        )}
      </div>

      <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
        {review.comment}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span>Difficulty: {review.difficulty}/5</span>
        <span>Workload: {review.workload}/5</span>
        <span>
          {review.wouldRecommend ? "Would recommend" : "Would not recommend"}
        </span>
        {review.isOwner && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onEdit(review)}
              className="text-purple-600 hover:underline"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-500 hover:underline"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewsSection({
  courseId,
  reviewCount: initialCount,
}: ReviewsSectionProps) {
  const { data: session, status } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [restrictionMessage, setRestrictionMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewCount, setReviewCount] = useState(initialCount);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/reviews`);
      if (res.status === 403) {
        const data = await res.json();
        setRestricted(true);
        setRestrictionMessage(data.message || "Access restricted");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setReviewCount(data.reviews.length);
        setRestricted(false);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (status !== "loading") {
      fetchReviews();
    }
  }, [status, fetchReviews]);

  function handleVoteChange(
    reviewId: string,
    data: { upvotes: number; downvotes: number; netScore: number; userVote: "UP" | "DOWN" | null }
  ) {
    setReviews((prev) =>
      prev
        .map((r) =>
          r.id === reviewId ? { ...r, ...data } : r
        )
        .sort((a, b) => b.netScore - a.netScore)
    );
  }

  function handleDelete(reviewId: string) {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setReviewCount((c) => c - 1);
  }

  function handleEdit(review: Review) {
    setEditingReview(review);
    setShowForm(true);
  }

  function handleReviewSaved() {
    setShowForm(false);
    setEditingReview(null);
    fetchReviews();
  }

  if (loading && status === "loading") {
    return (
      <section className="mb-8 rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 rounded bg-gray-200" />
          <div className="h-20 rounded bg-gray-200" />
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Reviews ({reviewCount})
        </h2>
        {status === "authenticated" && session?.user?.isVerified && !showForm && (
          <button
            onClick={() => {
              setEditingReview(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-purple-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-800 transition-colors"
          >
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ReviewForm
            courseId={courseId}
            editingReview={
              editingReview
                ? {
                    id: editingReview.id,
                    rating: editingReview.rating,
                    difficulty: editingReview.difficulty,
                    workload: editingReview.workload,
                    comment: editingReview.comment,
                    wouldRecommend: editingReview.wouldRecommend,
                    semesterTaken: editingReview.semesterTaken,
                  }
                : null
            }
            onSaved={handleReviewSaved}
            onCancel={() => {
              setShowForm(false);
              setEditingReview(null);
            }}
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
              Sign in to view reviews
            </Link>
          )}
          {status === "authenticated" && !session?.user?.isVerified && (
            <Link
              href="/verify-email"
              className="text-sm text-purple-700 hover:underline"
            >
              Verify your email to view reviews
            </Link>
          )}
          {status === "authenticated" && session?.user?.isVerified && (
            <p className="text-sm text-gray-500">
              Upload at least one grade report to unlock reviews
            </p>
          )}
        </div>
      )}

      {!restricted && !loading && reviews.length === 0 && (
        <p className="text-sm text-gray-400">
          No reviews yet. Be the first to write one!
        </p>
      )}

      {!restricted && loading && (
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded bg-gray-100" />
          <div className="h-24 rounded bg-gray-100" />
        </div>
      )}

      {!restricted && !loading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onVoteChange={handleVoteChange}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </section>
  );
}
