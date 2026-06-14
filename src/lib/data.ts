/** Client-side loaders for the committed static data, served at /data/. */

import type { TeamDecadeChunk, TeamsIndex } from "./types";

// Matches next.config's basePath so data URLs resolve under a sub-path host
// (GitHub project pages) and at the root (local / Cloudflare). Inlined at build.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let indexCache: TeamsIndex | null = null;
const chunkCache = new Map<string, TeamDecadeChunk>();

/** Load and cache the spin index (`teams.json`). */
export async function loadTeamsIndex(): Promise<TeamsIndex> {
  if (!indexCache) {
    const res = await fetch(`${BASE}/data/teams.json`);
    if (!res.ok) throw new Error(`Failed to load teams.json (${res.status})`);
    indexCache = (await res.json()) as TeamsIndex;
  }
  return indexCache;
}

/** Lazy-load and cache one team-decade pool chunk (e.g. "td/NYA-1920.json"). */
export async function loadChunk(chunkPath: string): Promise<TeamDecadeChunk> {
  const cached = chunkCache.get(chunkPath);
  if (cached) return cached;
  const res = await fetch(`${BASE}/data/${chunkPath}`);
  if (!res.ok) throw new Error(`Failed to load ${chunkPath} (${res.status})`);
  const chunk = (await res.json()) as TeamDecadeChunk;
  chunkCache.set(chunkPath, chunk);
  return chunk;
}
