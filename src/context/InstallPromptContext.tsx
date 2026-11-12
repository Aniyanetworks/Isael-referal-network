import { createContext, useEffect, useState, type ReactNode } from "react";

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

// iPadOS Safari's default UA claims to be a Mac ("Macintosh; Intel Mac OS X
// ...") with no "iPad" token at all - maxTouchPoints is the standard way to
// tell a real (no touch) Mac apart from an iPad pretending to be one.
function isIpadSpoofingMac(): boolean {
  return /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || isIpadSpoofingMac();
}

// Desktop Safari (macOS) has its own install mechanism since Safari 17 -
// File -> Add to Dock - but like iOS, no JS API to trigger it.
function isMacSafariDesktop(): boolean {
  if (isIos()) return false;
  const ua = navigator.userAgent;
  return (
    /Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Edg\/|OPR\//i.test(ua)
  );
}

export type InstallMethod = "prompt" | "ios" | "macSafari" | "bookmark";

export interface InstallPromptContextValue {
  isInstalled: boolean;
  /** null once installed - otherwise always some way to offer saving the
   * app, even where that's just "bookmark this page" as the last resort
   * (Firefox, and any other browser with no real install mechanism). */
  installMethod: InstallMethod | null;
  /** Only meaningful when installMethod is "prompt" - resolves
   * "unavailable" as a no-op everywhere else. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

/**
 * Captures the browser's beforeinstallprompt event exactly once, at the app
 * root, so every piece of UI that wants to offer an install action (the
 * dismissible bottom banner, the header button) reads from this one place
 * instead of each racing to attach its own listener for an event that only
 * fires once per page load. Also works out which install method actually
 * applies on this browser/OS: only Chromium browsers expose that event at
 * all - Safari (iOS and macOS) needs a manual instruction instead, and
 * browsers with no install mechanism whatsoever (Firefox) fall back to a
 * plain "bookmark this page" tip rather than showing nothing.
 */
export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  }

  const installMethod: InstallMethod | null = isInstalled
    ? null
    : deferredPrompt
      ? "prompt"
      : isIos()
        ? "ios"
        : isMacSafariDesktop()
          ? "macSafari"
          : "bookmark";

  return (
    <InstallPromptContext.Provider value={{ isInstalled, installMethod, promptInstall }}>
      {children}
    </InstallPromptContext.Provider>
  );
}
