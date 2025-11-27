import React, { useState, useEffect, useCallback } from "react";

// --- START GENERIC OPFS ACCESSOR CLASS ---
// This class replaces MockOPFS and provides path-based navigation and access
// independent of the application's specific data types or directory names.

class GenericOPFSAccessor {
  private async getHandleByPath(
    pathSegments: string[]
  ): Promise<FileSystemDirectoryHandle> {
    if (
      typeof navigator === "undefined" ||
      !navigator.storage ||
      !navigator.storage.getDirectory
    ) {
      throw new Error("OPFS API is not supported in this browser environment.");
    }

    let handle = await navigator.storage.getDirectory();
    for (const segment of pathSegments) {
      // Note: We don't use { create: true } here to avoid creating paths while navigating
      handle = await handle.getDirectoryHandle(segment);
    }
    return handle;
  }

  async listEntries(
    pathSegments: string[]
  ): Promise<{ entries: { name: string; isDirectory: boolean }[] }> {
    const entries: { name: string; isDirectory: boolean }[] = [];

    try {
      const dirHandle = await this.getHandleByPath(pathSegments);

      // Using 'as any' to satisfy older TypeScript definitions
      const directoryEntries = (dirHandle as any).entries();

      for await (const [name, handle] of directoryEntries) {
        entries.push({
          name,
          // @ts-ignore: 'kind' property is available at runtime but may be missing in older types
          isDirectory: handle.kind === "directory",
        });
      }

      // Sort directories first, then files, alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return { entries };
    } catch (error) {
      if (error instanceof Error && error.name === "NotFoundError") {
        return { entries: [] };
      }
      console.error("[OPFS Explorer] Failed to list entries:", error);
      throw new Error("Could not access directory.");
    }
  }

  async readFile(
    pathSegments: string[],
    filename: string
  ): Promise<string | null> {
    try {
      const dirHandle = await this.getHandleByPath(pathSegments);
      const fileHandle = await dirHandle.getFileHandle(filename);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return content;
    } catch (error) {
      return null;
    }
  }

  async deleteEntry(
    pathSegments: string[],
    entryName: string,
    isDirectory: boolean
  ): Promise<void> {
    try {
      const dirHandle = await this.getHandleByPath(pathSegments);
      // Recursively delete contents for a directory
      await dirHandle.removeEntry(entryName, { recursive: isDirectory });
    } catch (error) {
      console.error(`[OPFS Explorer] Failed to delete ${entryName}:`, error);
      throw error;
    }
  }
}
// --- END GENERIC OPFS ACCESSOR CLASS ---

// Initialize the generic OPFS instance
const opfs = new GenericOPFSAccessor();

