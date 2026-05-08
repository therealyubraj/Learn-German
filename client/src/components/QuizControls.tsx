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

function ButtonLabel({
  label,
  vimKey,
  showVimKey,
}: {
  label: string;
  vimKey?: string;
  showVimKey: boolean;
}) {
  return (
    <span className="flex w-full items-center justify-between gap-3">
      <span>{label}</span>
      {showVimKey && vimKey ? (
        <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-full border border-current/20 bg-[#0D1117]/40 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]">
          {vimKey}
        </span>
      ) : null}
    </span>
  );
}

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
  const [isRemarksTranslationVisible, setIsRemarksTranslationVisible] =
    useState<boolean>(false);

  const { settings } = useSettings();
  const showVimBindings = settings.vim.enabled;

  const canRevealAnswer = controlState !== "guessing";
  const hasRemarks = Boolean(item.remarks?.trim());

  async function speakText(text: string) {
    try {
      setIsSpeaking(true);
      await tts.speak(text, settings.tts);
    } finally {
      setIsSpeaking(false);
    }
  }

  const handleCheckAnswer = () => {
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
    handlePlaySound();
    setInputValue(item.RHS);
    setControlState("givenUp");
  };

  const handleNextQuestion = () => {
    onNext(controlState === "guessedCorrect");
  };

  const handlePlaySound = async () => {
    await speakText(item.TTS || item.RHS);
  };

  const handleSpeakRemarks = async () => {
    if (!item.remarks?.trim()) {
      return;
    }

    await speakText(item.remarks);
  };

  const hasRemarksTranslation = Boolean(item.remarksEN?.trim());

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

      <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]">
        {controlState === "guessing" ? (
          <p className="text-center text-sm font-medium text-[#E6EDF3]">
            Type the German translation, then check your answer.
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-sm font-medium text-[#E6EDF3]">
                {item.remarks || `Correct answer: ${item.RHS}`}
              </p>
              {hasRemarksTranslation && isRemarksTranslationVisible ? (
                <p className="text-sm text-[#8B949E]">{item.remarksEN}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {hasRemarksTranslation ? (
                <button
                  type="button"
                  className={`${buttonStyles.base} ${buttonStyles.quiet} min-h-11 px-4 py-2 text-xs`}
                  onClick={() =>
                    setIsRemarksTranslationVisible((current) => !current)
                  }
                  disabled={isSpeaking}
                  data-vim-key="t"
                >
                  <ButtonLabel
                    label={
                      isRemarksTranslationVisible
                        ? "Hide translation"
                        : "Show translation"
                    }
                    vimKey="T"
                    showVimKey={showVimBindings}
                  />
                </button>
              ) : null}
              {hasRemarks ? (
                <button
                  type="button"
                  className={`${buttonStyles.base} ${buttonStyles.quiet} min-h-11 shrink-0 px-4 py-2 text-xs`}
                  onClick={handleSpeakRemarks}
                  disabled={isSpeaking}
                  data-vim-key="r"
                >
                  <ButtonLabel
                    label="Speak remarks"
                    vimKey="R"
                    showVimKey={showVimBindings}
                  />
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <button
          className={`${buttonStyles.base} ${buttonStyles.primary} w-full`}
          onClick={handleCheckAnswer}
          disabled={controlState !== "guessing" || isSpeaking}
          data-vim-key="Enter"
        >
          <ButtonLabel
            label="Check answer"
            vimKey="Enter"
            showVimKey={showVimBindings}
          />
        </button>
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            className={`${buttonStyles.base} ${buttonStyles.quiet}`}
            onClick={handlePlaySound}
            disabled={!canRevealAnswer || isSpeaking}
            data-vim-key="s"
          >
            <ButtonLabel
              label="Listen"
              vimKey="S"
              showVimKey={showVimBindings}
            />
          </button>
          <button
            className={`${buttonStyles.base} ${buttonStyles.secondary}`}
            onClick={handleGiveUp}
            disabled={controlState !== "guessing" || isSpeaking}
            data-vim-key="g"
          >
            <ButtonLabel
              label="Give up"
              vimKey="G"
              showVimKey={showVimBindings}
            />
          </button>
          <button
            className={`${buttonStyles.base} ${buttonStyles.secondary}`}
            onClick={handleNextQuestion}
            disabled={controlState === "guessing" || isSpeaking}
            data-vim-key="n"
          >
            <ButtonLabel
              label="Next question"
              vimKey="N"
              showVimKey={showVimBindings}
            />
          </button>
        </div>
      </div>

    </div>
  );
}
