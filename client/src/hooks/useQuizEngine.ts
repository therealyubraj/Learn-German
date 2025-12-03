// hooks/useQuizEngine.ts

import { useState, useEffect, useCallback } from "react";
import { Word, WordStatsMap } from "../types";
import * as quizEngine from "../quiz/engine";
import { getWordListChecksum } from "../lib";

type UseQuizEngineProps = {
  initialWords: Word[];
  initialStats: WordStatsMap;
  activePoolSize: number;
  useEphemeralStats: boolean; // If true, starts a session with fresh stats
  onSaveStats: (checksum: string, stats: WordStatsMap) => Promise<void>;
};

export function useQuizEngine({
  initialWords,
  initialStats,
  activePoolSize,
  useEphemeralStats,
  onSaveStats,
}: UseQuizEngineProps) {
  const [session, setSession] = useState<quizEngine.QuizSession | null>(null);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [wordlistChecksum, setWordlistChecksum] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      if (initialWords.length === 0) {
        setIsLoading(false);
        setIsFinished(true); // Nothing to quiz
        return;
      }

      const sessionStats = useEphemeralStats ? {} : initialStats;
      const newSession = quizEngine.createQuizSession(
        initialWords,
        sessionStats,
        activePoolSize
      );
      const { nextWord, updatedSession } = quizEngine.getNextWord(newSession);

      setSession(updatedSession);
      setCurrentWord(nextWord);

      if (!nextWord) {
        setIsFinished(true);
      }

      const checksum = await getWordListChecksum({
        words: initialWords,
        id: "",
        name: "",
        checksum: "",
      });
      setWordlistChecksum(checksum);
      setIsLoading(false);
    }
    initialize();
  }, [initialWords, initialStats, activePoolSize, useEphemeralStats]);

  const submitAnswer = useCallback(
    async (isCorrect: boolean) => {
      // We use a functional update to guarantee we are working with the latest session state.
      // This prevents race conditions and stale state bugs.
      setSession((prevSession) => {
        if (!currentWord || !wordlistChecksum || !prevSession) {
          return prevSession; // Should not happen, but a safe guard
        }

        const { updatedStats, updatedActivePool } = quizEngine.updateWordStats(
          prevSession,
          currentWord,
          isCorrect
        );

        const sessionAfterUpdate = {
          ...prevSession,
          stats: updatedStats,
          activePool: updatedActivePool,
        };

        // Saving stats is a side-effect, we can trigger it here.
        // It's wrapped in a self-executing async function.
        (async () => {
          try {
            await onSaveStats(wordlistChecksum, updatedStats);
          } catch (error) {
            console.error("The provided onSaveStats function failed:", error);
          }
        })();

        const { nextWord, updatedSession } =
          quizEngine.getNextWord(sessionAfterUpdate);

        // Update the currentWord state for the UI
        setCurrentWord(nextWord);

        if (!nextWord) {
          setIsFinished(true);
        }

        // Return the final, updated session state
        return updatedSession;
      });
    },
    [currentWord, wordlistChecksum, onSaveStats] // session is no longer needed here
  );

  return {
    currentWord,
    isLoading,
    isFinished,
    submitAnswer,
  };
}
