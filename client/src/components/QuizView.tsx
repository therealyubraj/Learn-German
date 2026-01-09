import React from "react";
import { QuizControls } from "./QuizControls";
import { QuizItem } from "../types";

export function QuizView({
  item,
  onNext,
}: {
  item: QuizItem;
  onNext: (guessedCorrectly: boolean) => void;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-12">
      <div>
        <p className="text-lg text-gray-400">Answer the following question:</p>
        <h1 className="text-5xl font-bold text-white">{item.LHS}</h1>
      </div>
      <QuizControls item={item} onNext={onNext} />
    </div>
  );
}
