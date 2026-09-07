ALTER TABLE jobs_current
  ADD COLUMN queue_name varchar(255) NULL AFTER state_group,
  ADD COLUMN reason varchar(255) NULL AFTER queue_name,
  ADD COLUMN node_list varchar(2048) NULL AFTER reason,
  ADD KEY jobs_current_queue_name_idx (queue_name);

ALTER TABLE jobs_history
  ADD COLUMN queue_name varchar(255) NULL AFTER state_final,
  ADD COLUMN reason varchar(255) NULL AFTER queue_name,
  ADD COLUMN node_list varchar(2048) NULL AFTER reason,
  ADD KEY jobs_history_queue_name_idx (queue_name);
