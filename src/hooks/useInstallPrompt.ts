import { useContext } from "react";
import { InstallPromptContext, type InstallPromptContextValue } from "../context/InstallPromptContext";

export function useInstallPrompt(): InstallPromptContextValue {
  const context = useContext(InstallPromptContext);
  if (!context) {
    throw new Error("useInstallPrompt must be used within an InstallPromptProvider");
  }
  return context;
}
