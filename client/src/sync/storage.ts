import { AuthSession } from "./types";

const SESSION_STORAGE_KEY = "learn-german-sync-session";
const CLIENT_INSTALLATION_ID_KEY = "learn-german-client-installation-id";
export const SYNC_SESSION_CHANGED_EVENT = "learn-german-sync-session-changed";

function canUseWindow() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getStoredSyncSession(): AuthSession | null {
  if (!canUseWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveStoredSyncSession(session: AuthSession) {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SYNC_SESSION_CHANGED_EVENT));
}

export function clearStoredSyncSession() {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(SYNC_SESSION_CHANGED_EVENT));
}

export function getOrCreateClientInstallationId() {
  if (!canUseWindow()) {
    return crypto.randomUUID();
  }

  const existing = window.localStorage.getItem(CLIENT_INSTALLATION_ID_KEY);
  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_INSTALLATION_ID_KEY, nextId);
  return nextId;
}

export function getDefaultDeviceName() {
  if (typeof navigator === "undefined") {
    return "Browser device";
  }

  const platform = navigator.platform || "Unknown platform";
  return `Browser on ${platform}`;
}
