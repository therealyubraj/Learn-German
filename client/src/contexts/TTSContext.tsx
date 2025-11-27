import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { loadSettings } from '../settings/service';
import { getVoices, speak as speakText } from '../tts/service';
import { TTSSettings } from '../types';

interface TTSContextType {
  isSpeaking: boolean;
  speak: (text: string) => void;
  settings: TTSSettings | null;
  updateSettings: (newSettings: TTSSettings) => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export function useTTS() {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
}

interface TTSProviderProps {
  children: ReactNode;
}

export function TTSProvider({ children }: TTSProviderProps) {
  const [settings, setSettings] = useState<TTSSettings | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load settings and voices on initial mount
  useEffect(() => {
    async function loadInitialData() {
      const loadedSettings = await loadSettings();
      if (loadedSettings) {
        setSettings(loadedSettings.tts);
      }
      const availableVoices = await getVoices();
      setVoices(availableVoices);
    }
    loadInitialData();
  }, []);

  const speak = useCallback((text: string) => {
    if (!settings) return;
    
    // Cancel any ongoing speech before starting a new one
    window.speechSynthesis.cancel();

    const voice = voices.find(v => v.name === settings.voiceName) || null;
    if (!voice && settings.voiceName) {
      console.warn(`Voice "${settings.voiceName}" not found. Using default.`);
    }

    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.pitch = settings.pitch;
    utterance.rate = settings.speed;
    utterance.volume = settings.volume;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error("An error occurred during speech synthesis:", event.error);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [settings, voices]);

  const updateSettings = (newSettings: TTSSettings) => {
    setSettings(newSettings);
  };
  
  const value = {
    isSpeaking,
    speak,
    settings,
    updateSettings,
  };

  return (
    <TTSContext.Provider value={value}>
      {children}
    </TTSContext.Provider>
  );
}
