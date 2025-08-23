import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { VERBS, type VerbItem } from "./list";
import { VimInputQuiz } from "./VerbInput";

// ================== OPFS STORAGE HELPERS ==================
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

function pickNextVerbIndex(
  stats: Record<number, { correct: number; wrong: number }>
): number {
  const weights = VERBS.map((_, i) => {
    const s = stats[i] || { correct: 0, wrong: 0 };
    // Basic weighting: wrong answers increase weight, correct answers decrease it slightly
    return 1 + s.wrong * 2 - s.correct * 0.5;
  });

  const total = weights.reduce((a, b) => a + Math.max(b, 0.1), 0);
  let rnd = Math.random() * total;

  for (let i = 0; i < weights.length; i++) {
    rnd -= Math.max(weights[i], 0.1);
    if (rnd <= 0) return i;
  }
  return 0;
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
      setFeedback("correct");
    } else {
      updated[current].wrong++;
      setFeedback("wrong");
    }
    setStats(updated);
    saveStats(updated);
  };

  const giveUp = () => {
    const updated = { ...stats };
    if (!updated[current]) updated[current] = { correct: 0, wrong: 0 };
    updated[current].wrong++;
    setStats(updated);
    saveStats(updated);
    setFeedback("givenUp");
  };

  const nextVerb = () => {
    if (feedback === null) return;
    setAnswer("");
    setFeedback(null);
    const nextIndex = pickNextVerbIndex(stats);
    setCurrent(nextIndex);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && feedback !== null) {
        nextVerb();
      } else if (event.key === "ArrowUp") {
        giveUp();
      }

      // Allow Enter even while typing
      if (event.key === "Enter" && answer.trim() !== "" && feedback === null) {
        checkAnswer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answer, feedback, stats]);

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
        nextVerb={nextVerb}
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
