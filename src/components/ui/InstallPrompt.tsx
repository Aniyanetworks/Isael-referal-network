import { useState } from "react";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";
import { DownloadIcon, XIcon } from "./icons";
import { installHint } from "./installHint";

const DISMISSED_KEY = "konexigo_install_dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // Private browsing / storage blocked - the banner just won't remember
    // being dismissed, which is a minor inconvenience, not a bug worth
    // crashing over.
  }
}

/**
 * A small "Install app" banner. QR access never requires installing - this
 * is purely an optional convenience offered once, dismissible, and never
 * shown again after that (or once the app is already installed). The
 * header's InstallButton covers the on-demand case this banner itself
 * doesn't: once dismissed here, it's gone for good even if the person
 * changes their mind later.
 *
 * Chromium browsers (installMethod "prompt"): a real Install button.
 * Safari, iOS and macOS ("ios"/"macSafari"): a manual instruction, since
 * neither has a JS API to trigger its own install flow.
 * Everything else with no install mechanism at all ("bookmark"): a plain
 * "bookmark this page" tip instead of showing nothing.
 */
export function InstallPrompt() {
  const { installMethod, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (dismissed || !installMethod) return null;

  function close() {
    dismiss();
    setDismissed(true);
  }

  async function install() {
    const outcome = await promptInstall();
    if (outcome !== "unavailable") close();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg shadow-black/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          <DownloadIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm text-slate-700">
          {installMethod === "prompt" ? "Install Konexigo for quicker access." : installHint(installMethod)}
        </div>
        {installMethod === "prompt" && (
          <button
            type="button"
            onClick={() => void install()}
            className="shrink-0 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
