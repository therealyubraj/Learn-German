import { useState, useEffect, useCallback, useRef } from "react";

interface VerbItem {
  en: string;
  de: string[];
  note?: string;
}

interface PreviousAnswer {
  en: string;
  answer: string;
}

interface VimInputQuizProps {
  currentVerb: VerbItem;
  checkAnswer: () => void;
  nextVerb: () => void;
  giveUp: () => void;
  answer: string;
  setAnswer: (val: string) => void;
  feedback: null | "correct" | "wrong" | "givenUp";
}

export function VimInputQuiz({
  currentVerb,
  checkAnswer,
  nextVerb,
  giveUp,
  answer,
  setAnswer,
  feedback,
}: VimInputQuizProps) {
  const [mode, setMode] = useState<"insert" | "normal">("insert");
  const [previousAnswers, setPreviousAnswers] = useState<PreviousAnswer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null); // new ref

  // Next button callback
  const handleNext = useCallback(() => {
    if (feedback === "correct" || feedback === "givenUp") {
      setPreviousAnswers((prev) => [...prev, { en: currentVerb.en, answer }]);
      setAnswer("");
      nextVerb();
      setMode("insert"); // switch mode
      setTimeout(() => inputRef.current?.focus(), 0); // focus input
    }
  }, [answer, feedback, currentVerb.en, nextVerb, setAnswer]);

  // Give up callback
  const handleGiveUp = useCallback(() => {
    setPreviousAnswers((prev) => [
      ...prev,
      { en: currentVerb.en, answer: currentVerb.de[0] },
    ]);
    setAnswer(currentVerb.de[0]);
    giveUp();
    setMode("normal"); // automatically switch to normal mode
  }, [currentVerb.en, currentVerb.de, giveUp, setAnswer]);

  // Auto switch to normal mode on correct
  useEffect(() => {
    if (feedback === "correct") setMode("normal");
  }, [feedback]);

  // Keyboard shortcuts (unchanged)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName;
      const isTyping = targetTag === "INPUT" || targetTag === "TEXTAREA";

      if (mode === "insert") {
        if (e.key === "Escape") {
          e.preventDefault();
          setMode("normal");
        } else if (e.key === "Enter" && isTyping) {
          e.preventDefault();
          checkAnswer();
        }
      } else if (mode === "normal") {
        e.preventDefault();
        if (e.key.toLowerCase() === "i") {
          setMode("insert");
          inputRef.current?.focus(); // focus input when switching to insert
        } else if (e.key.toLowerCase() === "n") {
          handleNext();
        } else if (e.key.toLowerCase() === "z") {
          handleGiveUp();
        } else if (e.key === "Enter") {
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, handleNext, handleGiveUp, checkAnswer]);

  // ... rest of component remains unchanged ...

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Most Recent Previous Answer */}
      {previousAnswers.length > 0 && (
        <div className="text-left text-gray-400 text-sm">
          <span className="font-semibold">
            {previousAnswers[previousAnswers.length - 1].answer}
          </span>{" "}
          ({previousAnswers[previousAnswers.length - 1].en})
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef} // attach ref
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer..."
        disabled={feedback === "correct" || feedback === "givenUp"}
        className={`w-full min-h-[80px] px-6 py-4 text-center
          text-[3em] bg-gray-900 placeholder-gray-400 text-white
          border-2 ${
            feedback === "correct" || feedback === "givenUp"
              ? "border-green-400"
              : "border-gray-500"
          }
          ${
            feedback === "correct" || feedback === "givenUp"
              ? "opacity-50 cursor-not-allowed"
              : ""
          }
          focus:outline-none focus:ring-2 focus:ring-offset-1
          transition-all duration-300
        `}
      />

      <div className="text-sm text-gray-400 text-center">
        {mode === "insert" ? "Insert" : "Normal"}
      </div>

      {/* Buttons */}
      <div className="flex justify-center space-x-8">
        <button
          onClick={checkAnswer}
          disabled={
            answer.trim() === "" ||
            feedback === "correct" ||
            feedback === "givenUp"
          }
          className={`px-14 py-5 text-xl font-bold rounded-lg shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            answer.trim() === "" ||
            feedback === "correct" ||
            feedback === "givenUp"
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          Check
        </button>
        <button
          onClick={handleGiveUp}
          disabled={feedback === "correct" || feedback === "givenUp"}
          className="px-14 py-5 text-xl font-bold rounded-lg shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-yellow-600 text-white hover:bg-yellow-700"
        >
          Give Up
        </button>
        <button
          onClick={handleNext}
          disabled={!(feedback === "correct" || feedback === "givenUp")}
          className={`px-14 py-5 text-xl font-bold rounded-lg shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            !(feedback === "correct" || feedback === "givenUp")
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
