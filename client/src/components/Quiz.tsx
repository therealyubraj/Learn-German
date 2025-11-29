import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { storage } from "../FS/Storage";
import { Word, WordStatsMap, AppSettings } from "../types";
import { QuizView } from "./QuizView";
import { useVimMode } from "../contexts/VimModeContext";
import { useQuizEngine } from "../hooks/useQuizEngine";
import { computeChecksum } from "../hash";
import { loadSettings, getDefaultSettings } from "../settings/service";

export function Quiz() {
  const [searchParams] = useSearchParams();
  const { setIsActionInProgress, setVimMode } = useVimMode();

  const [initialWords, setInitialWords] = useState<Word[]>([]);
  const [initialStats, setInitialStats] = useState<WordStatsMap>({});
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset the action and vim states at the beginning of every new quiz
    setIsActionInProgress(false);
    setVimMode("insert");

    async function loadInitialData() {
      const listIds = searchParams.get("lists")?.split(",");
      if (!listIds || listIds.length === 0) {
        setError("No word lists selected.");
        setIsLoadingData(false);
        return;
      }

      try {
        const appSettings = await loadSettings();
        setSettings(appSettings);

        const lists = await Promise.all(
          listIds.map((id) => storage.getListById(id))
        );
        const combinedWords = lists
          .filter((list) => list !== null)
          .flatMap((list) => list!.words);

        if (combinedWords.length === 0) {
          setError("The selected lists are empty or could not be found.");
          setIsLoadingData(false);
          return;
        }

        const checksum = await computeChecksum(combinedWords);
        const stats = await storage.loadStats(checksum);
        
        setInitialWords(combinedWords);
        setInitialStats(stats || {});
      } catch (e) {
        console.error("Failed to load initial quiz data:", e);
        setError("An error occurred while loading the quiz data.");
      } finally {
        setIsLoadingData(false);
      }
    }

    loadInitialData();
  }, [searchParams, setIsActionInProgress, setVimMode]);

  // Once initial data is loaded, the QuizEngine takes over
  if (isLoadingData) {
    return <div>Loading quiz...</div>;
  }
  
  if (error) {
    return <Navigate to="/quiz-selection" replace />;
  }
  
  // The QuizEngineWrapper handles the actual quiz logic.
  // This separation prevents re-triggering the initial data load.
  return (
    <QuizEngineWrapper
      initialWords={initialWords}
      initialStats={initialStats}
      setIsActionInProgress={setIsActionInProgress}
      activePoolSize={settings.quiz.activePoolSize}
    />
  );
}


type QuizEngineWrapperProps = {
  initialWords: Word[];
  initialStats: WordStatsMap;
  setIsActionInProgress: (inProgress: boolean) => void;
  activePoolSize: number;
};

function QuizEngineWrapper({ initialWords, initialStats, setIsActionInProgress, activePoolSize }: QuizEngineWrapperProps) {
  const {
    currentWord,
    isLoading: isEngineLoading,
    isFinished,
    submitAnswer,
  } = useQuizEngine(initialWords, initialStats, setIsActionInProgress, activePoolSize);

  const handleNext = (isCorrect: boolean) => {
    submitAnswer(isCorrect);
  };
  
  if (isEngineLoading) {
    return <div>Starting quiz...</div>;
  }

  if (isFinished) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Quiz Finished!</h1>
      </div>
    );
  }

  if (!currentWord) {
    // This can happen if the list is empty or engine fails to select a word
    return <Navigate to="/quiz-selection" replace />;
  }

  return <QuizView currentWord={currentWord} onNext={handleNext} />;
}
