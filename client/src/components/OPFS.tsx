import { useEffect, useState } from "react";
import { storage } from "../FS/Storage";
import { LSResponse } from "../FS/IStorageProvider";

export function OPFSExplorer() {
  const [currentPath, setCurrentPath] = useState("/");
  const [entries, setEntries] = useState<LSResponse>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      const items = await storage.ls(currentPath);
      setEntries(items);
      setError(null);
    } catch (err) {
      setError(`Failed to list directory: ${currentPath}`);
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentPath]);

  const handleEntryClick = (entry: LSResponse[0]) => {
    if (entry.type === "dir") {
      const newPath =
        currentPath === "/" ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      setCurrentPath(newPath);
      setSelectedFile(null);
      setFileContent(null);
    }
  };

  const handleViewFile = async (fileName: string) => {
    try {
      const filePath =
        currentPath === "/" ? `/${fileName}` : `${currentPath}/${fileName}`;
      const content = await storage.readFile(filePath);
      setSelectedFile(fileName);
      setFileContent(content);
    } catch (error) {
      setError(`Failed to read file: ${fileName}`);
      console.error(error);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (window.confirm(`Are you sure you want to delete ${fileName}?`)) {
      try {
        const filePath =
          currentPath === "/" ? `/${fileName}` : `${currentPath}/${fileName}`;
        const success = await storage.deleteFile(filePath);
        if (success) {
          fetchEntries(); // Refresh the list
        } else {
          setError(`Failed to delete file: ${fileName}`);
        }
      } catch (error) {
        setError(`Failed to delete file: ${fileName}`);
        console.error(error);
      }
    }
  };

  const handleBack = () => {
    const segments = currentPath.split("/").filter(Boolean);
    segments.pop();
    setCurrentPath(`/${segments.join("/")}`);
    setSelectedFile(null);
    setFileContent(null);
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg w-full max-w-4xl">
      <h3 className="font-bold text-lg mb-2">OPFS Explorer: {currentPath}</h3>
      {currentPath !== "/" && (
        <button
          onClick={handleBack}
          className="mb-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
        >
          Back
        </button>
      )}
      {error && <div className="text-red-500">{error}</div>}
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center justify-between hover:bg-gray-700 p-1 rounded"
          >
            <div
              className="flex items-center cursor-pointer"
              onClick={() => handleEntryClick(entry)}
            >
              <span className="mr-2">{entry.type === "dir" ? "📁" : "📄"}</span>
              <span>{entry.name}</span>
            </div>
            {entry.type === "file" && (
              <div>
                <button
                  onClick={() => handleViewFile(entry.name)}
                  className="mr-2 px-2 py-1 bg-blue-600 rounded hover:bg-blue-500"
                >
                  View
                </button>
                <button
                  onClick={() => handleDeleteFile(entry.name)}
                  className="px-2 py-1 bg-red-600 rounded hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {selectedFile && fileContent && (
        <div className="mt-4">
          <h4 className="font-bold">Content of {selectedFile}</h4>
          <pre className="p-2 bg-gray-900 rounded mt-2 max-h-64 overflow-y-auto">{fileContent}</pre>
        </div>
      )}
    </div>
  );
}
