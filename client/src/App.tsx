import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import { Quiz } from "./components/Quiz";
import { VERBS } from "./data/verbs";
import { NOUNS } from "./data/nouns";

function Home() {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-extrabold mb-16 text-white drop-shadow-lg">
        What would you like to practice today?
      </h1>
      <nav className="flex flex-col items-center gap-8">
        <Link
          to="/verbs"
          className="w-72 px-8 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xl shadow-lg transition-all duration-300 transform hover:scale-110 hover:shadow-[0_0_25px_rgba(99,102,241,0.8)]"
        >
          🚀 Practice Verbs
        </Link>
        <Link
          to="/nouns"
          className="w-72 px-8 py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl shadow-lg transition-all duration-300 transform hover:scale-110 hover:shadow-[0_0_25px_rgba(16,185,129,0.8)]"
        >
          📘 Practice Nouns
        </Link>
      </nav>
    </div>
  );
}

function App() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/verbs"
          element={<Quiz items={VERBS} quizType="verbs" />}
        />
        <Route
          path="/nouns"
          element={<Quiz items={NOUNS} quizType="nouns" />}
        />
      </Routes>
    </div>
  );
}

export default App;
