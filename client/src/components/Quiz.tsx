import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QuizInput } from "./QuizInput";
import type { QuizItem } from "../types";

interface Stats {
  correct: number;
  wrong: number;
}

interface StoredData {
  stats: Record<number, Stats>;
  activePool: number[];
  learned: number[];
}

interface QuizProps {
  items: QuizItem[];
  quizType: string;
}

export function Quiz({ items, quizType }: QuizProps) {
  const poolSize = 12;

  const [stats, setStats] = useState<Record<number, Stats>>({});
  const [activePool, setActivePool] = useState<number[]>([]);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number>(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<
    null | "correct" | "wrong" | "givenUp"
  >(null);

  const statsFileName = `${quizType}-quiz-stats.json`;

  // Load stats from OPFS
  useEffect(() => {
    (async () => {
      try {
        const root = await (navigator as any).storage.getDirectory();
        const handle = await root.getFileHandle(statsFileName, {
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

        const initialIndex = pickNextItemIndex(
          data.stats || {},
          null,
          data.activePool || []
        );
        setCurrent(initialIndex);
      } catch {
        // no saved stats yet
        fillPool({}, []);
        setCurrent(pickNextItemIndex({}, null, activePool));
      }
    })();
  }, [items, quizType]);

  const saveData = async (
    updatedStats?: Record<number, Stats>,
    updatedPool?: number[],
    updatedLearned?: Set<number>
  ) => {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle(statsFileName, {
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
    const scored = items.map((_, i) => {
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

  const demoteWord = (i: number) => {
    if (learned.has(i)) {
      const newLearned = new Set(learned);
      newLearned.delete(i);
      setLearned(newLearned);
      setActivePool((prev) => [...prev, i]);
    }
  };

  const pickNextItemIndex = (
    s: Record<number, Stats>,
    previous: number | null,
    pool: number[]
  ): number => {
    if (pool.length === 0) return Math.floor(Math.random() * items.length);

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
    const currentItem = items[current];
    const isCorrect = currentItem.de.includes(answer);

    const updated = { ...stats };
    if (!updated[current]) updated[current] = { correct: 0, wrong: 0 };
    if (isCorrect) {
      updated[current].correct++;
      promoteWord(current, updated);
      setFeedback("correct");
    } else {
      updated[current].wrong++;
      demoteWord(current);
      setFeedback("wrong");
    }
    setStats(updated);
    saveData(updated);
  };

  const giveUp = () => {
    setAnswer(items[current].de[0]);
    setFeedback("givenUp");

    const updated = { ...stats };
    if (!updated[current]) updated[current] = { correct: 0, wrong: 0 };
    updated[current].wrong++;
    demoteWord(current);
    setStats(updated);
    saveData(updated);
  };

  const nextItem = () => {
    if (!(feedback === "correct" || feedback === "givenUp")) return;
    setAnswer("");
    setFeedback(null);
    const nextIndex = pickNextItemIndex(stats, current, activePool);
    setCurrent(nextIndex);
  };

  if (!items || items.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="quiz-container max-w-5xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8 text-gray-100 flex flex-col md:flex-row">
      <div className="flex-1">
        <h2 className="text-4xl font-bold text-white text-center">
          German {quizType.charAt(0).toUpperCase() + quizType.slice(1)} Quiz
        </h2>
        <p className="text-center text-gray-300 text-sm mt-2">
          Attempted{" "}
          {Object.values(stats).reduce((a, s) => a + s.correct + s.wrong, 0)}{" "}
          {quizType} so far
        </p>

        <div className="text-center mt-6 space-y-4">
          <p className="text-xl text-gray-300">What is the German {quizType.slice(0, -1)} for:</p>
          <p className="text-5xl font-bold text-blue-400">
            {items[current].en}
          </p>
        </div>

        <QuizInput
          currentItem={items[current]}
          checkAnswer={checkAnswer}
          nextVerb={nextItem}
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
                : `Answer: ${items[current].de.join(", ")}`}
            </motion.div>
          )}
        </div>
      </div>

      <div className="md:w-1/4 md:ml-6 mt-6 md:mt-0 bg-gray-700 p-4 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-2">Learned {quizType}</h3>
        <ul className="text-gray-300 text-sm max-h-[60vh] overflow-y-auto space-y-1">
          {Array.from(learned).map((i) => (
            <li key={i}>{items[i].en}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Quiz;
