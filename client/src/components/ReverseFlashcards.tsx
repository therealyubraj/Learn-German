import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import { getCombinedWordLists, writeStats } from "../FS/utils";
import { quizEngine } from "../quiz/engine";
import { useSync } from "../sync/SyncContext";
import { assertSyncMutationAllowed } from "../sync/runtime";
import { showToast } from "../Toast";
import { QuizItem, WordStat } from "../types";
import { getQuizItemKey } from "../utils";

type ReverseFlashcardLoadState = "loading" | "ready" | "empty" | "error";

const REVERSE_REVIEW_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REVERSE_FLASHCARDS_PER_SESSION = 30;

const buttonClassName =
  "inline-flex min-h-14 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors";

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
  const { session, saveStatsDeltaImmediately } = useSync();
  const selectedQuizzes = useMemo<string[]>(
    () => location.state?.selectedQuizzes ?? [],
    [location.state],
  );
  const [loadState, setLoadState] =
    useState<ReverseFlashcardLoadState>("loading");
  const [knownWords, setKnownWords] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [forgottenCount, setForgottenCount] = useState(0);

  const currentWord = knownWords[currentIndex];
  const hasSelection = selectedQuizzes.length > 0;
  const showVimBindings = settings.vim.enabled;

  function isReverseReviewDue(stat: WordStat, now = Date.now()) {
    return now - stat.reverseReviewedAt >= REVERSE_REVIEW_INTERVAL_MS;
  }

  async function persistStatMutation(
    statKey: string,
    previousStat: WordStat | null,
  ) {
    const stats = quizEngine.getStats();

    try {
      if (session) {
        const canonicalStats = await saveStatsDeltaImmediately(stats, [statKey]);
        if (canonicalStats[statKey]) {
          stats[statKey] = canonicalStats[statKey];
        }
        return true;
      }

      const success = await writeStats(stats, {
        dirtyStatKeys: [statKey],
      });
      if (!success) {
        throw new Error("Failed to write stats.");
      }
      return true;
    } catch (error) {
      if (previousStat) {
        stats[statKey] = previousStat;
      } else {
        delete stats[statKey];
      }

      const message = (error as Error).message;
      console.error("Failed to persist reverse flashcard stats.", error);
      showToast(message);
      return false;
    }
  }

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

        const now = Date.now();
        const nextKnownWords = fetchedQuiz.words
          .filter((word) => {
            const stat = fetchedQuiz.stats[getQuizItemKey(word)];
            return stat
              ? quizEngine.isKnown(stat) && isReverseReviewDue(stat, now)
              : false;
          })
          .sort((left, right) => {
            const leftStat = fetchedQuiz.stats[getQuizItemKey(left)];
            const rightStat = fetchedQuiz.stats[getQuizItemKey(right)];
            return leftStat.reverseReviewedAt - rightStat.reverseReviewedAt;
          })
          .slice(0, MAX_REVERSE_FLASHCARDS_PER_SESSION);

        setKnownWords(nextKnownWords);
        setCurrentIndex(0);
        setIsRevealed(false);
        setIsDetailOpen(false);
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
      setIsDetailOpen(false);
      setLoadState("empty");
      return;
    }

    setCurrentIndex(nextIndex);
    setIsRevealed(false);
    setIsDetailOpen(false);
  }

  async function handleRemembered() {
    if (!currentWord) {
      return;
    }

    try {
      assertSyncMutationAllowed();
    } catch (error) {
      console.error(error);
      window.alert((error as Error).message);
      return;
    }

    const currentKey = getQuizItemKey(currentWord);
    const currentStats = quizEngine.getStats();
    const previousStat = currentStats[currentKey]
      ? { ...currentStats[currentKey] }
      : null;

    quizEngine.markReverseRecallSucceeded(currentWord);

    const didPersist = await persistStatMutation(currentKey, previousStat);
    if (!didPersist) {
      return;
    }

    setRememberedCount((count) => count + 1);
    advanceCard();
  }

  async function handleForgotten() {
    if (!currentWord) {
      return;
    }

    try {
      assertSyncMutationAllowed();
    } catch (error) {
      console.error(error);
      window.alert((error as Error).message);
      return;
    }

    const currentKey = getQuizItemKey(currentWord);
    const currentStats = quizEngine.getStats();
    const previousStat = currentStats[currentKey]
      ? { ...currentStats[currentKey] }
      : null;

    quizEngine.markReverseRecallFailed(currentWord);

    const didPersist = await persistStatMutation(currentKey, previousStat);
    if (!didPersist) {
      return;
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
                  : "No reverse cards due."}
              </p>
              <p className="mt-2 text-sm text-[#8B949E]">
                {knownWords.length > 0
                  ? `${rememberedCount} remembered · ${forgottenCount} sent back to practice`
                  : "Known words return here after a short break."}
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
                <button
                  type="button"
                  onClick={() => void handleForgotten()}
                  data-vim-key="g"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#F85149]/45 bg-[#F85149]/8 px-4 py-2 text-xs font-semibold text-[#FF7B72] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/14 hover:text-[#FFA198]"
                >
                  <ReverseButtonLabel
                    label="I forgot"
                    vimKey="G"
                    showVimKey={showVimBindings}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isRevealed) {
                    setIsRevealed(true);
                    return;
                  }
                  setIsDetailOpen(true);
                }}
                data-vim-key={isRevealed ? undefined : "Enter"}
                className="h-[min(50svh,22rem)] min-h-[20.5rem] w-full overflow-hidden rounded-3xl border border-[#30363D] bg-[#0D1117] px-6 py-7 text-left transition-colors hover:border-[#F59E0B] hover:bg-[#121821] sm:h-[23rem] sm:px-8 sm:py-8"
              >
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FBBF24]">
                    {isRevealed ? "Meaning" : "German"}
                  </p>
                  <p className="flashcard-clamp flashcard-clamp-2 max-w-full text-[2.65rem] font-semibold leading-[1.02] text-[#E6EDF3] sm:text-[4rem]">
                    {isRevealed ? currentWord.LHS : currentWord.RHS}
                  </p>
                  {isRevealed ? (
                    <div className="flex max-w-[32rem] flex-col gap-2">
                      <p className="flashcard-clamp flashcard-clamp-1 text-sm font-medium text-[#8B949E]">
                        {currentWord.RHS}
                      </p>
                      {currentWord.remarks ? (
                        <p className="flashcard-clamp flashcard-clamp-3 text-base leading-7 text-[#E6EDF3]">
                          {currentWord.remarks}
                        </p>
                      ) : null}
                      {currentWord.remarksEN ? (
                        <p className="flashcard-clamp flashcard-clamp-2 text-sm leading-6 text-[#8B949E]">
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
                  onClick={() => void handleRemembered()}
                  data-vim-key="n"
                  className={`${buttonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C] sm:col-start-2`}
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

        {isDetailOpen && currentWord ? (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/70 px-4 pb-4 pt-16 sm:items-center sm:justify-center sm:p-8"
            onClick={() => setIsDetailOpen(false)}
          >
            <div
              className="max-h-[82svh] w-full max-w-[42rem] overflow-y-auto rounded-3xl border border-[#30363D] bg-[#0D1117] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-8 sm:py-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#FBBF24]">
                    Meaning
                  </p>
                  <h2 className="mt-3 break-words text-[2.65rem] font-semibold leading-[1.02] text-[#E6EDF3] sm:text-[4rem]">
                    {currentWord.LHS}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close details"
                  onClick={() => setIsDetailOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#30363D] bg-[#161B22] text-xl leading-none text-[#8B949E] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#E6EDF3]"
                >
                  &times;
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B949E]">
                    German
                  </p>
                  <p className="mt-2 break-words text-xl font-semibold text-[#E6EDF3]">
                    {currentWord.RHS}
                  </p>
                </div>
                {currentWord.remarks ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B949E]">
                      Deutsch
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-[#E6EDF3]">
                      {currentWord.remarks}
                    </p>
                  </div>
                ) : null}
                {currentWord.remarksEN ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B949E]">
                      English
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#8B949E]">
                      {currentWord.remarksEN}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

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
