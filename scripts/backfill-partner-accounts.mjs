// One-off backfill: before the account feature existed, Admin-created
// partners had no Supabase Auth user and no `profiles` row - they only
// existed as a `partners` record, so they have no way to log in or reset a
// password. This finds every partner missing that link and creates it:
// silently creates a fresh (random-password, pre-confirmed) Auth user for
// partners with no account at all, or just links the `profiles` row for
// partners whose email already has an account (e.g. a duplicate/retry) but
// isn't linked to that partner yet.
//
// Deliberately does NOT email anyone here - Supabase's built-in SMTP has a
// low send-rate limit, so inviting everyone in one batch would silently fail
// for most of them. Instead each partner just uses the existing "Forgot
// password?" flow themselves whenever they actually want to log in, which
// sends one on-demand email at a time instead of a burst.
//
// Requires the Supabase SERVICE ROLE key (Project Settings -> API), which
// must never be used client-side. Add it to .env as SUPABASE_SERVICE_ROLE_KEY
// (that file is gitignored) and run:
//
//   node scripts/backfill-partner-accounts.mjs            (dry run, default)
//   node scripts/backfill-partner-accounts.mjs --apply     (actually creates + writes)

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env - add the service role key and re-run."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllAuthUsers() {
  const byEmail = new Map();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user);
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return byEmail;
}

async function main() {
  console.log(APPLY ? "Running for real (--apply)." : "Dry run (pass --apply to make changes).");

  const { data: partners, error: partnersError } = await admin
    .from("partners")
    .select("id, company_name, email, status");
  if (partnersError) throw partnersError;

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email, partner_id")
    .eq("role", "partner");
  if (profilesError) throw profilesError;

  const linkedPartnerIds = new Set(profiles.filter((p) => p.partner_id).map((p) => p.partner_id));
  const profileByUserId = new Map(profiles.map((p) => [p.id, p]));

  const authUsersByEmail = await listAllAuthUsers();

  const summary = { alreadyLinked: 0, linkedExisting: 0, created: 0, errors: 0 };

  for (const partner of partners) {
    if (linkedPartnerIds.has(partner.id)) {
      summary.alreadyLinked += 1;
      continue;
    }

    const email = partner.email?.trim().toLowerCase();
    if (!email) {
      console.warn(`SKIP  ${partner.company_name} (${partner.id}) - no email on file`);
      summary.errors += 1;
      continue;
    }

    try {
      const existingUser = authUsersByEmail.get(email);

      if (existingUser) {
        if (profileByUserId.has(existingUser.id)) {
          console.log(
            `LINK  ${partner.company_name} <${partner.email}> -> existing profile, setting partner_id`
          );
          if (APPLY) {
            const { error } = await admin
              .from("profiles")
              .update({ partner_id: partner.id })
              .eq("id", existingUser.id);
            if (error) throw error;
          }
        } else {
          console.log(
            `LINK  ${partner.company_name} <${partner.email}> -> existing auth user, creating profile row`
          );
          if (APPLY) {
            const { error } = await admin.from("profiles").insert({
              id: existingUser.id,
              email: partner.email,
              role: "partner",
              partner_id: partner.id,
            });
            if (error) throw error;
          }
        }
        summary.linkedExisting += 1;
      } else {
        console.log(
          `CREATE ${partner.company_name} <${partner.email}> -> no account yet, creating one (no email sent)`
        );
        if (APPLY) {
          // Random password nobody needs to know - the partner always gets in
          // via "Forgot password?" on /login, never this value directly.
          const throwawayPassword = randomBytes(24).toString("base64url");
          const { data: created, error: createError } = await admin.auth.admin.createUser({
            email: partner.email,
            password: throwawayPassword,
            email_confirm: true,
          });
          if (createError) throw createError;

          // The on_auth_user_created trigger (0001_init.sql) already inserted
          // a bare profiles row (role defaults to 'partner') the instant the
          // user was created above - just set partner_id on it.
          const { error: profileError } = await admin
            .from("profiles")
            .update({ partner_id: partner.id })
            .eq("id", created.user.id);
          if (profileError) throw profileError;
        }
        summary.created += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error(`ERROR ${partner.company_name} <${partner.email}>:`, error.message ?? error);
    }
  }

  console.log("\nSummary:", summary);
  if (!APPLY) {
    console.log("\nThis was a dry run - no emails sent, no rows written. Re-run with --apply to do it for real.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
