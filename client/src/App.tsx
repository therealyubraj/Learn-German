import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { UserImport } from "./components/UserImport";
import { OPFSExplorer } from "./components/OPFS";
import { Navbar } from "./components/Navbar";
import { Quiz } from "./components/Quiz";
import { QuizSelectionScreen } from "./components/QuizSelectionScreen";
import { Review } from "./components/Review";
import { Settings } from "./components/Settings";
import { SyncPage } from "./components/sync/SyncPage";
import { TotpEnrollmentPage } from "./components/sync/TotpEnrollmentPage";
import { SyncRequirementGate } from "./components/sync/SyncRequirementGate";
import { SyncScreen } from "./components/sync/SyncScreen";
import { WordSetEditor } from "./components/WordSetEditor";
import { WordSetStats } from "./components/WordSetStats";
import { SettingsProvider } from "./contexts/SettingsContext";
import { VimModeProvider } from "./contexts/VimModeContext";
import { VimModeIndicator } from "./components/VimModeIndicator";
import { initializeBuiltInWordLists } from "./FS/utils";
import { SyncProvider } from "./sync/SyncContext";

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeBuiltInWordLists().catch((error) => {
      console.error("Failed to initialize built-in word lists.", error);
    }).finally(() => {
      setIsInitializing(false);
    });
  }, []);

  return (
    <SettingsProvider>
      <SyncProvider>
        <VimModeProvider>
          <div className="relative flex min-h-screen w-full flex-col bg-[#0D1117] text-white">
            <Navbar />
            <main className="w-full flex-1">
              {isInitializing ? (
                <div className="flex min-h-[calc(100vh-5rem)] w-full items-start justify-center px-6 pb-16 pt-28 sm:px-8 sm:pt-32">
                  <div className="w-full max-w-[42rem] rounded-3xl border border-[#30363D] bg-[#161B22] px-6 py-6 text-center text-sm font-medium text-[#8B949E] shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:px-8">
                    Preparing your word sets...
                  </div>
                </div>
              ) : (
                <Routes>
                  <Route path="/" element={<QuizSelectionScreen />} />
                  <Route path="/import" element={<UserImport />} />
                  <Route path="/opfs" element={<OPFSExplorer />} />
                  <Route path="/quiz-selection" element={<QuizSelectionScreen />} />
                  <Route path="/word-sets/:name/edit" element={<WordSetEditor />} />
                  <Route path="/word-sets/:name/review" element={<Review />} />
                  <Route path="/stats" element={<WordSetStats />} />
                  <Route path="/quiz" element={<Quiz />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/sync" element={<SyncPage />} />
                  <Route path="/totp-enroll" element={<TotpEnrollmentPage />} />
                </Routes>
              )}
            </main>
            <VimModeIndicator />
            <SyncRequirementGate />
            <SyncScreen />
          </div>
        </VimModeProvider>
      </SyncProvider>
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
