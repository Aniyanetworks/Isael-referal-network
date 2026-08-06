import { downloadVCard, type VCardPartner } from "../../lib/vcard";
import { DownloadIcon } from "./icons";

export function SaveToPhoneButton({ partner }: { partner: VCardPartner }) {
  return (
    <button
      type="button"
      onClick={() => downloadVCard(partner)}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
    >
      <DownloadIcon className="h-4 w-4" />
      Save to Phone
    </button>
  );
}
