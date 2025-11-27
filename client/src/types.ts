export type Word = {
  LHS: string;
  RHS: string;
};

export type WordList = {
  id: string; // Unique identifier for the list (e.g., UUID)
  name: string;
  words: Word[];
  checksum: string; // Checksum of the sorted word list for statistics
};

export type TTSSettings = {
  voiceName: string | null;
  pitch: number;
  speed: number;
  volume: number;
  lang: string;
};

export type VimSettings = {
  enabled: boolean;
};

export type AppSettings = {
  tts: TTSSettings;
  vim: VimSettings;
};
