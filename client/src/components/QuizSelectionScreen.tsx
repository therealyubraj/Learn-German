import React from "react";

export function QuizSelectionScreen() {
  const selectedLists = [
    { id: "1", name: "A1 Vocabulary" },
    { id: "2", name: "Common Verbs" },
  ];
  const availableLists = [
    { id: "3", name: "B1 Nouns" },
    { id: "4", name: "Adjectives" },
  ];
  const isPracticeMode = false;

  return (
    <div className="container mx-auto p-4 text-white text-center flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Select Word Lists for Quiz</h1>

      {/* View for Selected Lists */}
      <div className="p-4 border border-gray-700 rounded-md bg-gray-800 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2 text-gray-100">
          Selected Quizzes
        </h2>
        {selectedLists.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {selectedLists.map((list) => (
              <span
                key={list.id}
                className="flex items-center bg-blue-600 text-white text-sm px-3 py-1 rounded-full"
              >
                {list.name}
                <button
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
        <label
          htmlFor="list-select"
          className="block mb-2 font-medium text-gray-300"
        >
          Add a word list:
        </label>
        <select
          id="list-select"
          className="w-full max-w-sm p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white mx-auto block"
          disabled={availableLists.length === 0}
        >
          <option value="" disabled>
            {availableLists.length > 0
              ? "Select a list"
              : "No more lists available"}
          </option>
          {availableLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {/* Practice Mode Checkbox */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <input
          type="checkbox"
          id="practice-mode"
          checked={isPracticeMode}
          readOnly
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700"
        />
        <label htmlFor="practice-mode" className="text-gray-300">
          Free Practice Mode
        </label>
      </div>

      {/* Start Quiz Button */}
      <div className="mt-8 flex justify-center">
        <button
          className="px-8 py-4 bg-green-700 text-white font-bold text-xl rounded-lg hover:bg-green-800 transition-colors duration-300 disabled:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedLists.length === 0}
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
