import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllStoredWordLists, getStatsForWords } from "../FS/utils";
import { quizEngine } from "../quiz/engine";
import { StoredWordList, WordStat } from "../types";
import { getQuizItemKey } from "../utils";

type WordSetStatsSummary = {
  wordSet: StoredWordList;
  totalWords: number;
  unseenWords: number;
  learningWords: number;
  knownWords: number;
  dueReviewWords: number;
  averageMastery: number;
  averageExposure: number;
  masteryBuckets: Record<string, number>;
  recentlyReviewedWords: number;
};

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function getStatBucket(stat: WordStat | undefined) {
  if (!stat || stat.lastReviewed <= 0) {
    return "unseen";
  }

  if (quizEngine.isKnown(stat)) {
    return "known";
  }

  return "learning";
}

function buildStatsSummary(
  wordSet: StoredWordList,
  stats: Record<string, WordStat>,
) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const masteryBuckets: Record<string, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5+": 0,
  };

  let unseenWords = 0;
  let learningWords = 0;
  let knownWords = 0;
  let dueReviewWords = 0;
  let recentlyReviewedWords = 0;
  let masteryTotal = 0;
  let exposureTotal = 0;

  for (const word of wordSet.list) {
    const stat = stats[getQuizItemKey(word)];
    const bucket = getStatBucket(stat);

    if (bucket === "unseen") {
      unseenWords++;
    } else if (bucket === "known") {
      knownWords++;
    } else {
      learningWords++;
    }

    const mastery = stat?.mastery ?? 1;
    masteryTotal += mastery;
    exposureTotal += stat?.exposureCount ?? 0;

    if (mastery >= 5) {
      masteryBuckets["5+"]++;
    } else {
      masteryBuckets[String(Math.max(1, mastery))]++;
    }

    if (stat && quizEngine.isDueForReview(stat, now)) {
      dueReviewWords++;
    }

    if (stat?.lastReviewed && now - stat.lastReviewed <= oneDayMs) {
      recentlyReviewedWords++;
    }
  }

  const totalWords = wordSet.list.length;

  return {
    wordSet,
    totalWords,
    unseenWords,
    learningWords,
    knownWords,
    dueReviewWords,
    recentlyReviewedWords,
    averageMastery: totalWords > 0 ? masteryTotal / totalWords : 0,
    averageExposure: totalWords > 0 ? exposureTotal / totalWords : 0,
    masteryBuckets,
  };
}

