import { useState } from "react";
import { toast } from "sonner";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import { DownloadIcon } from "./icons";
import { installHint } from "./installHint";

/**
 * Header button offering install on demand, any time it's actually possible
 * - unlike the bottom InstallPrompt banner (dismissible once, then gone for
 * good) or Chrome's own beforeinstallprompt mini-infobar (shows once per
 * origin, then throttled for a long time regardless of which page you're
 * on). Only Chromium browsers can install at a click (installMethod
 * "prompt") - Safari (iOS and macOS) opens an instruction popover instead,
 * since neither has a JS API to trigger its own install flow, and browsers
 * with no install mechanism at all (Firefox) get a "bookmark this" tip
 * rather than nothing. Hidden entirely once the app is already installed.
 */
export function InstallButton() {
  const { installMethod, promptInstall } = useInstallPrompt();
  const [hintOpen, setHintOpen] = useState(false);

  if (!installMethod) return null;

  async function handleClick() {
    if (installMethod === "prompt") {
      const outcome = await promptInstall();
      if (outcome === "accepted") toast.success("Installing Konexigo...");
      return;
    }
    setHintOpen((open) => !open);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleClick()}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
      >
        <DownloadIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Install app</span>
      </button>

      {hintOpen && installMethod !== "prompt" && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setHintOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg">
            {installHint(installMethod)}
          </div>
        </>
      )}
    </div>
  );
}
