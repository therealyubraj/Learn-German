import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getWordListByName, saveEditedWordList } from "../FS/utils";
import { QuizItem } from "../types";
import { showToast } from "../Toast";

type EditableQuizItem = {
  id: string;
  LHS: string;
  RHS: string;
  remarks: string;
  TTS: string;
};

const fieldClassName =
  "w-full rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none transition-colors placeholder:text-[#8B949E] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30";

function toEditableItem(item: QuizItem): EditableQuizItem {
  return {
    id: crypto.randomUUID(),
    LHS: item.LHS,
    RHS: item.RHS,
    remarks: item.remarks ?? "",
    TTS: item.TTS ?? "",
  };
}

function getEmptyItem(): EditableQuizItem {
  return {
    id: crypto.randomUUID(),
    LHS: "",
    RHS: "",
    remarks: "",
    TTS: "",
  };
}

export function WordSetEditor() {
  const { name } = useParams();
  const wordSetName = name ? decodeURIComponent(name) : null;
  const [items, setItems] = useState<EditableQuizItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadWordSet() {
      if (!wordSetName) {
        setError("No word set was selected.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const wordSet = await getWordListByName(wordSetName);
        setItems(wordSet.list.map(toEditableItem));
        setHighlightedItemId(null);
      } catch (loadError) {
        console.error("Failed to load word set.", loadError);
        setError("Could not load this word set.");
      } finally {
        setIsLoading(false);
      }
    }

    loadWordSet();
  }, [wordSetName]);

  function updateItem(
    index: number,
    field: keyof EditableQuizItem,
    value: string,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function handleAddItem() {
    const nextItem = getEmptyItem();
    setSearchQuery("");
    setHighlightedItemId(nextItem.id);
    setItems((current) => [nextItem, ...current]);
  }

  function handleRemoveItem(index: number) {
    setItems((current) => {
      const removedItem = current[index];
      if (removedItem?.id === highlightedItemId) {
        setHighlightedItemId(null);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function handleSave() {
    if (!wordSetName) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      if (items.length === 0) {
        throw new Error("A word set must contain at least one item.");
      }

      const cleanList: QuizItem[] = items.map((item, index) => {
        const LHS = item.LHS.trim();
        const RHS = item.RHS.trim();
        const remarks = item.remarks.trim();
        const TTS = item.TTS.trim();

        if (LHS === "") {
          throw new Error(`LHS is empty at item ${index + 1}.`);
        }

        if (RHS === "") {
          throw new Error(`RHS is empty at item ${index + 1}.`);
        }

        return {
          LHS,
          RHS,
          remarks: remarks || undefined,
          TTS: TTS || undefined,
        };
      });

      const savedList = await saveEditedWordList(wordSetName, cleanList);
      setItems(savedList.list.map(toEditableItem));
      setHighlightedItemId(null);
      showToast("Word set saved.");
    } catch (saveError) {
      const message = (saveError as Error).message;
      setError(message);
      showToast(message);
    } finally {
      setIsSaving(false);
    }
  }

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (normalizedQuery === "") {
      return [];
    }

    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.id !== highlightedItemId)
      .filter(({ item }) =>
        `${item.LHS} ${item.RHS}`.toLowerCase().includes(normalizedQuery),
      );
  }, [highlightedItemId, items, searchQuery]);

  const highlightedItemEntry = useMemo(() => {
    if (!highlightedItemId) {
      return null;
    }

    const index = items.findIndex((item) => item.id === highlightedItemId);
    if (index === -1) {
      return null;
    }

    return {
      item: items[index],
      index,
    };
  }, [highlightedItemId, items]);

  function renderItemEditor(
    item: EditableQuizItem,
    index: number,
    heading: string,
    isDraft = false,
  ) {
    return (
      <div
        key={item.id}
        className={`rounded-3xl border bg-[#0D1117] p-5 ${
          isDraft ? "border-[#00C896]/45 shadow-[0_18px_40px_rgba(0,200,150,0.08)]" : "border-[#30363D]"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B949E]">
              {heading}
            </h3>
            {isDraft ? (
              <p className="mt-1 text-xs text-[#00C896]">
                New item draft
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => handleRemoveItem(index)}
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#30363D] px-4 py-2 text-sm font-medium text-[#8B949E] transition-colors hover:border-[#F85149] hover:bg-[#F85149]/10 hover:text-[#FFB3AD]"
          >
            Remove
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#A6ADC8]">LHS</label>
            <input
              value={item.LHS}
              onChange={(event) => updateItem(index, "LHS", event.target.value)}
              className={fieldClassName}
              type="text"
              placeholder="Prompt shown in the quiz"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#A6ADC8]">RHS</label>
            <input
              value={item.RHS}
              onChange={(event) => updateItem(index, "RHS", event.target.value)}
              className={fieldClassName}
              type="text"
              placeholder="Expected answer"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#A6ADC8]">TTS</label>
            <input
              value={item.TTS}
              onChange={(event) => updateItem(index, "TTS", event.target.value)}
              className={fieldClassName}
              type="text"
              placeholder="Optional spoken text override"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#A6ADC8]">
              Remarks
            </label>
            <input
              value={item.remarks}
              onChange={(event) =>
                updateItem(index, "remarks", event.target.value)
              }
              className={fieldClassName}
              type="text"
              placeholder="Optional feedback or note"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[30px] flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-32 sm:px-8 sm:pt-36">
      <div className="flex w-full max-w-[64rem] flex-col gap-8">
        <div className="flex flex-col gap-4 text-center">
          <div className="flex justify-center">
            <Link
              to="/quiz-selection"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
            >
              Back to Quiz Setup
            </Link>
          </div>

          <div>
            <h1
              className="font-semibold tracking-[-0.04em] text-[#E6EDF3]"
              style={{ fontSize: "4.25rem", lineHeight: "1.02" }}
            >
              Edit Word Set
            </h1>
            <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
              Update quiz items for <span className="font-semibold">{wordSetName}</span>.
            </p>
          </div>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[40px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          {isLoading ? (
            <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[16px] text-sm text-[#8B949E]">
              Loading saved word set...
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm leading-6 text-[#8B949E]">
                Edit the quiz-facing fields directly. Changing only{" "}
                <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                  remarks
                </code>{" "}
                or{" "}
                <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-xs text-[#E6EDF3]">
                  TTS
                </code>{" "}
                keeps the same quiz-item identity, so existing progress is reused.
              </div>

              <div className="sticky top-24 z-10 rounded-3xl border border-[#30363D] bg-[#0D1117]/95 p-5 backdrop-blur-sm">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="text-base font-medium text-[#A6ADC8]">
                        Quiz items
                      </h2>
                      <p className="mt-1 text-sm text-[#8B949E]">
                        {items.length} item{items.length === 1 ? "" : "s"} in this
                        set
                        {searchQuery.trim() !== ""
                          ? ` • ${visibleItems.length} match${
                              visibleItems.length === 1 ? "" : "es"
                            }`
                          : highlightedItemId
                            ? " • new draft open"
                            : " • search to edit an existing item"}
                      </p>
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
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          if (event.target.value.trim() !== "") {
                            setHighlightedItemId(null);
                          }
                        }}
                        className={fieldClassName}
                        type="text"
                        placeholder="Type to find existing items..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:w-[12rem]">
                    <button
                      type="button"
                      disabled={isSaving || isLoading}
                      onClick={handleSave}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[24px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#161B22] px-[22px] py-[14px] text-sm font-medium text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
                    >
                      Add item
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {highlightedItemEntry
                  ? renderItemEditor(
                      highlightedItemEntry.item,
                      highlightedItemEntry.index,
                      "Draft item",
                      true,
                    )
                  : null}

                {visibleItems.map(({ item, index }) =>
                  renderItemEditor(item, index, `Item ${index + 1}`),
                )}

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#30363D] bg-[#0D1117] px-[18px] py-[20px] text-center text-sm text-[#8B949E]">
                    This set has no quiz items. Add one before saving.
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#30363D] bg-[#0D1117] px-[18px] py-[20px] text-center text-sm text-[#8B949E]">
                    {highlightedItemEntry
                      ? "Search to edit an existing item, or continue working on the draft above."
                      : searchQuery.trim() === ""
                      ? "Search to edit an existing item, or add a new one."
                      : "No items match the current search. Clear the filter or add a new item."}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                  {error}
                </div>
              ) : null}
              <div className="border-t border-[#30363D] pt-2">
                <p className="text-sm text-[#8B949E]">
                  Saving overwrites this set in OPFS and re-sorts items by
                  LHS/RHS.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
