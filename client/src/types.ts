export type Word = {
  LHS: string;
  RHS: string;
  remarks?: string; // Optional field for additional notes or examples
  TTS?: string; // Optional field for a custom Text-to-Speech string
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

export type QuizSettings = {
  activePoolSize: number;
};

export type AppSettings = {
  tts: TTSSettings;
  vim: VimSettings;
  quiz: QuizSettings;
};

export interface WordStats {
  level: number;       // Mastery level, e.g., 1-8
  lastReviewedAt: number; // Timestamp of the last review (milliseconds since epoch)
  nextReviewAt: number;   // Timestamp for the next scheduled review (milliseconds since epoch)
  createdAt: number;     // Timestamp when the word was first introduced (milliseconds since epoch)
}

export type WordStatsMap = {
  [wordIdentifier: string]: WordStats; // `wordIdentifier` is LHS + '|' + RHS
};
