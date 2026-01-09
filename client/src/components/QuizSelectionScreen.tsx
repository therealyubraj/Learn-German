import React, { useEffect, useState } from "react";
import { getAllWordListMetadata } from "../FS/utils";
import { useNavigate } from "react-router-dom";

type QuizItem = {
  name: string;
};
export function QuizSelectionScreen() {
  const [selectedItems, setSelectedItems] = useState<Array<QuizItem>>([]);
  const [availableItems, setAvailableItems] = useState<Array<QuizItem>>([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function populateList() {
      const allItems = await getAllWordListMetadata();
      setAvailableItems(allItems.map((x) => ({ name: x.name })));
    }

    populateList();
  }, []);

  function handleNewSelection(event: React.ChangeEvent<HTMLSelectElement>) {
    // Placeholder for future implementation
    setSelectedItems([...selectedItems, { name: event.target.value }]);
    setAvailableItems(
      availableItems.filter((x) => x.name !== event.target.value)
    );

    console.log("List selected:", event.target.value);
  }

  function handleItemRemoval(name: string) {
    setSelectedItems(selectedItems.filter((x) => x.name !== name));
    setAvailableItems([...availableItems, { name }]);
  }

  function handleQuizStart() {
    navigate("/quiz", {
      state: { selectedQuizzes: selectedItems.map((x) => x.name) },
    });
  }

  return (
    <div className="container mx-auto p-4 text-white text-center flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Select Word Lists for Quiz</h1>

      {/* View for Selected Lists */}
      <div className="p-4 border border-gray-700 rounded-md bg-gray-800 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2 text-gray-100">
          Selected Quizzes
        </h2>
        {selectedItems.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {selectedItems.map((item) => (
              <span
                key={item.name}
                className="flex items-center bg-blue-600 text-white text-sm px-3 py-1 rounded-full"
              >
                {item.name}
                <button
                  className="ml-2 text-white hover:text-red-300 focus:outline-none"
                  onClick={() => handleItemRemoval(item.name)}
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

      <div>
        <label className="block mb-2 font-medium text-gray-300">
          Add quizzes
        </label>
        <select
          id="quiz-select"
          className="w-full max-w-sm p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white mx-auto block"
          disabled={availableItems.length === 0}
          onChange={handleNewSelection}
          value={""}
        >
          <option value="" disabled>
            {availableItems.length > 0
              ? "Select a Quiz"
              : "No more quizzes available"}
          </option>
          {availableItems.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start Quiz Button */}
      <div className="mt-8 flex justify-center">
        <button
          className="px-8 py-4 bg-green-700 text-white font-bold text-xl rounded-lg hover:bg-green-800 transition-colors duration-300 disabled:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedItems.length === 0}
          onClick={handleQuizStart}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
