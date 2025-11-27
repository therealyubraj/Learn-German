import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { storage } from "../FS/Storage";
import { Word } from "../types";
import { QuizView } from "./QuizView";
import { useVimMode } from "../contexts/VimModeContext";

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function Quiz() {
  const [searchParams] = useSearchParams();
  const { setIsActionInProgress, setVimMode } = useVimMode();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    // Reset the action and vim states at the beginning of every new quiz
    setIsActionInProgress(false);
    setVimMode("insert");

    async function fetchAndCombineLists() {
      const listIds = searchParams.get("lists")?.split(",");
      if (!listIds || listIds.length === 0) {
        setError("No word lists selected.");
        setLoading(false);
        return;
      }

      try {
        const lists = await Promise.all(
          listIds.map((id) => storage.getListById(id))
        );

        const combinedWords = lists
          .filter((list) => list !== null) // Filter out any lists that weren't found
          .flatMap((list) => list!.words);

        if (combinedWords.length === 0) {
          setError("The selected lists are empty or could not be found.");
          setLoading(false);
          return;
        }

        setWords(shuffleArray(combinedWords));
      } catch (e) {
        console.error("Failed to fetch word lists:", e);
        setError("An error occurred while loading the word lists.");
      } finally {
        setLoading(false);
      }
    }

    fetchAndCombineLists();
  }, [searchParams, setIsActionInProgress]);

  const handleNextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setQuizFinished(true);
    }
  };

  if (loading) {
    return <div>Loading quiz...</div>;
  }

  if (error) {
    // Redirect back to selection if there's an error
    return <Navigate to="/quiz-selection" replace />;
  }

  if (quizFinished) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold">Quiz Finished!</h1>
      </div>
    );
  }

  if (words.length === 0) {
    return <Navigate to="/quiz-selection" replace />;
  }

  const currentWord = words[currentWordIndex];

  return <QuizView currentWord={currentWord} onNext={handleNextWord} />;
}
