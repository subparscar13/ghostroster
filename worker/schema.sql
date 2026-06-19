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
  created_at  INTEGER NOT NULL,           -- unix seconds
  UNIQUE (device_id, date_key, mode)      -- per-day-per-board upsert; caps per-device flooding
);

-- Ranking (wins desc, run-diff tiebreak) scoped by board + date.
CREATE INDEX IF NOT EXISTS idx_scores_mode_date ON scores (mode, date_key, wins DESC, run_diff DESC);
