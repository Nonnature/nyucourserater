import type { VoteType } from "@/generated/prisma/client";

export interface ReviewWithCourse {
  id: string;
  rating: number;
  difficulty: number;
  workload: number;
  comment: string;
  wouldRecommend: boolean;
  semesterTaken: string;
  createdAt: Date;
  updatedAt: Date;
  course: {
    id: string;
    code: string;
    name: string;
    department: { code: string; name: string };
  };
  votes: { vote: VoteType }[];
}

export interface MyReviewResponse {
  id: string;
  rating: number;
  difficulty: number;
  workload: number;
  comment: string;
  wouldRecommend: boolean;
  semesterTaken: string;
  createdAt: string;
  updatedAt: string;
  netScore: number;
  course: {
    id: string;
    code: string;
    name: string;
    departmentCode: string;
    departmentName: string;
  };
}

export function mapMyReview(review: ReviewWithCourse): MyReviewResponse {
  const up = review.votes.filter((v) => v.vote === "UP").length;
  const down = review.votes.filter((v) => v.vote === "DOWN").length;
  return {
    id: review.id,
    rating: review.rating,
    difficulty: review.difficulty,
    workload: review.workload,
    comment: review.comment,
    wouldRecommend: review.wouldRecommend,
    semesterTaken: review.semesterTaken,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    netScore: up - down,
    course: {
      id: review.course.id,
      code: review.course.code,
      name: review.course.name,
      departmentCode: review.course.department.code,
      departmentName: review.course.department.name,
    },
  };
}

export interface GradeWithCourse {
  id: string;
  grade: string;
  semester: string;
  createdAt: Date;
  course: {
    id: string;
    code: string;
    name: string;
    department: { code: string; name: string };
  };
}

export interface MyGradeResponse {
  id: string;
  grade: string;
  semester: string;
  createdAt: string;
  course: {
    id: string;
    code: string;
    name: string;
    departmentCode: string;
    departmentName: string;
  };
}

export function mapMyGrade(report: GradeWithCourse): MyGradeResponse {
  return {
    id: report.id,
    grade: report.grade,
    semester: report.semester,
    createdAt: report.createdAt.toISOString(),
    course: {
      id: report.course.id,
      code: report.course.code,
      name: report.course.name,
      departmentCode: report.course.department.code,
      departmentName: report.course.department.name,
    },
  };
}
