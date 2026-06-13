/** Client-side loaders for the committed static data, served at /data/. */

import type { TeamsIndex } from "./types";

let indexCache: TeamsIndex | null = null;

/** Load and cache the spin index (`teams.json`). */
export async function loadTeamsIndex(): Promise<TeamsIndex> {
  if (!indexCache) {
    const res = await fetch("/data/teams.json");
    if (!res.ok) throw new Error(`Failed to load teams.json (${res.status})`);
    indexCache = (await res.json()) as TeamsIndex;
  }
  return indexCache;
}
