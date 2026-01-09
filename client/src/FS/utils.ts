import { defaultSettings } from "../contexts/SettingsContext";
import { computeChecksum } from "../hash";
import {
  AppSettings,
  QuizItem,
  QuizStat,
  RunningQuiz,
  StoredWordList,
  WordListMetaData,
  WordStat,
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
  quiz.checksum = await computeChecksum(JSON.stringify(quiz.words));
  quiz.stats = await getStatFromChecksum(quiz.checksum, quiz.words);
  return quiz;
}

export async function saveNewWordList(newList: StoredWordList) {
  const success = await storage.writeFile(
    `${getWordListDirectory()}/${newList.metadata.name}.json`,
    JSON.stringify(newList, null, 2)
  );

  if (!success) {
    throw new Error("Could not save new list.");
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
export async function getStatFromChecksum(
  checksum: string,
  allWords: QuizItem[]
): Promise<QuizStat> {
  const filename = `${STATS_DIR}/${checksum}.json`;
  if (await storage.exists(filename)) {
    return JSON.parse(await storage.readFile(filename));
  }

  const initStats: QuizStat = {};

  for (const word of allWords) {
    initStats[getQuizItemKey(word)] = {
      correct: 0,
      incorrect: 0,
    };
  }

  await storage.writeFile(filename, JSON.stringify(initStats));

  return initStats;
}

export async function writeStats(checksum: string, stats: QuizStat) {
  return await storage.writeFile(
    `${STATS_DIR}/${checksum}.json`,
    JSON.stringify(stats)
  );
}
