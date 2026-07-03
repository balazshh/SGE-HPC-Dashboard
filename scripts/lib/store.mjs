import mysql from 'mysql2/promise';

function getDbConfig() {
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? 'hpc_dashboard',
    user: process.env.DB_USER ?? 'hpc_dashboard',
    password: process.env.DB_PASSWORD ?? 'hpc_dashboard',
  };
}

export function shouldWriteDb() {
  return process.env.DB_WRITE === '1';
}

async function withConnection(work) {
  const connection = await mysql.createConnection(getDbConfig());
  try {
    await work(connection);
  } finally {
    await connection.end();
  }
}

export async function storeLiveSnapshot({ recordedAt, snapshot, jobs }) {
  if (!shouldWriteDb()) return;

  await withConnection(async (connection) => {
    await connection.beginTransaction();
    try {
      await connection.execute(
        `INSERT INTO cluster_snapshots
          (recorded_at, total_slots, used_slots, free_slots, running_jobs, queued_jobs, failed_jobs, hold_jobs, health_status, offline_node_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordedAt,
          snapshot.totalSlots,
          snapshot.usedSlots,
          snapshot.freeSlots,
          snapshot.runningJobs,
          snapshot.queuedJobs,
          snapshot.failedJobs,
          snapshot.holdJobs,
          snapshot.healthStatus,
          snapshot.offlineNodeCount,
        ],
      );

      await connection.execute('DELETE FROM jobs_current');
      for (const job of jobs) {
        await connection.execute(
          `INSERT INTO jobs_current
            (job_id, owner, name, state_raw, state_group, submitted_at, started_at, slots, last_seen_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.jobId,
            job.owner,
            job.name,
            job.stateRaw,
            job.stateGroup,
            job.submittedAt,
            job.startedAt,
            job.slots,
            job.lastSeenAt,
          ],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}

export async function storeHistory(records) {
  if (!shouldWriteDb()) return;

  await withConnection(async (connection) => {
    for (const record of records) {
      await connection.execute(
        `INSERT IGNORE INTO jobs_history
          (job_id, owner, name, state_final, submitted_at, started_at, finished_at, slots, queue)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.jobId,
          record.owner,
          record.name,
          record.stateFinal,
          record.submittedAt,
          record.startedAt,
          record.finishedAt,
          record.slots,
          record.queue,
        ],
      );
    }
  });
}

export async function storeRollups(hourly, daily) {
  if (!shouldWriteDb()) return;

  await withConnection(async (connection) => {
    for (const row of hourly) {
      await connection.execute(
        `INSERT INTO user_job_hourly
          (owner, bucket_start, submitted_count, started_count, finished_count, failed_count)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           submitted_count = VALUES(submitted_count),
           started_count = VALUES(started_count),
           finished_count = VALUES(finished_count),
           failed_count = VALUES(failed_count)`,
        [row.owner, row.bucketStart, row.submittedCount, row.startedCount, row.finishedCount, row.failedCount],
      );
    }

    for (const row of daily) {
      await connection.execute(
        `INSERT INTO user_job_daily
          (owner, bucket_date, submitted_count, started_count, finished_count, failed_count)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           submitted_count = VALUES(submitted_count),
           started_count = VALUES(started_count),
           finished_count = VALUES(finished_count),
           failed_count = VALUES(failed_count)`,
        [row.owner, row.bucketDate, row.submittedCount, row.startedCount, row.finishedCount, row.failedCount],
      );
    }
  });
}

export async function cleanupOldData() {
  if (!shouldWriteDb()) return false;

  await withConnection(async (connection) => {
    await connection.execute(`DELETE FROM cluster_snapshots WHERE recorded_at < UTC_TIMESTAMP() - INTERVAL 90 DAY`);
    await connection.execute(`DELETE FROM jobs_history WHERE finished_at < UTC_TIMESTAMP() - INTERVAL 365 DAY`);
    await connection.execute(`DELETE FROM user_job_hourly WHERE bucket_start < UTC_TIMESTAMP() - INTERVAL 365 DAY`);
    await connection.execute(`DELETE FROM user_job_daily WHERE bucket_date < UTC_DATE() - INTERVAL 365 DAY`);
  });

  return true;
}
