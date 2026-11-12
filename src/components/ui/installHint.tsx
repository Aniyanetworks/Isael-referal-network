import type { ReactNode } from "react";
import type { InstallMethod } from "../../context/InstallPromptContext";

const isMacPlatform = /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);

/** Instructional copy for every installMethod except "prompt" - that one
 * has a real button instead, so there's nothing to explain. */
export function installHint(method: Exclude<InstallMethod, "prompt">): ReactNode {
  if (method === "ios") {
    return (
      <>
        Tap the <span className="font-medium">Share</span> icon in Safari's toolbar, then{" "}
        <span className="font-medium">Add to Home Screen</span>.
      </>
    );
  }
  if (method === "macSafari") {
    return (
      <>
        In Safari's menu bar, click <span className="font-medium">File</span>, then{" "}
        <span className="font-medium">Add to Dock</span>.
      </>
    );
  }
  return (
    <>
      This browser can't install the app, but you can bookmark it (
      <span className="font-medium">{isMacPlatform ? "Cmd" : "Ctrl"} + D</span>) for quick access.
    </>
  );
}
