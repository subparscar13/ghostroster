import type { Metadata } from "next";
import { JetBrains_Mono, Roboto_Slab } from "next/font/google";

import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import "./globals.css";

const slab = Roboto_Slab({ subsets: ["latin"], variable: "--font-roboto-slab", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Ghost Roster",
  description:
    "Spin a random MLB franchise and decade, draft 13 players across baseball history, and chase a 162-0 season.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${slab.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper text-ink">
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
