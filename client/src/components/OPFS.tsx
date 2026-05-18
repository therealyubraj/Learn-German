import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { opfsStorage, storage } from "../FS/Storage";
import { LSResponse } from "../FS/IStorageProvider";
import { clearLocalDataDirty } from "../sync/local";
import { clearSyncMutationRuntimeState } from "../sync/runtime";
import { clearLocalSyncClientState } from "../sync/storage";

const FIRST_OPEN_STORAGE_KEY = "german-app-quiz-selection-initialized";

type ExplorerEntry = LSResponse[number];

export function OPFSExplorer() {
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<LSResponse>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  async function fetchEntries() {
    try {
      const items = await storage.ls(currentPath);
      setEntries(items);
      setError(null);
    } catch (err) {
      setError(`Failed to list directory: ${currentPath}`);
      console.error(err);
    }
  }

  useEffect(() => {
    void fetchEntries();
  }, [currentPath]);

  function handleEntryClick(entry: ExplorerEntry) {
    if (entry.type !== "dir") {
      return;
    }

    const newPath =
      currentPath === "/" ? `/${entry.name}` : `${currentPath}/${entry.name}`;
    setCurrentPath(newPath);
    setSelectedFile(null);
    setFileContent(null);
  }

  async function handleViewFile(fileName: string) {
    try {
      const filePath =
        currentPath === "/" ? `/${fileName}` : `${currentPath}/${fileName}`;
      const content = await storage.readFile(filePath);
      setSelectedFile(fileName);
      setFileContent(content);
    } catch (nextError) {
      setError(`Failed to read file: ${fileName}`);
      console.error(nextError);
    }
  }

  async function handleDeleteFile(fileName: string) {
    if (!window.confirm(`Delete ${fileName}?`)) {
      return;
    }

    try {
      const filePath =
        currentPath === "/" ? `/${fileName}` : `${currentPath}/${fileName}`;
      const success = await storage.deleteFile(filePath);
      if (!success) {
        setError(`Failed to delete file: ${fileName}`);
        return;
      }

      await fetchEntries();
    } catch (nextError) {
      setError(`Failed to delete file: ${fileName}`);
      console.error(nextError);
    }
  }

  function handleBack() {
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    setCurrentPath(`/${segments.join("/")}`);
    setSelectedFile(null);
    setFileContent(null);
  }

  async function handleHardReset() {
    if (
      !window.confirm(
        "Hard reset the app? This clears local OPFS data, local sync session state, and first-open flags on this device only.",
      )
    ) {
      return;
    }

    try {
      setIsResetting(true);
      setError(null);

      await opfsStorage.clearAll();
      clearLocalDataDirty();
      clearSyncMutationRuntimeState();
      clearLocalSyncClientState();
      window.localStorage.removeItem(FIRST_OPEN_STORAGE_KEY);

      navigate("/", { replace: true });
      window.location.assign("/");
    } catch (nextError) {
      const message = "Hard reset failed.";
      setError(message);
      console.error(nextError);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-28 sm:px-8 sm:pt-32">
      <div className="flex w-full max-w-[62rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.25rem", lineHeight: "1.1" }}
          >
            OPFS Explorer
          </h1>
          <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
            Inspect local browser files and use the debug-only hard reset when
            you need a fully fresh device state.
          </p>
        </div>

        <div className="rounded-3xl border border-[#30363D] bg-[#161B22] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-7 sm:py-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-[#30363D] bg-[#0D1117] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B949E]">
                  Current path
                </p>
                <p className="mt-2 break-all text-sm font-medium text-[#E6EDF3]">
                  {currentPath}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {currentPath !== "/" ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#30363D] bg-[#161B22] px-4 py-2 text-sm font-medium text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
                  >
                    Back
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => void handleHardReset()}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-4 py-2 text-sm font-medium text-[#FFB3AD] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/16 hover:text-[#FFD2CD] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
                >
                  {isResetting ? "Resetting..." : "Hard reset"}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-5 py-4 text-sm font-medium text-[#FFB3AD]">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#30363D] bg-[#0D1117]">
              {entries.length > 0 ? (
                <ul className="divide-y divide-[#30363D]">
                  {entries.map((entry) => (
                    <li
                      key={entry.name}
                      className="flex items-center justify-between gap-4 px-4 py-4"
                    >
                      <button
                        type="button"
                        onClick={() => handleEntryClick(entry)}
                        disabled={entry.type !== "dir"}
                        className={`flex min-w-0 items-center gap-3 text-left ${
                          entry.type === "dir"
                            ? "cursor-pointer text-[#E6EDF3]"
                            : "cursor-default text-[#8B949E]"
                        }`}
                      >
                        <span className="text-lg" aria-hidden="true">
                          {entry.type === "dir" ? "📁" : "📄"}
                        </span>
                        <span className="truncate text-sm font-medium">
                          {entry.name}
                        </span>
                      </button>

                      {entry.type === "file" ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleViewFile(entry.name)}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#30363D] bg-[#161B22] px-3 py-2 text-xs font-medium text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteFile(entry.name)}
                            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#F85149]/45 bg-[#F85149]/10 px-3 py-2 text-xs font-medium text-[#FFB3AD] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/16 hover:text-[#FFD2CD]"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-6 py-8 text-center text-sm text-[#8B949E]">
                  This directory is empty.
                </div>
              )}
            </div>

            {selectedFile && fileContent ? (
              <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] p-5">
                <h2 className="text-base font-medium text-[#E6EDF3]">
                  {selectedFile}
                </h2>
                <pre className="quiz-selection-scroll mt-4 max-h-80 overflow-y-auto rounded-2xl border border-[#30363D] bg-[#161B22] p-4 text-xs leading-6 text-[#A6ADC8]">
                  {fileContent}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
