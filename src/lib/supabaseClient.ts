import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      // Keeps the session in localStorage and silently refreshes it in the
      // background, so a login lasts until the refresh token itself expires
      // rather than the ~1hr access token - no forced re-login window is
      // configured server-side (see chat), so this is effectively indefinite.
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
