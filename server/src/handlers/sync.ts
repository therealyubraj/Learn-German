import { getSessionContext } from "../auth";
import { badRequest, json, parseJsonBody, unauthorized } from "../lib/http";
import {
  mergeQuizStats,
  mergeSnapshots,
  normalizeSyncSnapshot,
  normalizeWordStat,
} from "../lib/snapshot";
import { nowIso } from "../lib/time";
import {
  DeviceRow,
  Env,
  StatsDelta,
  SyncSnapshot,
  UserStatRecordRow,
  WordStat,
} from "../types";

function recordToWordStat(row: UserStatRecordRow): WordStat {
  return {
    mastery: row.mastery,
    successCount: row.success_count,
    lastReviewed: row.last_reviewed,
    reverseReviewedAt: row.reverse_reviewed_at ?? row.last_reviewed,
    exposureCount: row.exposure_count,
  };
}

async function applyPersistedStatRows(
  env: Env,
  userId: string,
  snapshot: SyncSnapshot,
) {
  const statRows = await env.DB.prepare(
    `
      SELECT *
      FROM user_stat_records
      WHERE user_id = ?
    `,
  )
    .bind(userId)
    .all<UserStatRecordRow>();

  const persistedStats: Record<string, WordStat> = {};
  for (const row of statRows.results ?? []) {
    persistedStats[row.stat_key] = recordToWordStat(row);
  }

  return {
    ...snapshot,
    stats: {
      version: snapshot.stats.version,
      stats: mergeQuizStats(snapshot.stats.stats, persistedStats),
    },
  };
}

export async function statusHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  const user = await env.DB.prepare(
    "SELECT latest_revision FROM users WHERE id = ? LIMIT 1",
  )
    .bind(session.userId)
    .first<{ latest_revision: number }>();

  const currentDevice = await env.DB.prepare(
    "SELECT * FROM devices WHERE id = ? LIMIT 1",
  )
    .bind(session.deviceId)
    .first<DeviceRow>();

  if (!user || !currentDevice) {
    return unauthorized();
  }

  const otherDevices = await env.DB.prepare(
    `
      SELECT *
      FROM devices
      WHERE user_id = ? AND id != ?
      ORDER BY updated_at DESC
    `,
  )
    .bind(session.userId, session.deviceId)
    .all<DeviceRow>();

  const hasSnapshot = !!(await env.DB.prepare(
    "SELECT user_id FROM user_snapshots WHERE user_id = ? LIMIT 1",
  )
    .bind(session.userId)
    .first());

  const hasRemoteChanges = (otherDevices.results ?? []).some(
    (device: DeviceRow) =>
      device.last_uploaded_revision > currentDevice.last_applied_revision,
  );

  const hasPendingRemoteUpload = (otherDevices.results ?? []).some(
    (device: DeviceRow) => device.has_unpushed_changes === 1,
  );

  return json({
    ok: true,
    latestRevision: user.latest_revision,
    hasSnapshot,
    hasRemoteChanges,
    hasPendingRemoteUpload,
    device: {
      id: currentDevice.id,
      name: currentDevice.name,
      lastSeenAt: currentDevice.last_seen_at,
      lastUploadedRevision: currentDevice.last_uploaded_revision,
      lastAppliedRevision: currentDevice.last_applied_revision,
      hasUnpushedChanges: currentDevice.has_unpushed_changes === 1,
    },
    otherDevices: (otherDevices.results ?? []).map((device: DeviceRow) => ({
      id: device.id,
      name: device.name,
      lastSeenAt: device.last_seen_at,
      lastUploadedRevision: device.last_uploaded_revision,
      lastAppliedRevision: device.last_applied_revision,
      hasUnpushedChanges: device.has_unpushed_changes === 1,
    })),
  });
}

export async function markDirtyHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  await env.DB.prepare(
    `
      UPDATE devices
      SET has_unpushed_changes = 1, updated_at = ?, last_seen_at = ?
      WHERE id = ?
    `,
  )
    .bind(nowIso(), nowIso(), session.deviceId)
    .run();

  return json({ ok: true });
}

