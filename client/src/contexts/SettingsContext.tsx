import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { AppSettings } from "../types";
import { readSavedSettings } from "../FS/utils";

// Define the shape of your settings
// Define the shape of your context
interface SettingsContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export const defaultSettings: AppSettings = {
  quiz: {
    poolSize: 10,
  },
  vim: {
    enabled: false,
  },
  tts: {
    voiceName: null,
    rate: 1,
    pitch: 1,
    volume: 1,
  },
};

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

// Create a provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    async function fetchAndSetSettings() {
      const savedSettings = await readSavedSettings();
      setSettings(savedSettings);
    }
    fetchAndSetSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Create a custom hook for using the context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
