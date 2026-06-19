-- Ghost Roster leaderboard (D-012). One row per (device, day); the Worker upserts the
-- best result per device per day. No roster is stored — we trust the score.
CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT    NOT NULL,
  initials    TEXT    NOT NULL,
  date_key    TEXT    NOT NULL,           -- YYYY-MM-DD
  wins        INTEGER NOT NULL,
  losses      INTEGER NOT NULL,
  run_diff    INTEGER NOT NULL,
  grade       TEXT    NOT NULL,
  squares     TEXT    NOT NULL DEFAULT '',
  division    TEXT    NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,           -- unix seconds
  UNIQUE (device_id, date_key)            -- enables the per-day upsert; caps per-device flooding
);

-- Daily ranking (wins desc, run-diff tiebreak) within a date.
CREATE INDEX IF NOT EXISTS idx_scores_date ON scores (date_key, wins DESC, run_diff DESC);
