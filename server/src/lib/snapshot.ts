import {
  LegacyQuizStatsStoreV1,
  LegacyQuizStatsStoreV2,
  SyncSnapshot,
  WordStat,
} from "../types";
import { nowIso } from "./time";

export function normalizeWordStat(stat: Partial<WordStat> | undefined): WordStat {
  return {
    mastery: stat?.mastery ?? 1,
    successCount: stat?.successCount ?? 0,
    lastReviewed: stat?.lastReviewed ?? 0,
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

      merged[key] =
        incoming.lastReviewed > existing.lastReviewed
          ? incoming
          : {
              mastery: Math.max(existing.mastery, incoming.mastery),
              successCount: Math.max(existing.successCount, incoming.successCount),
              lastReviewed: Math.max(existing.lastReviewed, incoming.lastReviewed),
              exposureCount: Math.max(
                existing.exposureCount,
                incoming.exposureCount,
              ),
            };
    }
  }

  return merged;
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
    version: 1,
    exportedAt: now,
    wordLists: [],
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

  return {
    version:
      typeof snapshot.version === "number"
        ? snapshot.version
        : fallbackSnapshot.version,
    exportedAt,
    wordLists,
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

export function mergeQuizStats(
  current: SyncSnapshot["stats"]["stats"],
  incoming: SyncSnapshot["stats"]["stats"],
) {
  const merged = { ...current };

  for (const [key, incomingStat] of Object.entries(incoming)) {
    const existingStat = normalizeWordStat(merged[key]);
    const nextIncomingStat = normalizeWordStat(incomingStat);

    if (nextIncomingStat.lastReviewed > existingStat.lastReviewed) {
      merged[key] = nextIncomingStat;
      continue;
    }

    if (existingStat.lastReviewed > nextIncomingStat.lastReviewed) {
      merged[key] = existingStat;
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
    return incoming;
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

  const settingsWins = incoming.settingsUpdatedAt >= current.settingsUpdatedAt;

  return {
    version: incoming.version,
    exportedAt:
      incoming.exportedAt >= current.exportedAt
        ? incoming.exportedAt
        : current.exportedAt,
    wordLists: Array.from(wordListsByName.values()).sort((left, right) =>
      left.metadata.name.localeCompare(right.metadata.name),
    ),
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
