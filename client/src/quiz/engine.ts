import { QuizItem, QuizStat, WordStat } from "../types";
import { getQuizItemKey } from "../utils";

// Configuration for the algorithm
const MASTERY_THRESHOLD = 3; // N: Hits needed to level up
const POOL_HEALTHY_SCORE = 50; // Priority threshold to inject new words

export function selectNextWord(
  allWords: QuizItem[],
  stats: QuizStat,
  currentItem?: QuizItem
): QuizItem {
  const now = Date.now();

  const activeCandidates: { item: QuizItem; weight: number }[] = [];
  const dormantCandidates: QuizItem[] = [];

  // 1. Categorize words into Active and Dormant pools
  for (const word of allWords) {
    const key = getQuizItemKey(word);
    const stat = stats[key];

    // Prevent immediate repetition
    if (
      currentItem &&
      getQuizItemKey(currentItem) === key &&
      allWords.length > 1
    ) {
      continue;
    }

    if (stat.lastReviewed === 0) {
      dormantCandidates.push(word);
    } else {
      const hoursSince = (now - stat.lastReviewed) / (1000 * 60 * 60);
      /**
       * Priority Weight = (Time Since Last Seen / Mastery Level)
       * Lower Mastery = Higher Weight (appears more often).
       */
      const weight = ((hoursSince + 0.1) * 100) / stat.mastery;
      activeCandidates.push({ item: word, weight });
    }
  }

  // 2. Determine urgency of active pool
  const maxPriority =
    activeCandidates.length > 0
      ? Math.max(...activeCandidates.map((c) => c.weight))
      : 0;

  /**
   * 3. DECISION LADDER
   */

  // Choice A: Inject a New Word
  // If we have new words AND (the active pool is empty OR the most urgent review is fresh enough)
  if (
    dormantCandidates.length > 0 &&
    (activeCandidates.length === 0 || maxPriority < POOL_HEALTHY_SCORE)
  ) {
    return dormantCandidates[
      Math.floor(Math.random() * dormantCandidates.length)
    ];
  }

  // Choice B: Review an Active Word (Weighted Random)
  if (activeCandidates.length > 0) {
    const totalWeight = activeCandidates.reduce((sum, c) => sum + c.weight, 0);
    let randomValue = Math.random() * totalWeight;

    for (const candidate of activeCandidates) {
      randomValue -= candidate.weight;
      if (randomValue <= 0) return candidate.item;
    }
    return activeCandidates[activeCandidates.length - 1].item;
  }

  // Choice C: Final Emergency Fallback (ensures a word is always returned)
  return allWords[Math.floor(Math.random() * allWords.length)];
}

export function updateStats(
  currentStats: QuizStat,
  currentItem: QuizItem,
  guessedCorrectly: boolean
): QuizStat {
  const key = getQuizItemKey(currentItem);
  const currentStat = currentStats[key];

  let { mastery, successCount } = currentStat;

  if (guessedCorrectly) {
    successCount++;
    if (successCount >= MASTERY_THRESHOLD) {
      mastery++;
      successCount = 0;
    }
  } else {
    // Failure Penalty: reset progress to force immediate re-learning
    mastery = 1;
    successCount = 0;
  }

  return {
    ...currentStats,
    [key]: {
      mastery,
      successCount,
      lastReviewed: Date.now(), // This "activates" the word for the next run
    },
  };
}

export function getInitStats(): WordStat {
  return {
    mastery: 1,
    successCount: 0,
    lastReviewed: 0, // 0 signifies it hasn't been "activated" yet
  };
}
