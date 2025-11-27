import React, { useState } from "react";
import type { Word, WordList } from "../types";
import { computeChecksum } from "../hash";
import { storage } from "../FS/Storage";

export function UserImport() {
  // --- STATE ---
  // Keep these to control the UI, but feel free to move them to a hook
  const [input, setInput] = useState("");
  const [listName, setListName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // --- LOGIC ---

  const handleImport = async () => {
    try {
      if (!listName.trim()) {
        throw new Error("Word list name cannot be empty.");
      }

      const parsed = JSON.parse(input) as Array<Word>;

      console.log("parsed", parsed, Array.isArray(parsed));
      if (!Array.isArray(parsed)) {
        throw new Error(
          "JSON is valid but must be an array of type: {LHS: string; RHS: string;}"
        );
      }

      if (parsed.length === 0) {
        throw new Error("List is empty.");
      }

      const processedWords = parsed.map(word => ({
        LHS: word.LHS.trim(),
        RHS: word.RHS.trim(),
      }));

      for (const item of processedWords) {
        if (!item.LHS || !item.RHS) {
          throw new Error(
            `One of the items contains invalid Word format: ${JSON.stringify(
              item
            )}`
          );
        }
      }

      processedWords.sort((a, b) => {
        if (a.LHS < b.LHS) return -1;
        if (a.LHS > b.LHS) return 1;
        if (a.RHS < b.RHS) return -1;
        if (a.RHS > b.RHS) return 1;
        return 0;
      });

      const wordsForChecksum = processedWords
        .map((word) => `${word.LHS}|${word.RHS}`)
        .join("|");
      const checksum = await computeChecksum(wordsForChecksum);

      // check if this checksum exists in the file system.
      const allChecksums = await storage.getAllListChecksums();

      if (allChecksums.includes(checksum)) {
        throw new Error("This set of words is already saved to the device.");
      }

      const newWordList: WordList = {
        id: crypto.randomUUID(), // Generate a unique ID
        name: listName,
        words: processedWords,
        checksum: checksum,
      };

      storage.addNewList(newWordList);
      setError("");
      setSuccessCount(processedWords.length);
    } catch (e: any) {
      setSuccessCount(null);
      setError(e.message);
    }
  };

  // --- UI HELPERS ---

  // Visual feedback: Red border on error, Blue focus otherwise
  const borderClass = error
    ? "border-red-500 focus:ring-red-500/50"
    : "border-gray-700 focus:ring-blue-500";

  return (
    // Outer Layout: Centers the card on the screen
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      {/* Card Container */}
      <div className="w-full max-w-4xl bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Import Word List
          </h2>
          <p className="text-gray-400 text-sm">
            Paste your JSON array below. Format:
            <code className="mx-1 bg-gray-700 px-1.5 py-0.5 rounded text-blue-200 font-mono">
              Array&lt;{"{ en: string; de: string; }"}&gt;
            </code>
          </p>
        </div>

        {/* Text Input Area */}
        <div className="relative group flex flex-col gap-3">
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            className={`
              w-full p-4 rounded-lg font-mono text-sm resize-y border transition-all outline-none
              bg-gray-900 text-gray-100 placeholder-gray-600 focus:ring-2 
              ${borderClass}`}
            type="text"
            placeholder="List Name"
          ></input>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={`[\n  { "en": "Apple", "de": "Apfel" },\n  { "en": "Car", "de": "Auto" }\n]`}
            className={`
              w-full h-64 p-4 rounded-lg font-mono text-sm resize-y border transition-all outline-none
              bg-gray-900 text-gray-100 placeholder-gray-600 focus:ring-2 
              ${borderClass}
            `}
          />
        </div>

        {/* Error Message Banner */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/40 border border-red-700/50 text-red-200 rounded-lg text-sm flex items-center animate-pulse-once">
            <span className="mr-3 text-lg">⚠️</span>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleImport}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg transition-all transform active:scale-95"
          >
            Import Words
          </button>
        </div>
      </div>
    </div>
  );
}
