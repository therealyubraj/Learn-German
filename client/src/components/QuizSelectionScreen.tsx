import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { getAllWordListSummaries } from "../FS/utils";
import { WordListSummary } from "../types";

type QuizButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit";
};

type SelectionChipProps = {
  label: string;
  onRemove: () => void;
};

type MultiSelectDropdownProps = {
  options: WordListSummary[];
  selectedNames: string[];
  onToggle: (name: string) => void;
  disabled?: boolean;
};

const FIRST_OPEN_STORAGE_KEY = "german-app-quiz-selection-initialized";
const DEFAULT_FIRST_OPEN_SET_NAME = "German Basics";

function QuizButton({
  children,
  disabled = false,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}: QuizButtonProps) {
  const baseClassName =
    "inline-flex min-h-14 items-center justify-center rounded-2xl border px-12 py-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-0";

  const variantClassName =
    variant === "primary"
      ? "border-[#00C896] bg-[#00C896] text-[#0D1117] shadow-[0_18px_40px_rgba(0,200,150,0.18)] hover:bg-[#00FF9C] active:scale-[0.99] disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E] disabled:shadow-none disabled:hover:bg-[#1C232D]"
      : "border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClassName} ${variantClassName} ${className}`}
    >
      {children}
    </button>
  );
}

function SelectionChip({ label, onRemove }: SelectionChipProps) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -6 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="inline-flex min-h-12 w-[15rem] items-center justify-between gap-3 rounded-full border border-[#00C896]/35 bg-[#00C896]/10 px-[18px] py-[12px] text-sm font-medium text-[#E6EDF3] shadow-[0_10px_24px_rgba(0,200,150,0.08)]"
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/10 hover:text-[#E6EDF3]"
      >
        &times;
      </button>
    </motion.span>
  );
}

