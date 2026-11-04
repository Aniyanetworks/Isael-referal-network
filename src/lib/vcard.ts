import type { Partner } from "../types";
import { toExternalUrl } from "./url";

export type VCardPartner = Pick<
  Partner,
  "company_name" | "phone" | "website" | "address" | "slug" | "logo_url" | "email" | "social_links"
>;

const MAX_PHOTO_SIDE = 200;
const PHOTO_FETCH_TIMEOUT_MS = 6000;

function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

// RFC 2426 requires long lines folded at 75 octets, continued by a line that
// starts with a single space. Needed mainly for the base64 PHOTO line, but
// applied to every line for safety.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) {
    chunks.push(" " + line.slice(i, i + 74));
  }
  return chunks.join("\r\n");
}

/**
 * Fetches a logo and re-encodes it as a small base64 JPEG so it can be
 * embedded directly in the vCard (a PHOTO;VALUE=uri pointing at a URL is
 * largely ignored by iOS/Android contact imports). Returns null - never
 * throws - if the image can't be loaded or converted: an SVG logo, a
 * cross-origin host without CORS headers, or a slow/unreachable URL. The
 * contact still saves fine without a photo in that case.
 */
async function fetchLogoAsJpegBase64(url: string): Promise<string | null> {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const loaded = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), PHOTO_FETCH_TIMEOUT_MS);
      image.onload = () => {
        clearTimeout(timer);
        resolve(true);
      };
      image.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      image.src = url;
    });
    if (!loaded || !image.naturalWidth || !image.naturalHeight) return null;

    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White backing so a transparent-background logo (most PNG/SVG logos)
    // doesn't turn black in contact apps that don't understand alpha.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const [, base64] = dataUrl.split(",", 2);
    return base64 || null;
  } catch {
    // Cross-origin image with no CORS header taints the canvas and
    // toDataURL throws a SecurityError - treat exactly like "couldn't load".
    return null;
  }
}

async function buildVCard(partner: VCardPartner): Promise<string> {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(partner.company_name)}`,
    `ORG:${escapeVCardValue(partner.company_name)}`,
  ];
  if (partner.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardValue(partner.phone)}`);
  if (partner.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeVCardValue(partner.email)}`);
  const website = toExternalUrl(partner.website);
  if (website) lines.push(`URL;TYPE=WORK:${escapeVCardValue(website)}`);
  if (partner.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(partner.address)};;;;`);

  for (const key of ["facebook", "instagram", "linkedin"] as const) {
    const social = toExternalUrl(partner.social_links?.[key]);
    if (social) lines.push(`URL;TYPE=${key.toUpperCase()}:${escapeVCardValue(social)}`);
  }

  if (partner.logo_url) {
    const photoBase64 = await fetchLogoAsJpegBase64(partner.logo_url);
    if (photoBase64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`);
  }

  lines.push("END:VCARD");
  return lines.map(foldLine).join("\r\n");
}

/** Downloads a .vcf contact card so a customer can save the partner's info to their phone. */
export async function downloadVCard(partner: VCardPartner): Promise<void> {
  const vcard = await buildVCard(partner);
  const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${partner.slug}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
