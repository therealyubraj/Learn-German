import { ItemFormValues } from "./types";
import { ItemForm, ModalShell } from "./shared";

export function EditItemModal({
  isOpen,
  editingDraft,
  isMutating,
  onClose,
  onDraftChange,
  onDelete,
  onSave,
}: {
  isOpen: boolean;
  editingDraft: ItemFormValues | null;
  isMutating: boolean;
  onClose: () => void;
  onDraftChange: (field: keyof ItemFormValues, value: string) => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  if (!isOpen || !editingDraft) {
    return null;
  }

  const isEditingDraftValid =
    editingDraft.LHS.trim() !== "" && editingDraft.RHS.trim() !== "";

  return (
    <ModalShell
      title="Edit Item"
      description="Update this quiz item here. Saving applies immediately, while deleting still asks for confirmation."
      onClose={onClose}
    >
      <div className="flex flex-col gap-7">
        <div className="rounded-2xl border border-[#30363D] bg-[#11161d] p-6 sm:p-7">
          <div className="mb-5">
            <h3 className="text-base font-medium text-[#E6EDF3]">
              Edit this item
            </h3>
            <p className="mt-1 text-sm text-[#8B949E]">
              Update the fields below, then save directly from this modal.
            </p>
          </div>
          <ItemForm
            values={editingDraft}
            onChange={onDraftChange}
            showValidation
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#30363D] bg-[#0D1117] px-4 py-4 sm:flex-row sm:justify-between sm:px-5">
          <button
            type="button"
            disabled={isMutating}
            onClick={onDelete}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[24px] py-[14px] text-sm font-medium text-[#FFB3AD] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/16 hover:text-[#FFD2CD] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
          >
            {isMutating ? "Working..." : "Delete item"}
          </button>

          <button
            type="button"
            disabled={isMutating || !isEditingDraftValid}
            onClick={onSave}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[24px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
          >
            {isMutating ? "Saving..." : "Save item"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
