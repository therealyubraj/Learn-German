import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../FS/Storage";
import type { Word, WordList } from "../types";

export function QuizSelectionScreen() {
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchWordLists() {
      const lists = await storage.getAllLists();
      setWordLists(lists);
    }
    fetchWordLists();
  }, []);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value;
    if (newId && !selectedListIds.includes(newId)) {
      setSelectedListIds((prev) => [...prev, newId]);
    }
    event.target.value = ""; // Reset dropdown after selection
  };

  const handleRemoveList = (idToRemove: string) => {
    setSelectedListIds((prev) => prev.filter((id) => id !== idToRemove));
  };

  const handleStartQuiz = () => {
    if (selectedListIds.length === 0) {
      return;
    }
    const idParams = selectedListIds.join(",");
    navigate(`/quiz?lists=${idParams}`);
  };

  const availableLists = wordLists.filter(
    (list) => !selectedListIds.includes(list.id)
  );
  const selectedLists = wordLists.filter((list) =>
    selectedListIds.includes(list.id)
  );

  return (
    <div className="container mx-auto p-4 text-white text-center flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Select Word Lists for Quiz</h1>

      {/* View for Selected Lists */}
      <div className="p-4 border border-gray-700 rounded-md bg-gray-800 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2 text-gray-100">Selected Quizzes</h2>
        {selectedLists.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {selectedLists.map((list) => (
              <span
                key={list.id}
                className="flex items-center bg-blue-600 text-white text-sm px-3 py-1 rounded-full"
              >
                {list.name}
                <button
                  onClick={() => handleRemoveList(list.id)}
                  className="ml-2 text-white hover:text-red-300 focus:outline-none"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No quizzes selected yet.</p>
        )}
      </div>

      {/* Dropdown for available lists */}
      <div>
        <label htmlFor="list-select" className="block mb-2 font-medium text-gray-300">Add a word list:</label>
        <select
          id="list-select"
          className="w-full max-w-sm p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white mx-auto block"
          onChange={handleSelectChange}
          value="" // Controlled component, reset value after selection
          disabled={availableLists.length === 0}
        >
          <option value="" disabled>
            {availableLists.length > 0 ? "Select a list" : "No more lists available"}
          </option>
          {availableLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start Quiz Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleStartQuiz}
          className="px-8 py-4 bg-green-700 text-white font-bold text-xl rounded-lg hover:bg-green-800 transition-colors duration-300"
          disabled={selectedListIds.length === 0}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
