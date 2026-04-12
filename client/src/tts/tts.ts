class TTSService {
  private voices: SpeechSynthesisVoice[] = [];
  private readonly preferredDefaultVoiceName = "Google Deutsch";

  constructor() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    this.voices = window.speechSynthesis.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public async speak(
    text: string,
    settings: {
      voiceName: string | null;
      rate: number;
      pitch: number;
      volume: number;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const germanVoices = this.voices.filter((v) => v.lang.startsWith("de"));
      const preferredVoice =
        this.voices.find((v) => v.name === settings.voiceName) ??
        this.voices.find((v) => v.name === this.preferredDefaultVoiceName) ??
        germanVoices.find((v) => v.default) ??
        germanVoices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const tts = new TTSService();
