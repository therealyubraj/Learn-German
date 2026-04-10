import React from "react";
import { Link } from "react-router-dom";
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
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-6 py-10 sm:px-8">
      <div className="flex w-full max-w-[42rem] flex-col gap-8">
        <div className="mt-[100px] text-center">
          <p className="text-base leading-7 text-[#00C896] sm:text-lg">
            Translate this word
          </p>
          <h1
            className="mt-3 font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.75rem", lineHeight: "0.98" }}
          >
            {item.LHS}
          </h1>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[40px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <QuizControls item={item} onNext={onNext} />
        </div>

        <div className="flex justify-center pt-2">
          <Link
            to="/quiz-selection"
            className="w-full mt-[20px] inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#F85149]/45 bg-[#F85149]/8 px-[22px] py-[14px] text-sm font-medium text-[#FF7B72] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/14 hover:text-[#FFA198]"
          >
            Exit quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
