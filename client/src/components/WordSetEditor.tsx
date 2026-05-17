import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteWordListByName,
  getWordListByName,
  saveEditedWordList,
} from "../FS/utils";
import { showToast } from "../Toast";
import { AddItemModal } from "./word-set-editor/AddItemModal";
import { EditItemModal } from "./word-set-editor/EditItemModal";
import {
  ActionsSection,
  EditorHeader,
  ItemListSection,
} from "./word-set-editor/sections";
import { AddMode, EditableQuizItem, ItemFormValues } from "./word-set-editor/types";
import {
  getEmptyFormValues,
  getItemFormValues,
  normalizeQuizItem,
  parseQuizItemsFromJSON,
  toEditableItem,
} from "./word-set-editor/utils";

export function WordSetEditor() {
  const { name } = useParams();
  const navigate = useNavigate();
  const wordSetName = name ? decodeURIComponent(name) : null;

  const [items, setItems] = useState<EditableQuizItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isViewingAllItems, setIsViewingAllItems] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [singleItemDraft, setSingleItemDraft] = useState<ItemFormValues>(
    getEmptyFormValues(),
  );
  const [jsonAppendInput, setJsonAppendInput] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ItemFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isDeletingSet, setIsDeletingSet] = useState(false);

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
      } catch (loadError) {
        console.error("Failed to load word set.", loadError);
        setError("Could not load this word set.");
      } finally {
        setIsLoading(false);
      }
    }

    loadWordSet();
  }, [wordSetName]);

  useEffect(() => {
    if (!isAddModalOpen && !editingItemId) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [editingItemId, isAddModalOpen]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (isViewingAllItems) {
      return items.map((item, index) => ({ item, index }));
    }

    if (normalizedQuery === "") {
      return [];
    }

    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) =>
        `${item.LHS} ${item.RHS}`.toLowerCase().includes(normalizedQuery),
      );
  }, [isViewingAllItems, items, searchQuery]);

  const editingItem = useMemo(() => {
    if (!editingItemId) {
      return null;
    }

    return items.find((item) => item.id === editingItemId) ?? null;
  }, [editingItemId, items]);

  async function persistItems(
    nextItems: ItemFormValues[],
    successMessage: string,
  ) {
    if (!wordSetName) {
      return false;
    }

    try {
      setIsMutating(true);
      setError(null);

      if (nextItems.length === 0) {
        throw new Error(
          "A word set must contain at least one item. Delete the set instead.",
        );
      }

      const cleanList = nextItems.map((item, index) =>
        normalizeQuizItem(item, index),
      );
      const savedList = await saveEditedWordList(wordSetName, cleanList);
      setItems(savedList.list.map(toEditableItem));
      showToast(successMessage);
      return true;
    } catch (mutationError) {
      const message = (mutationError as Error).message;
      setError(message);
      showToast(message);
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  function openAddModal(mode: AddMode = "single") {
    setError(null);
    setAddMode(mode);
    setSingleItemDraft(getEmptyFormValues());
    setJsonAppendInput("");
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    if (isMutating) {
      return;
    }

    setIsAddModalOpen(false);
    setSingleItemDraft(getEmptyFormValues());
    setJsonAppendInput("");
  }

  function openEditModal(item: EditableQuizItem) {
    setError(null);
    setEditingItemId(item.id);
    setEditingDraft(getItemFormValues(item));
  }

  function closeEditModal() {
    if (isMutating) {
      return;
    }

    setEditingItemId(null);
    setEditingDraft(null);
  }

  function updateSingleItemDraft(field: keyof ItemFormValues, value: string) {
    setSingleItemDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateEditingDraft(field: keyof ItemFormValues, value: string) {
    setEditingDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  async function handleAddSingleItem() {
    const shouldAdd = window.confirm(
      `Add "${singleItemDraft.LHS.trim() || "this item"}" to "${wordSetName}"?`,
    );

    if (!shouldAdd) {
      return;
    }

    const nextItems = [singleItemDraft, ...items.map(getItemFormValues)];
    const didSave = await persistItems(nextItems, "Item added.");

    if (didSave) {
      closeAddModal();
      setSearchQuery("");
      setIsViewingAllItems(true);
    }
  }

  async function handleAddJSONItems() {
    let appendedItems: ItemFormValues[];

    try {
      appendedItems = parseQuizItemsFromJSON(jsonAppendInput);
    } catch (appendError) {
      const message = (appendError as Error).message;
      setError(message);
      showToast(message);
      return;
    }

    const shouldAdd = window.confirm(
      `Add ${appendedItems.length} item${appendedItems.length === 1 ? "" : "s"} to "${wordSetName}"?`,
    );

    if (!shouldAdd) {
      return;
    }

    const nextItems = [...items.map(getItemFormValues), ...appendedItems];
    const didSave = await persistItems(
      nextItems,
      `Added ${appendedItems.length} item${appendedItems.length === 1 ? "" : "s"}.`,
    );

    if (didSave) {
      closeAddModal();
      setSearchQuery("");
      setIsViewingAllItems(true);
    }
  }

  async function handleSaveEditedItem() {
    if (!editingItem || !editingDraft) {
      return;
    }

    const nextItems = items.map((item) =>
      item.id === editingItem.id ? editingDraft : getItemFormValues(item),
    );
    const didSave = await persistItems(nextItems, "Item updated.");

    if (didSave) {
      closeEditModal();
    }
  }

  async function handleDeleteItem() {
    if (!editingItem) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${editingItem.LHS}" from "${wordSetName}"?`,
    );

    if (!shouldDelete) {
      return;
    }

    const nextItems = items
      .filter((item) => item.id !== editingItem.id)
      .map(getItemFormValues);
    const didSave = await persistItems(nextItems, "Item deleted.");

    if (didSave) {
      closeEditModal();
    }
  }

  async function handleDeleteWordSet() {
    if (!wordSetName) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete the word set "${wordSetName}"? This removes the saved set from OPFS.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setIsDeletingSet(true);
      setError(null);
      await deleteWordListByName(wordSetName);
      showToast("Word set deleted.");
      navigate("/quiz-selection");
    } catch (deleteError) {
      const message = (deleteError as Error).message;
      setError(message);
      showToast(message);
    } finally {
      setIsDeletingSet(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setIsViewingAllItems(false);
  }

  function handleToggleViewAll() {
    setSearchQuery("");
    setIsViewingAllItems((current) => !current);
  }

  return (
    <>
      <div className="relative mt-[30px] flex min-h-[calc(100vh-5rem)] w-full justify-center overflow-hidden px-6 pb-24 pt-32 sm:px-10 sm:pb-28 sm:pt-36 lg:px-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-24 h-64 w-64 -translate-x-[32rem] rounded-full bg-[#00C896]/10 blur-3xl" />
          <div className="absolute right-0 top-48 h-80 w-80 translate-x-1/4 rounded-full bg-[#1F6FEB]/10 blur-3xl" />
        </div>

        <div className="relative flex w-full max-w-[66rem] flex-col gap-8">
          <EditorHeader />

          <div className="w-full rounded-[2rem] border border-[#30363D] bg-[#161B22] px-7 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-10 sm:py-10 lg:px-12">
            {isLoading ? (
              <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[16px] text-sm text-[#8B949E]">
                Loading saved word set...
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <ActionsSection
                  isMutating={isMutating}
                  isDeletingSet={isDeletingSet}
                  isLoading={isLoading}
                  onAddItem={() => openAddModal("single")}
                  onDeleteSet={handleDeleteWordSet}
                />

                <ItemListSection
                  wordSetName={wordSetName}
                  itemsCount={items.length}
                  visibleItems={visibleItems}
                  isViewingAllItems={isViewingAllItems}
                  searchQuery={searchQuery}
                  isMutating={isMutating}
                  isDeletingSet={isDeletingSet}
                  onSearchChange={handleSearchChange}
                  onToggleViewAll={handleToggleViewAll}
                  onEditItem={openEditModal}
                />

                {error ? (
                  <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                    {error}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddItemModal
        isOpen={isAddModalOpen}
        addMode={addMode}
        singleItemDraft={singleItemDraft}
        jsonAppendInput={jsonAppendInput}
        isMutating={isMutating}
        onClose={closeAddModal}
        onModeChange={setAddMode}
        onSingleDraftChange={updateSingleItemDraft}
        onJsonChange={setJsonAppendInput}
        onSubmit={addMode === "single" ? handleAddSingleItem : handleAddJSONItems}
      />

      <EditItemModal
        isOpen={!!editingItem && !!editingDraft}
        editingDraft={editingDraft}
        isMutating={isMutating}
        onClose={closeEditModal}
        onDraftChange={updateEditingDraft}
        onDelete={handleDeleteItem}
        onSave={handleSaveEditedItem}
      />
    </>
  );
}
