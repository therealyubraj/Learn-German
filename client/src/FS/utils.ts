import { createStatsMigrationBackup } from "./backups";
import { defaultSettings } from "../contexts/SettingsContext";
import { getBuiltInWordLists } from "../builtInWordLists";
import { getWordListChecksum } from "../lib";
import { quizEngine } from "../quiz/engine";
import {
  APP_SNAPSHOT_VERSION,
  type SyncSnapshot,
} from "../sync/types";
import {
  DEFAULT_SYNC_TIMESTAMP,
  getWordListUpdatedAt,
  mergeQuizStats,
} from "../sync/merge";
import { markLocalDataDirty } from "../sync/local";
import { assertSyncMutationAllowed } from "../sync/runtime";
import {
  AnyQuizStatsStore,
  CURRENT_QUIZ_STATS_VERSION,
  getQuizStatsMigrationSteps,
  migrateQuizStatsStoreOneStep,
  migrateQuizStatsStore,
} from "../stats/migrations";
import {
  AppSettings,
  QuizItem,
  QuizStat,
  RunningQuiz,
  StoredWordList,
  VersionedQuizStats,
  WordList,
  WordListMetaData,
  WordListSummary,
} from "../types";
import { getQuizItemKey, sortWordListInPlace } from "../utils";
import { storage } from "./Storage";

const WORDS_DIR = "wordlists";
const SYNC_DIR = "sync";
const LOCAL_SYNC_METADATA_FILE = `${SYNC_DIR}/local-sync-metadata.json`;

export function getWordListDirectory(newFileName?: string) {
  if (!newFileName) {
    return WORDS_DIR;
  }

  return WORDS_DIR + "/" + newFileName;
}

function getWordListPath(name: string) {
  return `${getWordListDirectory()}/${name}.json`;
}

type LocalSyncMetadata = {
  settingsUpdatedAt: string;
};

type SaveMutationOptions = {
  markDirty?: boolean;
};

type SaveWordListOptions = SaveMutationOptions & {
  updatedAt?: string;
};

type SaveSettingsOptions = SaveMutationOptions & {
  updatedAt?: string;
};

function getCurrentTimestamp() {
  return new Date().toISOString();
}

async function readLocalSyncMetadata(): Promise<LocalSyncMetadata> {
  try {
    const raw = await storage.readFile(LOCAL_SYNC_METADATA_FILE);
    const parsed = JSON.parse(raw) as Partial<LocalSyncMetadata>;
    return {
      settingsUpdatedAt: parsed.settingsUpdatedAt ?? DEFAULT_SYNC_TIMESTAMP,
    };
  } catch {
    return {
      settingsUpdatedAt: DEFAULT_SYNC_TIMESTAMP,
    };
  }
}

async function writeLocalSyncMetadata(metadata: LocalSyncMetadata) {
  const success = await storage.writeFile(
    LOCAL_SYNC_METADATA_FILE,
    JSON.stringify(metadata, null, 2),
  );

  if (!success) {
    throw new Error("Could not save local sync metadata.");
  }
}

function normalizeStoredWordList(
  storedWordList: StoredWordList,
  fallbackUpdatedAt = DEFAULT_SYNC_TIMESTAMP,
): StoredWordList {
  return {
    ...storedWordList,
    metadata: {
      ...storedWordList.metadata,
      updatedAt: storedWordList.metadata.updatedAt ?? fallbackUpdatedAt,
    },
  };
}

async function parseStoredWordListFile(path: string): Promise<StoredWordList> {
  return normalizeStoredWordList(JSON.parse(await storage.readFile(path)));
}

export async function getAllWordListMetadata() {
  const wordListDirectory = getWordListDirectory();

  const allFiles = (await storage.ls(wordListDirectory)).filter(
    (x) => x.type === "file"
  );

  const allMetadata: WordListMetaData[] = [];
  for (const file of allFiles) {
    const parsedContent = await parseStoredWordListFile(
      wordListDirectory + "/" + file.name,
    );
    allMetadata.push(parsedContent.metadata);
  }

  return allMetadata;
}

