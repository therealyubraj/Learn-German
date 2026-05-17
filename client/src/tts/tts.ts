class TTSService {
  private voices: SpeechSynthesisVoice[] = [];
  private readonly preferredDefaultVoiceName = "Google Deutsch";
  private readonly preferredFallbackVoicePattern = /anna/i;

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

  public getPreferredDefaultVoiceName(): string | null {
    const germanVoices = this.voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith("de"),
    );

    return (
      this.voices.find((voice) => voice.name === this.preferredDefaultVoiceName)
        ?.name ??
      germanVoices.find((voice) =>
        this.preferredFallbackVoicePattern.test(voice.name),
      )?.name ??
      null
    );
  }

  public resolveVoiceName(voiceName: string | null): string | null {
    if (voiceName && this.voices.some((voice) => voice.name === voiceName)) {
      return voiceName;
    }

    return this.getPreferredDefaultVoiceName();
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
        this.voices.find((v) => v.name === this.resolveVoiceName(settings.voiceName)) ??
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
