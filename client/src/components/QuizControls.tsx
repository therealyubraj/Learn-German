import React from "react";

export function QuizControls() {
  const getInputClasses = () => `
    min-h-[80px] px-6 py-4 text-center
    text-[3em] bg-gray-900 placeholder-gray-400 text-white
    border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
    transition-all duration-300
    !border-blue-500 focus:ring-blue-500
  `;

  const baseButtonClasses =
    "px-4 py-2 rounded-md text-white transition-colors duration-200";
  const enabledButtonClasses = "bg-blue-600 hover:bg-blue-700";
  const questionMode = true;

  return (
    <div className="flex flex-col gap-5 mt-4">
      <div className="w-full max-w-2xl flex items-center gap-4">
        <input
          name="answer"
          className={getInputClasses()}
          data-vim-primary-input="true"
        />
        <button
          className={`${baseButtonClasses} bg-green-600 hover:bg-green-700`}
          data-vim-key="s"
        >
          🔊
        </button>
      </div>
      <p className="text-gray-300 text-lg mt-2 text-center">Some remarks here.</p>
      <div>Insert</div>
      <div className="flex gap-4">
        <button
          className={`${baseButtonClasses} ${enabledButtonClasses}`}
          data-vim-key="c"
        >
          Check answer
        </button>
        <button
          className={`${baseButtonClasses} bg-yellow-600 hover:bg-yellow-700`}
          data-vim-key="g"
        >
          Give up
        </button>
        <button
          className={`${baseButtonClasses} bg-purple-600 hover:bg-purple-700`}
          data-vim-key="n"
        >
          Next question
        </button>
      </div>
    </div>
  );
}
