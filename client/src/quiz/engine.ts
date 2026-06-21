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
  private readonly NEW_WORD_PROBABILITY = 0.2;
  private readonly REVIEW_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;

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

  public isKnown(stat: WordStat) {
    return (
      stat.mastery >= this.TARGET_MASTERY &&
      (stat.exposureCount ?? 0) >= this.MIN_EXPOSURES_FOR_MASTERY
    );
  }

  public isDueForReview(stat: WordStat, now = Date.now()) {
    if (stat.mastery < this.TARGET_MASTERY || stat.lastReviewed <= 0) {
      return false;
    }

    return now - stat.lastReviewed >= this.REVIEW_INTERVAL_MS;
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
  selectNextWord(currentWord?: QuizItem): QuizItem {
    const learning: QuizItem[] = [];
    const dormant: QuizItem[] = [];
    const newWords: QuizItem[] = [];
    const review: QuizItem[] = [];

    for (const word of this.words) {
      const stat = this.stats[getQuizItemKey(word)];
      if (!stat) continue;

      if (stat.lastReviewed === 0) {
        dormant.push(word);
        if ((stat.exposureCount ?? 0) === 0) {
          newWords.push(word);
        }
      } else if (
        stat.mastery < this.TARGET_MASTERY ||
        stat.exposureCount < this.MIN_EXPOSURES_FOR_MASTERY
      ) {
        learning.push(word);
      } else {
        review.push(word);
      }
    }

    const availableNewWords = this.excludeCurrentWordIfPossible(
      newWords,
      currentWord,
    );
    const availableDormant = this.excludeCurrentWordIfPossible(
      dormant,
      currentWord,
    );
    const availableLearning = this.excludeCurrentWordIfPossible(
      learning,
      currentWord,
    );
    const availableReview = this.excludeCurrentWordIfPossible(
      review,
      currentWord,
    );

    // 1. Occasionally inject a completely new word.
    if (
      availableNewWords.length > 0 &&
      Math.random() < this.NEW_WORD_PROBABILITY
    ) {
      return this.activateDormantWord(availableNewWords);
    }

    // 2. If the set has no active words yet, start with a new one.
    if (
      learning.length === 0 &&
      review.length === 0 &&
      availableDormant.length > 0
    ) {
      return this.activateDormantWord(availableDormant);
    }

    // 3. Fair rotation among learning words
    const eligible = availableLearning.filter((word) => {
      const key = getQuizItemKey(word);
      return !this.recentlyShownKeys.includes(key);
    });

    let pool =
      eligible.length > 0
        ? eligible
        : availableLearning.length > 0
          ? availableLearning
          : this.getReviewPool(availableReview);

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
    if (!chosen) {
      throw new Error("Quiz engine could not select a next word.");
    }

    this.recordShown(chosen);

    return chosen;
  }

  // ---- Update ----
  updateStats(word: QuizItem, guessedCorrectly: boolean) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];
    if (!stat) return;

    const previousExposureCount = stat.exposureCount ?? 0;

    stat.exposureCount = previousExposureCount + 1;
    stat.lastReviewed = Date.now();

    if (guessedCorrectly) {
      if (previousExposureCount === 0) {
        stat.mastery = Math.max(stat.mastery, this.TARGET_MASTERY);
        stat.exposureCount = Math.max(
          stat.exposureCount,
          this.MIN_EXPOSURES_FOR_MASTERY
        );
        stat.successCount = 0;
        return;
      }

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

  markKnown(word: QuizItem) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];
    if (!stat) return;

    stat.exposureCount = Math.max(
      stat.exposureCount ?? 0,
      this.MIN_EXPOSURES_FOR_MASTERY
    );
    stat.lastReviewed = Date.now();
    stat.mastery = Math.max(stat.mastery, this.TARGET_MASTERY);
    stat.successCount = 0;
  }

  updateReviewStats(word: QuizItem, remembered: boolean) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];
    if (!stat) return;

    stat.exposureCount = Math.max(
      stat.exposureCount ?? 0,
      this.MIN_EXPOSURES_FOR_MASTERY
    );
    stat.lastReviewed = Date.now();
    stat.successCount = 0;

    if (remembered) {
      stat.mastery = Math.max(stat.mastery + 1, this.TARGET_MASTERY);
    } else {
      stat.mastery = Math.max(1, stat.mastery - 2);
    }
  }

  // ---- Helpers ----
  private excludeCurrentWordIfPossible(
    pool: QuizItem[],
    currentWord?: QuizItem,
  ) {
    if (!currentWord || pool.length <= 1) {
      return pool;
    }

    const currentKey = getQuizItemKey(currentWord);
    const withoutCurrentWord = pool.filter(
      (word) => getQuizItemKey(word) !== currentKey,
    );

    return withoutCurrentWord.length > 0 ? withoutCurrentWord : pool;
  }

  private activateDormantWord(dormant: QuizItem[]): QuizItem {
    const word = dormant[Math.floor(Math.random() * dormant.length)];
    const key = getQuizItemKey(word);

    const stat = this.stats[key];
    stat.lastReviewed = Date.now();
    stat.exposureCount = stat.exposureCount ?? 0;

    this.recordShown(word);

    return word;
  }

  private getReviewPool(review: QuizItem[]): QuizItem[] {
    const eligibleReview = review.filter((word) => {
      const key = getQuizItemKey(word);
      return !this.recentlyShownKeys.includes(key);
    });

    if (eligibleReview.length > 0) {
      return eligibleReview;
    }

    return review.length > 0 ? review : this.words;
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
