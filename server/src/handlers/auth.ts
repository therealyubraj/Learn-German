import {
  getEnrollmentByToken,
  getSessionContext,
  getTotpCredentialByEmail,
  issueSession,
  upsertDevice,
  upsertUser,
} from "../auth";
import { sha256 } from "../lib/crypto";
import { sendTotpEnrollmentEmail } from "../lib/email";
import {
  badRequest,
  json,
  parseJsonBody,
  unauthorized,
} from "../lib/http";
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from "../lib/totp";
import { addDays, nowIso } from "../lib/time";
import { Env } from "../types";

const GMAIL_DOMAIN = "@gmail.com";

function normalizeGmailEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isAllowedEnrollmentEmail(email: string) {
  return email.endsWith(GMAIL_DOMAIN);
}

function getAppBaseUrl(env: Env, request: Request) {
  if (env.APP_BASE_URL) {
    return env.APP_BASE_URL.replace(/\/$/, "");
  }

  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, "");
  }

  return new URL(request.url).origin.replace(/\/$/, "");
}

function getTotpIssuer(env: Env) {
  return env.TOTP_ISSUER ?? env.APP_NAME ?? "Learn Deutsch";
}

function isProductionEnvironment(env: Env) {
  return env.ENVIRONMENT === "production";
}

function isLocalHostValue(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return value.includes("localhost") || value.includes("127.0.0.1");
}

function canEchoDevEnrollmentLink(env: Env, request: Request) {
  return (
    !isProductionEnvironment(env) &&
    env.DEV_TOTP_ENROLLMENT_LINK_ECHO === "true" &&
    (isLocalHostValue(env.APP_BASE_URL) ||
      isLocalHostValue(new URL(request.url).origin))
  );
}

function buildEnrollmentLink(env: Env, request: Request, rawToken: string) {
  return `${getAppBaseUrl(env, request)}/#/totp-enroll?token=${encodeURIComponent(
    rawToken,
  )}`;
}

function isEnrollmentUsable(expiresAt: string, consumedAt: string | null) {
  return !consumedAt && expiresAt >= nowIso();
}

export async function startTotpEnrollmentHandler(request: Request, env: Env) {
  const body = await parseJsonBody<{ email?: string }>(request);
  const email = normalizeGmailEmail(body?.email);

  if (!email) {
    return badRequest("Email is required.");
  }

  if (!isAllowedEnrollmentEmail(email)) {
    return badRequest("Only @gmail.com addresses are allowed.");
  }

  const rawToken = crypto.randomUUID();
  const tokenHash = await sha256(rawToken);
  const secret = generateTotpSecret();
  const createdAt = nowIso();
  const expiresAt = addDays(
    createdAt,
    Number.parseInt(env.TOTP_ENROLLMENT_TTL_HOURS ?? "24", 10) / 24,
  );

  await env.DB.prepare(
    `
      INSERT INTO totp_enrollments (
        id,
        email,
        secret,
        token_hash,
        expires_at,
        consumed_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?)
    `,
  )
    .bind(
      crypto.randomUUID(),
      email,
      secret,
      tokenHash,
      expiresAt,
      createdAt,
    )
    .run();

  const enrollmentLink = buildEnrollmentLink(env, request, rawToken);
  let emailWasSent = false;

  try {
    await sendTotpEnrollmentEmail({
      env,
      recipient: email,
      enrollmentLink,
      expiresAt,
    });
    emailWasSent = true;
  } catch (emailError) {
    console.error("Failed to send TOTP enrollment email.", emailError);
    if (!canEchoDevEnrollmentLink(env, request)) {
      throw emailError;
    }
  }

  return json({
    ok: true,
    expiresAt,
    emailSent: emailWasSent,
    ...(canEchoDevEnrollmentLink(env, request)
      ? { devEnrollmentLink: enrollmentLink }
      : {}),
  });
}

export async function getTotpEnrollmentHandler(request: Request, env: Env) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return badRequest("Enrollment token is required.");
  }

  const enrollment = await getEnrollmentByToken(token, env);
  if (!enrollment || !isEnrollmentUsable(enrollment.expires_at, enrollment.consumed_at)) {
    return unauthorized("This TOTP enrollment link is invalid or has expired.");
  }

  const issuer = getTotpIssuer(env);
  const otpauthUrl = buildOtpAuthUri({
    issuer,
    accountName: enrollment.email,
    secret: enrollment.secret,
  });

  return json({
    ok: true,
    email: enrollment.email,
    issuer,
    secret: enrollment.secret,
    expiresAt: enrollment.expires_at,
    otpauthUrl,
  });
}

