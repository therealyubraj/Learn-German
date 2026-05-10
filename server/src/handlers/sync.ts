import { getSessionContext } from "../auth";
import { badRequest, json, parseJsonBody, unauthorized } from "../lib/http";
import { mergeSnapshots, normalizeSyncSnapshot } from "../lib/snapshot";
import { nowIso } from "../lib/time";
import { DeviceRow, Env, SyncSnapshot } from "../types";

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

  return json({
    ok: true,
    revision: nextRevision,
    snapshot: mergedSnapshot,
  });
}

export async function pullHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
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
      revision: 0,
      snapshot: null,
      sourceDeviceId: null,
    });
  }

  return json({
    ok: true,
    revision: snapshotRow.revision,
    snapshot: normalizeSyncSnapshot(JSON.parse(snapshotRow.payload)),
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
