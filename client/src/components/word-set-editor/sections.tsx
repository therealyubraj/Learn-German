import { Link } from "react-router-dom";
import { EditableQuizItem } from "./types";
import { fieldClassName } from "./shared";

type VisibleItemEntry = {
  item: EditableQuizItem;
  index: number;
};

export function EditorHeader() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2.2rem] font-semibold tracking-[-0.05em] text-[#E6EDF3] sm:text-[3rem]">
            Edit Word Set
          </h1>
        </div>

        <Link
          to="/"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
        >
          Back to Quiz Setup
        </Link>
      </div>
    </div>
  );
}

export function ActionsSection({
  wordSetName,
  isMutating,
  isDeletingSet,
  isLoading,
  onAddItem,
  onRenameSet,
  onDeleteSet,
}: {
  wordSetName: string | null;
  isMutating: boolean;
  isDeletingSet: boolean;
  isLoading: boolean;
  onAddItem: () => void;
  onRenameSet: () => void;
  onDeleteSet: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[#30363D] bg-[#0D1117] p-6 sm:p-7">
      <div className="flex h-full flex-col gap-4">
        <h2 className="text-base font-medium text-[#A6ADC8]">Manage this set</h2>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#30363D] bg-[#161B22] px-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium text-[#E6EDF3]">
            {wordSetName ?? "Word set"}
          </p>
          <button
            type="button"
            disabled={isMutating || isDeletingSet || isLoading}
            onClick={onRenameSet}
            aria-label="Rename word set"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#30363D] bg-[#0D1117] text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        </div>

        <div className="rounded-2xl border border-[#30363D] bg-[#161B22] p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isMutating || isDeletingSet}
              onClick={onAddItem}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[22px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
            >
              Add item
            </button>

            <button
              type="button"
              disabled={isMutating || isDeletingSet || isLoading}
              onClick={onDeleteSet}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[22px] py-[14px] text-sm font-medium text-[#FFB3AD] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/16 hover:text-[#FFD2CD] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
            >
              {isDeletingSet ? "Deleting..." : "Delete set"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ItemListSection({
  wordSetName,
  itemsCount,
  visibleItems,
  isViewingAllItems,
  searchQuery,
  isMutating,
  isDeletingSet,
  onSearchChange,
  onToggleViewAll,
  onEditItem,
}: {
  wordSetName: string | null;
  itemsCount: number;
  visibleItems: VisibleItemEntry[];
  isViewingAllItems: boolean;
  searchQuery: string;
  isMutating: boolean;
  isDeletingSet: boolean;
  onSearchChange: (value: string) => void;
  onToggleViewAll: () => void;
  onEditItem: (item: EditableQuizItem) => void;
}) {
  return (
    <div className="rounded-3xl border border-[#30363D] bg-[#0D1117] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-[#30363D] px-1 pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-base font-medium text-[#A6ADC8]">
            {wordSetName ?? "Word set"}
          </h2>

          <button
            type="button"
            onClick={onToggleViewAll}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#30363D] bg-[#161B22] px-4 py-2 text-sm font-medium text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
          >
            {isViewingAllItems ? "Hide list" : "View all"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="word-set-search"
            className="text-sm font-medium text-[#A6ADC8]"
          >
            Search by LHS or RHS
          </label>
          <input
            id="word-set-search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className={fieldClassName}
            type="text"
            placeholder="Type to find existing items..."
          />
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className="quiz-selection-scroll max-h-[60vh] overflow-y-auto pr-1 sm:pr-2">
          <div className="flex flex-col gap-3">
            {visibleItems.map(({ item, index }) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#30363D] bg-[#161B22] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B949E]">
                      Item {index + 1}
                    </p>
                    <div className="mt-2 flex flex-col gap-1">
                      <p className="break-words text-lg font-semibold text-[#E6EDF3]">
                        {item.LHS}
                      </p>
                      <p className="break-words text-sm text-[#00C896]">
                        {item.RHS}
                      </p>
                    </div>
                    {item.remarks || item.remarksEN || item.TTS ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#8B949E]">
                        {item.remarks ? (
                          <span className="rounded-full border border-[#30363D] bg-[#0D1117] px-3 py-1">
                            Note: {item.remarks}
                          </span>
                        ) : null}
                        {item.remarksEN ? (
                          <span className="rounded-full border border-[#30363D] bg-[#0D1117] px-3 py-1">
                            English: {item.remarksEN}
                          </span>
                        ) : null}
                        {item.TTS ? (
                          <span className="rounded-full border border-[#30363D] bg-[#0D1117] px-3 py-1">
                            TTS: {item.TTS}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={isMutating || isDeletingSet}
                    onClick={() => onEditItem(item)}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-4 py-2 text-sm font-medium text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
                  >
                    Edit item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#30363D] bg-[#0D1117] px-6 py-8 text-center text-sm text-[#8B949E]">
          {itemsCount === 0
            ? "This set has no items yet. Add one to get started."
            : null}
          {itemsCount > 0 &&
          !isViewingAllItems &&
          searchQuery.trim() === ""
            ? "Search for an item, or use View all."
            : null}
          {itemsCount > 0 &&
          !isViewingAllItems &&
          searchQuery.trim() !== ""
            ? "No items match your search."
            : null}
          {itemsCount > 0 && isViewingAllItems
            ? "No items to show."
            : null}
        </div>
      )}
    </div>
  );
}
