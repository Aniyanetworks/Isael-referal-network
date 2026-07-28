import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

interface ReferralLinkActionsProps {
  url: string;
  fileName: string;
  onRegenerate?: () => unknown;
  regenerating?: boolean;
}

export function ReferralLinkActions({
  url,
  fileName,
  onRegenerate,
  regenerating = false,
}: ReferralLinkActionsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy link")
    );
  }

  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function confirmRegenerate() {
    await onRegenerate?.();
    setConfirmOpen(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="rounded-md border border-gray-200 p-2">
        <QRCodeCanvas ref={canvasRef} value={url} size={80} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="form-input w-64 text-xs text-gray-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={downloadQr}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            Download QR
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={regenerating}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
            >
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
          )}
        </div>
      </div>

      {onRegenerate && (
        <ConfirmDialog
          open={confirmOpen}
          title="Regenerate link"
          description="This clears the click history recorded for this link so far. The shareable URL itself won't change."
          confirmLabel="Regenerate"
          danger
          pending={regenerating}
          onConfirm={() => void confirmRegenerate()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
