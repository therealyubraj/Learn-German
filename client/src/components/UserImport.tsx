import React, { useState, ChangeEvent } from "react";
import type { Word, WordList } from "../types";
import { storage } from "../FS/Storage";
import { getWordListChecksum } from "../lib";

export function UserImport() {
  // --- STATE ---
  const [input, setInput] = useState("");
  const [listName, setListName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // --- LOGIC ---

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Auto-fill the list name from the filename
      const fileName = file.name;
      const listName = fileName.toLowerCase().endsWith(".json")
        ? fileName.slice(0, -5)
        : fileName;
      setListName(listName);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          // Prettify the JSON for better readability in the textarea
          const parsed = JSON.parse(content);
          setInput(JSON.stringify(parsed, null, 2));
          setError(null);
        } catch (err) {
          setError("Failed to parse JSON file.");
        }
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    setError(null); // Clear previous errors
    setSuccessCount(null); // Clear previous success count

    try {
      if (!listName.trim()) {
        throw new Error("Word list name cannot be empty.");
      }

      let parsedWords: Array<Word>;
      try {
        parsedWords = JSON.parse(input) as Array<Word>;
      } catch (err) {
        throw new Error("Invalid JSON format. Please check for syntax errors.");
      }

      if (!Array.isArray(parsedWords)) {
        throw new Error("JSON must be an array.");
      }

      if (parsedWords.length === 0) {
        throw new Error("List is empty.");
      }

      const processedWords = parsedWords.map((word) => ({
        LHS: word.LHS ? String(word.LHS).trim() : "",
        RHS: word.RHS ? String(word.RHS).trim() : "",
        ...(word.remarks && { remarks: String(word.remarks).trim() }), // Include remarks if present
        ...(word.TTS && { TTS: String(word.TTS).trim() }), // Include TTS if present
      }));

      for (const item of processedWords) {
        if (!item.LHS || !item.RHS) {
          throw new Error(
            `Each object in the array must have non-empty "LHS" and "RHS" string properties. Found invalid item: ${JSON.stringify(
              item
            )}`
          );
        }
      }

      const newWordList: WordList = {
        id: crypto.randomUUID(), // Generate a unique ID
        name: listName,
        words: processedWords,
        checksum: "", // Checksum will be calculated next
      };

      const checksum = await getWordListChecksum(newWordList);
      newWordList.checksum = checksum;

      // check if this checksum exists in the file system.
      const allChecksums = await storage.getAllListChecksums();

      if (allChecksums.includes(checksum)) {
        throw new Error("This set of words is already saved to the device.");
      }

      await storage.addNewList(newWordList);
      setSuccessCount(processedWords.length);
      setInput(""); // Clear input after successful save
      setListName(""); // Clear list name after successful save
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

        {/* Error Message Banner */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/40 border border-red-700/50 text-red-200 rounded-lg text-sm flex items-center animate-pulse-once">
            <span className="mr-3 text-lg">⚠️</span>
            {error}
          </div>
        )}

        {/* Success Message Banner */}
        {successCount !== null && (
          <div className="mt-4 p-4 bg-green-900/40 border border-green-700/50 text-green-200 rounded-lg text-sm flex items-center animate-pulse-once">
            <span className="mr-3 text-lg">✅</span>
            Successfully imported {successCount} words!
          </div>
        )}

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
              onChange={handleFileChange}
            />
            <span className="text-sm text-gray-400">
              Easier for mobile devices.
            </span>
          </div>
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
