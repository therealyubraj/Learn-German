import { createStatsMigrationBackup } from "./backups";
import { defaultSettings } from "../contexts/SettingsContext";
import { getBuiltInWordLists } from "../builtInWordLists";
import { getWordListChecksum } from "../lib";
import { quizEngine } from "../quiz/engine";
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

export function getWordListDirectory(newFileName?: string) {
  if (!newFileName) {
    return WORDS_DIR;
  }

  return WORDS_DIR + "/" + newFileName;
}

function getWordListPath(name: string) {
  return `${getWordListDirectory()}/${name}.json`;
}

export async function getAllWordListMetadata() {
  const wordListDirectory = getWordListDirectory();

  const allFiles = (await storage.ls(wordListDirectory)).filter(
    (x) => x.type === "file"
  );

  const allMetadata: WordListMetaData[] = [];
  for (const file of allFiles) {
    const fileContent = await storage.readFile(
      wordListDirectory + "/" + file.name
    );

    const parsedContent: StoredWordList = JSON.parse(fileContent);

    allMetadata.push(parsedContent.metadata);
  }

  return allMetadata;
}

export async function getAllWordListSummaries(): Promise<WordListSummary[]> {
  const wordListDirectory = getWordListDirectory();

  const allFiles = (await storage.ls(wordListDirectory)).filter(
    (x) => x.type === "file"
  );

  const allSummaries: WordListSummary[] = [];
  for (const file of allFiles) {
    const fileContent = await storage.readFile(
      wordListDirectory + "/" + file.name
    );

    const parsedContent: StoredWordList = JSON.parse(fileContent);

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
    const fileContent = await storage.readFile(
      wordListDirectory + "/" + file.name
    );

    const parsedContent: StoredWordList = JSON.parse(fileContent);
    quiz.words = quiz.words.concat(parsedContent.list);
  }

  sortWordListInPlace(quiz.words);
  quiz.checksum = await getWordListChecksum(quiz.words);
  quiz.stats = await getStatsForWords(quiz.words);
  return quiz;
}

export async function saveNewWordList(newList: StoredWordList) {
  const success = await storage.writeFile(
    getWordListPath(newList.metadata.name),
    JSON.stringify(newList, null, 2)
  );

  if (!success) {
    throw new Error("Could not save new list.");
  }
}

export async function getWordListByName(name: string): Promise<StoredWordList> {
  return JSON.parse(await storage.readFile(getWordListPath(name)));
}

export async function saveEditedWordList(
  name: string,
  list: WordList
): Promise<StoredWordList> {
  const sortedList = [...list];
  sortWordListInPlace(sortedList);

  const checksum = await getWordListChecksum(sortedList);

  const nextList: StoredWordList = {
    list: sortedList,
    metadata: {
      name,
      checksum,
    },
  };

  await saveNewWordList(nextList);
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
    await saveNewWordList(wordList);
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

export async function saveSettings(settings: AppSettings): Promise<void> {
  const success = await storage.writeFile(
    SETTINGS_FILE_NAME,
    JSON.stringify(settings, null, 2)
  );

  if (!success) {
    throw new Error("Could not save settings.");
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

  const migratedStore = detectedStore
    ? detectedStore.version === CURRENT_QUIZ_STATS_VERSION
      ? migrateQuizStatsStore(detectedStore)
      : await migrateDetectedQuizStatsStore(detectedStore)
    : {
        version: CURRENT_QUIZ_STATS_VERSION,
        stats: {},
      };
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

export async function writeStats(stats: QuizStat) {
  const nextStore: VersionedQuizStats = {
    version: CURRENT_QUIZ_STATS_VERSION,
    stats,
  };

  return await storage.writeFile(
    GLOBAL_QUIZ_ITEM_STATS_FILE,
    JSON.stringify(nextStore)
  );
}
