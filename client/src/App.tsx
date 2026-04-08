import { Routes, Route, Link } from "react-router-dom";
import { useEffect } from "react";
import "./App.css";
import { UserImport } from "./components/UserImport";
import { OPFSExplorer } from "./components/OPFS";
import { Navbar } from "./components/Navbar";
import { Quiz } from "./components/Quiz";
import { QuizSelectionScreen } from "./components/QuizSelectionScreen";
import { Settings } from "./components/Settings";
import { SettingsProvider } from "./contexts/SettingsContext";
import { VimModeProvider } from "./contexts/VimModeContext";
import { VimModeIndicator } from "./components/VimModeIndicator";
import { initializeBuiltInWordLists } from "./FS/utils";
import { showToast } from "./Toast";

function Home() {
  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] w-full items-center overflow-hidden px-6 py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#0D1117]" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-[#00FF9C] sm:text-6xl">
            Learn German
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[#8B949E]">
            Start a quiz immediately, keep your own word lists locally, and use
            a fast minimal workflow with optional VIM controls.
          </p>

          <div className="mt-2 flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              to={"/quiz-selection"}
              className="inline-flex min-h-14 min-w-[260px] items-center justify-center rounded-xl border border-[#00C896] bg-[#00C896] px-8 py-4 text-lg font-semibold !text-[#0D1117] shadow-[0_18px_40px_rgba(0,200,150,0.18)] transition-colors hover:bg-[#00FF9C] hover:!text-[#0D1117]"
            >
              Begin Quiz
            </Link>
            <Link
              to={"/settings"}
              className="inline-flex min-h-14 min-w-[260px] items-center justify-center rounded-xl border border-[#30363D] bg-transparent px-8 py-4 text-lg font-semibold text-[#00FF9C] shadow-[0_12px_30px_rgba(0,200,150,0.08)] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8"
            >
              Open Settings
            </Link>
          </div>

          <p className="text-sm text-[#8B949E]">
            Import custom word sets from the quiz selection page when you need
            them.
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    initializeBuiltInWordLists().catch((error) => {
      console.error("Failed to initialize built-in word lists.", error);
    });
  }, []);

  return (
    <SettingsProvider>
      <VimModeProvider>
        <div className="relative flex min-h-screen w-full flex-col bg-[#0D1117] text-white">
          <Navbar />
          <main className="w-full flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/import" element={<UserImport />} />
              <Route path="/opfs" element={<OPFSExplorer />} />
              <Route path="/quiz-selection" element={<QuizSelectionScreen />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <VimModeIndicator />
        </div>
      </VimModeProvider>
    </SettingsProvider>
  );
}

// Runtime JS errors
//window.onerror = (message, source, line, column, error) => {
//showToast(message.toString());
//console.error("window.onerror", { message, source, line, column, error });
//};

// Unhandled promise rejections
//window.addEventListener("unhandledrejection", (event) => {
////showToast(event.reason);
//console.error("unhandledrejection", event);
//event.preventDefault();
//});

export default App;
