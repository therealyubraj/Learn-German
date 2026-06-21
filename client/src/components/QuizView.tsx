import React from "react";
import { Link } from "react-router-dom";
import { QuizControls } from "./QuizControls";
import { QuizItem } from "../types";

export function QuizView({
  item,
  onNext,
  onMarkKnown,
  onEditCurrent,
}: {
  item: QuizItem;
  onNext: (guessedCorrectly: boolean) => void;
  onMarkKnown: () => void;
  onEditCurrent: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-start justify-center px-4 py-6 sm:items-center sm:px-8 sm:py-10">
      <div className="flex w-full max-w-[42rem] flex-col gap-8">
        <div className="mt-14 text-center sm:mt-[100px]">
          <p className="text-base leading-7 text-[#00C896] sm:text-lg">
            Translate this word
          </p>
          <h1 className="mt-3 text-[3.15rem] font-semibold leading-[0.95] tracking-[-0.04em] text-[#E6EDF3] sm:text-[4.75rem] sm:leading-[0.98]">
            {item.LHS}
          </h1>
        </div>

        <div className="relative w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-[36px] sm:py-[40px]">
          <button
            type="button"
            onClick={onEditCurrent}
            data-vim-key="e"
            aria-label="Edit current word"
            className="absolute right-3 top-3 inline-flex min-h-9 items-center justify-center rounded-xl border border-[#30363D] bg-[#0D1117] px-3 text-xs font-semibold text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C] sm:right-4 sm:top-4"
          >
            Edit
          </button>
          <QuizControls
            item={item}
            onNext={onNext}
            onMarkKnown={onMarkKnown}
          />
        </div>

        <div className="flex justify-center pt-1 sm:pt-2">
          <Link
            to="/"
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#F85149]/45 bg-[#F85149]/8 px-[22px] py-[14px] text-sm font-medium text-[#FF7B72] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/14 hover:text-[#FFA198] sm:mt-[20px]"
          >
            Exit quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
