{
  /* Safelist for Tailwind JIT compiler:
  border-green-500
  border-red-500
  border-blue-500
  border-gray-600
*/
}
import { useState, useRef, useEffect } from "react";
import { useTTS } from "../contexts/TTSContext";
import { useVimMode } from "../contexts/VimModeContext";

type Props = {
  answer: string;
  onNext: (isCorrect: boolean) => void;
};

export function QuizControls({ answer, onNext }: Props) {
  const [answerState, setAnswerState] = useState({
    inputValue: "",
    incorrectAttempts: 0,
    hasAnsweredCorrectly: false,
    hasGivenUp: false,
  });
  const [shouldShake, setShouldShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { speak, isSpeaking } = useTTS();
  const {
    isActionInProgress,
    setIsActionInProgress,
    vimMode,
    setVimMode,
    isVimModeEnabled,
  } = useVimMode();
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    // This effect runs for every new question because the parent <QuizView> gives
    // this component a new `key` prop, which forces a re-mount.
    setIsActionInProgress(false);
    setVimMode("insert"); // Set vim mode to insert for the new question
    hasSpokenRef.current = false; // Reset speech guard
    inputRef.current?.focus(); // Focus the input for the new question
  }, [answer, setIsActionInProgress, setVimMode]); // `answer` is a stable dependency to trigger this effect for each new word

  useEffect(() => {
    if (
      (answerState.hasAnsweredCorrectly || answerState.hasGivenUp) &&
      !hasSpokenRef.current
    ) {
      speak(answer);
      hasSpokenRef.current = true;
    }
  }, [answerState.hasAnsweredCorrectly, answerState.hasGivenUp, answer, speak]);

  const handleCheckAnswer = () => {
    const isCorrect =
      answerState.inputValue.trim().toLowerCase() === answer.toLowerCase();
    if (isCorrect) {
      setAnswerState({
        ...answerState,
        hasAnsweredCorrectly: true,
      });
      setIsActionInProgress(true);
      setVimMode("normal");
    } else {
      setAnswerState({
        ...answerState,
        incorrectAttempts: answerState.incorrectAttempts + 1,
      });
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }
  };

  const handleGiveUp = () => {
    setAnswerState({
      ...answerState,
      inputValue: answer,
      hasGivenUp: true,
    });
    setIsActionInProgress(true);
    setVimMode("normal");
  };

  const handleNextQuestion = () => {
    // The engine needs to know the result of the last interaction
    onNext(answerState.hasAnsweredCorrectly);
  };

  const baseButtonClasses =
    "px-4 py-2 rounded-md text-white transition-colors duration-200";
  const enabledButtonClasses = "bg-blue-600 hover:bg-blue-700";
  const disabledButtonClasses = "bg-gray-500 cursor-not-allowed opacity-50";

  const getInputClasses = () => {
    let classes = `min-h-[80px] px-6 py-4 text-center
                   text-[3em] bg-gray-900 placeholder-gray-400 text-white
                   border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                   transition-all duration-300`;

    let dynamicBorderColorClass = "!border-gray-500"; // Default base border from old version
    let focusRingColorClass = "focus:ring-gray-500"; // Default focus ring for gray-500 border

    if (isVimModeEnabled && vimMode === "normal") {
      dynamicBorderColorClass = "!border-gray-600";
      focusRingColorClass = "focus:ring-gray-600";
    } else {
      if (answerState.hasAnsweredCorrectly) {
        dynamicBorderColorClass = "!border-green-500";
        focusRingColorClass = "focus:ring-green-500";
      } else if (answerState.incorrectAttempts > 0 || answerState.hasGivenUp) {
        dynamicBorderColorClass = "!border-red-500";
        focusRingColorClass = "focus:ring-red-500";
      } else {
        dynamicBorderColorClass = "!border-blue-500";
        focusRingColorClass = "focus:ring-blue-500";
      }
    }

    classes += ` ${dynamicBorderColorClass} ${focusRingColorClass}`;

    if (shouldShake) {
      classes += " animate-shake";
    }
    return classes;
  };

  const questionMode = !isActionInProgress;

  return (
    <div className="flex flex-col gap-5 mt-4">
      <div className="w-full max-w-2xl flex items-center gap-4">
        <input
          ref={inputRef}
          name="answer"
          className={getInputClasses()}
          value={answerState.inputValue}
          onChange={(e) =>
            setAnswerState({ ...answerState, inputValue: e.target.value })
          }
          disabled={isActionInProgress} // Disable input when action is in progress
          onKeyDown={(e) => {
            if (e.key === "Enter" && questionMode) {
              // Use questionMode
              handleCheckAnswer();
            }
          }}
          data-vim-primary-input="true"
        />
        <button
          onClick={() => speak(answer)}
          disabled={questionMode || isSpeaking}
          className={`${baseButtonClasses} ${
            questionMode || isSpeaking
              ? disabledButtonClasses
              : "bg-green-600 hover:bg-green-700"
          }`}
          data-vim-key="s"
        >
          🔊
        </button>
      </div>
      {isVimModeEnabled && (
        <div>{vimMode === "insert" ? "Insert" : "Normal"}</div>
      )}
      <div className="flex gap-4">
        <button
          onClick={handleCheckAnswer}
          disabled={isActionInProgress} // Disable when action is in progress
          className={`${baseButtonClasses} ${
            questionMode ? enabledButtonClasses : disabledButtonClasses
          }`}
          data-vim-key="c"
        >
          Check answer
        </button>
        <button
          onClick={handleGiveUp}
          disabled={isActionInProgress} // Disable when action is in progress
          className={`${baseButtonClasses} ${
            questionMode
              ? "bg-yellow-600 hover:bg-yellow-700"
              : disabledButtonClasses
          }`}
          data-vim-key="g"
        >
          Give up
        </button>
        <button
          onClick={handleNextQuestion}
          disabled={!isActionInProgress || isSpeaking}
          className={`${baseButtonClasses} ${
            questionMode || isSpeaking
              ? disabledButtonClasses
              : "bg-purple-600 hover:bg-purple-700"
          }`}
          data-vim-key="n"
        >
          Next question
        </button>
      </div>
    </div>
  );
}
