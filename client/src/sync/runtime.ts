const SYNC_RUNTIME_SESSION_KEY = "learn-german-sync-runtime-session";
const SYNC_RUNTIME_REQUIRES_SYNC_KEY =
  "learn-german-sync-runtime-requires-sync";

type SyncMutationRuntimeState = {
  hasSession: boolean;
  requiresSync: boolean;
};

function canUseWindow() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function setSyncMutationRuntimeState(state: SyncMutationRuntimeState) {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.setItem(
    SYNC_RUNTIME_SESSION_KEY,
    state.hasSession ? "true" : "false",
  );
  window.localStorage.setItem(
    SYNC_RUNTIME_REQUIRES_SYNC_KEY,
    state.requiresSync ? "true" : "false",
  );
}

export function clearSyncMutationRuntimeState() {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.removeItem(SYNC_RUNTIME_SESSION_KEY);
  window.localStorage.removeItem(SYNC_RUNTIME_REQUIRES_SYNC_KEY);
}

function hasLoggedInSyncSession() {
  if (!canUseWindow()) {
    return false;
  }

  return window.localStorage.getItem(SYNC_RUNTIME_SESSION_KEY) === "true";
}

function requiresSyncBeforeMutations() {
  if (!canUseWindow()) {
    return false;
  }

  return (
    window.localStorage.getItem(SYNC_RUNTIME_REQUIRES_SYNC_KEY) === "true"
  );
}

export function assertSyncMutationAllowed() {
  if (!hasLoggedInSyncSession()) {
    return;
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error(
      "This device is offline. Reconnect to the internet before changing synced data.",
    );
  }

  if (requiresSyncBeforeMutations()) {
    throw new Error(
      "Another device has newer changes. Sync this device before making more edits.",
    );
  }
}
