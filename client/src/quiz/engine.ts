import { Word, WordStats, WordStatsMap } from "../types";

const MAX_LEVEL = 8;

// Review intervals in milliseconds
const REVIEW_INTERVALS: { [key: number]: number } = {
  1: 4 * 60 * 60 * 1000, // 4 hours
  2: 8 * 60 * 60 * 1000, // 8 hours
  3: 24 * 60 * 60 * 1000, // 1 day
  4: 3 * 24 * 60 * 60 * 1000, // 3 days
  5: 7 * 24 * 60 * 60 * 1000, // 1 week
  6: 2 * 7 * 24 * 60 * 60 * 1000, // 2 weeks
  7: 30 * 24 * 60 * 60 * 1000, // 1 month
  8: 4 * 30 * 24 * 60 * 60 * 1000, // 4 months
};

export type QuizSession = {
  words: Word[];
  stats: WordStatsMap;
  activePool: Word[];
  lastPresentedWord: Word | null;
  activePoolSize: number;
};

function fillActivePool(
  currentSession: QuizSession
): {
  updatedActivePool: Word[];
  updatedStats: WordStatsMap;
} {
  const now = Date.now();
  const dueWords: Word[] = [];
  const updatedStats = { ...currentSession.stats };

  for (const word of currentSession.words) {
    const wordIdentifier = `${word.LHS}|${word.RHS}`;
    let wordStats = updatedStats[wordIdentifier];

    if (!wordStats) {
      // New word encountered, initialize stats
      wordStats = {
        level: 1,
        createdAt: now,
        lastReviewedAt: now,
        nextReviewAt: now, // Make it immediately eligible
      };
      updatedStats[wordIdentifier] = wordStats;
    }

    if (wordStats.nextReviewAt <= now) {
      dueWords.push(word);
    }
  }

  dueWords.sort((a, b) => {
    const statsA = updatedStats[`${a.LHS}|${a.RHS}`];
    const statsB = updatedStats[`${b.LHS}|${b.RHS}`];
    const levelA = statsA ? statsA.level : 0;
    const levelB = statsB ? statsB.level : 0;
    return levelA - levelB;
  });

  const newActivePool = [...currentSession.activePool];
  const wordsToAddCount = currentSession.activePoolSize - newActivePool.length;

  if (wordsToAddCount > 0) {
    const wordsToAddToPool = dueWords.filter(
      (word) =>
        !newActivePool.some(
          (poolWord) =>
            `${poolWord.LHS}|${poolWord.RHS}` === `${word.LHS}|${word.RHS}`
        )
    ).slice(0, wordsToAddCount);

    newActivePool.push(...wordsToAddToPool);
  }

  return { updatedActivePool: newActivePool, updatedStats };
}

export function createQuizSession(words: Word[], stats: WordStatsMap, activePoolSize: number): QuizSession {
  const initialSession: QuizSession = {
    words,
    stats,
    activePool: [],
    lastPresentedWord: null,
    activePoolSize,
  };
  const { updatedActivePool, updatedStats } = fillActivePool(initialSession);
  return {
    ...initialSession,
    activePool: updatedActivePool,
    stats: updatedStats,
  };
}

export function getNextWord(
  session: QuizSession
): { nextWord: Word | null; updatedSession: QuizSession } {
  let currentActivePool = session.activePool;
  let currentStats = session.stats;

  if (currentActivePool.length === 0) {
    const { updatedActivePool, updatedStats } = fillActivePool(session);
    currentActivePool = updatedActivePool;
    currentStats = updatedStats;
  }

  if (currentActivePool.length === 0) {
    return { nextWord: null, updatedSession: { ...session, stats: currentStats } };
  }

  let selectablePool = currentActivePool;
  if (session.lastPresentedWord && currentActivePool.length > 1) {
    selectablePool = currentActivePool.filter(
      (word) =>
        `${word.LHS}|${word.RHS}` !==
        `${session.lastPresentedWord!.LHS}|${session.lastPresentedWord!.RHS}`
    );
  }

  if (selectablePool.length === 0) {
    selectablePool = currentActivePool;
  }

  const randomIndex = Math.floor(Math.random() * selectablePool.length);
  const nextWord = selectablePool[randomIndex];

  const updatedSession: QuizSession = {
    ...session,
    stats: currentStats,
    activePool: currentActivePool,
    lastPresentedWord: nextWord,
  };

  return { nextWord, updatedSession };
}

export function updateWordStats(
  session: QuizSession,
  word: Word,
  isCorrect: boolean
): {
  updatedStats: WordStatsMap;
  updatedActivePool: Word[];
} {
  const wordIdentifier = `${word.LHS}|${word.RHS}`;
  const now = Date.now();

  const updatedStats = { ...session.stats };
  let currentStats = updatedStats[wordIdentifier];

  if (!currentStats) {
    currentStats = {
      level: 1,
      createdAt: now,
      lastReviewedAt: now,
      nextReviewAt: now,
    };
  }

  if (isCorrect) {
    currentStats.level = Math.min(MAX_LEVEL, currentStats.level + 1);
  } else {
    currentStats.level = Math.max(1, currentStats.level - 2);
  }

  currentStats.lastReviewedAt = now;
  currentStats.nextReviewAt = now + REVIEW_INTERVALS[currentStats.level];
  updatedStats[wordIdentifier] = currentStats;

  let updatedActivePool = [...session.activePool];
  if (isCorrect) {
    // If correct, remove from active pool
    updatedActivePool = updatedActivePool.filter(
      (w) => `${w.LHS}|${w.RHS}` !== wordIdentifier
    );
  }
  // If incorrect, the word remains in the active pool, so no change to updatedActivePool needed here.

  return { updatedStats, updatedActivePool };
}
