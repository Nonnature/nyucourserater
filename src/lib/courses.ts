import { Prisma } from "@/generated/prisma/client";

/**
 * Parse and clamp pagination params.
 */
export function parsePagination(params: {
  page?: string | null;
  limit?: string | null;
}) {
  const rawPage = parseInt(params.page || "1", 10);
  const rawLimit = parseInt(params.limit || "20", 10);
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Normalize a search query to handle common course code input variations.
 * E.g. "CSCI-GA3033" → "CSCI-GA 3033", "csci-ua101" → "csci-ua 101"
 *
 * Returns an array of unique search variants (original + normalized).
 */
export function normalizeQuery(q: string): string[] {
  const variants = new Set<string>();
  variants.add(q);

  // Pattern: dept-code immediately followed by digits, e.g. "CSCI-GA3033"
  const match = q.match(/^([A-Za-z]+-[A-Za-z]+)(\d+.*)$/);
  if (match) {
    variants.add(`${match[1]} ${match[2]}`);
  }

  return [...variants];
}

/**
 * Build Prisma `where` clause from search params.
 */
export function buildCourseWhere(params: {
  q?: string;
  department?: string;
  semester?: string;
}): Prisma.CourseWhereInput {
  const where: Prisma.CourseWhereInput = {};

  if (params.q) {
    const variants = normalizeQuery(params.q);
    const conditions: Prisma.CourseWhereInput[] = [];
    for (const v of variants) {
      conditions.push({ code: { contains: v, mode: "insensitive" } });
      conditions.push({ name: { contains: v, mode: "insensitive" } });
    }
    where.OR = conditions;
  }

  if (params.department) {
    where.department = {
      code: { equals: params.department, mode: "insensitive" },
    };
  }

  if (params.semester) {
    where.offerings = { some: { semester: params.semester } };
  }

  return where;
}

/**
 * Map a raw course row (with reviews and counts) to the API response shape.
 */
export function mapCourseToResponse(course: {
  id: string;
  code: string;
  name: string;
  department: { code: string; name: string };
  minUnits: number | null;
  maxUnits: number | null;
  _count: { reviews: number; offerings: number };
  reviews: { rating: number; difficulty: number; workload: number }[];
}) {
  const reviewCount = course._count.reviews;
  const avgRating =
    reviewCount > 0
      ? course.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : null;
  const avgDifficulty =
    reviewCount > 0
      ? course.reviews.reduce((s, r) => s + r.difficulty, 0) / reviewCount
      : null;

  return {
    id: course.id,
    code: course.code,
    name: course.name,
    department: course.department,
    units:
      course.minUnits === course.maxUnits
        ? course.minUnits
        : `${course.minUnits}-${course.maxUnits}`,
    reviewCount,
    offeringCount: course._count.offerings,
    avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    avgDifficulty: avgDifficulty ? Math.round(avgDifficulty * 10) / 10 : null,
  };
}

/**
 * Compute pagination metadata.
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
