import {
  PullSnapshotResponse,
  PushStatsDeltaResponse,
  PushSnapshotResponse,
  StartTotpEnrollmentResponse,
  StatsDelta,
  SyncSnapshot,
  SyncStatusResponse,
  TotpEnrollmentDetailsResponse,
  VerifyOtpResponse,
} from "./types";

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_SYNC_API_BASE?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return "/api";
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed with ${response.status}.`);
  }

  if (!payload) {
    throw new Error("Server returned an empty response.");
  }

  return payload as T;
}

export function startTotpEnrollment(email: string) {
  return request<StartTotpEnrollmentResponse>("/auth/totp-enrollment/start", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function getTotpEnrollment(token: string) {
  return request<TotpEnrollmentDetailsResponse>(
    `/auth/totp-enrollment?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
    },
  );
}

export function completeTotpEnrollment(
  token: string,
  code: string,
  deviceName: string,
  clientInstallationId: string,
) {
  return request<VerifyOtpResponse>("/auth/totp-enrollment/complete", {
    method: "POST",
    body: JSON.stringify({
      token,
      code,
      deviceName,
      clientInstallationId,
    }),
  });
}

export function loginWithTotp(
  email: string,
  code: string,
  deviceName: string,
  clientInstallationId: string,
) {
  return request<VerifyOtpResponse>("/auth/totp-login", {
    method: "POST",
    body: JSON.stringify({
      email,
      code,
      deviceName,
      clientInstallationId,
    }),
  });
}

export function getSession(token: string) {
  return request<VerifyOtpResponse>("/auth/session", {
    method: "GET",
    token,
  });
}

export function logout(token: string) {
  return request<{ ok: true }>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export function getSyncStatus(token: string) {
  return request<SyncStatusResponse>("/sync/status", {
    method: "GET",
    token,
  });
}

export function markRemoteDeviceDirty(token: string) {
  return request<{ ok: true }>("/sync/mark-dirty", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}

export function pushSyncSnapshot(token: string, snapshot: SyncSnapshot) {
  return request<PushSnapshotResponse>("/sync/push", {
    method: "POST",
    token,
    body: JSON.stringify({ snapshot }),
  });
}

export function pushStatsDelta(token: string, delta: StatsDelta) {
  return request<PushStatsDeltaResponse>("/sync/push-stats-delta", {
    method: "POST",
    token,
    body: JSON.stringify({ delta }),
  });
}

export function pullSyncSnapshot(token: string) {
  return request<PullSnapshotResponse>("/sync/pull", {
    method: "GET",
    token,
  });
}

export function acknowledgeSyncRevision(token: string, revision: number) {
  return request<{ ok: true }>("/sync/ack", {
    method: "POST",
    token,
    body: JSON.stringify({ revision }),
  });
}
