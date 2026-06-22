import { QuizItem, WordStat } from "../types";
import { getQuizItemKey } from "../utils";
import { RunningQuiz } from "../types";

type WordBucketName =
  | "reverseForgottenReady"
  | "newWords"
  | "dormant"
  | "learning"
  | "review"
  | "reverseForgottenCoolingDown";

type WordBuckets = Record<WordBucketName, QuizItem[]>;

class QuizEngine {
  private words: QuizItem[] = [];
  private stats: RunningQuiz["stats"] = {};
  private checksum: string | null = null;

  // session-only memory (NOT persisted)
  private recentlyShownKeys: string[] = [];

  // ---- Tunables ----
  private readonly TARGET_MASTERY = 3;
  private readonly MASTERY_SUCCESS_THRESHOLD = 3;
  private readonly MIN_EXPOSURES_FOR_MASTERY = 5;
  private readonly RECENT_EXCLUSION_SIZE = 2;
  private readonly NEW_WORD_PROBABILITY = 0.2;
  private readonly REVIEW_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;
  private readonly REVERSE_FORGOT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

  constructor() {}

  public emptyWordStat(): WordStat {
    return {
      exposureCount: 0,
      lastReviewed: 0,
      reverseReviewedAt: 0,
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
      if (stat.reverseReviewedAt === undefined) {
        stat.reverseReviewedAt = stat.lastReviewed ?? 0;
      }
    }
  }

  // ---- Selection ----
  selectNextWord(currentWord?: QuizItem): QuizItem | null {
    const currentKey = currentWord ? getQuizItemKey(currentWord) : null;
    const now = Date.now();
    const buckets = this.buildBuckets(now);
    const activeWordsCount =
      buckets.learning.length +
      buckets.review.length +
      buckets.reverseForgottenReady.length;

    const bucketPlan: Array<{
      name: WordBucketName;
      condition?: boolean;
      preferNotRecentlyShown?: boolean;
      sort?: (left: QuizItem, right: QuizItem) => number;
      activateDormant?: boolean;
    }> = [
      {
        name: "reverseForgottenReady",
        sort: this.byOldestReverseReview,
      },
      {
        name: "newWords",
        condition: Math.random() < this.NEW_WORD_PROBABILITY,
        activateDormant: true,
      },
      {
        name: "dormant",
        condition: activeWordsCount === 0,
        activateDormant: true,
      },
      {
        name: "learning",
        preferNotRecentlyShown: true,
        sort: this.byLeastExposureThenOldestReview,
      },
      {
        name: "review",
        preferNotRecentlyShown: true,
        sort: this.byLeastExposureThenOldestReview,
      },
      {
        name: "dormant",
        activateDormant: true,
      },
      {
        name: "newWords",
        activateDormant: true,
      },
      {
        name: "reverseForgottenCoolingDown",
        sort: this.byOldestReverseReview,
      },
    ];

    for (const step of bucketPlan) {
      if (step.condition === false) {
        continue;
      }

      const chosen = this.pickCandidate(buckets[step.name], currentWord, {
        preferNotRecentlyShown: step.preferNotRecentlyShown,
        sort: step.sort,
      });

      if (!chosen) {
        continue;
      }

      if (step.activateDormant) {
        this.activateDormantWord(chosen);
      }

      this.logSelection(step.name, chosen, currentKey, buckets);
      this.recordShown(chosen);
      return chosen;
    }

    const fallback = this.pickCandidate(this.words, currentWord);
    if (!fallback) {
      console.log("[quiz-engine] finished: no non-current word available", {
        currentKey,
        totalWords: this.words.length,
      });
      return null;
    }

    this.logSelection("fallback", fallback, currentKey, buckets);
    this.recordShown(fallback);
    return fallback;
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

  markReverseRecallFailed(word: QuizItem) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];
    if (!stat) return;

