import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VERBS, type VerbItem } from "./list";
import { VimInputQuiz } from "./VerbInput";

// ================== OPFS STORAGE HELPERS ==================
let activePool: number[] = []; // indexes of VERBS currently in play
let learned: Set<number> = new Set();
let poolSize = 12;

function fillPool(stats: Record<number, { correct: number; wrong: number }>) {
  if (activePool.length >= poolSize) {
    return;
  }

  // Score verbs: higher = more urgent to study
  const scored = VERBS.map((_, i) => {
    const s = stats[i] || { correct: 0, wrong: 0 };
    const total = s.correct + s.wrong;

    // Heuristic scoring:
    // - wrong answers boost score
    // - fewer total exposures boost score
    // - correct answers reduce score
    let score = s.wrong * 3 - s.correct + (total === 0 ? 2 : 0);

    if (learned.has(i)) {
      score = -1;
    }

    return { index: i, score };
  });

  // Sort by score descending (higher priority first)
  scored.sort((a, b) => b.score - a.score);

  // Pick top N for active pool
  activePool = activePool.concat(
    scored.slice(0, poolSize - activePool.length).map((s) => s.index)
  );
}

function promoteWord(
  index: number,
  stats: Record<number, { correct: number; wrong: number }>
) {
  if (stats[index].correct >= 3) {
    // mark as learned
    learned.add(index);
    // remove from active pool
    activePool = activePool.filter((i) => i !== index);

    fillPool(stats);
  }
}

function pickNextVerbIndex(
  stats: Record<number, { correct: number; wrong: number }>,
  previousIndex: number | null
): number {
  // compute weights for activePool
  const weights = activePool.map((i) => {
    const s = stats[i] || { correct: 0, wrong: 0 };
    let weight = 1 + s.wrong * 3 - s.correct * 0.5;

    // avoid previousIndex
    if (i === previousIndex) weight = 0;

    return Math.max(weight, 0.1);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * total;

  for (let j = 0; j < activePool.length; j++) {
    rnd -= weights[j];
    if (rnd <= 0) return activePool[j];
  }

  // fallback if something goes wrong
  return activePool.find((i) => i !== previousIndex) || activePool[0];
}

async function saveStats(
  stats: Record<number, { correct: number; wrong: number }>
) {
  try {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("verb-quiz-stats.json", {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(stats));
    await writable.close();
  } catch (err) {
    console.error("Error saving stats:", err);
  }
}

async function loadStats(): Promise<
  Record<number, { correct: number; wrong: number }>
> {
  try {
    const root = await (navigator as any).storage.getDirectory();
    const handle = await root.getFileHandle("verb-quiz-stats.json");
    const file = await handle.getFile();
    return JSON.parse(await file.text());
  } catch {
    // no saved stats yet
    return {};
  }
}

// ================== UTILS ==================
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

// ================== MAIN QUIZ COMPONENT ==================
export function ENtoDEVerbQuiz() {
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<
    null | "correct" | "wrong" | "givenUp"
  >(null);
  const [stats, setStats] = useState<
    Record<number, { correct: number; wrong: number }>
  >({});

  const currentVerb: VerbItem = VERBS[current];

  // Load stats from OPFS on mount
  useEffect(() => {
    (async () => {
      const loaded = await loadStats();
      setStats(loaded);

      fillPool(loaded);
      // pick an initial random verb
      setCurrent(Math.floor(Math.random() * VERBS.length));
    })();
  }, []);

  const checkAnswer = () => {
    if (answer.trim() === "") return;
    const isCorrect = currentVerb.de.some(
      (form) => normalize(answer) === normalize(form)
    );

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
    saveStats(updated);
  };

  const nextVerb = (prevIdx: number) => {
    if (feedback === null) return;
    setAnswer("");
    setFeedback(null);
    const nextIndex = pickNextVerbIndex(stats, prevIdx);
    setCurrent(nextIndex);
  };

  return (
    <div className="quiz-container max-w-5xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8 text-gray-100">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white">German Verb Quiz</h2>
      </div>

      <p className="text-center text-gray-300 text-sm">
        You’ve attempted{" "}
        {Object.values(stats).reduce((a, s) => a + s.correct + s.wrong, 0)}{" "}
        verbs so far
      </p>

      <div className="text-center space-y-4">
        <p className="text-xl text-gray-300">What is the German verb for:</p>
        <p className="text-5xl font-bold text-blue-400">{currentVerb.en}</p>
        {currentVerb.note && (
          <p className="text-base italic text-gray-500">
            Note: {currentVerb.note}
          </p>
        )}
      </div>

      <VimInputQuiz
        currentVerb={currentVerb}
        checkAnswer={checkAnswer}
        nextVerb={() => nextVerb(current)}
        giveUp={() => {
          setFeedback("givenUp");
          setAnswer(currentVerb.de[0]); // reveal answer
        }}
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
              : `Answer: ${currentVerb.de.join(", ")}`}
          </motion.div>
        )}
      </div>

      {/* Keyboard Shortcuts Display */}
      <div className="text-center text-sm text-gray-500 mt-8 space-y-1">
        <p>Keyboard Shortcuts:</p>
        <p>
          <span className="font-semibold">Enter</span>: Check Answer
        </p>
        <p>
          <span className="font-semibold">Arrow Up</span>: Give Up
        </p>
        <p>
          <span className="font-semibold">Arrow Right</span>: Next Verb
        </p>
      </div>
    </div>
  );
}

export default ENtoDEVerbQuiz;
