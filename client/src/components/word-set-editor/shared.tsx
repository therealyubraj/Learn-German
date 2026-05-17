import { type ReactNode } from "react";
import { ItemFormValues } from "./types";

export const fieldClassName =
  "w-full rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none transition-colors placeholder:text-[#8B949E] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30";

export function ItemForm({
  values,
  onChange,
}: {
  values: ItemFormValues;
  onChange: (field: keyof ItemFormValues, value: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#A6ADC8]">LHS</label>
        <input
          value={values.LHS}
          onChange={(event) => onChange("LHS", event.target.value)}
          className={fieldClassName}
          type="text"
          placeholder="Prompt shown in the quiz"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#A6ADC8]">RHS</label>
        <input
          value={values.RHS}
          onChange={(event) => onChange("RHS", event.target.value)}
          className={fieldClassName}
          type="text"
          placeholder="Expected answer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#A6ADC8]">TTS</label>
        <input
          value={values.TTS}
          onChange={(event) => onChange("TTS", event.target.value)}
          className={fieldClassName}
          type="text"
          placeholder="Optional spoken text override"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#A6ADC8]">Remarks</label>
        <input
          value={values.remarks}
          onChange={(event) => onChange("remarks", event.target.value)}
          className={fieldClassName}
          type="text"
          placeholder="Optional feedback or note"
        />
      </div>

      <div className="flex flex-col gap-2 lg:col-span-2">
        <label className="text-sm font-medium text-[#A6ADC8]">
          Remarks Translation (EN)
        </label>
        <input
          value={values.remarksEN}
          onChange={(event) => onChange("remarksEN", event.target.value)}
          className={fieldClassName}
          type="text"
          placeholder="Optional English translation for the remarks"
        />
      </div>
    </div>
  );
}

export function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020409]/84 px-6 py-8 backdrop-blur-sm sm:px-10 sm:py-12"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(52rem,calc(100vh-5rem))] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-[#30363D] bg-[#161B22] shadow-[0_24px_80px_rgba(0,0,0,0.52)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#30363D] px-7 py-7 sm:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#E6EDF3]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#8B949E]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-4 text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
          >
            Close
          </button>
        </div>
        <div className="quiz-selection-scroll overflow-y-auto px-7 py-7 sm:px-10 sm:py-10">
          {children}
        </div>
      </div>
    </div>
  );
}
