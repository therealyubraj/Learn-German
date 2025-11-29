import { storage } from '../FS/Storage';
import { AppSettings } from '../types';

const SETTINGS_FILE_PATH = 'settings.json';

export function getDefaultSettings(): AppSettings {
  return {
    tts: {
      voiceName: null,
      pitch: 1,
      speed: 1,
      volume: 1,
      lang: 'de-DE',
    },
    vim: {
      enabled: false,
    },
    quiz: {
      activePoolSize: 20,
    },
  };
}

/**
 * Saves the application settings to the OPFS.
 * @param settings The settings object to save.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const settingsJson = JSON.stringify(settings, null, 2);
    await storage.writeFile(SETTINGS_FILE_PATH, settingsJson);
  } catch (error) {
    console.error('Failed to save settings:', error);
    // Optionally, handle the error, e.g., by notifying the user.
  }
}

/**
 * Loads the application settings from the OPFS.
 * It merges the loaded settings with defaults to ensure all keys are present.
 * @returns A promise that resolves to the settings object.
 */
export async function loadSettings(): Promise<AppSettings> {
  const defaultSettings = getDefaultSettings();
  try {
    const settingsJson = await storage.readFile(SETTINGS_FILE_PATH);
    if (!settingsJson) {
      return defaultSettings;
    }
    const savedSettings = JSON.parse(settingsJson) as Partial<AppSettings>;
    
    // Deep merge saved settings over defaults
    return {
      ...defaultSettings,
      ...savedSettings,
      tts: {
        ...defaultSettings.tts,
        ...savedSettings.tts,
      },
      vim: {
        ...defaultSettings.vim,
        ...savedSettings.vim,
      },
      quiz: {
        ...defaultSettings.quiz,
        ...savedSettings.quiz,
      },
    };
  } catch (error) {
    console.error('Failed to load or parse settings, returning defaults:', error);
    return defaultSettings;
  }
}
