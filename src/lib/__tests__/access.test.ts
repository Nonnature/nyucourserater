jest.mock("@/lib/prisma", () => ({
  prisma: {
    gradeReport: { count: jest.fn() },
  },
}));
jest.mock("@/generated/prisma/client", () => ({ PrismaClient: jest.fn() }));

import { canViewReviews, canWrite, getAccessDeniedReason } from "../access";
import { prisma } from "@/lib/prisma";

const mockGradeCount = prisma.gradeReport.count as jest.Mock;

beforeEach(() => {
  mockGradeCount.mockReset();
});

// Current date is Apr 2026 → Spring+Summer 2026 period
// "Spring 2026" enrollment = semester 1 (first semester)
const firstSemesterUser = {
  id: "u1",
  isVerified: true,
  enrollmentSemester: "Spring 2026",
};

// "Fall 2024" enrollment + Apr 2026 = semester 4 (not first)
const laterSemesterUser = {
  id: "u2",
  isVerified: true,
  enrollmentSemester: "Fall 2024",
};

const unverifiedUser = {
  id: "u3",
  isVerified: false,
  enrollmentSemester: "Fall 2025",
};

const noEnrollmentUser = {
  id: "u4",
  isVerified: true,
  enrollmentSemester: null,
};

describe("canViewReviews", () => {
  it("returns false for null user", async () => {
    expect(await canViewReviews(null)).toBe(false);
  });

  it("returns false for unverified user", async () => {
    expect(await canViewReviews(unverifiedUser)).toBe(false);
  });

  it("returns false for user without enrollment semester", async () => {
    expect(await canViewReviews(noEnrollmentUser)).toBe(false);
  });

  it("returns true for first-semester user (exempt)", async () => {
    // First semester user — no grade check needed
    expect(await canViewReviews(firstSemesterUser)).toBe(true);
    expect(mockGradeCount).not.toHaveBeenCalled();
  });

  it("returns true for later-semester user with grades", async () => {
    mockGradeCount.mockResolvedValue(1);
    expect(await canViewReviews(laterSemesterUser)).toBe(true);
    expect(mockGradeCount).toHaveBeenCalledWith({
      where: { userId: "u2" },
    });
  });

  it("returns false for later-semester user without grades", async () => {
    mockGradeCount.mockResolvedValue(0);
    expect(await canViewReviews(laterSemesterUser)).toBe(false);
  });
});

describe("canWrite", () => {
  it("returns false for null user", () => {
    expect(canWrite(null)).toBe(false);
  });

  it("returns false for unverified user", () => {
    expect(canWrite(unverifiedUser)).toBe(false);
  });

  it("returns true for verified user", () => {
    expect(canWrite(firstSemesterUser)).toBe(true);
  });
});

describe("getAccessDeniedReason", () => {
  it("returns sign_in_required for null user", async () => {
    expect(await getAccessDeniedReason(null)).toBe("sign_in_required");
  });

  it("returns verification_required for unverified user", async () => {
    expect(await getAccessDeniedReason(unverifiedUser)).toBe(
      "verification_required"
    );
  });

  it("returns enrollment_required for user without enrollment", async () => {
    expect(await getAccessDeniedReason(noEnrollmentUser)).toBe(
      "enrollment_required"
    );
  });

  it("returns null for first-semester user", async () => {
    expect(await getAccessDeniedReason(firstSemesterUser)).toBeNull();
  });

  it("returns null for later-semester user with grades", async () => {
    mockGradeCount.mockResolvedValue(2);
    expect(await getAccessDeniedReason(laterSemesterUser)).toBeNull();
  });

  it("returns grade_report_required for later-semester user without grades", async () => {
    mockGradeCount.mockResolvedValue(0);
    expect(await getAccessDeniedReason(laterSemesterUser)).toBe(
      "grade_report_required"
    );
  });
});
