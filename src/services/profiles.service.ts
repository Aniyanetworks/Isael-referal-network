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

/**
 * Removes a partner signup's app record (rejects/cancels it). Only deletes
 * the profiles row - the underlying Supabase Auth user still exists, since
 * deleting that requires the service-role key, which must never run in the
 * browser. If they sign up again with the same email it'll say "already
 * registered"; that's an acceptable edge case for a rejected signup.
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const { error } = await supabase.from("profiles").delete().eq("id", profileId);
  if (error) throw error;
}