function MultiSelectDropdown({
  options,
  selectedNames,
  onToggle,
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return options.filter((option) =>
      option.name.toLowerCase().includes(normalizedQuery),
    );
  }, [options, searchQuery, selectedNames]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setActiveIndex(0);
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= visibleOptions.length) {
      setActiveIndex(Math.max(visibleOptions.length - 1, 0));
    }
  }, [activeIndex, visibleOptions.length]);

  useEffect(() => {
    function handleOutsidePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsidePointer);
    return () =>
      document.removeEventListener("mousedown", handleOutsidePointer);
  }, []);

  function handleOptionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (
      (event.key === "Enter" || event.key === " ") &&
      visibleOptions[activeIndex]
    ) {
      event.preventDefault();
      onToggle(visibleOptions[activeIndex].name);
    }
  }

  const selectedCount = selectedNames.length;
  const triggerLabel =
    selectedCount === 0
      ? "Search or select word sets..."
      : `${selectedCount} set${selectedCount === 1 ? "" : "s"} selected`;

  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-controls="word-set-multiselect"
        aria-haspopup="listbox"
        onKeyDown={handleOptionKeyDown}
        onClick={() => !disabled && setIsOpen((current) => !current)}
        className={`group relative isolate flex min-h-[4.5rem] w-full items-center justify-between overflow-hidden rounded-2xl border bg-[#161B22] px-[24px] py-[18px] transition-all ${
          disabled
            ? "cursor-not-allowed border-[#30363D] opacity-60"
            : `cursor-pointer border-[#30363D] shadow-[0_12px_32px_rgba(0,0,0,0.18)] ${
                isOpen
                  ? "border-[#00C896] ring-1 ring-[#00C896]/30"
                  : "hover:border-[#00C896] hover:ring-1 hover:ring-[#00C896]/20"
              }`
        }`}
      >
        <span className="truncate text-[1.05rem] font-medium text-[#E6EDF3]">
          {triggerLabel}
        </span>
        <span
          aria-hidden="true"
          className={`text-lg text-[#8B949E] transition-all duration-200 group-hover:text-[#E6EDF3] ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </div>

      <AnimatePresence>
        {isOpen && !disabled ? (
          <motion.div
            id="word-set-multiselect"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 rounded-2xl border border-[#30363D] bg-[#161B22] shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
          >
            <div className="rounded-t-2xl border-b border-[#30363D] p-4">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleOptionKeyDown}
                placeholder="Search or select word sets..."
                className="w-full rounded-xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none placeholder:text-[#8B949E] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30"
              />
            </div>

            <div className="quiz-selection-scroll max-h-72 overflow-y-auto overflow-x-hidden rounded-b-2xl p-2">
              {visibleOptions.length > 0 ? (
                <div role="listbox" aria-multiselectable="true">
                  {visibleOptions.map((option, index) => {
                    const isSelected = selectedNames.includes(option.name);

                    return (
                      <button
                        key={option.name}
                        type="button"
                        onClick={() => onToggle(option.name)}
                        className={`flex w-full items-center justify-between gap-4 rounded-xl px-[18px] py-[14px] text-left transition-colors ${
                          index === activeIndex
                            ? isSelected
                              ? "bg-[#00C896]/18"
                              : "bg-[#00C896]/10"
                            : "bg-transparent"
                        } ${isSelected ? "bg-[#00C896]/12" : ""} hover:bg-[#00C896]/14`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <motion.span
                            layout={false}
                            initial={false}
                            animate={{
                              backgroundColor: isSelected
                                ? "rgba(0, 200, 150, 1)"
                                : "rgba(13, 17, 23, 1)",
                              borderColor: isSelected
                                ? "rgba(0, 200, 150, 1)"
                                : "rgba(48, 54, 61, 1)",
                              color: isSelected
                                ? "rgba(13, 17, 23, 1)"
                                : "rgba(13, 17, 23, 0)",
                              scale: isSelected ? 1 : 0.98,
                            }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            aria-hidden="true"
                            className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                              isSelected ? "text-[#0D1117]" : "text-transparent"
                            }`}
                          >
                            ✓
                          </motion.span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#E6EDF3]">
                              {option.name}
                            </p>
                            <p className="text-xs text-[#8B949E]">
                              {option.wordCount} words
                            </p>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="inline-flex min-w-[5.5rem] items-center justify-center gap-1 rounded-full border border-[#00C896]/35 bg-[#00C896]/10 px-2.5 py-1 text-xs font-medium text-[#E6EDF3]">
                            <span aria-hidden="true">✓</span>
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="min-w-[5.5rem]" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[#8B949E]">
                  No matching sets found.
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function QuizSelectionScreen() {
  const [allSets, setAllSets] = useState<WordListSummary[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function populateList() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextSets = await getAllWordListSummaries();
        setAllSets(nextSets);

        let isFirstOpen = false;

        try {
          isFirstOpen =
            window.localStorage.getItem(FIRST_OPEN_STORAGE_KEY) === null;
          if (isFirstOpen) {
            window.localStorage.setItem(FIRST_OPEN_STORAGE_KEY, "true");
          }
        } catch (storageError) {
          console.warn(
            "Could not read quiz selection first-open state.",
            storageError,
          );
        }

        const basicGermanSet = nextSets.find(
          (wordSet) => wordSet.name === DEFAULT_FIRST_OPEN_SET_NAME,
        );

        if (isFirstOpen && basicGermanSet) {
          setSelectedNames([basicGermanSet.name]);
        } else if (nextSets.length === 1) {
          setSelectedNames([nextSets[0].name]);
        } else {
          setSelectedNames([]);
        }
        console.log("isfirst", isFirstOpen, basicGermanSet);
      } catch (error) {
        console.error("Failed to load word lists.", error);
        setLoadError("Could not load your saved word sets.");
      } finally {
        setIsLoading(false);
      }
    }

    populateList();
  }, []);

  const selectedSets = useMemo(
    () => allSets.filter((option) => selectedNames.includes(option.name)),
    [allSets, selectedNames],
  );

  const totalSelectedWords = useMemo(
    () => selectedSets.reduce((sum, option) => sum + option.wordCount, 0),
    [selectedSets],
  );

  const isReady = selectedNames.length > 0;

  function toggleSelection(name: string) {
    setSelectedNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function handleQuizStart() {
    navigate("/quiz", {
      state: { selectedQuizzes: selectedNames },
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-6 py-10 sm:px-8">
      <div className="flex w-full max-w-[42rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.25rem", lineHeight: "0.98" }}
          >
            Quiz Setup
          </h1>
          <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
            Select the word sets you want, then start the quiz.
          </p>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[40px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label
                htmlFor="word-set-picker"
                className="text-base font-medium text-[#A6ADC8]"
              >
                Choose saved word sets
              </label>

              {loadError ? (
                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-5 py-6 text-center">
                  <p className="text-sm font-medium text-[#E6EDF3]">
                    {loadError}
                  </p>
                  <p className="mt-2 text-sm text-[#8B949E]">
                    Refresh the page or import a new set.
                  </p>
                </div>
              ) : (
                <div id="word-set-picker">
                  <MultiSelectDropdown
                    options={allSets}
                    selectedNames={selectedNames}
                    onToggle={toggleSelection}
                    disabled={isLoading || allSets.length === 0}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-[#8B949E]">
                  Selected sets
                </h2>
                <span className="text-sm text-[#8B949E]">
                  {selectedNames.length} selected
                </span>
              </div>

              {selectedSets.length > 0 ? (
                <motion.div layout className="flex flex-wrap gap-3">
                  <AnimatePresence mode="popLayout">
                    {selectedSets.map((option) => (
                      <SelectionChip
                        key={option.name}
                        label={option.name}
                        onRemove={() => toggleSelection(option.name)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <p className="text-sm text-[#8B949E]">
                  <span className="font-medium text-[#E6EDF3]">
                    No sets selected yet
                  </span>
                </p>
              )}
            </div>

            <motion.div
              key={`${selectedNames.length}-${totalSelectedWords}`}
              initial={{ opacity: 0.7, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-center text-sm font-medium text-[#E6EDF3]"
            >
              {selectedNames.length > 0
                ? `${selectedNames.length} set${
                    selectedNames.length === 1 ? "" : "s"
                  } selected • ${totalSelectedWords} words`
                : "0 sets selected • 0 words"}
            </motion.div>

            <motion.div
              animate={{
                scale: isReady ? 1 : 0.985,
                opacity: isReady ? 1 : 0.92,
              }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <QuizButton
                disabled={!isReady}
                onClick={handleQuizStart}
                className="w-full"
              >
                Start Quiz
              </QuizButton>
            </motion.div>

            <div className="flex justify-center pt-1">
              <Link
                to="/import"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-medium text-[#8B949E] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
              >
                <span aria-hidden="true">+</span>
                <span>Import a new word set</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
