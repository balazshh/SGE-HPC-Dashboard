-- Upgrade installations created before the overview capacity fields existed.
-- This migration is safe to run more than once on MySQL 8.

SET @dashboard_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE cluster_snapshots ADD COLUMN reserved_slots INT NULL AFTER free_slots',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'cluster_snapshots'
    AND column_name = 'reserved_slots'
);
PREPARE dashboard_stmt FROM @dashboard_sql;
EXECUTE dashboard_stmt;
DEALLOCATE PREPARE dashboard_stmt;

SET @dashboard_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE jobs_current ADD COLUMN slots INT NOT NULL DEFAULT 1',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'jobs_current'
    AND column_name = 'slots'
);
PREPARE dashboard_stmt FROM @dashboard_sql;
EXECUTE dashboard_stmt;
DEALLOCATE PREPARE dashboard_stmt;

ALTER TABLE jobs_current MODIFY COLUMN submitted_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS queues_current (
  id serial PRIMARY KEY,
  queue_name varchar(255) NOT NULL,
  used_slots int NOT NULL,
  reserved_slots int NULL,
  free_slots int NOT NULL,
  total_slots int NOT NULL,
  state varchar(64) NULL,
  last_seen_at datetime NOT NULL,
  UNIQUE KEY queues_current_queue_name_unique (queue_name)
);

ALTER TABLE queues_current MODIFY COLUMN reserved_slots INT NULL;

SET @dashboard_sql = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE queues_current ADD COLUMN state VARCHAR(64) NULL AFTER total_slots',
    'SELECT 1'
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'queues_current'
    AND column_name = 'state'
);
PREPARE dashboard_stmt FROM @dashboard_sql;
EXECUTE dashboard_stmt;
DEALLOCATE PREPARE dashboard_stmt;
