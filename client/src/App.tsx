import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import { UserImport } from "./components/UserImport";
import { OPFSExplorer } from "./components/OPFS";
import { Navbar } from "./components/Navbar";
import { Quiz } from "./components/Quiz";
import { QuizSelectionScreen } from "./components/QuizSelectionScreen";
import { Settings } from "./components/Settings";
import { SettingsProvider } from "./contexts/SettingsContext";
import { showToast } from "./Toast";

function Home() {
  return (
    <div className="text-center">
      <nav className="flex flex-col items-center gap-8"></nav>
      <div className="flex flex-col gap-3">
        <Link to={"/import"}>Add word list</Link>
        <Link to={"/quiz-selection"}>Quiz</Link>
        <Link to={"/settings"}>Settings</Link>
        <Link to={"/opfs"}>OPFS</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <div className="relative flex flex-col items-center justify-center w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/import" element={<UserImport />} />
          <Route path="/opfs" element={<OPFSExplorer />} />
          <Route path="/quiz-selection" element={<QuizSelectionScreen />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
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
