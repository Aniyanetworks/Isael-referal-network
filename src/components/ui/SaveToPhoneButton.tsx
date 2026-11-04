import { useState } from "react";
import { toast } from "sonner";
import { downloadVCard, type VCardPartner } from "../../lib/vcard";
import { DownloadIcon } from "./icons";

export function SaveToPhoneButton({
  partner,
  onSave,
}: {
  partner: VCardPartner;
  /** Called (fire-and-forget) once a save is attempted, for contact_click tracking. */
  onSave?: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleClick() {
    setSaving(true);
    onSave?.();
    try {
      await downloadVCard(partner);
    } catch {
      toast.error("Couldn't save the contact. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
    >
      <DownloadIcon className="h-4 w-4" />
      {saving ? "Preparing..." : "Save to Phone"}
    </button>
  );
}
