CREATE TABLE user (
  id varchar(36) PRIMARY KEY,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY user_email_unique (email)
);

CREATE TABLE session (
  id varchar(36) PRIMARY KEY,
  expires_at timestamp(3) NOT NULL,
  token varchar(255) NOT NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ip_address text NULL,
  user_agent text NULL,
  user_id varchar(36) NOT NULL,
  UNIQUE KEY session_token_unique (token),
  KEY session_user_id_idx (user_id),
  CONSTRAINT session_user_fk FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE account (
  id varchar(36) PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id varchar(36) NOT NULL,
  access_token text NULL,
  refresh_token text NULL,
  id_token text NULL,
  access_token_expires_at timestamp(3) NULL,
  refresh_token_expires_at timestamp(3) NULL,
  scope text NULL,
  password text NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY account_user_id_idx (user_id),
  CONSTRAINT account_user_fk FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE verification (
  id varchar(36) PRIMARY KEY,
  identifier varchar(255) NOT NULL,
  value text NOT NULL,
  expires_at timestamp(3) NOT NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY verification_identifier_idx (identifier)
);

CREATE TABLE cluster_snapshots (
  id serial PRIMARY KEY,
  recorded_at datetime NOT NULL,
  total_slots int NOT NULL,
  used_slots int NOT NULL,
  free_slots int NOT NULL,
  job_count int NOT NULL DEFAULT 0,
  running_jobs int NOT NULL,
  queued_jobs int NOT NULL,
  failed_jobs int NOT NULL,
  hold_jobs int NOT NULL,
  health_status enum('healthy','degraded','down') NOT NULL,
  offline_node_count int NOT NULL DEFAULT 0,
  KEY cluster_snapshots_recorded_at_idx (recorded_at)
);

CREATE TABLE nodes_current (
  id serial PRIMARY KEY,
  hostname varchar(255) NOT NULL,
  arch varchar(64) NULL,
  ncpu int NULL,
  nsoc int NULL,
  ncor int NULL,
  nthr int NULL,
  load_raw varchar(32) NULL,
  memtot_raw varchar(32) NULL,
  memuse_raw varchar(32) NULL,
  status enum('ok','partial','missing') NOT NULL,
  last_seen_at datetime NOT NULL,
  UNIQUE KEY nodes_current_hostname_unique (hostname),
  KEY nodes_current_status_idx (status)
);

CREATE TABLE jobs_current (
  id serial PRIMARY KEY,
  job_id varchar(64) NOT NULL,
  owner varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  state_group enum('queued','running','hold','suspended','error','finished','deleted') NOT NULL,
  submitted_at datetime NOT NULL,
  started_at datetime NULL,
  slots int NOT NULL DEFAULT 1,
  UNIQUE KEY jobs_current_job_id_unique (job_id),
  KEY jobs_current_owner_idx (owner),
  KEY jobs_current_state_group_idx (state_group)
);

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

CREATE TABLE jobs_history (
  id serial PRIMARY KEY,
  job_id varchar(64) NOT NULL,
  owner varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  state_final enum('queued','running','hold','suspended','error','finished','deleted') NOT NULL,
  submitted_at datetime NOT NULL,
  started_at datetime NULL,
  finished_at datetime NOT NULL,
  UNIQUE KEY jobs_history_job_id_finished_unique (job_id, finished_at),
  KEY jobs_history_owner_finished_idx (owner, finished_at)
);
