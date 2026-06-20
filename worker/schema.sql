-- Ghost Roster leaderboard (D-012). One row per (device, day, mode); the Worker upserts
-- the best result per device per day, per board. `mode` is 'daily' or 'classic' (the
-- regular game). No roster is stored — high claims are re-verified by replaying the sim.
CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT    NOT NULL,
  initials    TEXT    NOT NULL,
  date_key    TEXT    NOT NULL,           -- YYYY-MM-DD
  mode        TEXT    NOT NULL DEFAULT 'daily',  -- 'daily' | 'classic'
  wins        INTEGER NOT NULL,
  losses      INTEGER NOT NULL,
  run_diff    INTEGER NOT NULL,
  grade       TEXT    NOT NULL,
  squares     TEXT    NOT NULL DEFAULT '',
  division    TEXT    NOT NULL DEFAULT '',
  reloads     INTEGER NOT NULL DEFAULT 0,  -- classic: mid-draft refreshes (free re-spins) → asterisk on the board (D-012)
  created_at  INTEGER NOT NULL,           -- unix seconds
  UNIQUE (device_id, date_key, mode)      -- per-day-per-board upsert; caps per-device flooding
);
-- Migration for an existing DB (no-op on a fresh CREATE above):
--   ALTER TABLE scores ADD COLUMN reloads INTEGER NOT NULL DEFAULT 0;

-- Ranking (wins desc, run-diff tiebreak) scoped by board + date.
CREATE INDEX IF NOT EXISTS idx_scores_mode_date ON scores (mode, date_key, wins DESC, run_diff DESC);

-- Global vanity counters (e.g. total rosters built). Seed 'rosters' from existing
-- submissions as a baseline; it climbs from there. Idempotent (DO NOTHING after first).
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT    PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO counters (name, value) VALUES ('rosters', (SELECT COUNT(*) FROM scores))
  ON CONFLICT(name) DO NOTHING;
