import { useEffect, useState } from "react";
import { DownloadIcon, XIcon } from "./icons";

const DISMISSED_KEY = "konexigo_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag - not covered by the standard media query there.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

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
 * shown again after that (or once the app is already installed).
 *
 * Android/Chrome: captures the native beforeinstallprompt event and offers
 * a button that triggers it directly.
 * iOS Safari: has no such event, so a short "Share -> Add to Home Screen"
 * instruction is shown instead.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  // A pure function of navigator.userAgent, which never changes for the
  // life of the page - a plain computed value, not state to sync in an effect.
  const showIosHint = isIos();

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (dismissed || isStandalone() || (!deferredPrompt && !showIosHint)) return null;

  function close() {
    dismiss();
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    close();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg shadow-black/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
          <DownloadIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          {deferredPrompt ? (
            <p className="text-slate-700">Install Konexigo for quicker access.</p>
          ) : (
            <p className="text-slate-700">
              Install Konexigo: tap <span className="font-medium">Share</span>, then{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          )}
        </div>
        {deferredPrompt && (
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
