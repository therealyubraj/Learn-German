import { AddMode, ItemFormValues } from "./types";
import { ItemForm, ModalShell, fieldClassName } from "./shared";

export function AddItemModal({
  isOpen,
  addMode,
  singleItemDraft,
  jsonAppendInput,
  isMutating,
  onClose,
  onModeChange,
  onSingleDraftChange,
  onJsonChange,
  onSubmit,
}: {
  isOpen: boolean;
  addMode: AddMode;
  singleItemDraft: ItemFormValues;
  jsonAppendInput: string;
  isMutating: boolean;
  onClose: () => void;
  onModeChange: (mode: AddMode) => void;
  onSingleDraftChange: (field: keyof ItemFormValues, value: string) => void;
  onJsonChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <ModalShell
      title="Add Items"
      description="Choose how you want to add items, then confirm the action to save them directly into this word set."
      onClose={onClose}
    >
      <div className="flex flex-col gap-7">
        <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] p-2">
          <div className="inline-flex w-full rounded-xl bg-[#11161d] p-1">
            <button
              type="button"
              onClick={() => onModeChange("single")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                addMode === "single"
                  ? "bg-[#00C896] text-[#0D1117]"
                  : "text-[#A6ADC8] hover:bg-[#161B22] hover:text-[#E6EDF3]"
              }`}
            >
              Single item
            </button>

            <button
              type="button"
              onClick={() => onModeChange("json")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                addMode === "json"
                  ? "bg-[#00C896] text-[#0D1117]"
                  : "text-[#A6ADC8] hover:bg-[#161B22] hover:text-[#E6EDF3]"
              }`}
            >
              JSON import
            </button>
          </div>
        </div>

        {addMode === "single" ? (
          <div className="rounded-2xl border border-[#30363D] bg-[#11161d] p-6 sm:p-7">
            <div className="mb-5">
              <h3 className="text-base font-medium text-[#E6EDF3]">
                Add a single item
              </h3>
              <p className="mt-1 text-sm text-[#8B949E]">
                Fill in the quiz fields below, then add the item directly to
                this set.
              </p>
            </div>

            <ItemForm
              values={singleItemDraft}
              onChange={onSingleDraftChange}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-[#30363D] bg-[#11161d] p-6 sm:p-7">
            <div className="mb-5">
              <h3 className="text-base font-medium text-[#E6EDF3]">
                Import from JSON
              </h3>
              <p className="mt-1 text-sm text-[#8B949E]">
                Paste an array of quiz items and add them in one step.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#A6ADC8]">
                JSON array
              </label>
              <textarea
                value={jsonAppendInput}
                onChange={(event) => onJsonChange(event.target.value)}
                spellCheck={false}
                className={`${fieldClassName} quiz-selection-scroll min-h-[18rem] resize-y overflow-y-auto font-mono text-sm leading-7`}
                placeholder={`[
  {
    "LHS": "dürfen",
    "RHS": "may",
    "remarks": "modal verb",
    "remarksEN": "This is a modal verb.",
    "TTS": "dürfen"
  }
]`}
              />
            </div>

            <p className="mt-4 text-sm text-[#8B949E]">
              Accepted fields:{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                LHS
              </code>
              ,{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                RHS
              </code>
              , optional{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                remarks
              </code>
              , optional{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                remarksEN
              </code>
              , optional{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                TTS
              </code>
              .
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-4 py-4 sm:px-5">
          <button
            type="button"
            disabled={isMutating}
            onClick={onSubmit}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[24px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
          >
            {isMutating ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
