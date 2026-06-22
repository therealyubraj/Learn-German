import { useCallback, useEffect, useMemo, useState } from "react";
import { QuizView } from "./QuizView";
import { Link, useLocation } from "react-router-dom";
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
  const selectedQuizzes = useMemo<string[]>(
    () => location.state?.selectedQuizzes ?? [],
    [location.state],
  );
  const [currentItem, setCurrentItem] = useState<QuizItem>({
    LHS: "",
    RHS: "",
  });
  const [editingDraft, setEditingDraft] = useState<ItemFormValues | null>(null);
  const [editingSetName, setEditingSetName] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMutatingItem, setIsMutatingItem] = useState(false);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "empty" | "finished" | "error"
  >("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const finishQuiz = useCallback((message = "Finished.") => {
    setLoadState("finished");
    setLoadError(message);
  }, []);

  const showNextItem = useCallback((nextItem: QuizItem | null) => {
    if (!nextItem) {
      finishQuiz("Finished.");
      return false;
    }

    setCurrentItem(nextItem);
    setLoadState("ready");
    setLoadError(null);
    return true;
  }, [finishQuiz]);

  async function reloadQuiz(preferredItem?: QuizItem) {
    const fetchedQuiz = await getCombinedWordLists(selectedQuizzes);
    if (fetchedQuiz.words.length === 0) {
      setLoadState("empty");
      setLoadError("No words were found for the selected sets.");
      return;
    }
    quizEngine.resetEngine(fetchedQuiz);

    if (preferredItem) {
      const preferredKey = getQuizItemKey(preferredItem);
      const reloadedPreferredItem = fetchedQuiz.words.find(
        (word) => getQuizItemKey(word) === preferredKey,
      );

      if (reloadedPreferredItem) {
        setCurrentItem(reloadedPreferredItem);
        setLoadState("ready");
        setLoadError(null);
        return;
      }
    }

    showNextItem(quizEngine.selectNextWord(currentItem));
  }

  async function persistStatMutation(
    statKey: string,
    previousStat: WordStat | null,
  ) {
    const stats = quizEngine.getStats();

    try {
      console.log("[quiz] persisting stat mutation", {
        statKey,
        hasSession: Boolean(session),
      });

      if (session) {
        const canonicalStats = await saveStatsDeltaImmediately(stats, [statKey]);
        if (canonicalStats[statKey]) {
          stats[statKey] = canonicalStats[statKey];
        }
        console.log("[quiz] persisted stat mutation through sync", {
          statKey,
          receivedCanonicalStat: Boolean(canonicalStats[statKey]),
        });
        return true;
      }

      const success = await writeStats(stats, {
        dirtyStatKeys: [statKey],
      });
      if (!success) {
        throw new Error("Failed to write stats.");
      }
      console.log("[quiz] persisted stat mutation locally", { statKey });
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
    const currentKey = getQuizItemKey(currentItem);
    console.log("[quiz] onNext started", {
      currentKey,
      guessedCorrectly,
    });

    try {
      assertSyncMutationAllowed();
    } catch (error) {
      console.error(error);
      window.alert((error as Error).message);
      return;
    }

    const currentStats = quizEngine.getStats();
    const previousStat = currentStats[currentKey]
      ? { ...currentStats[currentKey] }
      : null;

    quizEngine.updateStats(currentItem, guessedCorrectly);

    const didPersist = await persistStatMutation(currentKey, previousStat);
    if (!didPersist) {
      console.warn("[quiz] onNext stopped because stat persistence failed", {
        currentKey,
      });
      return;
    }

    const newItem = quizEngine.selectNextWord(currentItem);
    console.log("[quiz] onNext selected item", {
      previousKey: currentKey,
      nextKey: newItem ? getQuizItemKey(newItem) : null,
      isSameWord: newItem ? getQuizItemKey(newItem) === currentKey : false,
    });
    showNextItem(newItem);
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
    showNextItem(newItem);
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
      try {
        setLoadState("loading");
        setLoadError(null);

        if (selectedQuizzes.length === 0) {
          setLoadState("empty");
          setLoadError("No word sets were selected.");
          return;
        }

        const fetchedQuiz = await getCombinedWordLists(selectedQuizzes);
        if (fetchedQuiz.words.length === 0) {
          setLoadState("empty");
          setLoadError("No words were found for the selected sets.");
          return;
        }

        quizEngine.resetEngine(fetchedQuiz);
        showNextItem(quizEngine.selectNextWord());
      } catch (error) {
        console.error("Failed to start quiz.", error);
        setLoadError((error as Error).message);
        setLoadState("error");
      }
    }
    fetchAndSetWordLists();
  }, [selectedQuizzes, showNextItem]);

  if (loadState !== "ready") {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] w-full items-start justify-center px-4 py-6 sm:items-center sm:px-8 sm:py-10">
        <div className="w-full max-w-[42rem] rounded-3xl border border-[#30363D] bg-[#161B22] px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:px-8 sm:py-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00C896]">
            Quiz
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[#E6EDF3]">
            {loadState === "loading"
              ? "Loading words..."
              : loadState === "finished"
                ? "Finished"
                : "No quiz words loaded"}
          </h1>
          {loadState !== "loading" ? (
            <p className="mt-3 text-sm leading-6 text-[#8B949E]">
              {loadError ?? "Choose a word set before starting a quiz."}
            </p>
          ) : null}
          {loadState !== "loading" ? (
            <Link
              to="/"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
            >
              Back to setup
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

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
