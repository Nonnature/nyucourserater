// Mock all heavy dependencies that auth.ts imports
jest.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: jest.fn() }));
jest.mock("next-auth/providers/credentials", () => jest.fn(() => ({})));
jest.mock("next-auth/providers/google", () => jest.fn(() => ({})));
jest.mock("bcryptjs", () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: {} }));
jest.mock("@/generated/prisma/client", () => ({ PrismaClient: jest.fn() }));

import { isNyuEmail } from "../auth";

// ─── isNyuEmail ─────────────────────────────────────────
// design.md §10: "@nyu.edu 邮箱注册自动设置 is_verified = true"

describe("isNyuEmail", () => {
  it("returns true for @nyu.edu email", () => {
    expect(isNyuEmail("student@nyu.edu")).toBe(true);
  });

  it("returns true for uppercase @NYU.EDU", () => {
    expect(isNyuEmail("student@NYU.EDU")).toBe(true);
  });

  it("returns true for mixed case @Nyu.Edu", () => {
    expect(isNyuEmail("student@Nyu.Edu")).toBe(true);
  });

  it("returns false for gmail", () => {
    expect(isNyuEmail("student@gmail.com")).toBe(false);
  });

  it("returns false for other .edu domains", () => {
    expect(isNyuEmail("student@columbia.edu")).toBe(false);
  });

  it("returns false for nyu subdomain emails", () => {
    expect(isNyuEmail("student@stern.nyu.edu")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isNyuEmail("")).toBe(false);
  });

  it("returns false for nyu.edu without @", () => {
    expect(isNyuEmail("nyu.edu")).toBe(false);
  });
});
