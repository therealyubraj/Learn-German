import { QuizItem, QuizStat, WordStat } from "../types";
import { getQuizItemKey } from "../utils";

export function selectNextWord(
  checksum: string,
  allWords: QuizItem[],
  stats: { [key: string]: WordStat },
  currentItem?: QuizItem
) {
  let i = Math.floor(Math.random() * allWords.length);
  while (currentItem === allWords[i] || allWords.length < 2) {
    i = Math.floor(Math.random() * allWords.length);
  }
  return allWords[i];
}

export function updateStats(
  currentStats: QuizStat,
  currentItem: QuizItem,
  guessedCorrectly: boolean
): QuizStat {
  const newStats: QuizStat = {};

  const allKeys = Object.keys(currentStats);
  const currentItemKey = getQuizItemKey(currentItem);

  for (const k of allKeys) {
    newStats[k] = currentStats[k];
  }

  if (guessedCorrectly) {
    newStats[currentItemKey].correct++;
  } else {
    newStats[currentItemKey].incorrect++;
  }

  return newStats;
}