export async function pushHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  const body = await parseJsonBody<{ snapshot?: SyncSnapshot }>(request);
  const incomingSnapshot = body?.snapshot
    ? normalizeSyncSnapshot(body.snapshot)
    : null;
  if (!incomingSnapshot) {
    return badRequest("Snapshot payload is required.");
  }

  const currentUser = await env.DB.prepare(
    "SELECT latest_revision FROM users WHERE id = ? LIMIT 1",
  )
    .bind(session.userId)
    .first<{ latest_revision: number }>();

  if (!currentUser) {
    return unauthorized();
  }

  const existingSnapshotRow = await env.DB.prepare(
    "SELECT payload FROM user_snapshots WHERE user_id = ? LIMIT 1",
  )
    .bind(session.userId)
    .first<{ payload: string }>();

  const currentSnapshot = existingSnapshotRow
    ? normalizeSyncSnapshot(JSON.parse(existingSnapshotRow.payload))
    : null;
  const mergedSnapshot = mergeSnapshots(currentSnapshot, incomingSnapshot);
  const nextRevision = currentUser.latest_revision + 1;
  const timestamp = nowIso();
  const serializedSnapshot = JSON.stringify(mergedSnapshot);

  await env.DB.batch([
    env.DB.prepare(
      `
        INSERT INTO device_snapshots (device_id, user_id, revision, payload, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET
          revision = excluded.revision,
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `,
    ).bind(
      session.deviceId,
      session.userId,
      nextRevision,
      JSON.stringify(incomingSnapshot),
      timestamp,
    ),
    env.DB.prepare(
      `
        INSERT INTO user_snapshots (user_id, revision, source_device_id, payload, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          revision = excluded.revision,
          source_device_id = excluded.source_device_id,
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `,
    ).bind(
      session.userId,
      nextRevision,
      session.deviceId,
      serializedSnapshot,
      timestamp,
    ),
    env.DB.prepare(
      "UPDATE users SET latest_revision = ?, updated_at = ? WHERE id = ?",
    ).bind(nextRevision, timestamp, session.userId),
    env.DB.prepare(
      `
        UPDATE devices
        SET
          last_uploaded_revision = ?,
          last_applied_revision = ?,
          has_unpushed_changes = 0,
          last_seen_at = ?,
          updated_at = ?
        WHERE id = ?
      `,
    ).bind(nextRevision, nextRevision, timestamp, timestamp, session.deviceId),
  ]);

  const responseSnapshot = await applyPersistedStatRows(
    env,
    session.userId,
    mergedSnapshot,
  );

  return json({
    ok: true,
    revision: nextRevision,
    snapshot: responseSnapshot,
  });
}

