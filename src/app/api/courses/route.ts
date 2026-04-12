import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parsePagination,
  buildCourseWhere,
  mapCourseToResponse,
  buildPaginationMeta,
} from "@/lib/courses";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim() || "";
  const department = params.get("department") || "";
  const semester = params.get("semester") || "";
  const { page, limit, offset } = parsePagination({
    page: params.get("page"),
    limit: params.get("limit"),
  });

  const where = buildCourseWhere({ q, department, semester });

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        department: { select: { code: true, name: true } },
        _count: { select: { reviews: true, offerings: true } },
        reviews: {
          select: { rating: true, difficulty: true, workload: true },
        },
      },
      orderBy: [{ code: "asc" }],
      skip: offset,
      take: limit,
    }),
    prisma.course.count({ where }),
  ]);

  const data = courses.map(mapCourseToResponse);

  return NextResponse.json({
    courses: data,
    pagination: buildPaginationMeta(page, limit, total),
  });
}
