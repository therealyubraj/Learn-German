import { Routes, Route } from "react-router-dom";
import "./App.css";

function Home() {
  return (
    <div className="text-center">
      <nav className="flex flex-col items-center gap-8"></nav>
    </div>
  );
}

function App() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
}

export default App;
