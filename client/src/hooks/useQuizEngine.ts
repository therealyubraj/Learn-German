// hooks/useQuizEngine.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { Word, WordStatsMap } from "../types";
import * as quizEngine from "../quiz/engine";
import { storage } from "../FS/Storage";
import { computeChecksum } from "../hash";

export function useQuizEngine(
  initialWords: Word[],
  initialStats: WordStatsMap,
  setIsActionInProgress: (inProgress: boolean) => void
) {
  const [session, setSession] = useState(() =>
    quizEngine.createQuizSession(initialWords, initialStats)
  );
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [wordlistChecksum, setWordlistChecksum] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    async function calculateChecksum() {
      if (initialWords.length > 0) {
        const checksum = await computeChecksum(initialWords);
        setWordlistChecksum(checksum);
      }
    }
    calculateChecksum();
  }, [initialWords]);

  // Initial word selection
  useEffect(() => {
    if (!isInitialized.current) {
      const { nextWord, updatedSession } = quizEngine.getNextWord(session);
      setSession(updatedSession);
      setCurrentWord(nextWord);
      setIsLoading(false);
      isInitialized.current = true;
    }
  }, [session]); // Dependency is okay here, as it only runs once

  const submitAnswer = useCallback(
    async (isCorrect: boolean) => {
      if (!currentWord || !wordlistChecksum) return;

      const { updatedStats, updatedActivePool } = quizEngine.updateWordStats(
        session,
        currentWord,
        isCorrect
      );

      const updatedSessionAfterStats = {
        ...session,
        stats: updatedStats,
        activePool: updatedActivePool,
      };

      try {
        await storage.saveStats(wordlistChecksum, updatedStats);
      } catch (error) {
        console.error("Failed to save stats:", error);
      }

      const { nextWord, updatedSession } = quizEngine.getNextWord(
        updatedSessionAfterStats
      );

      setCurrentWord(nextWord);
      setSession(updatedSession);
      setIsActionInProgress(false); // Reset the action lock for the new question

      if (!nextWord) {
        setIsFinished(true);
      }
    },
    [currentWord, session, wordlistChecksum, setIsActionInProgress]
  );

  return {
    currentWord,
    isLoading,
    isFinished,
    submitAnswer,
  };
}
