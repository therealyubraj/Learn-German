import { QuizStat, StoredWordList, WordStat } from "../types";
import { DeletedWordListTombstone, SyncSnapshot } from "./types";

export const DEFAULT_SYNC_TIMESTAMP = "1970-01-01T00:00:00.000Z";

function normalizeWordStat(stat: Partial<WordStat> | undefined): WordStat {
  const hasReverseReviewedAt =
    !!stat && Object.prototype.hasOwnProperty.call(stat, "reverseReviewedAt");

  return {
    mastery: stat?.mastery ?? 1,
    successCount: stat?.successCount ?? 0,
    lastReviewed: stat?.lastReviewed ?? 0,
    reverseReviewedAt: hasReverseReviewedAt
      ? stat?.reverseReviewedAt ?? 0
      : stat?.lastReviewed ?? 0,
    exposureCount: stat?.exposureCount ?? 0,
  };
}

export function getWordListUpdatedAt(wordList: StoredWordList): string {
  return wordList.metadata.updatedAt ?? DEFAULT_SYNC_TIMESTAMP;
}

export function getDeletedWordListUpdatedAt(
  wordList: DeletedWordListTombstone,
): string {
  return wordList.deletedAt ?? DEFAULT_SYNC_TIMESTAMP;
}

function mergeWordStat(current: WordStat | undefined, incoming: WordStat | undefined) {
  const nextCurrent = normalizeWordStat(current);
  const nextIncoming = normalizeWordStat(incoming);

  if (nextIncoming.lastReviewed > nextCurrent.lastReviewed) {
    return {
      ...nextIncoming,
      reverseReviewedAt: Math.max(
        nextCurrent.reverseReviewedAt,
        nextIncoming.reverseReviewedAt,
      ),
    };
  }

  if (nextCurrent.lastReviewed > nextIncoming.lastReviewed) {
    return {
      ...nextCurrent,
      reverseReviewedAt: Math.max(
        nextCurrent.reverseReviewedAt,
        nextIncoming.reverseReviewedAt,
      ),
    };
  }

  return {
    mastery: Math.max(nextCurrent.mastery, nextIncoming.mastery),
    successCount: Math.max(nextCurrent.successCount, nextIncoming.successCount),
    lastReviewed: Math.max(nextCurrent.lastReviewed, nextIncoming.lastReviewed),
    reverseReviewedAt: Math.max(
      nextCurrent.reverseReviewedAt,
      nextIncoming.reverseReviewedAt,
    ),
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

export function mergeDeletedWordListTombstones(
  current: DeletedWordListTombstone[],
  incoming: DeletedWordListTombstone[],
): DeletedWordListTombstone[] {
  const mergedByName = new Map<string, DeletedWordListTombstone>();

  for (const wordList of current) {
    mergedByName.set(wordList.name, wordList);
  }

  for (const wordList of incoming) {
    const existing = mergedByName.get(wordList.name);
    if (
      !existing ||
      getDeletedWordListUpdatedAt(wordList) >=
        getDeletedWordListUpdatedAt(existing)
    ) {
      mergedByName.set(wordList.name, wordList);
    }
  }

  return Array.from(mergedByName.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function resolveWordListSnapshotState(
  wordLists: StoredWordList[],
  deletedWordLists: DeletedWordListTombstone[],
): Pick<SyncSnapshot, "wordLists" | "deletedWordLists"> {
  const mergedWordLists = mergeWordLists([], wordLists);
  const mergedDeletedWordLists = mergeDeletedWordListTombstones(
    [],
    deletedWordLists,
  );
  const deletedWordListsByName = new Map(
    mergedDeletedWordLists.map((wordList) => [wordList.name, wordList]),
  );

  const resolvedWordLists = mergedWordLists.filter((wordList) => {
    const deletedWordList = deletedWordListsByName.get(wordList.metadata.name);
    return (
      !deletedWordList ||
      getWordListUpdatedAt(wordList) > getDeletedWordListUpdatedAt(deletedWordList)
    );
  });

  const resolvedWordListsByName = new Set(
    resolvedWordLists.map((wordList) => wordList.metadata.name),
  );

  const resolvedDeletedWordLists = mergedDeletedWordLists.filter(
    (wordList) => !resolvedWordListsByName.has(wordList.name),
  );

  return {
    wordLists: resolvedWordLists,
    deletedWordLists: resolvedDeletedWordLists,
  };
}

export function mergeSyncSnapshots(
  current: SyncSnapshot | null,
  incoming: SyncSnapshot,
): SyncSnapshot {
  if (!current) {
    return {
      ...incoming,
      ...resolveWordListSnapshotState(
        incoming.wordLists,
        incoming.deletedWordLists,
      ),
    };
  }

  const settingsWins = incoming.settingsUpdatedAt >= current.settingsUpdatedAt;
  const resolvedWordLists = resolveWordListSnapshotState(
    mergeWordLists(current.wordLists, incoming.wordLists),
    mergeDeletedWordListTombstones(
      current.deletedWordLists,
      incoming.deletedWordLists,
    ),
  );

  return {
    version: incoming.version,
    exportedAt:
      incoming.exportedAt >= current.exportedAt
        ? incoming.exportedAt
        : current.exportedAt,
    wordLists: resolvedWordLists.wordLists,
    deletedWordLists: resolvedWordLists.deletedWordLists,
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
