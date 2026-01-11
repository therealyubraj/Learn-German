import { useEffect, useRef, useState } from "react";
import { QuizView } from "./QuizView";
import { useLocation } from "react-router-dom";
import { getCombinedWordLists, writeStats } from "../FS/utils";
import { QuizItem, RunningQuiz } from "../types";
import { quizEngine } from "../quiz/engine";

export function Quiz() {
  const location = useLocation();
  const [currentItem, setCurrentItem] = useState<QuizItem>({
    LHS: "",
    RHS: "",
  });

  function onNext(guessedCorrectly: boolean) {
    // update the stats of this word in the file
    quizEngine.updateStats(currentItem, guessedCorrectly);

    // and get a new word and rerender
    const newItem = quizEngine.selectNextWord();
    setCurrentItem(newItem);

    writeStats(quizEngine.getChecksum() as string, quizEngine.getStats())
      .then((v) => {
        if (!v) {
          console.error("Failed to write stats?");
        } else {
          console.log("Successfully wrote stats.");
        }
      })
      .catch((e) => console.error(e));
  }

  useEffect(() => {
    async function fetchAndSetWordLists() {
      const fetchedQuiz = await getCombinedWordLists(
        location.state.selectedQuizzes
      );
      quizEngine.resetEngine(fetchedQuiz);

      setCurrentItem(quizEngine.selectNextWord());
    }
    fetchAndSetWordLists();
  }, []);

  return (
    <QuizView
      item={currentItem}
      onNext={onNext}
      key={`${currentItem.LHS}-${currentItem.RHS}`}
    />
  );
}
