import { QuizStat, StoredWordList, WordStat } from "../types";
import { SyncSnapshot } from "./types";

export const DEFAULT_SYNC_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function normalizeWordStat(stat: Partial<WordStat> | undefined): WordStat {
  return {
    mastery: stat?.mastery ?? 1,
    successCount: stat?.successCount ?? 0,
    lastReviewed: stat?.lastReviewed ?? 0,
    exposureCount: stat?.exposureCount ?? 0,
  };
}

export function getWordListUpdatedAt(wordList: StoredWordList): string {
  return wordList.metadata.updatedAt ?? DEFAULT_SYNC_TIMESTAMP;
}

function mergeWordStat(current: WordStat | undefined, incoming: WordStat | undefined) {
  const nextCurrent = normalizeWordStat(current);
  const nextIncoming = normalizeWordStat(incoming);

  if (nextIncoming.lastReviewed > nextCurrent.lastReviewed) {
    return nextIncoming;
  }

  if (nextCurrent.lastReviewed > nextIncoming.lastReviewed) {
    return nextCurrent;
  }

  return {
    mastery: Math.max(nextCurrent.mastery, nextIncoming.mastery),
    successCount: Math.max(nextCurrent.successCount, nextIncoming.successCount),
    lastReviewed: Math.max(nextCurrent.lastReviewed, nextIncoming.lastReviewed),
    exposureCount: Math.max(
      nextCurrent.exposureCount,
      nextIncoming.exposureCount,
    ),
  };
}

export function mergeQuizStats(current: QuizStat, incoming: QuizStat): QuizStat {
  const merged: QuizStat = { ...current };

  for (const [key, incomingStat] of Object.entries(incoming)) {
    merged[key] = mergeWordStat(merged[key], incomingStat);
  }

  return merged;
}

function mergeWordLists(
  current: StoredWordList[],
  incoming: StoredWordList[],
): StoredWordList[] {
  const mergedByName = new Map<string, StoredWordList>();

  for (const wordList of current) {
    mergedByName.set(wordList.metadata.name, wordList);
  }

  for (const wordList of incoming) {
    const existing = mergedByName.get(wordList.metadata.name);
    if (!existing || getWordListUpdatedAt(wordList) >= getWordListUpdatedAt(existing)) {
      mergedByName.set(wordList.metadata.name, wordList);
    }
  }

  return Array.from(mergedByName.values()).sort((left, right) =>
    left.metadata.name.localeCompare(right.metadata.name),
  );
}

export function mergeSyncSnapshots(
  current: SyncSnapshot | null,
  incoming: SyncSnapshot,
): SyncSnapshot {
  if (!current) {
    return incoming;
  }

  const settingsWins = incoming.settingsUpdatedAt >= current.settingsUpdatedAt;

  return {
    version: incoming.version,
    exportedAt:
      incoming.exportedAt >= current.exportedAt
        ? incoming.exportedAt
        : current.exportedAt,
    wordLists: mergeWordLists(current.wordLists, incoming.wordLists),
    settings: settingsWins ? incoming.settings : current.settings,
    settingsUpdatedAt: settingsWins
      ? incoming.settingsUpdatedAt
      : current.settingsUpdatedAt,
    stats: {
      version: incoming.stats.version,
      stats: mergeQuizStats(current.stats.stats, incoming.stats.stats),
    },
  };
}
