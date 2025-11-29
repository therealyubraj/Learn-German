import { getVoices, speak } from "../tts/service";
import { useVimMode } from "../contexts/VimModeContext";
import { useTTS } from "../contexts/TTSContext";
import { loadSettings, saveSettings } from "../settings/service";
import { AppSettings, TTSSettings, VimSettings, QuizSettings } from "../types";
import { useNavigation } from "../contexts/NavigationContext";
import { useEffect, useMemo, useRef, useState } from "react";

export function Settings() {
  const { setIsVimModeEnabled } = useVimMode(); // Assuming context provides setters
  const { updateSettings } = useTTS();
  const { setIsDirty } = useNavigation();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isVimModeEnabled, setIsVimModeEnabledState] = useState(false);
  const [activePoolSize, setActivePoolSize] = useState(20);

  // TTS State
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [pitch, setPitch] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [previewText, setPreviewText] = useState("Hello! This is my voice");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Reset dirty state on unmount
  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const settings = await loadSettings();
        if (settings) {
          // Load Vim settings
          setIsVimModeEnabledState(settings.vim.enabled);
          setActivePoolSize(settings.quiz.activePoolSize);

          // Load TTS settings
          setSelectedLanguage(settings.tts.lang);
          setSelectedVoice(settings.tts.voiceName || "");
          setPitch(settings.tts.pitch);
          setSpeed(settings.tts.speed);
          setVolume(settings.tts.volume);
        }

        const availableVoices = await getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !settings) {
          const defaultLang =
            availableVoices.find((v) => v.lang.startsWith("en"))?.lang ||
            availableVoices[0].lang;
          setSelectedLanguage(defaultLang);
        }
      } finally {
        setIsLoading(false);
        // Allow a moment for state to settle before we start tracking changes
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      }
    }
    loadInitialSettings();
  }, []);

  useEffect(() => {
    if (!isInitialLoad.current) {
      setIsDirty(true);
    }
  }, [
    isVimModeEnabled,
    activePoolSize,
    selectedLanguage,
    selectedVoice,
    pitch,
    speed,
    volume,
    setIsDirty,
  ]);

  const languages = useMemo(() => {
    const uniqueLanguages = [...new Set(voices.map((v) => v.lang))];
    return uniqueLanguages.sort();
  }, [voices]);

  const filteredVoices = useMemo(() => {
    return voices
      .filter((v) => v.lang === selectedLanguage)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [voices, selectedLanguage]);

  useEffect(() => {
    if (
      filteredVoices.length > 0 &&
      !filteredVoices.some((v) => v.name === selectedVoice)
    ) {
      setSelectedVoice(filteredVoices[0].name);
    }
  }, [selectedLanguage, filteredVoices, selectedVoice]);

  const handlePreview = () => {
    const voice = voices.find((v) => v.name === selectedVoice) || null;
    speak(previewText, voice, pitch, speed, volume);
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    const ttsSettings: TTSSettings = {
      lang: selectedLanguage,
      voiceName: selectedVoice,
      pitch,
      speed,
      volume,
    };
    const vimSettings: VimSettings = {
      enabled: isVimModeEnabled,
    };
    const quizSettings: QuizSettings = {
      activePoolSize: activePoolSize,
    };
    const settings: AppSettings = {
      tts: ttsSettings,
      vim: vimSettings,
      quiz: quizSettings,
    };
    await saveSettings(settings);

    // Also update context
    updateSettings(ttsSettings);
    setIsVimModeEnabled(isVimModeEnabled);
    setIsDirty(false); // Mark as no longer dirty in the context

    setTimeout(() => setSaveStatus("saved"), 500);
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-white text-center">
        Loading settings...
      </div>
    );
  }

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
                onChange={() => setIsVimModeEnabledState(!isVimModeEnabled)}
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
            onChange={(e) => setActivePoolSize(parseInt(e.target.value, 10))}
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
              onChange={(e) => setSelectedLanguage(e.target.value)}
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
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={filteredVoices.length === 0}
            >
              {filteredVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
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
              onChange={(e) => setPitch(parseFloat(e.target.value))}
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
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
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
              onChange={(e) => setVolume(parseFloat(e.target.value))}
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
          onClick={handleSave}
          className={`px-6 py-2 font-semibold rounded-md transition-colors duration-300 ${
            saveStatus === "saved"
              ? "bg-green-600 text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
            ? "Saved!"
            : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
