import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VERBS } from "./new_list";
import { VimInputQuiz } from "./VerbInput";

interface Stats {
  correct: number;
  wrong: number;
}

interface StoredData {
  stats: Record<number, Stats>;
  activePool: number[];
  learned: number[];
}

export function ENtoDEVerbQuiz() {
  const poolSize = 12;

  const [stats, setStats] = useState<Record<number, Stats>>({});
  const [activePool, setActivePool] = useState<number[]>([]);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number>(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<
    null | "correct" | "wrong" | "givenUp"
  >(null);

  // Load stats from OPFS
  useEffect(() => {
    (async () => {
      try {
        const root = await (navigator as any).storage.getDirectory();
        const handle = await root.getFileHandle("verb-quiz-stats.json", {
          create: true,
        });
        const file = await handle.getFile();
        const text = await file.text();
        const data: StoredData = text
          ? JSON.parse(text)
          : { stats: {}, activePool: [], learned: [] };
        setStats(data.stats || {});
        setActivePool(data.activePool || []);
        setLearned(new Set(data.learned || []));

        if ((data.activePool || []).length === 0) {
          fillPool(data.stats || {}, data.learned || []);
        }

        const initialIndex = pickNextVerbIndex(
          data.stats || {},
          null,
          data.activePool || []
        );
        setCurrent(initialIndex);
      } catch {
        // no saved stats yet
        fillPool({}, []);
        setCurrent(pickNextVerbIndex({}, null, activePool));
      }
    })();
  }, []);

  const saveData = async (
    updatedStats?: Record<number, Stats>,
    updatedPool?: number[],
    updatedLearned?: Set<number>
  ) => {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("verb-quiz-stats.json", {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(
      JSON.stringify({
        stats: updatedStats || stats,
        activePool: updatedPool || activePool,
        learned: Array.from(updatedLearned || learned),
      })
    );
    await writable.close();
  };

  const fillPool = (s: Record<number, Stats>, l: number[]) => {
    let pool = [...activePool];
    const learnedSet = new Set(l);
    const scored = VERBS.map((_, i) => {
      const stat = s[i] || { correct: 0, wrong: 0 };
      const total = stat.correct + stat.wrong;
      let score = stat.wrong * 3 - stat.correct + (total === 0 ? 2 : 0);
      if (learnedSet.has(i)) score = -1;
      return { index: i, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const toAdd = scored
      .filter((x) => !pool.includes(x.index) && x.score > 0)
      .slice(0, poolSize - pool.length)
      .map((x) => x.index);
    pool = pool.concat(toAdd);
    setActivePool(pool);
  };

  const promoteWord = (i: number, updatedStats: Record<number, Stats>) => {
    if (updatedStats[i].correct >= 3) {
      const newLearned = new Set(learned);
      newLearned.add(i);
      setLearned(newLearned);
      setActivePool((prev) => prev.filter((idx) => idx !== i));
      fillPool(updatedStats, Array.from(newLearned));
    }
  };

  const pickNextVerbIndex = (
    s: Record<number, Stats>,
    previous: number | null,
    pool: number[]
  ): number => {
    if (pool.length === 0) return Math.floor(Math.random() * VERBS.length);

    const weights = pool.map((i) => {
      const stat = s[i] || { correct: 0, wrong: 0 };
      let w = 1 + stat.wrong * 3 - stat.correct * 0.5;
      if (i === previous) w = 0;
      return Math.max(w, 0.1);
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let rnd = Math.random() * total;
    for (let j = 0; j < pool.length; j++) {
      rnd -= weights[j];
      if (rnd <= 0) return pool[j];
    }
    return pool.find((i) => i !== previous) || pool[0];
  };

  const checkAnswer = () => {
    if (!answer.trim()) return;
    const currentVerb = VERBS[current];
    const isCorrect = currentVerb.de.includes(answer);

    const updated = { ...stats };
    if (!updated[current]) updated[current] = { correct: 0, wrong: 0 };
    if (isCorrect) {
      updated[current].correct++;
      promoteWord(current, updated);
      setFeedback("correct");
    } else {
      updated[current].wrong++;
      setFeedback("wrong");
    }
    setStats(updated);
    saveData(updated);
  };

  const giveUp = () => {
    setAnswer(VERBS[current].de[0]);
    setFeedback("givenUp");

    const updated = { ...stats };
    if (!updated[current]) updated[current] = { correct: 0, wrong: 0 };
    updated[current].wrong++;
    setStats(updated);
    saveData(updated);
  };

  const nextVerb = () => {
    if (!(feedback === "correct" || feedback === "givenUp")) return;
    setAnswer("");
    setFeedback(null);
    const nextIndex = pickNextVerbIndex(stats, current, activePool);
    setCurrent(nextIndex);
  };

  return (
    <div className="quiz-container max-w-5xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8 text-gray-100 flex flex-col md:flex-row">
      <div className="flex-1">
        <h2 className="text-4xl font-bold text-white text-center">
          German Verb Quiz
        </h2>
        <p className="text-center text-gray-300 text-sm mt-2">
          Attempted{" "}
          {Object.values(stats).reduce((a, s) => a + s.correct + s.wrong, 0)}{" "}
          verbs so far
        </p>

        <div className="text-center mt-6 space-y-4">
          <p className="text-xl text-gray-300">What is the German verb for:</p>
          <p className="text-5xl font-bold text-blue-400">
            {VERBS[current].en}
          </p>
        </div>

        <VimInputQuiz
          currentVerb={VERBS[current]}
          checkAnswer={checkAnswer}
          nextVerb={nextVerb}
          giveUp={giveUp}
          answer={answer}
          setAnswer={setAnswer}
          feedback={feedback}
        />

        <div className="h-20 flex items-center justify-center my-8">
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center font-extrabold text-2xl p-3 rounded-xl w-full max-w-md ${
                feedback === "correct"
                  ? "bg-green-600 text-white"
                  : feedback === "wrong"
                  ? "bg-red-600 text-white"
                  : "bg-yellow-600 text-white"
              }`}
            >
              {feedback === "correct"
                ? "Correct!"
                : feedback === "wrong"
                ? "Wrong, try again."
                : `Answer: ${VERBS[current].de.join(", ")}`}
            </motion.div>
          )}
        </div>
      </div>

      <div className="md:w-1/4 md:ml-6 mt-6 md:mt-0 bg-gray-700 p-4 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-2">Learned Verbs</h3>
        <ul className="text-gray-300 text-sm max-h-[60vh] overflow-y-auto space-y-1">
          {Array.from(learned).map((i) => (
            <li key={i}>{VERBS[i].en}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ENtoDEVerbQuiz;
