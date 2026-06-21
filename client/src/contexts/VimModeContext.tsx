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

function isInsideVimDisabledArea(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest('[data-vim-disabled="true"]'))
    : false;
}

function isTextInput(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  );
}

function findVimButton(key: string) {
  const normalizedKey = key.toLowerCase();

  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-vim-key]"),
  ).find((candidate) => {
    const candidateKey = candidate.dataset.vimKey?.toLowerCase();
    const isDisabled =
      candidate instanceof HTMLButtonElement
        ? candidate.disabled
        : candidate.getAttribute("aria-disabled") === "true";

    return (
      candidateKey === normalizedKey &&
      !isDisabled &&
      !isInsideVimDisabledArea(candidate)
    );
  });
}

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
              if (isInsideVimDisabledArea(element)) {
                return;
              }

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
      if (isInsideVimDisabledArea(event.target)) {
        return;
      }

      const activeElement = document.activeElement;
      const isInputFocused = isTextInput(activeElement);
      const inputCanReceiveText = isInputFocused && !activeElement.disabled;

      if (event.key === "Escape") {
        event.preventDefault(); // Prevent any default escape behavior
        if (inputCanReceiveText) {
          activeElement.blur();
        }
        setVimMode("normal");
        return;
      }

      const shouldHandleShortcut = vimMode === "normal" || !inputCanReceiveText;

      if (shouldHandleShortcut) {
        if (event.key === "i") {
          event.preventDefault(); // Prevent typing 'i'
          const primaryInput = document.querySelector(
            '[data-vim-primary-input="true"]'
          ) as HTMLInputElement | HTMLTextAreaElement | null;

          if (primaryInput && !primaryInput.disabled) {
            setVimMode("insert");
            primaryInput.focus();
          }
          return;
        }

        // Find and click the button corresponding to the pressed key
        const button = findVimButton(event.key);

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
      if (isInsideVimDisabledArea(event.target)) {
        return;
      }

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
      if (isInsideVimDisabledArea(event.target)) {
        return;
      }

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
