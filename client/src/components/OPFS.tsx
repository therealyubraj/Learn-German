import React from "react";

export const OPFSExplorer = () => {
  const pathSegments: string[] = ["wordlists"];
  const entries: { name: string; isDirectory: boolean }[] = [
    { name: "stats", isDirectory: true },
    { name: "wordlists", isDirectory: true },
    { name: "settings.json", isDirectory: false },
  ];
  const selectedFileName: string | null = "settings.json";
  const fileContent: string | null =
    '{\n  "vim": { "enabled": true },\n  "tts": { "voiceName": "Google Deutsch" }\n}';
  const isLoading = false;
  const error: string | null = null;
  const currentPath = `/${pathSegments.join("/")}/`;

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
        <button className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 focus:outline-none">
          / (root)
        </button>
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <span className="mx-1">/</span>
            <button className="text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 focus:outline-none">
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
                    className={`${buttonClasses} bg-blue-500 hover:bg-blue-600 text-white`}
                    title="View Content"
                  >
                    View
                  </button>
                )}
                <button
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
