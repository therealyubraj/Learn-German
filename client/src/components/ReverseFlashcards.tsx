import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import { getCombinedWordLists, writeStats } from "../FS/utils";
import { quizEngine } from "../quiz/engine";
import { assertSyncMutationAllowed } from "../sync/runtime";
import { QuizItem } from "../types";
import { getQuizItemKey } from "../utils";

type ReverseFlashcardLoadState = "loading" | "ready" | "empty" | "error";

const buttonClassName =
  "inline-flex min-h-14 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function ReverseButtonLabel({
  label,
  vimKey,
  showVimKey,
}: {
  label: string;
  vimKey: string;
  showVimKey: boolean;
}) {
  return (
    <span className="flex w-full items-center justify-center gap-3">
      <span>{label}</span>
      {showVimKey ? (
        <span className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-current/20 bg-[#0D1117]/40 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]">
          {vimKey}
        </span>
      ) : null}
    </span>
  );
}

export function ReverseFlashcards() {
  const location = useLocation();
  const { settings } = useSettings();
  const selectedQuizzes = useMemo<string[]>(
    () => location.state?.selectedQuizzes ?? [],
    [location.state],
  );
  const [loadState, setLoadState] =
    useState<ReverseFlashcardLoadState>("loading");
  const [knownWords, setKnownWords] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [forgottenCount, setForgottenCount] = useState(0);

  const currentWord = knownWords[currentIndex];
  const remainingCount = Math.max(knownWords.length - currentIndex, 0);
  const hasSelection = selectedQuizzes.length > 0;
  const showVimBindings = settings.vim.enabled;

  useEffect(() => {
    async function loadKnownWords() {
      setLoadState("loading");

      if (!hasSelection) {
        setKnownWords([]);
        setLoadState("empty");
        return;
      }

      try {
        const fetchedQuiz = await getCombinedWordLists(selectedQuizzes);
        quizEngine.resetEngine(fetchedQuiz);

        const nextKnownWords = fetchedQuiz.words.filter((word) => {
          const stat = fetchedQuiz.stats[getQuizItemKey(word)];
          return stat ? quizEngine.isKnown(stat) : false;
        });

        setKnownWords(nextKnownWords);
        setCurrentIndex(0);
        setIsRevealed(false);
        setRememberedCount(0);
        setForgottenCount(0);
        setLoadState(nextKnownWords.length > 0 ? "ready" : "empty");
      } catch (error) {
        console.error("Failed to load reverse flashcards.", error);
        setLoadState("error");
      }
    }

    void loadKnownWords();
  }, [hasSelection, selectedQuizzes]);

  function advanceCard() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= knownWords.length) {
      setLoadState("empty");
      return;
    }

    setCurrentIndex(nextIndex);
    setIsRevealed(false);
  }

  function handleRemembered() {
    if (!currentWord || !isRevealed) {
      return;
    }

    setRememberedCount((count) => count + 1);
    advanceCard();
  }

  async function handleForgotten() {
    if (!currentWord || !isRevealed) {
      return;
    }

    try {
      assertSyncMutationAllowed();
    } catch (error) {
      console.error(error);
      window.alert((error as Error).message);
      return;
    }

    quizEngine.markReverseRecallFailed(currentWord);
    const success = await writeStats(quizEngine.getStats(), {
      dirtyStatKeys: [getQuizItemKey(currentWord)],
    });

    if (!success) {
      console.error("Failed to write stats?");
    }

    setForgottenCount((count) => count + 1);
    advanceCard();
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-start justify-center px-4 py-6 sm:items-center sm:px-8 sm:py-10">
      <div className="flex w-full max-w-[42rem] flex-col gap-6">
        <div className="text-center">
          <p className="text-base leading-7 text-[#FBBF24] sm:text-lg">
            Reverse flashcards
          </p>
          <h1 className="mt-2 text-[2.65rem] font-semibold leading-[1] text-[#E6EDF3] sm:text-[4rem]">
            Known word audit
          </h1>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-[36px] sm:py-[40px]">
          {loadState === "loading" ? (
            <p className="text-center text-sm font-medium text-[#8B949E]">
              Loading known words...
            </p>
          ) : null}

          {loadState === "error" ? (
            <div className="text-center">
              <p className="text-sm font-medium text-[#E6EDF3]">
                Could not load reverse flashcards.
              </p>
              <Link
                to="/"
                className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
              >
                Back to setup
              </Link>
            </div>
          ) : null}

          {loadState === "empty" ? (
            <div className="text-center">
              <p className="text-lg font-semibold text-[#E6EDF3]">
                {knownWords.length > 0
                  ? "Reverse audit complete."
                  : "No known words available."}
              </p>
              <p className="mt-2 text-sm text-[#8B949E]">
                {knownWords.length > 0
                  ? `${rememberedCount} remembered · ${forgottenCount} sent back to practice`
                  : "Start a regular quiz first, then known words will appear here."}
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
              >
                Back to setup
              </Link>
            </div>
          ) : null}

          {loadState === "ready" && currentWord ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4 text-sm text-[#8B949E]">
                <span>
                  {currentIndex + 1} / {knownWords.length}
                </span>
                <span>{remainingCount} remaining</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isRevealed) {
                    setIsRevealed(true);
                  }
                }}
                data-vim-key={isRevealed ? undefined : "Enter"}
                className="min-h-[19rem] w-full rounded-3xl border border-[#30363D] bg-[#0D1117] px-6 py-8 text-left transition-colors hover:border-[#F59E0B] hover:bg-[#121821]"
              >
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FBBF24]">
                    {isRevealed ? "Meaning" : "German"}
                  </p>
                  <p className="text-[3rem] font-semibold leading-none text-[#E6EDF3] sm:text-[4rem]">
                    {isRevealed ? currentWord.LHS : currentWord.RHS}
                  </p>
                  {isRevealed ? (
                    <div className="flex max-w-[32rem] flex-col gap-3">
                      {currentWord.remarks ? (
                        <p className="text-base leading-7 text-[#E6EDF3]">
                          {currentWord.remarks}
                        </p>
                      ) : null}
                      {currentWord.remarksEN ? (
                        <p className="text-sm leading-6 text-[#8B949E]">
                          {currentWord.remarksEN}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-[#8B949E]">
                      Tap to reveal
                      {showVimBindings ? (
                        <span className="ml-2 rounded-full border border-current/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em]">
                          Enter
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!isRevealed}
                  onClick={() => void handleForgotten()}
                  data-vim-key="g"
                  className={`${buttonClassName} border-[#F85149]/45 bg-[#F85149]/8 text-[#FF7B72] hover:border-[#F85149] hover:bg-[#F85149]/14 hover:text-[#FFA198] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]`}
                >
                  <ReverseButtonLabel
                    label="I forgot"
                    vimKey="G"
                    showVimKey={showVimBindings}
                  />
                </button>
                <button
                  type="button"
                  disabled={!isRevealed}
                  onClick={handleRemembered}
                  data-vim-key="n"
                  className={`${buttonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]`}
                >
                  <ReverseButtonLabel
                    label="I knew it"
                    vimKey="N"
                    showVimKey={showVimBindings}
                  />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {loadState === "ready" || loadState === "loading" ? (
          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
            >
              Back to setup
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
