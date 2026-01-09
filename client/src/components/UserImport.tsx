import { useState, ChangeEvent } from "react";
import { WordList } from "../types";
import { getAllWordListMetadata, saveNewWordList } from "../FS/utils";
import { sortWordListInPlace } from "../utils";
import { computeChecksum } from "../hash";
import { showToast } from "../Toast";

export function UserImport() {
  const [listJSONInput, setListJSONInput] = useState("");
  const [listNameInput, setListNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setListJSONInput(content);
        setError(null); // Clear any previous errors

        // Set the list name to the file name without extension
        const fileName = file.name;
        const fileNameWithoutExtension = fileName
          .split(".")
          .slice(0, -1)
          .join(".");
        setListNameInput(fileNameWithoutExtension);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      };
      reader.readAsText(file);
    } else {
      setListJSONInput("");
    }
  };

  const handleImport = async () => {
    try {
      if (!listJSONInput) {
        throw new Error("JSON cannot be empty.");
        return;
      }
      if (!listNameInput) {
        throw new Error("Name cannot be empty");
      }

      // is JSON valid
      let parsedJSON: WordList;
      try {
        parsedJSON = JSON.parse(listJSONInput);
      } catch (err) {
        throw new Error("The JSON is not valid.");
        return;
      }

      if (!Array.isArray(parsedJSON)) {
        throw new Error("The JSON is not a list.");
      }

      if (parsedJSON.length === 0) {
        throw new Error("The list is empty!");
      }

      const cleanList: WordList = [];
      for (let i = 0; i < parsedJSON.length; i++) {
        const word = parsedJSON[i];
        if (!word.LHS) {
          throw new Error(`LHS is empty at index:${i}`);
        }

        if (!word.RHS) {
          throw new Error(`RHS is empty at index:${i}`);
        }

        cleanList.push({
          LHS: word.LHS,
          RHS: word.RHS,
          remarks: word.remarks,
          TTS: word.TTS,
        });
      }

      sortWordListInPlace(cleanList);
      const newChecksum = await computeChecksum(JSON.stringify(cleanList));

      // does this name already exist? does this checksum already exist?
      const existingListsMetadata = await getAllWordListMetadata();

      console.log(existingListsMetadata);
      for (const existing of existingListsMetadata) {
        if (existing.checksum === newChecksum) {
          throw new Error(`Duplicate word list of ${existing.name}`);
        }

        if (existing.name === listNameInput) {
          throw new Error("This name already exists.");
        }
      }

      await saveNewWordList({
        list: cleanList,
        metadata: {
          checksum: newChecksum,
          name: listNameInput,
        },
      });
      showToast("Successfully saved!");
    } catch (e) {
      throw new Error((e as any).message);
    }
  };

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
            value={listNameInput}
            onChange={(e) => setListNameInput(e.target.value)}
            className={`
              w-full p-4 rounded-lg font-mono text-sm resize-y border transition-all outline-none
              bg-gray-900 text-gray-100 placeholder-gray-600 focus:ring-2 
              ${borderClass}`}
            type="text"
            placeholder="List Name"
          ></input>
          <textarea
            value={listJSONInput}
            onChange={(e) => setListJSONInput(e.target.value)}
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
