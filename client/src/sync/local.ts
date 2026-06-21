const DIRTY_FLAG_KEY = "learn-german-sync-dirty";
const DIRTY_REASON_KEY = "learn-german-sync-dirty-reason";
const DIRTY_REASONS_KEY = "learn-german-sync-dirty-reasons";
const DIRTY_STAT_KEYS_KEY = "learn-german-sync-dirty-stat-keys";

export const APP_DATA_CHANGED_EVENT = "learn-german-app-data-changed";

function canUseWindow() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readJsonArray(key: string) {
  if (!canUseWindow()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, values: string[]) {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(values))));
}

function readDirtyReasons() {
  if (!canUseWindow()) {
    return [];
  }

  const reasons = readJsonArray(DIRTY_REASONS_KEY);
  const legacyReason = window.localStorage.getItem(DIRTY_REASON_KEY);

  if (legacyReason && !reasons.includes(legacyReason)) {
    reasons.push(legacyReason);
  }

  return reasons;
}

export function markLocalDataDirty(reason: string, statKeys: string[] = []) {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.setItem(DIRTY_FLAG_KEY, "true");
  window.localStorage.setItem(DIRTY_REASON_KEY, reason);
  writeJsonArray(DIRTY_REASONS_KEY, [...readDirtyReasons(), reason]);

  if (reason === "stats" && statKeys.length > 0) {
    writeJsonArray(DIRTY_STAT_KEYS_KEY, [
      ...readJsonArray(DIRTY_STAT_KEYS_KEY),
      ...statKeys,
    ]);
  }

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
  window.localStorage.removeItem(DIRTY_REASONS_KEY);
  window.localStorage.removeItem(DIRTY_STAT_KEYS_KEY);
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

export function getDirtyStatKeys() {
  return readJsonArray(DIRTY_STAT_KEYS_KEY);
}

export function hasOnlyDirtyStats() {
  if (!isLocalDataDirty()) {
    return false;
  }

  const reasons = readDirtyReasons();
  return reasons.length > 0 && reasons.every((reason) => reason === "stats");
}

export function clearDirtyStatKeys(statKeys: string[]) {
  if (!canUseWindow()) {
    return;
  }

  const statKeySet = new Set(statKeys);
  const remainingStatKeys = readJsonArray(DIRTY_STAT_KEYS_KEY).filter(
    (key) => !statKeySet.has(key),
  );

  if (remainingStatKeys.length > 0) {
    writeJsonArray(DIRTY_STAT_KEYS_KEY, remainingStatKeys);
    return;
  }

  window.localStorage.removeItem(DIRTY_STAT_KEYS_KEY);

  const remainingReasons = readDirtyReasons().filter(
    (reason) => reason !== "stats",
  );

  if (remainingReasons.length === 0) {
    clearLocalDataDirty();
    return;
  }

  writeJsonArray(DIRTY_REASONS_KEY, remainingReasons);
  window.localStorage.setItem(
    DIRTY_REASON_KEY,
    remainingReasons[remainingReasons.length - 1] ?? "",
  );
  window.localStorage.setItem(DIRTY_FLAG_KEY, "true");
}
