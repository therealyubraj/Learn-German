import { useSettings } from "../contexts/SettingsContext";
import { useState, useEffect } from "react";
import { tts } from "../tts/tts";
import { saveSettings } from "../FS/utils"; // Import saveSettings

export function Settings() {
  const { settings, setSettings } = useSettings();
  const { vim, quiz, tts: ttsSettings } = settings;
  const { pitch, rate: speed, volume, voiceName } = ttsSettings;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewText, setPreviewText] = useState(
    "Hallo! Das ist meine Stimme!"
  );

  useEffect(() => {
    const availableVoices = tts.getVoices();
    setVoices(availableVoices.filter((v) => v.lang.startsWith("de")));
  }, []);

  const handlePreview = () => {
    tts.speak(previewText, { ...ttsSettings });
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings(settings);
      alert("Settings saved successfully!"); // Simple feedback
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings."); // Simple feedback
    }
  };

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
                checked={vim.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    vim: {
                      ...settings.vim,
                      enabled: e.target.checked,
                    },
                  })
                }
              />
              <div
                className={`block w-14 h-8 rounded-full transition ${
                  vim.enabled ? "bg-blue-600" : "bg-gray-600"
                }`}
              ></div>
              <div
                className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                  vim.enabled ? "transform translate-x-6" : ""
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
            Active Pool Size: {quiz.poolSize}
          </label>
          <input
            type="number"
            id="active-pool-size-input"
            className="w-full p-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
            value={quiz.poolSize}
            onChange={(e) =>
              setSettings({
                ...settings,
                quiz: {
                  ...quiz,
                  poolSize: parseInt(e.target.value, 10),
                },
              })
            }
            min="1"
            max="100"
          />
        </div>
      </div>

      <div className="p-4 border border-gray-700 rounded-md bg-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">
          Voice Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
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
              value={voiceName || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tts: { ...ttsSettings, voiceName: e.target.value },
                })
              }
              disabled={voices.length === 0}
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

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
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tts: { ...ttsSettings, pitch: parseFloat(e.target.value) },
                })
              }
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
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tts: { ...ttsSettings, rate: parseFloat(e.target.value) },
                })
              }
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
              onChange={(e) =>
                setSettings({
                  ...settings,
                  tts: { ...ttsSettings, volume: parseFloat(e.target.value) },
                })
              }
              className="w-full"
            />
          </div>
        </div>

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
            onChange={(e) => setPreviewText(e.target.value)}
          ></textarea>
        </div>

        <button
          onClick={handlePreview}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors duration-300"
        >
          Preview Voice
        </button>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className={`px-6 py-2 font-semibold rounded-md transition-colors duration-300 bg-purple-600 hover:bg-purple-700 text-white`}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
