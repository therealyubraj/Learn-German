import { sha256 } from "./lib/crypto";
import { getBearerToken } from "./lib/http";
import { addDays, nowIso } from "./lib/time";
import {
  DeviceRow,
  Env,
  SessionContext,
  TotpCredentialRow,
  TotpEnrollmentRow,
} from "./types";

export async function getSessionContext(
  request: Request,
  env: Env,
): Promise<SessionContext | null> {
  const rawToken = getBearerToken(request);
  if (!rawToken) {
    return null;
  }

  const tokenHash = await sha256(rawToken);
  const sessionRow = await env.DB.prepare(
    `
      SELECT
        sessions.user_id,
        sessions.device_id,
        sessions.expires_at,
        users.email,
        users.latest_revision,
        devices.name,
        devices.client_installation_id,
        devices.last_applied_revision
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      INNER JOIN devices ON devices.id = sessions.device_id
      WHERE sessions.token_hash = ?
      LIMIT 1
    `,
  )
    .bind(tokenHash)
    .first<{
      user_id: string;
      device_id: string;
      expires_at: string;
      email: string;
      latest_revision: number;
      name: string;
      client_installation_id: string;
      last_applied_revision: number;
    }>();

  if (!sessionRow || sessionRow.expires_at < nowIso()) {
    return null;
  }

  return {
    token: rawToken,
    userId: sessionRow.user_id,
    email: sessionRow.email,
    deviceId: sessionRow.device_id,
    deviceName: sessionRow.name,
    clientInstallationId: sessionRow.client_installation_id,
    sessionExpiresAt: sessionRow.expires_at,
    lastKnownRevision: sessionRow.latest_revision,
    lastAppliedRevision: sessionRow.last_applied_revision,
  };
}

export async function upsertUser(email: string, env: Env) {
  const existingUser = await env.DB.prepare(
    "SELECT id, latest_revision FROM users WHERE email = ? LIMIT 1",
  )
    .bind(email)
    .first<{ id: string; latest_revision: number }>();

  if (existingUser) {
    return existingUser;
  }

  const timestamp = nowIso();
  const user = {
    id: crypto.randomUUID(),
    latestRevision: 0,
  };

  await env.DB.prepare(
    `
      INSERT INTO users (id, email, latest_revision, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?)
    `,
  )
    .bind(user.id, email, timestamp, timestamp)
    .run();

  return {
    id: user.id,
    latest_revision: 0,
  };
}

export async function upsertDevice(
  env: Env,
  userId: string,
  clientInstallationId: string,
  deviceName: string,
) {
  const existingDevice = await env.DB.prepare(
    `
      SELECT *
      FROM devices
      WHERE user_id = ? AND client_installation_id = ?
      LIMIT 1
    `,
  )
    .bind(userId, clientInstallationId)
    .first<DeviceRow>();

  const timestamp = nowIso();

  if (existingDevice) {
    await env.DB.prepare(
      `
        UPDATE devices
        SET name = ?, last_seen_at = ?, updated_at = ?
        WHERE id = ?
      `,
    )
      .bind(deviceName, timestamp, timestamp, existingDevice.id)
      .run();

    return {
      ...existingDevice,
      name: deviceName,
      last_seen_at: timestamp,
      updated_at: timestamp,
    };
  }

  const device: DeviceRow = {
    id: crypto.randomUUID(),
    user_id: userId,
    client_installation_id: clientInstallationId,
    name: deviceName,
    last_seen_at: timestamp,
    last_uploaded_revision: 0,
    last_applied_revision: 0,
    has_unpushed_changes: 0,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await env.DB.prepare(
    `
      INSERT INTO devices (
        id,
        user_id,
        client_installation_id,
        name,
        last_seen_at,
        last_uploaded_revision,
        last_applied_revision,
        has_unpushed_changes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
    `,
  )
    .bind(
      device.id,
      device.user_id,
      device.client_installation_id,
      device.name,
      device.last_seen_at,
      device.created_at,
      device.updated_at,
    )
    .run();

  return device;
}

export async function issueSession(env: Env, userId: string, deviceId: string) {
  const rawToken = crypto.randomUUID();
  const tokenHash = await sha256(rawToken);
  const timestamp = nowIso();
  const expiresAt = addDays(
    timestamp,
    Number.parseInt(env.SESSION_TTL_DAYS ?? "30", 10),
  );

  await env.DB.prepare(
    `
      INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(crypto.randomUUID(), userId, deviceId, tokenHash, expiresAt, timestamp)
    .run();

  return {
    token: rawToken,
    sessionExpiresAt: expiresAt,
  };
}

export async function getTotpCredentialByEmail(email: string, env: Env) {
  return env.DB.prepare(
    `
      SELECT
        users.id AS user_id,
        totp_credentials.secret AS secret,
        totp_credentials.created_at,
        totp_credentials.updated_at
      FROM users
      INNER JOIN totp_credentials ON totp_credentials.user_id = users.id
      WHERE users.email = ?
      LIMIT 1
    `,
  )
    .bind(email)
    .first<TotpCredentialRow>();
}

export async function getEnrollmentByEmail(
  email: string,
  env: Env,
): Promise<TotpEnrollmentRow | null> {
  return env.DB.prepare(
    `
      SELECT *
      FROM totp_enrollments
      WHERE email = ?
      LIMIT 1
    `,
  )
    .bind(email)
    .first<TotpEnrollmentRow>();
}

export async function getEnrollmentByToken(
  rawToken: string,
  env: Env,
): Promise<TotpEnrollmentRow | null> {
  const tokenHash = await sha256(rawToken);
  return env.DB.prepare(
    `
      SELECT *
      FROM totp_enrollments
      WHERE token_hash = ?
      LIMIT 1
    `,
  )
    .bind(tokenHash)
    .first<TotpEnrollmentRow>();
}
