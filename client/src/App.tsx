import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { UserImport } from "./components/UserImport";
import { OPFSExplorer } from "./components/OPFS";
import { Navbar } from "./components/Navbar";
import { Quiz } from "./components/Quiz";
import { QuizSelectionScreen } from "./components/QuizSelectionScreen";
import { Settings } from "./components/Settings";
import { SyncPage } from "./components/sync/SyncPage";
import { TotpEnrollmentPage } from "./components/sync/TotpEnrollmentPage";
import { SyncRequirementGate } from "./components/sync/SyncRequirementGate";
import { SyncScreen } from "./components/sync/SyncScreen";
import { WordSetEditor } from "./components/WordSetEditor";
import { SettingsProvider } from "./contexts/SettingsContext";
import { VimModeProvider } from "./contexts/VimModeContext";
import { VimModeIndicator } from "./components/VimModeIndicator";
import { initializeBuiltInWordLists } from "./FS/utils";
import { SyncProvider } from "./sync/SyncContext";

function App() {
  useEffect(() => {
    initializeBuiltInWordLists().catch((error) => {
      console.error("Failed to initialize built-in word lists.", error);
    });
  }, []);

  return (
    <SettingsProvider>
      <SyncProvider>
        <VimModeProvider>
          <div className="relative flex min-h-screen w-full flex-col bg-[#0D1117] text-white">
            <Navbar />
            <main className="w-full flex-1">
              <Routes>
                <Route path="/" element={<QuizSelectionScreen />} />
                <Route path="/import" element={<UserImport />} />
                <Route path="/opfs" element={<OPFSExplorer />} />
                <Route path="/quiz-selection" element={<QuizSelectionScreen />} />
                <Route path="/word-sets/:name/edit" element={<WordSetEditor />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/sync" element={<SyncPage />} />
                <Route path="/totp-enroll" element={<TotpEnrollmentPage />} />
              </Routes>
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
