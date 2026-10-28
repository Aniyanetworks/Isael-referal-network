import { supabase } from "../lib/supabaseClient";

const BUCKET = "partner-logos";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

export async function uploadPartnerLogo(file: File): Promise<string> {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error("Logo must be a PNG, JPG, WEBP, SVG, or GIF image");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error("Logo must be 2 MB or smaller");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: "3600" });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
