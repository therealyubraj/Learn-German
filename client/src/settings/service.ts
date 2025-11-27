import { storage } from '../FS/Storage';
import { AppSettings } from '../types';

const SETTINGS_FILE_PATH = 'settings.json';

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
 * @returns A promise that resolves to the settings object, or null if not found or an error occurs.
 */
export async function loadSettings(): Promise<AppSettings | null> {
  try {
    const settingsJson = await storage.readFile(SETTINGS_FILE_PATH);
    if (!settingsJson) {
      // Handles both null and empty string, indicating no settings file
      return null;
    }
    return JSON.parse(settingsJson) as AppSettings;
  } catch (error) {
    console.error('Failed to parse settings:', error);
    return null;
  }
}
