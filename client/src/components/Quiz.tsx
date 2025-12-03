import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { storage } from "../FS/Storage";
import { Word, WordStatsMap, AppSettings, WordList } from "../types";
import { QuizView } from "./QuizView";
import { useVimMode } from "../contexts/VimModeContext";
import { useQuizEngine } from "../hooks/useQuizEngine";
import { loadSettings, getDefaultSettings } from "../settings/service";
import { getWordListChecksum } from "../lib";

export function Quiz() {
  const [searchParams] = useSearchParams();
  const { setIsActionInProgress, setVimMode } = useVimMode();

  // State for the quiz mode, 'srs' or 'practice'
  const [quizMode] = useState<"srs" | "practice">(
    (searchParams.get("mode") as "srs" | "practice") || "srs"
  );

  const [initialWords, setInitialWords] = useState<Word[]>([]);
  const [initialStats, setInitialStats] = useState<WordStatsMap>({});
  const [settings, setSettings] = useState<AppSettings>(getDefaultSettings());
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

        const tempWordList: WordList = {
          id: "",
          name: "",
          words: combinedWords,
          checksum: "",
        };
        const checksum = await getWordListChecksum(tempWordList);
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

  // Define the save function based on the quiz mode
  const handleSaveStats = async (
    checksum: string,
    stats: WordStatsMap
  ): Promise<void> => {
    if (quizMode === "srs") {
      await storage.saveStats(checksum, stats);
    }
    // In 'practice' mode, this function does nothing.
  };

  if (isLoadingData) {
    return <div>Loading quiz...</div>;
  }

  if (error) {
    return <Navigate to="/quiz-selection" replace />;
  }

  return (
    <QuizEngineWrapper
      initialWords={initialWords}
      initialStats={initialStats}
      activePoolSize={settings.quiz.activePoolSize}
      useEphemeralStats={quizMode === "practice"}
      onSaveStats={handleSaveStats}
      onAction={setIsActionInProgress}
    />
  );
}

type QuizEngineWrapperProps = {
  initialWords: Word[];
  initialStats: WordStatsMap;
  activePoolSize: number;
  useEphemeralStats: boolean;
  onSaveStats: (checksum: string, stats: WordStatsMap) => Promise<void>;
  onAction: (inProgress: boolean) => void;
};

function QuizEngineWrapper({
  initialWords,
  initialStats,
  activePoolSize,
  useEphemeralStats,
  onSaveStats,
  onAction,
}: QuizEngineWrapperProps) {
  const {
    currentWord,
    isLoading: isEngineLoading,
    isFinished,
    submitAnswer,
  } = useQuizEngine({
    initialWords,
    initialStats,
    activePoolSize,
    useEphemeralStats,
    onSaveStats,
  });

  const handleNext = (isCorrect: boolean) => {
    submitAnswer(isCorrect).then(() => {
      // After the engine has processed the answer and is ready for the next
      // word, we release the action lock.
      onAction(false);
    });
  };

  if (isEngineLoading) {
    return <div>Starting quiz...</div>;
  }

  if (isFinished) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Quiz Finished!</h1>
        {/* We can add a button here to restart in practice mode later */}
      </div>
    );
  }

  if (!currentWord) {
    return <Navigate to="/quiz-selection" replace />;
  }

  return <QuizView currentWord={currentWord} onNext={handleNext} />;
}
