import { supabase } from "../lib/supabaseClient";
import { getPartnerById } from "./partners.service";
import type { ReferralLink, ReferralLinkInput } from "../types";

const UNIQUE_VIOLATION = "23505";

export interface ReferralLinkFilters {
  referrer_partner_id?: string;
  target_partner_id?: string;
}

export async function getReferralLinks(
  filters: ReferralLinkFilters = {}
): Promise<ReferralLink[]> {
  let query = supabase
    .from("referral_links")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.referrer_partner_id) {
    query = query.eq("referrer_partner_id", filters.referrer_partner_id);
  }
  if (filters.target_partner_id) {
    query = query.eq("target_partner_id", filters.target_partner_id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getReferralLinkById(id: string): Promise<ReferralLink | null> {
  const { data, error } = await supabase
    .from("referral_links")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Every referrer/target combination maps to exactly one link (enforced by a
 * unique constraint in the DB). Returns the existing link for that pair if
 * one already exists, otherwise creates it.
 */
export async function getOrCreateReferralLink(
  input: ReferralLinkInput
): Promise<ReferralLink> {
  const existing = await findLink(input);
  if (existing) return existing;

  const [referrer, target] = await Promise.all([
    getPartnerById(input.referrer_partner_id),
    getPartnerById(input.target_partner_id),
  ]);
  if (!referrer || !target) {
    throw new Error("Referrer and target partner must both exist");
  }

  const { data, error } = await supabase
    .from("referral_links")
    .insert({
      referrer_partner_id: input.referrer_partner_id,
      target_partner_id: input.target_partner_id,
      slug: `${target.slug}-ref-${referrer.slug}`,
      qr_code_url: "",
    })
    .select()
    .single();

  if (!error) return data;

  if (error.code === UNIQUE_VIOLATION) {
    const raced = await findLink(input);
    if (raced) return raced;
  }
  throw error;
}

/**
 * Deletes the existing link for this pair (if any - this also cascades away
 * its click history) and creates a fresh row. The shareable URL is derived
 * from partner slugs, not the link's own id/slug, so the URL itself does not
 * change - this just gives the pair a clean link record.
 */
export async function regenerateReferralLink(
  input: ReferralLinkInput
): Promise<ReferralLink> {
  const existing = await findLink(input);
  if (existing) {
    await deleteReferralLink(existing.id);
  }
  return getOrCreateReferralLink(input);
}

async function findLink(input: ReferralLinkInput): Promise<ReferralLink | null> {
  const { data, error } = await supabase
    .from("referral_links")
    .select("*")
    .eq("referrer_partner_id", input.referrer_partner_id)
    .eq("target_partner_id", input.target_partner_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteReferralLink(id: string): Promise<void> {
  const { error } = await supabase.from("referral_links").delete().eq("id", id);
  if (error) throw error;
}

export interface ReferrerLinkCount {
  partner_id: string;
  count: number;
}

/** How many referral links each partner has generated as a referrer. */
export async function getLinkCountsByReferrer(): Promise<ReferrerLinkCount[]> {
  const { data, error } = await supabase.from("referral_links").select("referrer_partner_id");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.referrer_partner_id, (counts.get(row.referrer_partner_id) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([partner_id, count]) => ({ partner_id, count }));
}

/** Builds the shareable customer-facing URL for a referral link. */
export function buildReferralUrl(targetSlug: string, referrerSlug: string): string {
  const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, "");
  return `${siteUrl}/ref/${targetSlug}?ref=${referrerSlug}`;
}