export async function getAllStoredWordLists(): Promise<StoredWordList[]> {
  const wordListDirectory = getWordListDirectory();

  const allFiles = (await storage.ls(wordListDirectory)).filter(
    (x) => x.type === "file",
  );

  const allLists: StoredWordList[] = [];
  for (const file of allFiles) {
    allLists.push(
      await parseStoredWordListFile(wordListDirectory + "/" + file.name),
    );
  }

  return allLists.sort((left, right) =>
    left.metadata.name.localeCompare(right.metadata.name),
  );
}

export async function getAllWordListSummaries(): Promise<WordListSummary[]> {
  const allSummaries: WordListSummary[] = [];
  for (const parsedContent of await getAllStoredWordLists()) {
    allSummaries.push({
      ...parsedContent.metadata,
      wordCount: parsedContent.list.length,
    });
  }

  return allSummaries.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCombinedWordLists(
  listNames: Array<string>
): Promise<RunningQuiz> {
  const wordListDirectory = getWordListDirectory();

  const allFiles = (await storage.ls(wordListDirectory)).filter(
    (x) => x.type === "file" && listNames.includes(x.name.split(".")[0])
  );

  const quiz: RunningQuiz = {
    checksum: "",
    words: [],
    stats: {},
  };

  for (const file of allFiles) {
    const parsedContent = await parseStoredWordListFile(
      wordListDirectory + "/" + file.name,
    );
    quiz.words = quiz.words.concat(parsedContent.list);
  }

  sortWordListInPlace(quiz.words);
  quiz.checksum = await getWordListChecksum(quiz.words);
  quiz.stats = await getStatsForWords(quiz.words);
  return quiz;
}

export async function saveNewWordList(
  newList: StoredWordList,
  options: SaveWordListOptions = {},
) {
  if (options.markDirty ?? true) {
    assertSyncMutationAllowed();
  }

  const normalizedWordList = normalizeStoredWordList(newList, options.updatedAt);
  const nextWordList = {
    ...normalizedWordList,
    metadata: {
      ...normalizedWordList.metadata,
      updatedAt: options.updatedAt ?? normalizedWordList.metadata.updatedAt ?? getCurrentTimestamp(),
    },
  };
  const success = await storage.writeFile(
    getWordListPath(nextWordList.metadata.name),
    JSON.stringify(nextWordList, null, 2)
  );

  if (!success) {
    throw new Error("Could not save new list.");
  }

  if (options.markDirty ?? true) {
    markLocalDataDirty("wordlists");
  }
}

export async function getWordListByName(name: string): Promise<StoredWordList> {
  return parseStoredWordListFile(getWordListPath(name));
}

export async function deleteWordListByName(
  name: string,
  options: SaveMutationOptions = {},
): Promise<void> {
  if (options.markDirty ?? true) {
    assertSyncMutationAllowed();
  }

  const success = await storage.deleteFile(getWordListPath(name));

  if (!success) {
    throw new Error("Could not delete word set.");
  }

  if (options.markDirty ?? true) {
    markLocalDataDirty("wordlists");
  }
}

export async function saveEditedWordList(
  name: string,
  list: WordList,
  options: SaveWordListOptions = {},
): Promise<StoredWordList> {
  const sortedList = [...list];
  sortWordListInPlace(sortedList);

  const checksum = await getWordListChecksum(sortedList);

  const nextList: StoredWordList = {
    list: sortedList,
    metadata: {
      name,
      checksum,
      updatedAt: options.updatedAt ?? getCurrentTimestamp(),
    },
  };

  await saveNewWordList(nextList, options);
  return nextList;
}

export async function initializeBuiltInWordLists() {
  const wordListDirectory = getWordListDirectory();
  const existingFiles = (await storage.ls(wordListDirectory)).filter(
    (x) => x.type === "file"
  );

  if (existingFiles.length > 0) {
    return;
  }

  const builtInWordLists = await getBuiltInWordLists();
  for (const wordList of builtInWordLists) {
    await saveNewWordList(wordList, { markDirty: false });
  }
}

const SETTINGS_FILE_NAME = "settings.json";
export async function readSavedSettings(): Promise<AppSettings> {
  try {
    const settingsContent = await storage.readFile(SETTINGS_FILE_NAME);
    const savedSettings = JSON.parse(settingsContent);

    // Merge saved settings with defaults to ensure all keys are present
    return {
      ...defaultSettings,
      ...savedSettings,
      vim: {
        ...defaultSettings.vim,
        ...savedSettings.vim,
      },
      quiz: {
        ...defaultSettings.quiz,
        ...savedSettings.quiz,
      },
      tts: {
        ...defaultSettings.tts,
        ...savedSettings.tts,
      },
    };
  } catch (error) {
    console.warn("Could not read settings, using defaults.", error);
    return defaultSettings;
  }
}

export async function saveSettings(
  settings: AppSettings,
  options: SaveSettingsOptions = {},
): Promise<void> {
  if (options.markDirty ?? true) {
    assertSyncMutationAllowed();
  }

  const success = await storage.writeFile(
    SETTINGS_FILE_NAME,
    JSON.stringify(settings, null, 2)
  );

  if (!success) {
    throw new Error("Could not save settings.");
  }

  await writeLocalSyncMetadata({
    settingsUpdatedAt: options.updatedAt ?? getCurrentTimestamp(),
  });

  if (options.markDirty ?? true) {
    markLocalDataDirty("settings");
  }
}

const STATS_DIR = "stats";
const GLOBAL_QUIZ_ITEM_STATS_FILE = `${STATS_DIR}/quiz-item-stats.json`;

function isVersionedQuizStats(value: unknown): value is VersionedQuizStats {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeStats = value as Partial<VersionedQuizStats>;
  return (
    typeof maybeStats.version === "number" &&
    !!maybeStats.stats &&
    typeof maybeStats.stats === "object"
  );
}

async function readLegacyChecksumStatsStore(): Promise<AnyQuizStatsStore> {
  const statFiles = (await storage.ls(STATS_DIR)).filter(
    (entry) =>
      entry.type === "file" &&
      entry.name.endsWith(".json") &&
      entry.name !== "quiz-item-stats.json"
  );

  const statsByChecksum: Record<string, QuizStat> = {};

  for (const file of statFiles) {
    const checksum = file.name.replace(/\.json$/, "");
    statsByChecksum[checksum] = JSON.parse(
      await storage.readFile(`${STATS_DIR}/${file.name}`)
    );
  }

  return {
    version: 1,
    statsByChecksum,
  };
}

async function readDetectedQuizStatsStore(): Promise<AnyQuizStatsStore | null> {
  if (!(await storage.exists(GLOBAL_QUIZ_ITEM_STATS_FILE))) {
    const legacyStore = await readLegacyChecksumStatsStore();
    return Object.keys(legacyStore.statsByChecksum).length > 0 ? legacyStore : null;
  }

  const parsedGlobalStats = JSON.parse(
    await storage.readFile(GLOBAL_QUIZ_ITEM_STATS_FILE)
  ) as unknown;

  if (isVersionedQuizStats(parsedGlobalStats)) {
    return {
      version: parsedGlobalStats.version,
      stats: parsedGlobalStats.stats,
    };
  }

  return {
    version: 2,
    stats: parsedGlobalStats as QuizStat,
  };
}

async function persistQuizStatsStore(store: AnyQuizStatsStore) {
  if (store.version === 1) {
    return;
  }

  const payload =
    store.version === 2
      ? store.stats
      : {
          version: store.version,
          stats: store.stats,
        };

  const success = await storage.writeFile(
    GLOBAL_QUIZ_ITEM_STATS_FILE,
    JSON.stringify(payload)
  );

  if (!success) {
    throw new Error("Could not save quiz item stats.");
  }
}

export async function readVersionedQuizStats(): Promise<VersionedQuizStats> {
  const globalStatsExists = await storage.exists(GLOBAL_QUIZ_ITEM_STATS_FILE);
  const detectedStore = await readDetectedQuizStatsStore();

  const migratedStore = detectedStore
    ? detectedStore.version === CURRENT_QUIZ_STATS_VERSION
      ? migrateQuizStatsStore(detectedStore)
      : await migrateDetectedQuizStatsStore(detectedStore)
    : {
        version: CURRENT_QUIZ_STATS_VERSION,
        stats: {},
      };

  if (
    !globalStatsExists ||
    !detectedStore ||
    detectedStore.version !== CURRENT_QUIZ_STATS_VERSION
  ) {
    await persistQuizStatsStore(migratedStore);
  }

  return migratedStore;
}

async function migrateDetectedQuizStatsStore(
  detectedStore: AnyQuizStatsStore
): Promise<VersionedQuizStats> {
  const migrationSteps = getQuizStatsMigrationSteps(detectedStore.version);
  let nextStore: AnyQuizStatsStore = detectedStore;

  for (const [index, step] of migrationSteps.entries()) {
    await createStatsMigrationBackup(step, index + 1, migrationSteps.length);
    nextStore = migrateQuizStatsStoreOneStep(nextStore);
    await persistQuizStatsStore(nextStore);
  }

  return migrateQuizStatsStore(nextStore);
}

function ensureWordStatsExist(stats: QuizStat, allWords: QuizItem[]) {
  let didChange = false;

  for (const word of allWords) {
    const key = getQuizItemKey(word);
    if (stats[key]) {
      continue;
    }

    stats[key] = quizEngine.emptyWordStat();
    didChange = true;
  }

  return didChange;
}

export async function getStatsForWords(allWords: QuizItem[]): Promise<QuizStat> {
  const globalStatsExists = await storage.exists(GLOBAL_QUIZ_ITEM_STATS_FILE);
  const detectedStore = await readDetectedQuizStatsStore();
  const migratedStore = await readVersionedQuizStats();
  const nextStats = migratedStore.stats;

  const shouldRewriteVersionedStore =
    !globalStatsExists ||
    !detectedStore ||
    detectedStore.version !== CURRENT_QUIZ_STATS_VERSION;

  const didAddMissingWordStats = ensureWordStatsExist(nextStats, allWords);

  if (shouldRewriteVersionedStore || didAddMissingWordStats) {
    const nextStore: VersionedQuizStats = {
      version: CURRENT_QUIZ_STATS_VERSION,
      stats: nextStats,
    };
    await persistQuizStatsStore(nextStore);
  }

  return nextStats;
}

export async function writeStats(
  stats: QuizStat,
  options: SaveMutationOptions = {},
) {
  if (options.markDirty ?? true) {
    assertSyncMutationAllowed();
  }

  const nextStore: VersionedQuizStats = {
    version: CURRENT_QUIZ_STATS_VERSION,
    stats,
  };

  const success = await storage.writeFile(
    GLOBAL_QUIZ_ITEM_STATS_FILE,
    JSON.stringify(nextStore)
  );

  if (success && (options.markDirty ?? true)) {
    markLocalDataDirty("stats");
  }

  return success;
}

export async function getLocalAppSnapshot(): Promise<SyncSnapshot> {
  const [wordLists, settings, settingsMeta, stats] = await Promise.all([
    getAllStoredWordLists(),
    readSavedSettings(),
    readLocalSyncMetadata(),
    readVersionedQuizStats(),
  ]);

  const exportedAt = getCurrentTimestamp();

  return {
    version: APP_SNAPSHOT_VERSION,
    exportedAt,
    wordLists: wordLists.map((wordList) =>
      normalizeStoredWordList(wordList, exportedAt),
    ),
    settings,
    settingsUpdatedAt: settingsMeta.settingsUpdatedAt,
    stats,
  };
}

export async function applySyncSnapshot(snapshot: SyncSnapshot): Promise<void> {
  const [localWordLists, localSettingsMeta, localStatsStore] = await Promise.all(
    [getAllStoredWordLists(), readLocalSyncMetadata(), readVersionedQuizStats()],
  );

  const localWordListsByName = new Map(
    localWordLists.map((wordList) => [wordList.metadata.name, wordList]),
  );

  for (const incomingWordList of snapshot.wordLists) {
    const normalizedIncomingWordList = normalizeStoredWordList(
      incomingWordList,
      snapshot.exportedAt,
    );
    const currentWordList = localWordListsByName.get(
      normalizedIncomingWordList.metadata.name,
    );

    if (
      !currentWordList ||
      getWordListUpdatedAt(normalizedIncomingWordList) >
        getWordListUpdatedAt(currentWordList)
    ) {
      await saveNewWordList(normalizedIncomingWordList, {
        markDirty: false,
        updatedAt: normalizedIncomingWordList.metadata.updatedAt,
      });
    }
  }

  if (snapshot.settingsUpdatedAt > localSettingsMeta.settingsUpdatedAt) {
    await saveSettings(snapshot.settings, {
      markDirty: false,
      updatedAt: snapshot.settingsUpdatedAt,
    });
  }

  const mergedStats = mergeQuizStats(localStatsStore.stats, snapshot.stats.stats);
  await writeStats(mergedStats, { markDirty: false });
}
