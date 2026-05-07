import { QuizStat, VersionedQuizStats, WordStat } from "../types";

export const CURRENT_QUIZ_STATS_VERSION = 3;

type LegacyChecksumStatsStore = {
  version: 1;
  statsByChecksum: Record<string, QuizStat>;
};

type GlobalQuizStatsStoreV2 = {
  version: 2;
  stats: QuizStat;
};

type GlobalQuizStatsStoreV3 = VersionedQuizStats & {
  version: typeof CURRENT_QUIZ_STATS_VERSION;
};

export type AnyQuizStatsStore =
  | LegacyChecksumStatsStore
  | GlobalQuizStatsStoreV2
  | GlobalQuizStatsStoreV3;

export type QuizStatsMigrationStep = {
  fromVersion: number;
  toVersion: number;
};

function normalizeWordStat(stat: Partial<WordStat> | undefined): WordStat {
  return {
    mastery: stat?.mastery ?? 1,
    successCount: stat?.successCount ?? 0,
    lastReviewed: stat?.lastReviewed ?? 0,
    exposureCount: stat?.exposureCount ?? 0,
  };
}

function mergeWordStat(
  current: WordStat | undefined,
  incoming: Partial<WordStat> | undefined,
): WordStat {
  const nextCurrent = normalizeWordStat(current);
  const nextIncoming = normalizeWordStat(incoming);

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

function normalizeQuizStatMap(stats: QuizStat): QuizStat {
  const normalizedStats: QuizStat = {};

  for (const [key, stat] of Object.entries(stats)) {
    normalizedStats[key] = normalizeWordStat(stat);
  }

  return normalizedStats;
}

function migrateV1ToV2(store: LegacyChecksumStatsStore): GlobalQuizStatsStoreV2 {
  const mergedStats: QuizStat = {};

  for (const fileStats of Object.values(store.statsByChecksum)) {
    for (const [key, stat] of Object.entries(fileStats)) {
      mergedStats[key] = mergeWordStat(mergedStats[key], stat);
    }
  }

  return {
    version: 2,
    stats: mergedStats,
  };
}

function migrateV2ToV3(store: GlobalQuizStatsStoreV2): GlobalQuizStatsStoreV3 {
  return {
    version: CURRENT_QUIZ_STATS_VERSION,
    stats: normalizeQuizStatMap(store.stats),
  };
}

export function migrateQuizStatsStoreOneStep(
  store: AnyQuizStatsStore,
): AnyQuizStatsStore {
  switch (store.version) {
    case 1:
      return migrateV1ToV2(store);
    case 2:
      return migrateV2ToV3(store);
    case CURRENT_QUIZ_STATS_VERSION:
      return {
        ...store,
        stats: normalizeQuizStatMap(store.stats),
      };
    default:
      throw new Error(`Unsupported quiz stats version: ${store.version}`);
  }
}

export function getQuizStatsMigrationSteps(
  fromVersion: number,
): QuizStatsMigrationStep[] {
  const steps: QuizStatsMigrationStep[] = [];
  let currentVersion = fromVersion;

  while (currentVersion < CURRENT_QUIZ_STATS_VERSION) {
    steps.push({
      fromVersion: currentVersion,
      toVersion: currentVersion + 1,
    });
    currentVersion += 1;
  }

  return steps;
}

export function migrateQuizStatsStore(
  store: AnyQuizStatsStore,
): GlobalQuizStatsStoreV3 {
  let nextStore: AnyQuizStatsStore = store;

  while (nextStore.version < CURRENT_QUIZ_STATS_VERSION) {
    nextStore = migrateQuizStatsStoreOneStep(nextStore);
  }

  if (nextStore.version !== CURRENT_QUIZ_STATS_VERSION) {
    throw new Error(`Unsupported quiz stats version: ${nextStore.version}`);
  }

  return migrateQuizStatsStoreOneStep(nextStore) as GlobalQuizStatsStoreV3;
}
