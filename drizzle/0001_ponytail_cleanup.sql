ALTER TABLE nodes_current
  DROP COLUMN swapto_raw,
  DROP COLUMN swapus_raw;

ALTER TABLE jobs_current
  DROP COLUMN state_raw,
  DROP COLUMN slots,
  DROP COLUMN last_seen_at;

ALTER TABLE jobs_history
  DROP COLUMN slots,
  DROP COLUMN queue;

DROP TABLE IF EXISTS user_job_hourly;
DROP TABLE IF EXISTS user_job_daily;
