// Deletes a Supabase Auth user (and, via its `profiles.id references
// auth.users(id) on delete cascade` FK, their profile row too, if one still
// exists). Needs the service-role key, which must never reach the browser -
// this function holds it server-side instead, and only runs the delete for
// a caller it has verified is an admin.
//
// Called when an admin rejects a pending partner application, or deletes an
// already-approved partner - without this, the rejected/deleted person's
// Supabase Auth login stays behind with no profile, which both blocks them
// from signing up again with the same email ("already registered") and
// leaves them unable to log in (no profile to load).
import { createClient } from "jsr:@supabase/supabase-js@2";

// Browsers send an OPTIONS preflight before the real POST (it carries an
// Authorization header, which triggers CORS preflight); without an explicit
// response to it, the browser blocks the POST entirely before it's even
// sent - the function itself never saw it, so no amount of fixing the POST
// logic alone would show up as anything other than a silent client failure.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller via their own JWT (not the service-role key) so RLS
  // decides who they are - then check their profile is role='admin'.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: callerUser },
  } = await callerClient.auth.getUser();
  if (!callerUser) {
    return json({ error: "Not authenticated" }, 401);
  }

  const { data: callerProfile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", callerUser.id)
    .maybeSingle();
  if (callerProfile?.role !== "admin") {
    return json({ error: "Admin only" }, 403);
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.user_id || typeof body.user_id !== "string") {
    return json({ error: "user_id is required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await admin.auth.admin.deleteUser(body.user_id);
  if (error) {
    // Already-deleted is fine (nothing left to clean up) - everything else
    // is a real failure worth surfacing to the admin.
    const alreadyGone = /user not found/i.test(error.message);
    if (!alreadyGone) {
      return json({ error: error.message }, 400);
    }
  }

  return json({ ok: true });
});
