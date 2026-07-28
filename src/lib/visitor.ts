import type { DeviceType } from "../types";

const VISITOR_ID_KEY = "rpd_visitor_id";

/** Stable per-browser visitor id, persisted so repeat visits dedupe. */
export function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Best-effort public IP lookup; click recording must not fail if this does. */
export async function getClientIp(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const json: unknown = await response.json();
    if (json && typeof json === "object" && "ip" in json && typeof json.ip === "string") {
      return json.ip;
    }
    return "";
  } catch {
    return "";
  }
}
