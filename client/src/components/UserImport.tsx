import React from "react";

export function UserImport() {
  const borderClass = "border-gray-700 focus:ring-blue-500";

  return (
    // Outer Layout: Centers the card on the screen
    <div className="min-h-screen w-full flex items-center justify-center p-[16px]">
      {/* Card Container */}
      <div className="w-full max-w-4xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-[32px]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Import Word List
          </h2>
          <p className="text-gray-400 text-sm">
            Paste your JSON array below. Format:
            <code className="mx-1 bg-gray-700 px-1.5 py-0.5 rounded text-blue-200 font-mono">
              Array&lt;{"{ LHS: string; RHS: string; }"}&gt;
            </code>
          </p>
        </div>

        {/* Text Input Area */}
        <div className="relative group flex flex-col gap-3">
          <input
            className={`
              w-full p-4 rounded-lg font-mono text-sm resize-y border transition-all outline-none
              bg-gray-900 text-gray-100 placeholder-gray-600 focus:ring-2 
              ${borderClass}`}
            type="text"
            placeholder="List Name"
          ></input>
          <textarea
            spellCheck={false}
            placeholder={`[
  { "LHS": "das Haus", "RHS": "the house" },
  { "LHS": "die Katze", "RHS": "the cat" }
]`}
            className={`
              w-full h-64 p-4 rounded-lg font-mono text-sm resize-y border transition-all outline-none
              bg-gray-900 text-gray-100 placeholder-gray-600 focus:ring-2 
              ${borderClass}
            `}
          />
        </div>

        {/* Action Buttons and File Picker */}
        <div className="mt-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <label
              htmlFor="file-upload"
              className="cursor-pointer px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors duration-300"
            >
              Load from File
            </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".json"
            />
            <span className="text-sm text-gray-400">
              Easier for mobile devices.
            </span>
          </div>
          <button
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition-all transform active:scale-95"
          >
            Import Words
          </button>
        </div>
      </div>
    </div>
  );
}
