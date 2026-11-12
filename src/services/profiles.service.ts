import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import type { Profile } from "../types";

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Partner signups waiting for an Admin to link them to a partner record. */
export async function getUnlinkedPartnerProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "partner")
    .is("partner_id", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Every partner-role signup, linked or not - for the admin accounts page. */
export async function getAllPartnerProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "partner")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function linkProfileToPartner(
  profileId: string,
  partnerId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ partner_id: partnerId, role: "partner" })
    .eq("id", profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unlinkProfile(profileId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ partner_id: null })
    .eq("id", profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Removes a partner signup's app record (rejects/cancels it). */
export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) throw error;
}

/**
 * Deletes the underlying Supabase Auth user for a rejected/removed partner
 * signup, via the delete-partner-auth-user Edge Function (holds the
 * service-role key server-side, which must never run in the browser).
 * Without this the person's login stays behind with no profile - they can't
 * sign up again with the same email ("already registered") and can't log
 * in either (no profile to load). profiles.id cascades from auth.users, so
 * this also cleans up the profile row if one still exists.
 */
export async function deleteAuthUser(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-partner-auth-user", {
    body: { user_id: userId },
  });
  if (!error) return;

  // FunctionsHttpError's own .message is just "Edge Function returned a
  // non-2xx status code" - the function's actual { error: "..." } body (the
  // useful part) is on .context, a raw Response that has to be read async.
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    throw new Error(typeof body?.error === "string" ? body.error : error.message);
  }
  throw error;
}