export async function pushStatsDeltaHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  const body = await parseJsonBody<{ delta?: StatsDelta }>(request);
  const rawStats = body?.delta?.stats;
  if (!rawStats || typeof rawStats !== "object") {
    return badRequest("Stats delta payload is required.");
  }

  const normalizedStats: Record<string, WordStat> = {};
  for (const [key, stat] of Object.entries(rawStats)) {
    if (!key) {
      continue;
    }

    normalizedStats[key] = normalizeWordStat(stat);
  }

  const statEntries = Object.entries(normalizedStats);
  if (statEntries.length === 0) {
    return badRequest("Stats delta must include at least one stat.");
  }

  const currentUser = await env.DB.prepare(
    "SELECT latest_revision FROM users WHERE id = ? LIMIT 1",
  )
    .bind(session.userId)
    .first<{ latest_revision: number }>();

  if (!currentUser) {
    return unauthorized();
  }

  const nextRevision = currentUser.latest_revision + 1;
  const timestamp = nowIso();

  await env.DB.batch([
    ...statEntries.map(([key, stat]) =>
      env.DB.prepare(
        `
          INSERT INTO user_stat_records (
            user_id,
            stat_key,
            mastery,
            success_count,
            last_reviewed,
            reverse_reviewed_at,
            exposure_count,
            revision,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, stat_key) DO UPDATE SET
            mastery = CASE
              WHEN excluded.last_reviewed > user_stat_records.last_reviewed THEN excluded.mastery
              WHEN excluded.last_reviewed < user_stat_records.last_reviewed THEN user_stat_records.mastery
              ELSE max(user_stat_records.mastery, excluded.mastery)
            END,
            success_count = CASE
              WHEN excluded.last_reviewed > user_stat_records.last_reviewed THEN excluded.success_count
              WHEN excluded.last_reviewed < user_stat_records.last_reviewed THEN user_stat_records.success_count
              ELSE max(user_stat_records.success_count, excluded.success_count)
            END,
            last_reviewed = max(user_stat_records.last_reviewed, excluded.last_reviewed),
            reverse_reviewed_at = max(user_stat_records.reverse_reviewed_at, excluded.reverse_reviewed_at),
            exposure_count = CASE
              WHEN excluded.last_reviewed > user_stat_records.last_reviewed THEN excluded.exposure_count
              WHEN excluded.last_reviewed < user_stat_records.last_reviewed THEN user_stat_records.exposure_count
              ELSE max(user_stat_records.exposure_count, excluded.exposure_count)
            END,
            revision = excluded.revision,
            updated_at = excluded.updated_at
        `,
      ).bind(
        session.userId,
        key,
        stat.mastery,
        stat.successCount,
        stat.lastReviewed,
        stat.reverseReviewedAt,
        stat.exposureCount,
        nextRevision,
        timestamp,
      ),
    ),
    env.DB.prepare(
      "UPDATE users SET latest_revision = ?, updated_at = ? WHERE id = ?",
    ).bind(nextRevision, timestamp, session.userId),
    env.DB.prepare(
      `
        UPDATE devices
        SET
          last_uploaded_revision = ?,
          last_applied_revision = ?,
          has_unpushed_changes = 0,
          last_seen_at = ?,
          updated_at = ?
        WHERE id = ?
      `,
    ).bind(nextRevision, nextRevision, timestamp, timestamp, session.deviceId),
  ]);

  const statKeyPlaceholders = statEntries.map(() => "?").join(", ");
  const canonicalStatRows = await env.DB.prepare(
    `
      SELECT *
      FROM user_stat_records
      WHERE user_id = ? AND stat_key IN (${statKeyPlaceholders})
    `,
  )
    .bind(session.userId, ...statEntries.map(([key]) => key))
    .all<UserStatRecordRow>();

  const canonicalStats: Record<string, WordStat> = {};
  for (const row of canonicalStatRows.results ?? []) {
    canonicalStats[row.stat_key] = recordToWordStat(row);
  }

  return json({
    ok: true,
    revision: nextRevision,
    appliedStatKeys: statEntries.map(([key]) => key),
    stats: canonicalStats,
  });
}

export async function pullHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  const user = await env.DB.prepare(
    "SELECT latest_revision FROM users WHERE id = ? LIMIT 1",
  )
    .bind(session.userId)
    .first<{ latest_revision: number }>();

  if (!user) {
    return unauthorized();
  }

  const snapshotRow = await env.DB.prepare(
    `
      SELECT revision, source_device_id, payload
      FROM user_snapshots
      WHERE user_id = ?
      LIMIT 1
    `,
  )
    .bind(session.userId)
    .first<{ revision: number; source_device_id: string; payload: string }>();

  if (!snapshotRow) {
    return json({
      ok: true,
      revision: user.latest_revision,
      snapshot: null,
      sourceDeviceId: null,
    });
  }

  const snapshot = await applyPersistedStatRows(
    env,
    session.userId,
    normalizeSyncSnapshot(JSON.parse(snapshotRow.payload)),
  );

  return json({
    ok: true,
    revision: user.latest_revision,
    snapshot,
    sourceDeviceId: snapshotRow.source_device_id,
  });
}

export async function ackHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  const body = await parseJsonBody<{ revision?: number }>(request);
  if (typeof body?.revision !== "number") {
    return badRequest("Revision is required.");
  }

  await env.DB.prepare(
    `
      UPDATE devices
      SET last_applied_revision = ?, last_seen_at = ?, updated_at = ?
      WHERE id = ?
    `,
  )
    .bind(body.revision, nowIso(), nowIso(), session.deviceId)
    .run();

  return json({ ok: true });
}
