import { useState, useEffect, useCallback, useRef } from "react";
import { speak } from "../utils/tts";
import type { QuizItem } from "../types";

interface PreviousAnswer {
  en: string;
  answer: string;
}

interface QuizInputProps {
  currentItem: QuizItem;
  checkAnswer: () => void;
  nextVerb: () => void;
  giveUp: () => void;
  answer: string;
  setAnswer: (val: string) => void;
  feedback: null | "correct" | "wrong" | "givenUp";
}

export function QuizInput({
  currentItem,
  checkAnswer,
  nextVerb,
  giveUp,
  answer,
  setAnswer,
  feedback,
}: QuizInputProps) {
  const [mode, setMode] = useState<"insert" | "normal">("insert");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previousAnswers, setPreviousAnswers] = useState<PreviousAnswer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null); // new ref

  // Next button callback
  const handleNext = useCallback(() => {
    if (feedback === "correct" || feedback === "givenUp") {
      setPreviousAnswers((prev) => [...prev, { en: currentItem.en, answer }]);
      setAnswer("");
      nextVerb();
      setMode("insert"); // switch mode
      setTimeout(() => inputRef.current?.focus(), 0); // focus input
    }
  }, [answer, feedback, currentItem.en, nextVerb, setAnswer]);

  // Give up callback
  const handleGiveUp = useCallback(async () => {
    setPreviousAnswers((prev) => [
      ...prev,
      { en: currentItem.en, answer: currentItem.de[0] },
    ]);
    setAnswer(currentItem.de[0]);
    giveUp();
    setIsSpeaking(true);
    await speak(currentItem.de[0]);
    setIsSpeaking(false);
    setMode("normal"); // automatically switch to normal mode
  }, [currentItem.en, currentItem.de, giveUp, setAnswer]);

  const handleSpeak = useCallback(async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    await speak(currentItem.de[0]);
    setIsSpeaking(false);
  }, [currentItem.de, isSpeaking]);

  // Auto switch to normal mode on correct
  useEffect(() => {
    const handleCorrect = async () => {
      if (feedback === "correct") {
        setMode("normal");
        setIsSpeaking(true);
        await speak(currentItem.de[0]);
        setIsSpeaking(false);
      }
    };
    handleCorrect();
  }, [feedback, currentItem.de]);

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
        if (e.key.toLowerCase() === "i") {
          e.preventDefault();
          setMode("insert");
          inputRef.current?.focus(); // focus input when switching to insert
        } else if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          handleNext();
        } else if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          handleGiveUp();
        } else if (e.key.toLowerCase() === "s") {
          if (feedback === "correct" || feedback === "givenUp") {
            e.preventDefault();
            handleSpeak();
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, handleNext, handleGiveUp, checkAnswer, feedback, handleSpeak]);

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
      <div className="flex items-center justify-center w-full">
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
        <button
          onClick={handleSpeak}
          disabled={
            !(feedback === "correct" || feedback === "givenUp") || isSpeaking
          }
          className="ml-4 p-4 rounded-full bg-gray-700 text-2xl hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          aria-label="Listen to pronunciation"
        >
          🔊
        </button>
      </div>

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
          disabled={
            !(feedback === "correct" || feedback === "givenUp") || isSpeaking
          }
          className={`px-14 py-5 text-xl font-bold rounded-lg shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            !(feedback === "correct" || feedback === "givenUp") || isSpeaking
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
