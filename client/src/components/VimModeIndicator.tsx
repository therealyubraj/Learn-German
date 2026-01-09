import React from "react";
import { useVimMode } from "../contexts/VimModeContext";
import { useSettings } from "../contexts/SettingsContext";

export const VimModeIndicator = () => {
  const { vimMode } = useVimMode();
  const { settings } = useSettings();

  if (!settings.vim.enabled) {
    return null;
  }

  const bgColorClass = vimMode === "normal" ? "bg-gray-800" : "bg-gray-500";

  return (
    <div className={`fixed bottom-4 right-4 ${bgColorClass} text-white px-3 py-1 rounded-md text-sm z-50`}>
      -- {vimMode.toUpperCase()} --
    </div>
  );
};
