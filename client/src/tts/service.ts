// A wrapper around the browser's SpeechSynthesis API.

/**
 * Retrieves the available voices from the browser's SpeechSynthesis API.
 * @returns A promise that resolves to an array of SpeechSynthesisVoice objects.
 */
export async function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

/**
 * Speaks the given text using the specified voice, pitch, speed, and volume.
 * @param text The text to speak.
 * @param voice The voice to use.
 * @param pitch The pitch to use.
 * @param speed The speed (rate) to use.
 * @param volume The volume to use.
 */
export function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  pitch: number,
  speed: number,
  volume: number
) {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.pitch = pitch;
  utterance.rate = speed;
  utterance.volume = volume;

  window.speechSynthesis.speak(utterance);
}
