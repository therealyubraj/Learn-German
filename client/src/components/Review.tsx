import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import { getStatsForWords, getWordListByName, writeStats } from "../FS/utils";
import { quizEngine } from "../quiz/engine";
import { useSync } from "../sync/SyncContext";
import { assertSyncMutationAllowed } from "../sync/runtime";
import { showToast } from "../Toast";
import { QuizItem, WordStat } from "../types";
import { getQuizItemKey } from "../utils";

type ReviewLoadState = "loading" | "ready" | "empty" | "error";

const buttonClassName =
  "inline-flex min-h-14 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function ReviewButtonLabel({
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

export function Review() {
  const { name = "" } = useParams();
  const { settings } = useSettings();
  const { session, saveStatsDeltaImmediately } = useSync();
  const decodedName = useMemo(() => decodeURIComponent(name), [name]);
  const [loadState, setLoadState] = useState<ReviewLoadState>("loading");
  const [reviewWords, setReviewWords] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const currentWord = reviewWords[currentIndex];
  const remainingCount = Math.max(reviewWords.length - currentIndex, 0);
  const showVimBindings = settings.vim.enabled;

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
      console.error("Failed to persist review stats.", error);
      showToast(message);
      return false;
    }
  }

  useEffect(() => {
    async function loadReviewWords() {
      setLoadState("loading");

      try {
        const storedWordList = await getWordListByName(decodedName);
        const stats = await getStatsForWords(storedWordList.list);
        const now = Date.now();
        const dueWords = storedWordList.list.filter((word) => {
          const stat = stats[getQuizItemKey(word)];
          return stat ? quizEngine.isDueForReview(stat, now) : false;
        });

        quizEngine.resetEngine({
          checksum: storedWordList.metadata.checksum,
          words: storedWordList.list,
          stats,
        });

        setReviewWords(dueWords);
        setCurrentIndex(0);
        setIsRevealed(false);
        setLoadState(dueWords.length > 0 ? "ready" : "empty");
      } catch (error) {
        console.error("Failed to load review words.", error);
        setLoadState("error");
      }
    }

    void loadReviewWords();
  }, [decodedName]);

  async function handleReviewResult(remembered: boolean) {
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

    const currentKey = getQuizItemKey(currentWord);
    const currentStats = quizEngine.getStats();
    const previousStat = currentStats[currentKey]
      ? { ...currentStats[currentKey] }
      : null;

    quizEngine.updateReviewStats(currentWord, remembered);

    const didPersist = await persistStatMutation(currentKey, previousStat);
    if (!didPersist) {
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= reviewWords.length) {
      setLoadState("empty");
      return;
    }

    setCurrentIndex(nextIndex);
    setIsRevealed(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-start justify-center px-4 py-6 sm:items-center sm:px-8 sm:py-10">
      <div className="flex w-full max-w-[42rem] flex-col gap-6">
        <div className="text-center">
          <p className="text-base leading-7 text-[#FBBF24] sm:text-lg">
            Review due words
          </p>
          <h1 className="mt-2 text-[2.65rem] font-semibold leading-[1] text-[#E6EDF3] sm:text-[4rem]">
            {decodedName}
          </h1>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-[36px] sm:py-[40px]">
          {loadState === "loading" ? (
            <p className="text-center text-sm font-medium text-[#8B949E]">
              Loading review words...
            </p>
          ) : null}

          {loadState === "error" ? (
            <div className="text-center">
              <p className="text-sm font-medium text-[#E6EDF3]">
                Could not load this review set.
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
                Nothing due for review.
              </p>
              <p className="mt-2 text-sm text-[#8B949E]">
                Known words from this set will come back when their review
                window opens.
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
                  {currentIndex + 1} / {reviewWords.length}
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
                    {isRevealed ? "Answer" : "Prompt"}
                  </p>
                  <p className="text-[3rem] font-semibold leading-none text-[#E6EDF3] sm:text-[4rem]">
                    {isRevealed ? currentWord.RHS : currentWord.LHS}
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
                  onClick={() => void handleReviewResult(false)}
                  data-vim-key="g"
                  className={`${buttonClassName} border-[#F85149]/45 bg-[#F85149]/8 text-[#FF7B72] hover:border-[#F85149] hover:bg-[#F85149]/14 hover:text-[#FFA198] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]`}
                >
                  <ReviewButtonLabel
                    label="I forgot"
                    vimKey="G"
                    showVimKey={showVimBindings}
                  />
                </button>
                <button
                  type="button"
                  disabled={!isRevealed}
                  onClick={() => void handleReviewResult(true)}
                  data-vim-key="n"
                  className={`${buttonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]`}
                >
                  <ReviewButtonLabel
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
