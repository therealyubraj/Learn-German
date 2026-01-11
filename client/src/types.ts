export type QuizItem = {
  LHS: string;
  RHS: string;
  remarks?: string;
  TTS?: string;
};

export type WordList = Array<QuizItem>;

export type WordListMetaData = {
  name: string;
  checksum: string;
};

export type StoredWordList = {
  list: Array<QuizItem>;
  metadata: WordListMetaData;
};

export type AppSettings = {
  vim: {
    enabled: boolean;
  };
  quiz: {
    poolSize: number;
  };
  tts: {
    voiceName: string | null;
    rate: number;
    pitch: number;
    volume: number;
  };
};

export type WordStat = {
  mastery: number;
  successCount: number;
  lastReviewed: number;
  exposureCount: number;
};

export type QuizStat = {
  [key: string]: WordStat;
};

export type RunningQuiz = {
  words: Array<QuizItem>;
  checksum: string;
  stats: { [key: string]: WordStat };
};
