const DIRTY_FLAG_KEY = "learn-german-sync-dirty";
const DIRTY_REASON_KEY = "learn-german-sync-dirty-reason";

export const APP_DATA_CHANGED_EVENT = "learn-german-app-data-changed";

function canUseWindow() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function markLocalDataDirty(reason: string) {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.setItem(DIRTY_FLAG_KEY, "true");
  window.localStorage.setItem(DIRTY_REASON_KEY, reason);
  window.dispatchEvent(
    new CustomEvent(APP_DATA_CHANGED_EVENT, {
      detail: { reason },
    }),
  );
}

export function clearLocalDataDirty() {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.removeItem(DIRTY_FLAG_KEY);
  window.localStorage.removeItem(DIRTY_REASON_KEY);
}

export function resetLocalDataDirtyState() {
  clearLocalDataDirty();
}

export function isLocalDataDirty() {
  if (!canUseWindow()) {
    return false;
  }

  return window.localStorage.getItem(DIRTY_FLAG_KEY) === "true";
}
