const VOICE_NAME = "Martin";
let germanVoice!: SpeechSynthesisVoice;

window.speechSynthesis.onvoiceschanged = () => {
  const voices = window.speechSynthesis.getVoices();
  germanVoice = voices.find(
    (voice) => voice.lang === "de-DE" && voice.name === VOICE_NAME
  )!;
  console.log("Loaded German voice:", germanVoice);

  if (!germanVoice) {
    alert("No voice found!");
  }
};

console.log("gemerna", germanVoice);

export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "de-DE";
      utterance.voice = germanVoice;
      utterance.rate = 0.7;
      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event);
      window.speechSynthesis.speak(utterance);
    } else {
      console.error("Text-to-speech not supported in this browser.");
      reject("Speech synthesis not supported");
    }
  });
}
