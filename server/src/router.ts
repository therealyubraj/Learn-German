import {
  completeTotpEnrollmentHandler,
  getTotpEnrollmentHandler,
  loginWithTotpHandler,
  logoutHandler,
  startTotpEnrollmentHandler,
  sessionHandler,
} from "./handlers/auth";
import {
  ackHandler,
  markDirtyHandler,
  pullHandler,
  pushHandler,
  statusHandler,
} from "./handlers/sync";
import { notFound } from "./lib/http";
import { Env } from "./types";

export async function route(request: Request, env: Env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (
    url.pathname === "/api/auth/totp-enrollment/start" &&
    request.method === "POST"
  ) {
    return startTotpEnrollmentHandler(request, env);
  }

  if (
    url.pathname === "/api/auth/totp-enrollment" &&
    request.method === "GET"
  ) {
    return getTotpEnrollmentHandler(request, env);
  }

  if (
    url.pathname === "/api/auth/totp-enrollment/complete" &&
    request.method === "POST"
  ) {
    return completeTotpEnrollmentHandler(request, env);
  }

  if (url.pathname === "/api/auth/totp-login" && request.method === "POST") {
    return loginWithTotpHandler(request, env);
  }

  if (url.pathname === "/api/auth/session" && request.method === "GET") {
    return sessionHandler(request, env);
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    return logoutHandler(request, env);
  }

  if (url.pathname === "/api/sync/status" && request.method === "GET") {
    return statusHandler(request, env);
  }

  if (url.pathname === "/api/sync/mark-dirty" && request.method === "POST") {
    return markDirtyHandler(request, env);
  }

  if (url.pathname === "/api/sync/push" && request.method === "POST") {
    return pushHandler(request, env);
  }

  if (url.pathname === "/api/sync/pull" && request.method === "GET") {
    return pullHandler(request, env);
  }

  if (url.pathname === "/api/sync/ack" && request.method === "POST") {
    return ackHandler(request, env);
  }

  return notFound();
}