export const OPFSExplorer = () => {
  const [pathSegments, setPathSegments] = useState<string[]>([]);
  const [entries, setEntries] = useState<
    { name: string; isDirectory: boolean }[]
  >([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPath =
    pathSegments.length === 0 ? "/" : `/${pathSegments.join("/")}/`;

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedFileName(null);
    setFileContent(null);
    try {
      const { entries: newEntries } = await opfs.listEntries(pathSegments);
      setEntries(newEntries);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setError(
        "Failed to access directory. The directory may no longer exist."
      );
      setEntries([]);
      if (pathSegments.length > 0) {
        // Try to go back to the parent directory if the current one is gone
        setPathSegments((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  }, [pathSegments]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleEntryClick = useCallback((name: string, isDirectory: boolean) => {
    if (isDirectory) {
      setPathSegments((prev) => [...prev, name]);
    } else {
      handleSelectFile(name);
    }
  }, []);

  const handleSelectFile = useCallback(
    async (filename: string) => {
      console.log("filename", filename, pathSegments);
      setSelectedFileName(filename);
      setFileContent("Loading...");
      try {
        const content = await opfs.readFile(pathSegments, filename);
        if (content !== null) {
          // Use JSON.stringify on the content if it looks like JSON for pretty printing
          try {
            const parsed = JSON.parse(content);
            setFileContent(JSON.stringify(parsed, null, 2));
          } catch {
            // Not JSON, display raw content
            setFileContent(content);
          }
        } else {
          setFileContent("File content could not be read or file not found.");
        }
      } catch (err) {
        setFileContent("Error reading file.");
        console.error("Error reading file content:", err);
      }
    },
    [pathSegments]
  );

  const handleDeleteEntry = useCallback(
    async (name: string, isDirectory: boolean) => {
      const type = isDirectory ? "directory (and all its contents)" : "file";
      const message = `Are you sure you want to delete the ${type} "${name}"? This cannot be undone.`;

      // Using a custom modal/confirmation due to the alert() rule restriction
      if (!window.confirm(message)) return;

      try {
        await opfs.deleteEntry(pathSegments, name, isDirectory);
        // Clear display if the deleted file was currently selected
        if (!isDirectory && selectedFileName === name) {
          setSelectedFileName(null);
          setFileContent(null);
        }
        // Refresh the list
        fetchEntries();
      } catch (err) {
        setError(`Failed to delete ${name}. Check console.`);
        console.error("Deletion error:", err);
      }
    },
    [pathSegments, selectedFileName, fetchEntries]
  );

  const handleNavigateUp = useCallback(
    (index: number) => {
      setPathSegments(pathSegments.slice(0, index));
    },
    [pathSegments]
  );

  const containerClasses =
    "p-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl space-y-6 font-inter h-full min-h-screen";
  const titleClasses =
    "text-3xl font-extrabold text-teal-600 dark:text-teal-400 border-b pb-2 border-teal-200 dark:border-teal-700";
  const buttonClasses =
    "px-3 py-1 text-xs font-semibold rounded-md transition duration-150 ease-in-out";

  return (
    <div className={containerClasses}>
      <h1 className={titleClasses}>🛠️ OPFS Generic Explorer</h1>
      <p className="text-gray-700 dark:text-gray-300 text-sm">
        Browse the internal Origin Private File System (OPFS) structure. Click a
        directory to navigate.
      </p>

      {/* Breadcrumbs / Path Display */}
      <div className="flex flex-wrap items-center text-sm font-medium text-gray-500 dark:text-gray-400">
        <span className="text-gray-900 dark:text-white mr-1">Path:</span>
        <button
          onClick={() => setPathSegments([])}
          className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 focus:outline-none"
        >
          / (root)
        </button>
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <span className="mx-1">/</span>
            <button
              onClick={() => handleNavigateUp(index + 1)}
              className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 focus:outline-none"
            >
              {segment}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className="flex justify-between items-center border-b pb-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Contents of `{currentPath}`
        </h2>
        <button
          onClick={fetchEntries}
          className={`${buttonClasses} bg-purple-500 hover:bg-purple-600 text-white`}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
      )}

      {entries.length === 0 && !isLoading && !error ? (
        <p className="text-gray-500 italic">This directory is empty.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.name}
              className={`p-3 rounded-lg flex justify-between items-center transition-all duration-200 
                ${
                  entry.isDirectory
                    ? "bg-blue-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 cursor-pointer"
                    : selectedFileName === entry.name
                    ? "bg-green-100 dark:bg-green-800 ring-1 ring-green-500"
                    : "bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                }`}
              onClick={() => handleEntryClick(entry.name, entry.isDirectory)}
            >
              <div className="flex items-center space-x-2 w-full truncate">
                <span className="text-xl">
                  {entry.isDirectory ? "📁" : "📄"}
                </span>
                <span
                  className={`font-mono text-sm truncate ${
                    entry.isDirectory ? "font-bold" : ""
                  }`}
                >
                  {entry.name}
                </span>
              </div>
              <div className="flex-shrink-0 space-x-2">
                {!entry.isDirectory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectFile(entry.name);
                    }}
                    className={`${buttonClasses} bg-blue-500 hover:bg-blue-600 text-white`}
                    title="View Content"
                  >
                    View
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEntry(entry.name, entry.isDirectory);
                  }}
                  className={`${buttonClasses} bg-red-500 hover:bg-red-600 text-white`}
                  title={`Delete ${entry.isDirectory ? "Directory" : "File"}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFileName && (
        <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            File Content:{" "}
            <span className="font-mono text-base text-gray-600 dark:text-gray-400">
              {selectedFileName}
            </span>
          </h2>
          <pre className="p-4 bg-gray-900 text-yellow-300 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap break-all shadow-inner">
            {fileContent}
          </pre>
        </div>
      )}
    </div>
  );
};
