import { useEffect, useRef, useState } from "react";
import { QuizView } from "./QuizView";
import { useLocation } from "react-router-dom";
import { getCombinedWordLists, writeStats } from "../FS/utils";
import { QuizItem, RunningQuiz } from "../types";
import { selectNextWord, updateStats } from "../quiz/engine";

export function Quiz() {
  const location = useLocation();
  const quiz = useRef<RunningQuiz>({
    checksum: "",
    words: [],
    stats: {},
  });
  const [currentItem, setCurrentItem] = useState<QuizItem>({
    LHS: "",
    RHS: "",
  });

  function onNext(guessedCorrectly: boolean) {
    // update the stats of this word in the file
    quiz.current.stats = updateStats(
      quiz.current.stats,
      currentItem,
      guessedCorrectly
    );

    // and get a new word and rerender
    const newItem = selectNextWord(
      quiz.current.checksum,
      quiz.current.words,
      quiz.current.stats,
      currentItem
    );
    setCurrentItem(newItem);

    writeStats(quiz.current.checksum, quiz.current.stats)
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

      quiz.current = fetchedQuiz;
      setCurrentItem(
        selectNextWord(
          fetchedQuiz.checksum,
          fetchedQuiz.words,
          quiz.current.stats
        )
      );
    }
    fetchAndSetWordLists();
  }, []);

  if (quiz.current.words.length === 0) {
    return <div>No words????</div>;
  }
  return (
    <QuizView
      item={currentItem}
      onNext={onNext}
      key={`${currentItem.LHS}-${currentItem.RHS}`}
    />
  );
}
