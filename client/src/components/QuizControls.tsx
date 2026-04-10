import { useState } from "react";
import { tts } from "../tts/tts";
import { QuizItem } from "../types";
import { useSettings } from "../contexts/SettingsContext";

type ControlState = "guessing" | "givenUp" | "guessedCorrect";

// Input styles with variants for validation state
const inputStyles = {
  base: `min-h-[4.75rem] w-full rounded-[1.15rem] border bg-[#0D1117] px-[24px] py-[18px]
         text-center text-[3rem] leading-none font-semibold tracking-tight text-[#E6EDF3]
         placeholder:text-[#8B949E] outline-none transition-all duration-200
         disabled:cursor-not-allowed disabled:opacity-80`,
  variants: {
    state: {
      guessing:
        "border-[#30363D] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30",
      guessedCorrect: "border-[#00C896] bg-[#00C896]/10",
      givenUp: "border-[#F85149] bg-[#F85149]/10",
    },
  },
};

// Simplified button styles with a single, uniform appearance
const buttonStyles = {
  base: "inline-flex min-h-14 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  primary:
    "border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]",
  secondary:
    "border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]",
  quiet:
    "border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]",
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
    const isCorrect = inputValue.toLowerCase() === item.RHS.toLowerCase();
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label
          htmlFor="quiz-answer"
          className="text-base font-medium text-[#A6ADC8]"
        >
          Your answer
        </label>
        <input
          id="quiz-answer"
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && controlState === "guessing") {
              e.preventDefault();
              handleCheckAnswer();
            }
          }}
        />
      </div>

      <div className="min-h-12 rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-center text-sm font-medium text-[#E6EDF3]">
        {controlState === "guessing"
          ? "Type the German translation, then check your answer."
          : item.remarks || `Correct answer: ${item.RHS}`}
      </div>

      <div className="flex flex-col gap-4">
        <button
          className={`${buttonStyles.base} ${buttonStyles.primary} w-full`}
          onClick={handleCheckAnswer}
          disabled={controlState !== "guessing" || isSpeaking}
          data-vim-key="Enter"
        >
          Check answer
        </button>
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            className={`${buttonStyles.base} ${buttonStyles.quiet}`}
            onClick={handlePlaySound}
            disabled={controlState === "guessing" || isSpeaking}
            data-vim-key="s"
          >
            Listen
          </button>
          <button
            className={`${buttonStyles.base} ${buttonStyles.secondary}`}
            onClick={handleGiveUp}
            disabled={controlState !== "guessing" || isSpeaking}
            data-vim-key="g"
          >
            Give up
          </button>
          <button
            className={`${buttonStyles.base} ${buttonStyles.secondary}`}
            onClick={handleNextQuestion}
            disabled={controlState === "guessing" || isSpeaking}
            data-vim-key="n"
          >
            Next question
          </button>
        </div>
      </div>

    </div>
  );
}
