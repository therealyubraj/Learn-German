import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { loadSettings } from "../settings/service";

type VimMode = "normal" | "insert";

interface VimModeContextType {
  isVimModeEnabled: boolean;
  setIsVimModeEnabled: (enabled: boolean) => void;
  vimMode: VimMode;
  setVimMode: (mode: VimMode) => void;
  isActionInProgress: boolean;
  setIsActionInProgress: (inProgress: boolean) => void;
}

const VimModeContext = createContext<VimModeContextType | undefined>(undefined);

export function useVimMode() {
  const context = useContext(VimModeContext);
  if (!context) {
    throw new Error("useVimMode must be used within a VimModeProvider");
  }
  return context;
}

interface VimModeProviderProps {
  children: ReactNode;
}

export function VimModeProvider({ children }: VimModeProviderProps) {
  const [isVimModeEnabled, setIsVimModeEnabled] = useState(false);
  const [vimMode, setVimMode] = useState<VimMode>("insert");
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  useEffect(() => {
    async function loadVimSettings() {
      const settings = await loadSettings();
      if (settings) {
        setIsVimModeEnabled(settings.vim.enabled);
      }
    }
    loadVimSettings();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isVimModeEnabled) return;

      if (event.key === "Escape") {
        setVimMode("normal");
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (vimMode === "normal") {
        if (event.key === "i" && !isActionInProgress) { // Check if an action is NOT in progress
          event.preventDefault(); // Prevent 'i' from being typed into the input
          setVimMode("insert");
          const inputElement = document.querySelector(
            '[data-vim-primary-input="true"]'
          ) as HTMLElement;
          if (inputElement) {
            inputElement.focus();
          }
          return;
        }

        const key = event.key;
        const targetElement = document.querySelector(
          `[data-vim-key="${key}"]`
        ) as HTMLButtonElement;

        if (targetElement && !targetElement.disabled) {
          event.preventDefault();
          targetElement.click();
        }
      }
    },
    [isVimModeEnabled, vimMode, isActionInProgress]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const value = {
    isVimModeEnabled,
    setIsVimModeEnabled,
    vimMode,
    setVimMode,
    isActionInProgress,
    setIsActionInProgress,
  };

  return (
    <VimModeContext.Provider value={value}>{children}</VimModeContext.Provider>
  );
}
