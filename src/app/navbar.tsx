"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-lg font-bold text-purple-700">
          NYU Course Rater
        </Link>

        <div className="flex items-center gap-4">
          {status === "loading" && (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-8 w-20 rounded-lg bg-gray-200" />
            </div>
          )}
          {status === "authenticated" && session?.user && (
            <>
              <span className="text-sm text-gray-700">
                {session.user.name}
                {session.user.isVerified ? (
                  <span className="ml-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                    NYU
                  </span>
                ) : (
                  <Link
                    href="/verify-email"
                    className="ml-1 inline-block rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700"
                  >
                    Verify Email
                  </Link>
                )}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </>
          )}
          {status === "unauthenticated" && (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-purple-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-800 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
