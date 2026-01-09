import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { useSettings } from "./SettingsContext";

type VimMode = "normal" | "insert";

interface VimModeContextType {
  vimMode: VimMode;
  setVimMode: React.Dispatch<React.SetStateAction<VimMode>>;
}

const VimModeContext = createContext<VimModeContextType | undefined>(undefined);

export const useVimMode = () => {
  const context = useContext(VimModeContext);
  if (!context) {
    throw new Error("useVimMode must be used within a VimModeProvider");
  }
  return context;
};

export const VimModeProvider = ({ children }: { children: ReactNode }) => {
  const [vimMode, setVimMode] = useState<VimMode>("insert");
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings.vim.enabled) return;

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Check if it's an element
              const element = node as HTMLElement;
              let primaryInput: HTMLElement | null = null;
              
              if (element.matches('[data-vim-primary-input="true"]')) {
                primaryInput = element;
              } else {
                primaryInput = element.querySelector('[data-vim-primary-input="true"]');
              }
              
              if (primaryInput) {
                // New input found. Its appearance is the source of truth. Focus it.
                primaryInput.focus();
                // The `focusin` listener will handle setting the mode to 'insert'.
              }
            }
          });
        }
      }
    });

    // Start observing and do not stop until the provider unmounts.
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup function.
    return () => {
      observer.disconnect();
    };
  }, [settings.vim.enabled]);

  useEffect(() => {
    if (!settings.vim.enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      const isInputFocused =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA";

      if (event.key === "Escape") {
        event.preventDefault(); // Prevent any default escape behavior
        if (isInputFocused) {
          activeElement.blur();
        }
        setVimMode("normal");
        return;
      }

      if (vimMode === "normal") {
        if (event.key === "i") {
          event.preventDefault(); // Prevent typing 'i'
          setVimMode("insert");
          const primaryInput = document.querySelector(
            '[data-vim-primary-input="true"]'
          ) as HTMLElement;
          primaryInput?.focus();
          return;
        }

        // Find and click the button corresponding to the pressed key
        const key = event.key;
        const button = document.querySelector(
          `[data-vim-key="${key}"]`
        ) as HTMLElement;

        if (button) {
          event.preventDefault(); // Prevent any default key behavior
          button.click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [vimMode, settings.vim.enabled]);

  useEffect(() => {
    if (!settings.vim.enabled) return;

    const handleFocusOut = (event: FocusEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      // If the primary input lost focus and the new focus target is not
      // an element that should keep us in insert mode (e.g., another VIM-controlled button)
      // For now, simple: if primary input lost focus and it's not the VIM mode indicator
      // (which isn't focusable anyway), switch to normal.
      const primaryInput = document.querySelector(
        '[data-vim-primary-input="true"]'
      );
      
      // If the element that lost focus was the primary input AND the new active element
      // is NOT the primary input (i.e. focus moved somewhere else)
      if (primaryInput && event.target === primaryInput && event.relatedTarget !== primaryInput) {
        setVimMode('normal');
      }
    };

    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [settings.vim.enabled]);

  useEffect(() => {
    if (!settings.vim.enabled) return;

    const handleFocusIn = (event: FocusEvent) => {
      // If the primary input gained focus, switch to insert mode
      if ((event.target as HTMLElement).matches('[data-vim-primary-input="true"]')) {
        setVimMode('insert');
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [settings.vim.enabled]);

  return (
    <VimModeContext.Provider value={{ vimMode, setVimMode }}>
      {children}
    </VimModeContext.Provider>
  );
};
