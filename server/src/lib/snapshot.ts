import {
  LegacyQuizStatsStoreV1,
  LegacyQuizStatsStoreV2,
  SyncSnapshot,
  WordStat,
} from "../types";
import { nowIso } from "./time";

export function normalizeWordStat(stat: Partial<WordStat> | undefined): WordStat {
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

function mergeLegacyChecksumStats(
  statsByChecksum: LegacyQuizStatsStoreV1["statsByChecksum"],
) {
  const merged: SyncSnapshot["stats"]["stats"] = {};

  for (const fileStats of Object.values(statsByChecksum)) {
    for (const [key, stat] of Object.entries(fileStats)) {
      const existing = normalizeWordStat(merged[key]);
      const incoming = normalizeWordStat(stat);

      const reverseReviewedAt = Math.max(
        existing.reverseReviewedAt,
        incoming.reverseReviewedAt,
      );

      merged[key] =
        incoming.lastReviewed > existing.lastReviewed
          ? { ...incoming, reverseReviewedAt }
          : {
              mastery: Math.max(existing.mastery, incoming.mastery),
              successCount: Math.max(existing.successCount, incoming.successCount),
              lastReviewed: Math.max(existing.lastReviewed, incoming.lastReviewed),
              reverseReviewedAt,
              exposureCount: Math.max(
                existing.exposureCount,
                incoming.exposureCount,
              ),
            };
    }
  }

  return merged;
}

function getDeletedWordListUpdatedAt(
  wordList: SyncSnapshot["deletedWordLists"][number],
) {
  return wordList.deletedAt ?? "1970-01-01T00:00:00.000Z";
}

export function normalizeSnapshotStats(input: unknown): SyncSnapshot["stats"] {
  if (!input || typeof input !== "object") {
    return {
      version: 3,
      stats: {},
    };
  }

  const maybeVersioned = input as {
    version?: number;
    stats?: LegacyQuizStatsStoreV2;
    statsByChecksum?: LegacyQuizStatsStoreV1["statsByChecksum"];
  };

  if (
    typeof maybeVersioned.version === "number" &&
    maybeVersioned.version >= 3 &&
    maybeVersioned.stats &&
    typeof maybeVersioned.stats === "object"
  ) {
    const normalizedStats: SyncSnapshot["stats"]["stats"] = {};

    for (const [key, stat] of Object.entries(maybeVersioned.stats)) {
      normalizedStats[key] = normalizeWordStat(stat);
    }

    return {
      version: 3,
      stats: normalizedStats,
    };
  }

  if (
    maybeVersioned.version === 1 &&
    maybeVersioned.statsByChecksum &&
    typeof maybeVersioned.statsByChecksum === "object"
  ) {
    return {
      version: 3,
      stats: mergeLegacyChecksumStats(maybeVersioned.statsByChecksum),
    };
  }

  const normalizedStats: SyncSnapshot["stats"]["stats"] = {};
  const flatStats = (
    maybeVersioned.stats && typeof maybeVersioned.stats === "object"
      ? maybeVersioned.stats
      : input
  ) as LegacyQuizStatsStoreV2;

  for (const [key, stat] of Object.entries(flatStats)) {
    normalizedStats[key] = normalizeWordStat(stat);
  }

  return {
    version: 3,
    stats: normalizedStats,
  };
}

export function normalizeSyncSnapshot(input: unknown): SyncSnapshot {
  const now = nowIso();
  const fallbackSnapshot = {
    version: 2,
    exportedAt: now,
    wordLists: [],
    deletedWordLists: [],
    settings: {},
    settingsUpdatedAt: "1970-01-01T00:00:00.000Z",
    stats: {
      version: 3,
      stats: {},
    },
  } satisfies SyncSnapshot;

  if (!input || typeof input !== "object") {
    return fallbackSnapshot;
  }

  const snapshot = input as Partial<SyncSnapshot> & {
    stats?: unknown;
    wordLists?: unknown;
    deletedWordLists?: unknown;
    settingsUpdatedAt?: unknown;
  };

  const exportedAt =
    typeof snapshot.exportedAt === "string" ? snapshot.exportedAt : now;
  const wordLists = Array.isArray(snapshot.wordLists)
    ? snapshot.wordLists
        .map((wordList) => {
          if (!wordList || typeof wordList !== "object") {
            return null;
          }

          const nextWordList = wordList as SyncSnapshot["wordLists"][number];
          return {
            list: Array.isArray(nextWordList.list) ? nextWordList.list : [],
            metadata: {
              name: nextWordList.metadata?.name ?? "Unnamed list",
              checksum: nextWordList.metadata?.checksum ?? "",
              updatedAt: nextWordList.metadata?.updatedAt ?? exportedAt,
            },
          };
        })
        .filter(Boolean) as SyncSnapshot["wordLists"]
    : [];
  const deletedWordLists = Array.isArray(snapshot.deletedWordLists)
    ? snapshot.deletedWordLists
        .map((wordList) => {
          if (!wordList || typeof wordList !== "object") {
            return null;
          }

          const nextWordList = wordList as SyncSnapshot["deletedWordLists"][number];
          return {
            name: nextWordList.name ?? "Unnamed list",
            deletedAt: nextWordList.deletedAt ?? exportedAt,
          };
        })
        .filter(Boolean) as SyncSnapshot["deletedWordLists"]
    : [];

  return {
    version:
      typeof snapshot.version === "number"
        ? snapshot.version
        : fallbackSnapshot.version,
    exportedAt,
    wordLists,
    deletedWordLists,
    settings: snapshot.settings ?? fallbackSnapshot.settings,
    settingsUpdatedAt:
      typeof snapshot.settingsUpdatedAt === "string"
        ? snapshot.settingsUpdatedAt
        : exportedAt,
    stats: normalizeSnapshotStats(snapshot.stats),
  };
}

function getWordListUpdatedAt(wordList: SyncSnapshot["wordLists"][number]) {
  return wordList.metadata.updatedAt ?? "1970-01-01T00:00:00.000Z";
}

function mergeDeletedWordLists(
  current: SyncSnapshot["deletedWordLists"],
  incoming: SyncSnapshot["deletedWordLists"],
) {
  const merged = new Map<string, SyncSnapshot["deletedWordLists"][number]>();

  for (const wordList of current) {
    merged.set(wordList.name, wordList);
  }

  for (const wordList of incoming) {
    const existing = merged.get(wordList.name);
    if (
      !existing ||
      getDeletedWordListUpdatedAt(wordList) >=
        getDeletedWordListUpdatedAt(existing)
    ) {
      merged.set(wordList.name, wordList);
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function resolveWordListSnapshotState(
  wordLists: SyncSnapshot["wordLists"],
  deletedWordLists: SyncSnapshot["deletedWordLists"],
) {
  const deletedWordListsByName = new Map(
    deletedWordLists.map((wordList) => [wordList.name, wordList]),
  );

  const resolvedWordLists = wordLists.filter((wordList) => {
    const deletedWordList = deletedWordListsByName.get(wordList.metadata.name);
    return (
      !deletedWordList ||
      getWordListUpdatedAt(wordList) > getDeletedWordListUpdatedAt(deletedWordList)
    );
  });
  const resolvedWordListNames = new Set(
    resolvedWordLists.map((wordList) => wordList.metadata.name),
  );
  const resolvedDeletedWordLists = deletedWordLists.filter(
    (wordList) => !resolvedWordListNames.has(wordList.name),
  );

  return {
    wordLists: resolvedWordLists,
    deletedWordLists: resolvedDeletedWordLists,
  };
}

export function mergeQuizStats(
  current: SyncSnapshot["stats"]["stats"],
  incoming: SyncSnapshot["stats"]["stats"],
) {
  const merged = { ...current };

  for (const [key, incomingStat] of Object.entries(incoming)) {
    const existingStat = normalizeWordStat(merged[key]);
    const nextIncomingStat = normalizeWordStat(incomingStat);

    if (nextIncomingStat.lastReviewed > existingStat.lastReviewed) {
      merged[key] = {
        ...nextIncomingStat,
        reverseReviewedAt: Math.max(
          existingStat.reverseReviewedAt,
          nextIncomingStat.reverseReviewedAt,
        ),
      };
      continue;
    }

    if (existingStat.lastReviewed > nextIncomingStat.lastReviewed) {
      merged[key] = {
        ...existingStat,
        reverseReviewedAt: Math.max(
          existingStat.reverseReviewedAt,
          nextIncomingStat.reverseReviewedAt,
        ),
      };
      continue;
    }

    merged[key] = {
      mastery: Math.max(existingStat.mastery, nextIncomingStat.mastery),
      successCount: Math.max(
        existingStat.successCount,
        nextIncomingStat.successCount,
      ),
      lastReviewed: Math.max(
        existingStat.lastReviewed,
        nextIncomingStat.lastReviewed,
      ),
      reverseReviewedAt: Math.max(
        existingStat.reverseReviewedAt,
        nextIncomingStat.reverseReviewedAt,
      ),
      exposureCount: Math.max(
        existingStat.exposureCount,
        nextIncomingStat.exposureCount,
      ),
    };
  }

  return merged;
}

export function mergeSnapshots(
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

  const wordListsByName = new Map<string, SyncSnapshot["wordLists"][number]>();

  for (const wordList of current.wordLists) {
    wordListsByName.set(wordList.metadata.name, wordList);
  }

  for (const wordList of incoming.wordLists) {
    const existing = wordListsByName.get(wordList.metadata.name);
    if (
      !existing ||
      getWordListUpdatedAt(wordList) >= getWordListUpdatedAt(existing)
    ) {
      wordListsByName.set(wordList.metadata.name, wordList);
    }
  }
  const resolvedWordLists = resolveWordListSnapshotState(
    Array.from(wordListsByName.values()).sort((left, right) =>
      left.metadata.name.localeCompare(right.metadata.name),
    ),
    mergeDeletedWordLists(current.deletedWordLists, incoming.deletedWordLists),
  );

  const settingsWins = incoming.settingsUpdatedAt >= current.settingsUpdatedAt;

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
