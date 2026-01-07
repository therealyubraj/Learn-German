import React from "react";
import { QuizControls } from "./QuizControls";

export function QuizView() {
  const currentWord = { LHS: "das Haus", RHS: "the house" };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-12">
      <div>
        <p className="text-lg text-gray-400">Answer the following question:</p>
        <h1 className="text-5xl font-bold text-white">{currentWord.LHS}</h1>
      </div>
      <QuizControls />
    </div>
  );
}
