import { QuizItem, WordStat } from "../types";
import { getQuizItemKey } from "../utils";
import { RunningQuiz } from "../types";

class QuizEngine {
  private words: QuizItem[] = [];
  private stats: RunningQuiz["stats"] = {};
  private checksum: string | null = null;

  // session-only memory (NOT persisted)
  private recentlyShownKeys: string[] = [];

  // ---- Tunables ----
  private readonly MAX_LEARNING_SIZE = 7;
  private readonly TARGET_MASTERY = 3;
  private readonly MASTERY_SUCCESS_THRESHOLD = 3;
  private readonly MIN_EXPOSURES_FOR_MASTERY = 5;
  private readonly RECENT_EXCLUSION_SIZE = 2;
  private readonly NOVELTY_LEAK_PROBABILITY = 0.15;

  constructor() {}

  public emptyWordStat(): WordStat {
    return {
      exposureCount: 0,
      lastReviewed: 0,
      mastery: 1,
      successCount: 0,
    };
  }

  public getStats() {
    return this.stats;
  }

  public getChecksum() {
    return this.checksum;
  }

  // ---- Engine reset on new quiz ----
  resetEngine(runningQuiz: RunningQuiz) {
    this.words = runningQuiz.words;
    this.stats = runningQuiz.stats;
    this.checksum = runningQuiz.checksum;
    this.recentlyShownKeys = [];

    // Defensive normalization (important)
    for (const word of this.words) {
      const key = getQuizItemKey(word);
      const stat = this.stats[key];

      // stats should exist, but be defensive
      if (!stat) continue;

      if (stat.exposureCount === undefined) {
        stat.exposureCount = 0;
      }
    }
  }

  // ---- Selection ----
  selectNextWord(): QuizItem {
    const now = Date.now();

    const learning: QuizItem[] = [];
    const dormant: QuizItem[] = [];

    for (const word of this.words) {
      const stat = this.stats[getQuizItemKey(word)];
      if (!stat) continue;

      if (stat.lastReviewed === 0) {
        dormant.push(word);
      } else if (stat.mastery < this.TARGET_MASTERY) {
        learning.push(word);
      }
    }

    // 1. Fill learning set if under capacity
    if (learning.length < this.MAX_LEARNING_SIZE && dormant.length > 0) {
      return this.activateDormantWord(dormant);
    }

    // 2. Soft novelty leak
    if (
      learning.length >= this.MAX_LEARNING_SIZE &&
      dormant.length > 0 &&
      Math.random() < this.NOVELTY_LEAK_PROBABILITY
    ) {
      return this.activateDormantWord(dormant);
    }

    // 3. Fair rotation among learning words
    const eligible = learning.filter((word) => {
      const key = getQuizItemKey(word);
      return !this.recentlyShownKeys.includes(key);
    });

    const pool = eligible.length > 0 ? eligible : learning;

    pool.sort((a, b) => {
      const sa = this.stats[getQuizItemKey(a)];
      const sb = this.stats[getQuizItemKey(b)];

      // primary: least exposure
      if (sa.exposureCount! !== sb.exposureCount!) {
        return sa.exposureCount! - sb.exposureCount!;
      }

      // secondary: least recently reviewed
      return sa.lastReviewed - sb.lastReviewed;
    });

    const chosen = pool[0];

    this.recordShown(chosen);

    return chosen;
  }

  // ---- Update ----
  updateStats(word: QuizItem, guessedCorrectly: boolean) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];
    if (!stat) return;

    stat.exposureCount = (stat.exposureCount ?? 0) + 1;
    stat.lastReviewed = Date.now();

    if (guessedCorrectly) {
      stat.successCount++;
      if (stat.successCount >= this.MASTERY_SUCCESS_THRESHOLD) {
        stat.mastery++;
        stat.successCount = 0;
      }
    } else {
      stat.mastery = Math.max(1, stat.mastery - 1);
      stat.successCount = 0;
    }
  }

  // ---- Helpers ----
  private activateDormantWord(dormant: QuizItem[]): QuizItem {
    const word = dormant[Math.floor(Math.random() * dormant.length)];
    const key = getQuizItemKey(word);

    const stat = this.stats[key];
    stat.lastReviewed = Date.now();
    stat.exposureCount = stat.exposureCount ?? 0;

    this.recordShown(word);

    return word;
  }

  private recordShown(word: QuizItem) {
    const key = getQuizItemKey(word);
    this.recentlyShownKeys.push(key);

    if (this.recentlyShownKeys.length > this.RECENT_EXCLUSION_SIZE) {
      this.recentlyShownKeys.shift();
    }
  }
}

export const quizEngine = new QuizEngine();
