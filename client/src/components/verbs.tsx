import { useState } from "react";
import { motion } from "framer-motion";

export interface VerbItem {
  en: string;
  de: string[];
  note?: string;
}

const DEMO_VERBS: VerbItem[] = [
  { en: "to be", de: ["sein"], note: "irregular" },
  { en: "to have", de: ["haben"], note: "irregular" },
  { en: "to go", de: ["gehen"], note: "irregular" },
  { en: "to come", de: ["kommen"], note: "irregular" },
  { en: "to make / do", de: ["machen", "tun"], note: "machen is default" },
  { en: "to say", de: ["sagen"], note: "regular" },
  { en: "to see", de: ["sehen"], note: "irregular (e→ie)" },
  { en: "to take", de: ["nehmen"], note: "irregular (e→i)" },
  { en: "to give", de: ["geben"], note: "irregular (e→i)" },
  { en: "to want", de: ["wollen"], note: "modal" },
  {
    en: "to can / be able to",
    de: ["können", "koennen"],
    note: "modal; accept oe",
  },
  {
    en: "to must / have to",
    de: ["müssen", "muessen"],
    note: "modal; accept ue",
  },
  { en: "to should / ought to", de: ["sollen"], note: "modal" },
  {
    en: "to may / be allowed to",
    de: ["dürfen", "duerfen"],
    note: "modal; accept ue",
  },
  { en: "to like (to)", de: ["mögen", "moegen"], note: "modal-like" },
  { en: "to learn", de: ["lernen"], note: "regular" },
  { en: "to read", de: ["lesen"], note: "irregular (e→ie)" },
  { en: "to write", de: ["schreiben"], note: "regular" },
  { en: "to eat", de: ["essen"], note: "irregular (e→i)" },
  { en: "to drink", de: ["trinken"], note: "regular" },
  {
    en: "to live / reside",
    de: ["wohnen", "leben"],
    note: "wohnen=reside, leben=be alive",
  },
  { en: "to work", de: ["arbeiten"], note: "regular" },
  { en: "to speak", de: ["sprechen"], note: "irregular (e→i)" },
  { en: "to understand", de: ["verstehen"], note: "regular" },
  {
    en: "to begin / start",
    de: ["anfangen", "beginnen"],
    note: "anfangen is separable",
  },
  {
    en: "to stop / quit",
    de: ["aufhören", "aufhoeren", "stoppen"],
    note: "aufhören is common",
  },
];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

export function ENtoDEVerbQuiz() {
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | "correct" | "wrong">(null);

  const currentVerb = DEMO_VERBS[current];

  const checkAnswer = () => {
    const isCorrect = currentVerb.de.some(
      (form) => normalize(answer) === normalize(form)
    );
    setFeedback(isCorrect ? "correct" : "wrong");
  };

  const nextVerb = () => {
    setAnswer("");
    setFeedback(null);
    setCurrent((prev) => (prev + 1) % DEMO_VERBS.length);
  };

  const progress = ((current + 1) / DEMO_VERBS.length) * 100;

  return (
    <div className="quiz-container max-w-2xl mx-auto bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8 text-gray-100">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white">German Verb Quiz</h2>
      </div>
      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <motion.div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <p className="text-center text-gray-300 text-sm">
        {current + 1} / {DEMO_VERBS.length}
      </p>

      <div className="text-center space-y-4">
        <p className="text-xl text-gray-300">What is the German verb for:</p>
        <p className="text-5xl font-bold text-blue-400">{currentVerb.en}</p>
        {currentVerb.de.length > 0 && (
          <p className="text-lg text-gray-400">
            (e.g., {currentVerb.de.join(", ")})
          </p>
        )}
        {currentVerb.note && (
          <p className="text-base italic text-gray-500">
            Note: {currentVerb.note}
          </p>
        )}
      </div>

      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="w-full px-5 py-4 border border-gray-600 rounded-xl text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-white placeholder-gray-400"
        placeholder="Type your answer here..."
      />

      <div className="h-20">
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center font-medium text-xl p-3 rounded-xl ${
              feedback === "correct"
                ? "bg-green-700 text-white"
                : "bg-red-700 text-white"
            }`}
          >
            {feedback === "correct" ? "Correct!" : "Wrong, try again."}
            {currentVerb.note && (
              <div className="mt-2 text-base italic text-gray-400">
                Note: {currentVerb.note}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="flex justify-center space-x-8">
        <button
          onClick={checkAnswer}
          className="px-10 py-4 bg-blue-600 text-white text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
        >
          Check
        </button>
        <button
          onClick={nextVerb}
          className="px-10 py-4 bg-gray-700 text-white text-lg rounded-xl shadow-lg hover:bg-gray-600 transition-transform transform hover:scale-105"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default ENtoDEVerbQuiz;
