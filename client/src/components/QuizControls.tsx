import React, { useRef, useState } from "react";
import { tts } from "../tts/tts";
import { QuizItem } from "../types";
import { useSettings } from "../contexts/SettingsContext";

type ControlState = "guessing" | "givenUp" | "guessedCorrect";

// Input styles with variants for validation state
const inputStyles = {
  base: `min-h-[80px] px-6 py-4 text-center text-[3em] bg-gray-900 placeholder-gray-400
         text-white border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
         transition-all duration-300 disabled:cursor-not-allowed`,
  variants: {
    state: {
      guessing: "!border-blue-500 focus:ring-blue-500",
      guessedCorrect: "!border-green-500",
      givenUp: "!border-red-500",
    },
  },
};

// Simplified button styles with a single, uniform appearance
const buttonStyles = {
  base: "px-4 py-2 rounded-md text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 bg-blue-600 hover:bg-blue-700",
};

export function QuizControls({
  item,
  onNext,
}: {
  item: QuizItem;
  onNext: (guessedCorrectly: boolean) => void;
}) {
  const [controlState, setControlState] = useState<ControlState>("guessing");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isIncorrectGuess, setIsIncorrectGuess] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");

  const { settings } = useSettings();

  // --- Placeholder Click Handlers ---

  const handleCheckAnswer = () => {
    // In a real app, you'd check the answer value here.
    // For this placeholder, we'll just randomly decide if it was correct.
    const isCorrect = inputValue === item.RHS;
    console.log("userinput", inputValue, item.RHS);
    if (isCorrect) {
      handlePlaySound();
      setControlState("guessedCorrect");
    } else {
      setIsIncorrectGuess(true);
      setTimeout(() => {
        setIsIncorrectGuess(false);
      }, 500);
    }
  };

  const handleGiveUp = () => {
    // Giving up always marks the answer as incorrect.
    handlePlaySound();
    setInputValue(item.RHS);
    setControlState("givenUp");
  };

  const handleNextQuestion = () => {
    onNext(controlState === "guessedCorrect");
  };

  const handlePlaySound = async () => {
    setIsSpeaking(true);
    await tts.speak(item.TTS || item.RHS, settings.tts);
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col gap-5 mt-4">
      <div className="w-full max-w-2xl flex items-center gap-4">
        <input
          name="answer"
          className={`${inputStyles.base} ${
            inputStyles.variants.state[controlState]
          } ${isIncorrectGuess ? "shake" : ""}`}
          data-vim-primary-input="true"
          disabled={controlState !== "guessing"}
          value={inputValue}
          onChange={(evt) => {
            setInputValue(evt.target.value);
          }}
        />
        <button
          className={buttonStyles.base}
          onClick={handlePlaySound}
          disabled={controlState === "guessing" || isSpeaking}
        >
          🔊
        </button>
      </div>
      <p className="text-gray-300 text-lg mt-2 text-center">
        {controlState !== "guessing" && item.remarks}
      </p>
      <div>Insert</div>
      <div className="flex gap-4">
        <button
          className={buttonStyles.base}
          onClick={handleCheckAnswer}
          disabled={controlState !== "guessing" || isSpeaking}
        >
          Check answer
        </button>
        <button
          className={buttonStyles.base}
          onClick={handleGiveUp}
          disabled={controlState !== "guessing" || isSpeaking}
        >
          Give up
        </button>
        <button
          className={buttonStyles.base}
          onClick={handleNextQuestion}
          disabled={controlState === "guessing" || isSpeaking}
        >
          Next question
        </button>
      </div>
    </div>
  );
}
