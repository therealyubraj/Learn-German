import { useState, ChangeEvent } from "react";
import { WordList } from "../types";
import { getAllWordListMetadata, saveNewWordList } from "../FS/utils";
import { sortWordListInPlace } from "../utils";
import { computeChecksum } from "../hash";
import { showToast } from "../Toast";

const fieldClassName =
  "w-full rounded-2xl border bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none transition-colors placeholder:text-[#8B949E] focus:ring-1";

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
        setError(null);

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
      setError(null);

      if (!listJSONInput) {
        throw new Error("JSON cannot be empty.");
      }
      if (!listNameInput) {
        throw new Error("Name cannot be empty.");
      }

      let parsedJSON: WordList;
      try {
        parsedJSON = JSON.parse(listJSONInput);
      } catch {
        throw new Error("The JSON is not valid.");
      }

      if (!Array.isArray(parsedJSON)) {
        throw new Error("The JSON is not a list.");
      }

      if (parsedJSON.length === 0) {
        throw new Error("The list is empty.");
      }

      const cleanList: WordList = [];
      for (let i = 0; i < parsedJSON.length; i++) {
        const word = parsedJSON[i];
        if (!word.LHS) {
          throw new Error(`LHS is empty at index ${i}.`);
        }

        if (!word.RHS) {
          throw new Error(`RHS is empty at index ${i}.`);
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

      const existingListsMetadata = await getAllWordListMetadata();

      for (const existing of existingListsMetadata) {
        if (existing.checksum === newChecksum) {
          throw new Error(`Duplicate word list of ${existing.name}.`);
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
      const message = (e as Error).message;
      setError(message);
      showToast(message);
    }
  };

  const fieldStateClassName = error
    ? "border-[#F85149] focus:border-[#F85149] focus:ring-[#F85149]/30"
    : "border-[#30363D] focus:border-[#00C896] focus:ring-[#00C896]/30";

  return (
    <div className="mt-[30px] flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-32 sm:px-8 sm:pt-36">
      <div className="flex w-full max-w-[52rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.25rem", lineHeight: "1.02" }}
          >
            Import Word List
          </h1>
          <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
            Paste a JSON array or load a file, then save it as a reusable quiz
            set.
          </p>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[40px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm leading-6 text-[#8B949E]">
              Expected format:
              <code className="ml-2 rounded-lg border border-[#30363D] bg-[#161B22] px-2 py-1 text-xs text-[#E6EDF3]">
                Array&lt;{"{ LHS: string; RHS: string }"}&gt;
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <label
                htmlFor="list-name"
                className="text-base font-medium text-[#A6ADC8]"
              >
                List Name
              </label>
              <input
                id="list-name"
                value={listNameInput}
                onChange={(e) => setListNameInput(e.target.value)}
                className={`${fieldClassName} ${fieldStateClassName}`}
                type="text"
                placeholder="New List Name"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label
                htmlFor="list-json"
                className="text-base font-medium text-[#A6ADC8]"
              >
                JSON Content
              </label>
              <textarea
                id="list-json"
                value={listJSONInput}
                onChange={(e) => setListJSONInput(e.target.value)}
                spellCheck={false}
                placeholder={`[
  { "LHS": "das Haus", "RHS": "the house" },
  { "LHS": "die Katze", "RHS": "the cat" }
]`}
                className={`${fieldClassName} ${fieldStateClassName} min-h-[22rem] resize-y font-mono text-sm leading-7`}
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 border-t border-[#30363D] pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <label
                  htmlFor="file-upload"
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
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
                <span className="text-sm text-[#8B949E]">
                  Useful when importing from a saved JSON file.
                </span>
              </div>

              <button
                onClick={handleImport}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[24px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C]"
              >
                Import Words
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