export async function completeTotpEnrollmentHandler(request: Request, env: Env) {
  const body = await parseJsonBody<{
    token?: string;
    code?: string;
    deviceName?: string;
    clientInstallationId?: string;
  }>(request);
  const token = body?.token?.trim();
  const code = body?.code?.trim();
  const deviceName = body?.deviceName?.trim();
  const clientInstallationId = body?.clientInstallationId?.trim();

  if (!token || !code || !deviceName || !clientInstallationId) {
    return badRequest(
      "Enrollment token, code, device name, and installation id are required.",
    );
  }

  const enrollment = await getEnrollmentByToken(token, env);
  if (!enrollment || !isEnrollmentUsable(enrollment.expires_at, enrollment.consumed_at)) {
    return unauthorized("This TOTP enrollment link is invalid or has expired.");
  }

  const codeIsValid = await verifyTotpCode(enrollment.secret, code);
  if (!codeIsValid) {
    return unauthorized("The TOTP code is invalid.");
  }

  const user = await upsertUser(enrollment.email, env);
  const timestamp = nowIso();

  await env.DB.batch([
    env.DB.prepare(
      `
        INSERT INTO totp_credentials (user_id, secret, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          secret = excluded.secret,
          updated_at = excluded.updated_at
      `,
    ).bind(user.id, enrollment.secret, timestamp, timestamp),
    env.DB.prepare(
      "UPDATE totp_enrollments SET consumed_at = ? WHERE id = ?",
    ).bind(timestamp, enrollment.id),
  ]);

  const device = await upsertDevice(
    env,
    user.id,
    clientInstallationId,
    deviceName,
  );
  const nextSession = await issueSession(env, user.id, device.id);

  return json({
    ok: true,
    session: {
      token: nextSession.token,
      email: enrollment.email,
      userId: user.id,
      deviceId: device.id,
      deviceName: device.name,
      clientInstallationId,
      sessionExpiresAt: nextSession.sessionExpiresAt,
      lastKnownRevision: user.latest_revision,
      lastAppliedRevision: device.last_applied_revision,
    },
  });
}

export async function loginWithTotpHandler(request: Request, env: Env) {
  const body = await parseJsonBody<{
    email?: string;
    code?: string;
    deviceName?: string;
    clientInstallationId?: string;
  }>(request);
  const email = normalizeGmailEmail(body?.email);
  const code = body?.code?.trim();
  const deviceName = body?.deviceName?.trim();
  const clientInstallationId = body?.clientInstallationId?.trim();

  if (!email || !code || !deviceName || !clientInstallationId) {
    return badRequest("Email, code, device name, and installation id are required.");
  }

  if (!isAllowedEnrollmentEmail(email)) {
    return badRequest("Only @gmail.com addresses are allowed.");
  }

  const credential = await getTotpCredentialByEmail(email, env);
  if (!credential) {
    return unauthorized("No TOTP enrollment exists for this email.");
  }

  const codeIsValid = await verifyTotpCode(credential.secret, code);
  if (!codeIsValid) {
    return unauthorized("The TOTP code is invalid.");
  }

  const user = await upsertUser(email, env);
  const device = await upsertDevice(
    env,
    user.id,
    clientInstallationId,
    deviceName,
  );
  const nextSession = await issueSession(env, user.id, device.id);

  return json({
    ok: true,
    session: {
      token: nextSession.token,
      email,
      userId: user.id,
      deviceId: device.id,
      deviceName: device.name,
      clientInstallationId,
      sessionExpiresAt: nextSession.sessionExpiresAt,
      lastKnownRevision: user.latest_revision,
      lastAppliedRevision: device.last_applied_revision,
    },
  });
}

export async function sessionHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  return json({
    ok: true,
    session,
  });
}

export async function logoutHandler(request: Request, env: Env) {
  const session = await getSessionContext(request, env);
  if (!session) {
    return unauthorized();
  }

  const tokenHash = await sha256(session.token);
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .run();

  return json({ ok: true });
}
