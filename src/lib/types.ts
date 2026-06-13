/** App-side shapes for the committed static data (`public/data`). */

/** One spin-index entry: a (franchise, decade) cell that meets the eligibility floor. */
export type SpinCell = {
  franchiseId: string;
  franchise: string;
  decade: number;
  chunk: string;
  counts: { hitters: number; sp: number; rp: number };
};

/** `teams.json` — the spin index. */
export type TeamsIndex = {
  edition: string;
  generatedFrom?: string;
  cells: SpinCell[];
};