function formatUpdatedAt(updatedAt: string | undefined) {
  if (!updatedAt) {
    return "Unknown";
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return updatedAt;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  label,
  value,
  accent = "text-[#E6EDF3]",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B949E]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  colorClassName,
}: {
  label: string;
  value: number;
  total: number;
  colorClassName: string;
}) {
  const width = percent(value, total);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-[#E6EDF3]">{label}</span>
        <span className="text-[#8B949E]">
          {value} · {width}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#161B22]">
        <div
          className={`h-full rounded-full ${colorClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function WordSetStats() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [summaries, setSummaries] = useState<WordSetStatsSummary[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoading(true);
        setError(null);

        const wordSets = await getAllStoredWordLists();
        const nextSummaries: WordSetStatsSummary[] = [];

        for (const wordSet of wordSets) {
          const stats = await getStatsForWords(wordSet.list);
          nextSummaries.push(buildStatsSummary(wordSet, stats));
        }

        setSummaries(nextSummaries);
      } catch (loadError) {
        console.error("Failed to load word set stats.", loadError);
        setError("Could not load word set stats.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadStats();
  }, []);

  useEffect(() => {
    if (summaries.length === 0) {
      return;
    }

    const requestedName = searchParams.get("set");
    const requestedSummary = summaries.find(
      (summary) => summary.wordSet.metadata.name === requestedName,
    );
    const nextSelectedName =
      requestedSummary?.wordSet.metadata.name ??
      summaries[0]?.wordSet.metadata.name ??
      null;

    if (nextSelectedName && requestedName !== nextSelectedName) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("set", nextSelectedName);
          return next;
        },
        { replace: true },
      );
    }

    if (nextSelectedName !== selectedName) {
      setSelectedName(nextSelectedName);
    }
  }, [searchParams, selectedName, setSearchParams, summaries]);

  const selectedSummary = useMemo(
    () =>
      summaries.find((summary) => summary.wordSet.metadata.name === selectedName) ??
      null,
    [selectedName, summaries],
  );

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-start justify-center px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00C896]">
            Word Set Stats
          </p>
          <h1 className="mt-2 text-[2.75rem] font-semibold leading-none text-[#E6EDF3] sm:text-[4rem]">
            Study Overview
          </h1>
        </div>

        <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-[#30363D] bg-[#161B22] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <div className="px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B949E]">
                Word sets
              </p>
            </div>

            <div className="quiz-selection-scroll flex max-h-[34rem] flex-col gap-2 overflow-y-auto">
              {isLoading ? (
                <p className="px-3 py-4 text-sm text-[#8B949E]">Loading...</p>
              ) : null}

              {!isLoading && summaries.length === 0 ? (
                <p className="px-3 py-4 text-sm text-[#8B949E]">
                  No word sets found.
                </p>
              ) : null}

              {summaries.map((summary) => {
                const isSelected =
                  summary.wordSet.metadata.name === selectedSummary?.wordSet.metadata.name;

                return (
                  <button
                    key={summary.wordSet.metadata.name}
                    type="button"
                    onClick={() => {
                      const nextSelectedName = summary.wordSet.metadata.name;
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        next.set("set", nextSelectedName);
                        return next;
                      });
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-[#00C896] bg-[#00C896]/12"
                        : "border-transparent bg-transparent hover:border-[#30363D] hover:bg-[#0D1117]"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-[#E6EDF3]">
                      {summary.wordSet.metadata.name}
                    </p>
                    <p className="mt-1 text-xs text-[#8B949E]">
                      {summary.totalWords} words · {summary.dueReviewWords} due
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-[#30363D] bg-[#161B22] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-7 sm:py-7">
            {error ? (
              <p className="rounded-2xl border border-[#F85149]/40 bg-[#F85149]/10 px-4 py-4 text-sm text-[#FFB3AD]">
                {error}
              </p>
            ) : null}

            {!error && !selectedSummary ? (
              <p className="text-sm text-[#8B949E]">
                Select a word set to see its stats.
              </p>
            ) : null}

            {selectedSummary ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-[#E6EDF3]">
                      {selectedSummary.wordSet.metadata.name}
                    </h2>
                    <p className="mt-1 text-sm text-[#8B949E]">
                      {selectedSummary.totalWords} total words
                    </p>
                  </div>
                  <p className="text-sm text-[#8B949E]">
                    Updated{" "}
                    {formatUpdatedAt(selectedSummary.wordSet.metadata.updatedAt)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Known"
                    value={selectedSummary.knownWords}
                    accent="text-[#00FF9C]"
                  />
                  <StatCard
                    label="Learning"
                    value={selectedSummary.learningWords}
                    accent="text-[#FBBF24]"
                  />
                  <StatCard label="Unseen" value={selectedSummary.unseenWords} />
                  <StatCard
                    label="Due Review"
                    value={selectedSummary.dueReviewWords}
                    accent="text-[#F59E0B]"
                  />
                </div>

                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-5 py-5">
                  <h3 className="text-base font-semibold text-[#E6EDF3]">
                    Progress
                  </h3>
                  <div className="mt-5 flex flex-col gap-5">
                    <ProgressRow
                      label="Known"
                      value={selectedSummary.knownWords}
                      total={selectedSummary.totalWords}
                      colorClassName="bg-[#00C896]"
                    />
                    <ProgressRow
                      label="Learning"
                      value={selectedSummary.learningWords}
                      total={selectedSummary.totalWords}
                      colorClassName="bg-[#F59E0B]"
                    />
                    <ProgressRow
                      label="Unseen"
                      value={selectedSummary.unseenWords}
                      total={selectedSummary.totalWords}
                      colorClassName="bg-[#8B949E]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                  <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-5 py-5">
                    <h3 className="text-base font-semibold text-[#E6EDF3]">
                      Averages
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <StatCard
                        label="Average Mastery"
                        value={selectedSummary.averageMastery.toFixed(1)}
                      />
                      <StatCard
                        label="Average Exposure"
                        value={selectedSummary.averageExposure.toFixed(1)}
                      />
                      <StatCard
                        label="Reviewed Today"
                        value={selectedSummary.recentlyReviewedWords}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-5 py-5">
                    <h3 className="text-base font-semibold text-[#E6EDF3]">
                      Mastery Distribution
                    </h3>
                    <div className="mt-5 flex flex-col gap-4">
                      {Object.entries(selectedSummary.masteryBuckets).map(
                        ([bucket, count]) => (
                          <ProgressRow
                            key={bucket}
                            label={`Mastery ${bucket}`}
                            value={count}
                            total={selectedSummary.totalWords}
                            colorClassName={
                              bucket === "1"
                                ? "bg-[#8B949E]"
                                : bucket === "2"
                                  ? "bg-[#FBBF24]"
                                  : "bg-[#00C896]"
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
