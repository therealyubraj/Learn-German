import React from "react";

export function Settings() {
  const isVimModeEnabled = false;
  const activePoolSize = 20;
  const pitch = 1;
  const speed = 1;
  const volume = 1;
  const previewText = "Hello! This is my voice";
  const languages = ["en-US", "de-DE"];
  const filteredVoices = ["Default"];
  const selectedLanguage = "en-US";
  const selectedVoice = "Default";

  return (
    <div className="container mx-auto p-4 text-white">
      <h1 className="text-3xl font-bold mb-6 text-white border-b border-gray-600 pb-2">
        Settings
      </h1>

      <div className="mb-6 p-4 border border-gray-700 rounded-md bg-gray-800">
        <h2 className="text-xl font-semibold mb-3 text-gray-100">VIM Mode</h2>
        <div className="flex items-center">
          <label
            htmlFor="vim-toggle"
            className="flex items-center cursor-pointer"
          >
            <div className="relative">
              <input
                type="checkbox"
                id="vim-toggle"
                className="sr-only"
                checked={isVimModeEnabled}
                readOnly
              />
              <div
                className={`block w-14 h-8 rounded-full transition ${
                  isVimModeEnabled ? "bg-blue-600" : "bg-gray-600"
                }`}
              ></div>
              <div
                className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                  isVimModeEnabled ? "transform translate-x-6" : ""
                }`}
              ></div>
            </div>
            <div className="ml-4 text-lg text-gray-200 font-medium">
              Enable VIM Mode
            </div>
          </label>
        </div>
      </div>

      <div className="mb-6 p-4 border border-gray-700 rounded-md bg-gray-800">
        <h2 className="text-xl font-semibold mb-3 text-gray-100">
          Quiz Settings
        </h2>
        <div>
          <label
            htmlFor="active-pool-size-input"
            className="block mb-2 font-medium text-gray-300"
          >
            Active Pool Size: {activePoolSize}
          </label>
          <input
            type="number"
            id="active-pool-size-input"
            className="w-full p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
            value={activePoolSize}
            readOnly
            min="1"
            max="100"
          />
        </div>
      </div>

      <div className="p-4 border border-gray-700 rounded-md bg-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">
          Voice Settings
        </h2>

        {/* Language and Voice Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="lang-select"
              className="block mb-2 font-medium text-gray-300"
            >
              Language
            </label>
            <select
              id="lang-select"
              className="w-full p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
              value={selectedLanguage}
              readOnly
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="voice-select"
              className="block mb-2 font-medium text-gray-300"
            >
              Voice
            </label>
            <select
              id="voice-select"
              className="w-full p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
              value={selectedVoice}
              readOnly
              disabled={filteredVoices.length === 0}
            >
              {filteredVoices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <label
              htmlFor="pitch-slider"
              className="block mb-2 font-medium text-gray-300"
            >
              Pitch: {pitch}
            </label>
            <input
              type="range"
              id="pitch-slider"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              readOnly
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="speed-slider"
              className="block mb-2 font-medium text-gray-300"
            >
              Speed: {speed}
            </label>
            <input
              type="range"
              id="speed-slider"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              readOnly
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="volume-slider"
              className="block mb-2 font-medium text-gray-300"
            >
              Volume: {volume}
            </label>
            <input
              type="range"
              id="volume-slider"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              readOnly
              className="w-full"
            />
          </div>
        </div>

        {/* Preview Text */}
        <div className="mb-4">
          <label
            htmlFor="preview-text"
            className="block mb-2 font-medium text-gray-300"
          >
            Preview Text
          </label>
          <textarea
            id="preview-text"
            rows={3}
            className="w-full p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
            value={previewText}
            readOnly
          ></textarea>
        </div>

        <button
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-300"
        >
          Preview Voice
        </button>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          className={`px-6 py-2 font-semibold rounded-md transition-colors duration-300 bg-purple-600 hover:bg-purple-700 text-white`}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
