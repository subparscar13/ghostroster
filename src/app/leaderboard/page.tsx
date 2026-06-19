import type { Metadata } from "next";

import { LeaderboardView } from "@/components/LeaderboardView";

export const metadata: Metadata = {
  title: "Leaderboard — Ghost Roster",
  description: "Daily, weekly, and all-time Ghost Roster leaderboards — chase 162-0.",
};

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