    stat.exposureCount = Math.max(
      stat.exposureCount ?? 0,
      this.MIN_EXPOSURES_FOR_MASTERY
    );
    stat.reverseReviewedAt = Date.now();
    stat.mastery = Math.max(
      1,
      Math.min(stat.mastery, this.TARGET_MASTERY - 1)
    );
    stat.successCount = this.MASTERY_SUCCESS_THRESHOLD - 1;
  }

  markReverseRecallSucceeded(word: QuizItem) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];
    if (!stat) return;

    stat.exposureCount = Math.max(
      stat.exposureCount ?? 0,
      this.MIN_EXPOSURES_FOR_MASTERY
    );
    stat.reverseReviewedAt = Date.now();
    stat.mastery = Math.max(stat.mastery, this.TARGET_MASTERY);
    stat.successCount = 0;
  }

  // ---- Helpers ----
  private buildBuckets(now: number): WordBuckets {
    const buckets: WordBuckets = {
      reverseForgottenReady: [],
      newWords: [],
      dormant: [],
      learning: [],
      review: [],
      reverseForgottenCoolingDown: [],
    };

    for (const word of this.words) {
      const stat = this.stats[getQuizItemKey(word)];
      if (!stat) continue;

      if (stat.lastReviewed === 0) {
        buckets.dormant.push(word);
        if ((stat.exposureCount ?? 0) === 0) {
          buckets.newWords.push(word);
        }
      } else if (this.isReverseForgottenReady(stat, now)) {
        buckets.reverseForgottenReady.push(word);
      } else if (this.isReverseForgottenCoolingDown(stat, now)) {
        buckets.reverseForgottenCoolingDown.push(word);
      } else if (
        stat.mastery < this.TARGET_MASTERY ||
        stat.exposureCount < this.MIN_EXPOSURES_FOR_MASTERY
      ) {
        buckets.learning.push(word);
      } else {
        buckets.review.push(word);
      }
    }

    return buckets;
  }

  private isReverseForgottenReady(stat: WordStat, now = Date.now()) {
    return (
      stat.mastery < this.TARGET_MASTERY &&
      stat.reverseReviewedAt > stat.lastReviewed &&
      now - stat.reverseReviewedAt >= this.REVERSE_FORGOT_COOLDOWN_MS
    );
  }

  private isReverseForgottenCoolingDown(stat: WordStat, now = Date.now()) {
    return (
      stat.mastery < this.TARGET_MASTERY &&
      stat.reverseReviewedAt > stat.lastReviewed &&
      now - stat.reverseReviewedAt < this.REVERSE_FORGOT_COOLDOWN_MS
    );
  }

  private activateDormantWord(word: QuizItem) {
    const key = getQuizItemKey(word);
    const stat = this.stats[key];

    if (!stat) {
      return;
    }

    stat.lastReviewed = Date.now();
    stat.exposureCount = stat.exposureCount ?? 0;
  }

  private pickCandidate(
    candidates: QuizItem[],
    currentWord?: QuizItem,
    options: {
      preferNotRecentlyShown?: boolean;
      sort?: (left: QuizItem, right: QuizItem) => number;
    } = {},
  ) {
    const nonCurrentCandidates = this.withoutCurrent(candidates, currentWord);
    if (nonCurrentCandidates.length === 0) {
      return null;
    }

    const sortedCandidates = this.sorted(nonCurrentCandidates, options.sort);
    if (!options.preferNotRecentlyShown) {
      return sortedCandidates[0];
    }

    const notRecentlyShown = sortedCandidates.filter(
      (word) => !this.recentlyShownKeys.includes(getQuizItemKey(word)),
    );

    return notRecentlyShown[0] ?? sortedCandidates[0];
  }

  private withoutCurrent(candidates: QuizItem[], currentWord?: QuizItem) {
    if (!currentWord) {
      return candidates;
    }

    const currentKey = getQuizItemKey(currentWord);
    return candidates.filter((word) => getQuizItemKey(word) !== currentKey);
  }

  private sorted(
    candidates: QuizItem[],
    sort?: (left: QuizItem, right: QuizItem) => number,
  ) {
    const nextCandidates = [...candidates];
    if (sort) {
      nextCandidates.sort(sort);
    }
    return nextCandidates;
  }

  private byLeastExposureThenOldestReview = (
    left: QuizItem,
    right: QuizItem,
  ) => {
    const leftStat = this.stats[getQuizItemKey(left)];
    const rightStat = this.stats[getQuizItemKey(right)];

    if (leftStat.exposureCount !== rightStat.exposureCount) {
      return leftStat.exposureCount - rightStat.exposureCount;
    }

    return leftStat.lastReviewed - rightStat.lastReviewed;
  };

  private byOldestReverseReview = (left: QuizItem, right: QuizItem) => {
    const leftStat = this.stats[getQuizItemKey(left)];
    const rightStat = this.stats[getQuizItemKey(right)];
    return leftStat.reverseReviewedAt - rightStat.reverseReviewedAt;
  };

  private logSelection(
    source: WordBucketName | "fallback",
    word: QuizItem,
    previousKey: string | null,
    buckets: WordBuckets,
  ) {
    const nextKey = getQuizItemKey(word);
    if (previousKey && previousKey === nextKey) {
      console.warn("[quiz-engine] selected same word unexpectedly", {
        key: nextKey,
        source,
        totalWords: this.words.length,
      });
      return;
    }

    console.log("[quiz-engine] selected next word", {
      previousKey,
      nextKey,
      source,
      buckets: {
        reverseForgottenReady: buckets.reverseForgottenReady.length,
        newWords: buckets.newWords.length,
        dormant: buckets.dormant.length,
        learning: buckets.learning.length,
        review: buckets.review.length,
        reverseForgottenCoolingDown:
          buckets.reverseForgottenCoolingDown.length,
      },
    });
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
