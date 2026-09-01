ALTER TABLE jobs_current ADD COLUMN slots INT NOT NULL DEFAULT 1;

CREATE TABLE queues_current (
  id serial PRIMARY KEY,
  queue_name varchar(255) NOT NULL,
  used_slots int NOT NULL,
  reserved_slots int NOT NULL,
  free_slots int NOT NULL,
  total_slots int NOT NULL,
  last_seen_at datetime NOT NULL,
  UNIQUE KEY queues_current_queue_name_unique (queue_name)
);
