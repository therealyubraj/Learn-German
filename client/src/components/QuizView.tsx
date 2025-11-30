import { getWordIdentifier } from "../lib";
import { QuizControls } from "./QuizControls";
import { Word } from "../types";

type QuizViewProps = {
  currentWord: Word;
  onNext: (isCorrect: boolean) => void;
};

export function QuizView({ currentWord, onNext }: QuizViewProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-12">
      <div>
        <p className="text-lg text-gray-400">Answer the following question:</p>
        <h1 className="text-5xl font-bold text-white">{currentWord.LHS}</h1>
      </div>
      <QuizControls
        answer={currentWord.RHS}
        onNext={onNext}
        remarks={currentWord.remarks}
        tts={currentWord.TTS}
        key={getWordIdentifier(currentWord)}
      />
    </div>
  );
}
