import { useEffect, useState } from "react";
import { QuizView } from "./QuizView";
import { useLocation } from "react-router-dom";
import {
  getCombinedWordLists,
  getWordListByName,
  saveEditedWordList,
  writeStats,
} from "../FS/utils";
import { QuizItem, WordStat } from "../types";
import { quizEngine } from "../quiz/engine";
import { useSync } from "../sync/SyncContext";
import { assertSyncMutationAllowed } from "../sync/runtime";
import { showToast } from "../Toast";
import { EditItemModal } from "./word-set-editor/EditItemModal";
import { ItemFormValues } from "./word-set-editor/types";
import { normalizeQuizItem } from "./word-set-editor/utils";
import { getQuizItemKey } from "../utils";

export function Quiz() {
  const location = useLocation();
  const { session, saveStatsDeltaImmediately } = useSync();
  const selectedQuizzes = location.state?.selectedQuizzes ?? [];
  const [currentItem, setCurrentItem] = useState<QuizItem>({
    LHS: "",
    RHS: "",
  });
  const [editingDraft, setEditingDraft] = useState<ItemFormValues | null>(null);
  const [editingSetName, setEditingSetName] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMutatingItem, setIsMutatingItem] = useState(false);

  async function reloadQuiz(preferredItem?: QuizItem) {
    const fetchedQuiz = await getCombinedWordLists(selectedQuizzes);
    quizEngine.resetEngine(fetchedQuiz);

    if (preferredItem) {
      const preferredKey = getQuizItemKey(preferredItem);
      const reloadedPreferredItem = fetchedQuiz.words.find(
        (word) => getQuizItemKey(word) === preferredKey,
      );

      if (reloadedPreferredItem) {
        setCurrentItem(reloadedPreferredItem);
        return;
      }
    }

    setCurrentItem(quizEngine.selectNextWord(currentItem));
  }

  async function persistStatMutation(
    statKey: string,
    previousStat: WordStat | null,
  ) {
    const stats = quizEngine.getStats();

    try {
      if (session) {
        const canonicalStats = await saveStatsDeltaImmediately(stats, [statKey]);
        if (canonicalStats[statKey]) {
          stats[statKey] = canonicalStats[statKey];
        }
        return true;
      }

      const success = await writeStats(stats, {
        dirtyStatKeys: [statKey],
      });
      if (!success) {
        throw new Error("Failed to write stats.");
      }
      return true;
    } catch (error) {
      if (previousStat) {
        stats[statKey] = previousStat;
      } else {
        delete stats[statKey];
      }

      const message = (error as Error).message;
      console.error("Failed to persist quiz stats.", error);
      showToast(message);
      return false;
    }
  }

  async function onNext(guessedCorrectly: boolean) {
    try {
      assertSyncMutationAllowed();
    } catch (error) {
      console.error(error);
      window.alert((error as Error).message);
      return;
    }

    const currentKey = getQuizItemKey(currentItem);
    const currentStats = quizEngine.getStats();
    const previousStat = currentStats[currentKey]
      ? { ...currentStats[currentKey] }
      : null;

    quizEngine.updateStats(currentItem, guessedCorrectly);

    const didPersist = await persistStatMutation(currentKey, previousStat);
    if (!didPersist) {
      return;
    }

    const newItem = quizEngine.selectNextWord(currentItem);
    setCurrentItem(newItem);
  }

  async function onMarkKnown() {
    try {
      assertSyncMutationAllowed();
    } catch (error) {
      console.error(error);
      window.alert((error as Error).message);
      return;
    }

    const currentKey = getQuizItemKey(currentItem);
    const currentStats = quizEngine.getStats();
    const previousStat = currentStats[currentKey]
      ? { ...currentStats[currentKey] }
      : null;

    quizEngine.markKnown(currentItem);

    const didPersist = await persistStatMutation(currentKey, previousStat);
    if (!didPersist) {
      return;
    }

    const newItem = quizEngine.selectNextWord(currentItem);
    setCurrentItem(newItem);
  }

  async function findCurrentItemWordSet() {
    const currentKey = getQuizItemKey(currentItem);

    for (const wordSetName of selectedQuizzes) {
      const wordSet = await getWordListByName(wordSetName);
      const itemIndex = wordSet.list.findIndex(
        (item) => getQuizItemKey(item) === currentKey,
      );

      if (itemIndex >= 0) {
        return { wordSet, itemIndex };
      }
    }

    return null;
  }

  async function openEditCurrentItemModal() {
    try {
      const match = await findCurrentItemWordSet();

      if (!match) {
        showToast("Could not find this word in the selected sets.");
        return;
      }

      const item = match.wordSet.list[match.itemIndex];
      setEditingSetName(match.wordSet.metadata.name);
      setEditingDraft({
        LHS: item.LHS,
        RHS: item.RHS,
        remarks: item.remarks ?? "",
        remarksEN: item.remarksEN ?? "",
        TTS: item.TTS ?? "",
      });
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Failed to open quiz item editor.", error);
      showToast("Could not open this word for editing.");
    }
  }

  function closeEditCurrentItemModal() {
    if (isMutatingItem) {
      return;
    }

    setIsEditModalOpen(false);
    setEditingDraft(null);
    setEditingSetName(null);
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

  async function handleSaveCurrentItem() {
    if (!editingDraft || !editingSetName) {
      return;
    }

    try {
      setIsMutatingItem(true);
      assertSyncMutationAllowed();

      const match = await findCurrentItemWordSet();
      if (!match) {
        throw new Error("Could not find this word in the selected sets.");
      }

      const updatedItem = normalizeQuizItem(editingDraft, match.itemIndex);
      const nextList = match.wordSet.list.map((item, index) =>
        index === match.itemIndex ? updatedItem : item,
      );

      await saveEditedWordList(match.wordSet.metadata.name, nextList);
      await reloadQuiz(updatedItem);
      showToast(`Updated item in "${match.wordSet.metadata.name}".`);
      setIsEditModalOpen(false);
      setEditingDraft(null);
      setEditingSetName(null);
    } catch (error) {
      const message = (error as Error).message;
      console.error("Failed to save quiz item.", error);
      showToast(message);
    } finally {
      setIsMutatingItem(false);
    }
  }

  async function handleDeleteCurrentItem() {
    try {
      setIsMutatingItem(true);
      assertSyncMutationAllowed();

      const match = await findCurrentItemWordSet();
      if (!match) {
        throw new Error("Could not find this word in the selected sets.");
      }

      if (match.wordSet.list.length <= 1) {
        throw new Error("A word set must contain at least one item.");
      }

      const shouldDelete = window.confirm(
        `Delete "${match.wordSet.list[match.itemIndex].LHS}" from "${match.wordSet.metadata.name}"?`,
      );

      if (!shouldDelete) {
        return;
      }

      const nextList = match.wordSet.list.filter(
        (_, index) => index !== match.itemIndex,
      );

      await saveEditedWordList(match.wordSet.metadata.name, nextList);
      await reloadQuiz();
      showToast(`Deleted item from "${match.wordSet.metadata.name}".`);
      setIsEditModalOpen(false);
      setEditingDraft(null);
      setEditingSetName(null);
    } catch (error) {
      const message = (error as Error).message;
      console.error("Failed to delete quiz item.", error);
      showToast(message);
    } finally {
      setIsMutatingItem(false);
    }
  }

  useEffect(() => {
    async function fetchAndSetWordLists() {
      const fetchedQuiz = await getCombinedWordLists(selectedQuizzes);
      quizEngine.resetEngine(fetchedQuiz);

      setCurrentItem(quizEngine.selectNextWord());
    }
    fetchAndSetWordLists();
  }, []);

  return (
    <>
      <QuizView
        item={currentItem}
        onNext={onNext}
        onMarkKnown={onMarkKnown}
        onEditCurrent={openEditCurrentItemModal}
        key={`${currentItem.LHS}-${currentItem.RHS}`}
      />
      <EditItemModal
        isOpen={isEditModalOpen}
        editingDraft={editingDraft}
        isMutating={isMutatingItem}
        onClose={closeEditCurrentItemModal}
        onDraftChange={updateEditingDraft}
        onDelete={handleDeleteCurrentItem}
        onSave={handleSaveCurrentItem}
      />
    </>
  );
}
