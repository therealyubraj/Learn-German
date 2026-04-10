import { useSettings } from "../contexts/SettingsContext";
import { useState, useEffect } from "react";
import { tts } from "../tts/tts";
import { saveSettings } from "../FS/utils";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[34px] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#8B949E]">{description}</p>
      </div>
      {children}
    </section>
  );
}

const fieldClassName =
  "w-full rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none transition-colors placeholder:text-[#8B949E] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30";

const actionButtonClassName =
  "inline-flex min-h-12 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Settings() {
  const { settings, setSettings } = useSettings();
  const { vim, quiz, tts: ttsSettings } = settings;
  const { pitch, rate: speed, volume, voiceName } = ttsSettings;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewText, setPreviewText] = useState(
    "Hallo! Das ist meine Stimme!",
  );
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const availableVoices = tts.getVoices();
    setVoices(availableVoices.filter((v) => v.lang.startsWith("de")));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  const handlePreview = () => {
    tts.speak(previewText, { ...ttsSettings });
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings(settings);
      setSaveStatus("Settings saved.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("Could not save settings.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-44 sm:px-8 sm:pt-48">
      <div className="flex w-full max-w-[46rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="mt-[30px] font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.25rem", lineHeight: "1.1" }}
          >
            Settings
          </h1>
          <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
            Tune the quiz flow, keyboard mode, and German voice.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <SettingsSection
            title="VIM Mode"
            description="Enable keyboard-first controls for faster quiz sessions."
          >
            <label
              htmlFor="vim-toggle"
              className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[18px]"
            >
              <span className="text-base font-medium text-[#E6EDF3]">
                Enable VIM Mode
              </span>
              <span
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors ${
                  vim.enabled
                    ? "border-[#00C896] bg-[#00C896]/30"
                    : "border-[#30363D] bg-[#1C232D]"
                }`}
              >
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
                <span
                  className={`absolute left-1 h-6 w-6 rounded-full bg-[#E6EDF3] transition-transform ${
                    vim.enabled ? "translate-x-6 bg-[#00C896]" : ""
                  }`}
                />
              </span>
            </label>
          </SettingsSection>

          <SettingsSection
            title="Quiz Settings"
            description="Control how many words stay active in the learning pool."
          >
            <label
              htmlFor="active-pool-size-input"
              className="mb-3 block text-base font-medium text-[#A6ADC8]"
            >
              Active Pool Size: {quiz.poolSize}
            </label>
            <input
              type="number"
              id="active-pool-size-input"
              className={`${fieldClassName} settings-number-input`}
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
          </SettingsSection>

          <SettingsSection
            title="Voice Settings"
            description="Pick a German voice and preview the speaking behavior used in quizzes."
          >
            <div className="flex flex-col gap-6">
              <div>
                <label
                  htmlFor="voice-select"
                  className="mb-3 block text-base font-medium text-[#A6ADC8]"
                >
                  Voice
                </label>
                <select
                  id="voice-select"
                  className={fieldClassName}
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

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="pitch-slider"
                    className="mb-3 block text-sm font-medium text-[#A6ADC8]"
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
                        tts: {
                          ...ttsSettings,
                          pitch: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#00C896]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="speed-slider"
                    className="mb-3 block text-sm font-medium text-[#A6ADC8]"
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
                        tts: {
                          ...ttsSettings,
                          rate: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#00C896]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="volume-slider"
                    className="mb-3 block text-sm font-medium text-[#A6ADC8]"
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
                        tts: {
                          ...ttsSettings,
                          volume: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-[#00C896]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="preview-text"
                  className="mb-3 block text-base font-medium text-[#A6ADC8]"
                >
                  Preview Text
                </label>
                <textarea
                  id="preview-text"
                  rows={3}
                  className={`${fieldClassName} resize-none`}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                />
              </div>

              <button
                onClick={handlePreview}
                className={`${actionButtonClassName} border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]`}
              >
                Preview Voice
              </button>
            </div>
          </SettingsSection>
        </div>

        <div className="flex flex-col items-center gap-3 mb-[70px]">
          <button
            onClick={handleSaveSettings}
            className={`${actionButtonClassName} mb-10 w-full border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C]`}
          >
            Save Settings
          </button>
          {saveStatus ? (
            <p className="text-sm font-medium text-[#8B949E]">{saveStatus}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
