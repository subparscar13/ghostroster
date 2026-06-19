"use client";

import Link from "next/link";

import { leaderboardEnabled } from "@/lib/leaderboard";

/** Footer link to the leaderboard — rendered only when the endpoint is configured
 * (mirrors CommentBox / Analytics so the app is unchanged when the feature is off). */
export function LeaderboardLink() {
  if (!leaderboardEnabled()) return null;
  return (
    <>
      <Link href="/leaderboard" className="underline decoration-faded underline-offset-2 hover:text-ink">
        leaderboard
      </Link>
      <span aria-hidden> · </span>
    </>
  );
}
