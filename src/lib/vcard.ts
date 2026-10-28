import type { Partner } from "../types";
import { toExternalUrl } from "./url";

export type VCardPartner = Pick<Partner, "company_name" | "phone" | "website" | "address" | "slug">;

function escapeVCardValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function buildVCard(partner: VCardPartner): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(partner.company_name)}`,
    `ORG:${escapeVCardValue(partner.company_name)}`,
  ];
  if (partner.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardValue(partner.phone)}`);
  const website = toExternalUrl(partner.website);
  if (website) lines.push(`URL:${escapeVCardValue(website)}`);
  if (partner.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(partner.address)};;;;`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Downloads a .vcf contact card so a customer can save the partner's info to their phone. */
export function downloadVCard(partner: VCardPartner): void {
  const blob = new Blob([buildVCard(partner)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${partner.slug}.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
