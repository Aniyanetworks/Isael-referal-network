import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ALLOWED_LOGO_TYPES, uploadPartnerLogo } from "../../services/logos.service";

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export function LogoUpload({ value, onChange, onUploadingChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setBusy(busy: boolean) {
    setUploading(busy);
    onUploadingChange?.(busy);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      onChange(await uploadPartnerLogo(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
          {value ? (
            <img src={value} alt="Logo preview" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-400">No logo</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : value ? "Change logo" : "Upload logo"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_LOGO_TYPES.join(",")}
          className="hidden"
          onChange={handleFile}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">PNG, JPG, WEBP, SVG or GIF, up to 2 MB.</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
