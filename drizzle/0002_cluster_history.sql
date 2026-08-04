ALTER TABLE cluster_snapshots
  ADD COLUMN job_count int NOT NULL DEFAULT 0 AFTER free_slots;

UPDATE cluster_snapshots
SET job_count = running_jobs + queued_jobs + failed_jobs + hold_jobs;
