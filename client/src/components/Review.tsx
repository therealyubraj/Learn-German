import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStatsForWords, getWordListByName, writeStats } from "../FS/utils";
import { quizEngine } from "../quiz/engine";
import { assertSyncMutationAllowed } from "../sync/runtime";
import { QuizItem } from "../types";
import { getQuizItemKey } from "../utils";

type ReviewLoadState = "loading" | "ready" | "empty" | "error";

const buttonClassName =
  "inline-flex min-h-14 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Review() {
  const { name = "" } = useParams();
  const decodedName = useMemo(() => decodeURIComponent(name), [name]);
  const [loadState, setLoadState] = useState<ReviewLoadState>("loading");
  const [reviewWords, setReviewWords] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const currentWord = reviewWords[currentIndex];
  const remainingCount = Math.max(reviewWords.length - currentIndex, 0);

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

    quizEngine.updateReviewStats(currentWord, remembered);
    const success = await writeStats(quizEngine.getStats(), {
      dirtyStatKeys: [getQuizItemKey(currentWord)],
    });

    if (!success) {
      console.error("Failed to write stats?");
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
                onClick={() => setIsRevealed(true)}
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
                    </p>
                  )}
                </div>
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!isRevealed}
                  onClick={() => void handleReviewResult(false)}
                  className={`${buttonClassName} border-[#F85149]/45 bg-[#F85149]/8 text-[#FF7B72] hover:border-[#F85149] hover:bg-[#F85149]/14 hover:text-[#FFA198] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]`}
                >
                  I forgot
                </button>
                <button
                  type="button"
                  disabled={!isRevealed}
                  onClick={() => void handleReviewResult(true)}
                  className={`${buttonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]`}
                >
                  I knew it
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
