import { supabase } from "../lib/supabaseClient";
import { slugify } from "../lib/slugify";
import type { Network, NetworkInput, Partner } from "../types";

const UNIQUE_VIOLATION = "23505";

export async function getNetworks(): Promise<Network[]> {
  const { data, error } = await supabase.from("networks").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getNetworkById(id: string): Promise<Network | null> {
  const { data, error } = await supabase.from("networks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getNetworkBySlug(slug: string): Promise<Network | null> {
  const { data, error } = await supabase
    .from("networks")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createNetwork(input: NetworkInput): Promise<Network> {
  const baseSlug = slugify(input.name);

  const { data, error } = await supabase
    .from("networks")
    .insert({ ...input, slug: baseSlug })
    .select()
    .single();

  if (!error) return data;

  if (error.code === UNIQUE_VIOLATION) {
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const retry = await supabase
      .from("networks")
      .insert({ ...input, slug })
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  throw error;
}

export async function updateNetwork(
  id: string,
  input: Partial<NetworkInput>
): Promise<Network> {
  const { data, error } = await supabase
    .from("networks")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNetwork(id: string): Promise<void> {
  const { error } = await supabase.from("networks").delete().eq("id", id);
  if (error) throw error;
}

export async function getNetworkMemberCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("network_partners").select("network_id");
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.network_id, (counts.get(row.network_id) ?? 0) + 1);
  }
  return counts;
}

export async function getNetworkMemberIds(networkId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("partner_id")
    .eq("network_id", networkId);
  if (error) throw error;
  return (data ?? []).map((row) => row.partner_id);
}

export async function getNetworkMembers(networkId: string): Promise<Partner[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("partners(*)")
    .eq("network_id", networkId);
  if (error) throw error;
  return (data ?? []).map((row) => row.partners as unknown as Partner).filter(Boolean);
}

export async function getNetworksForPartner(partnerId: string): Promise<Network[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("networks(*)")
    .eq("partner_id", partnerId);
  if (error) throw error;
  return (data ?? []).map((row) => row.networks as unknown as Network).filter(Boolean);
}

export async function addPartnerToNetwork(networkId: string, partnerId: string): Promise<void> {
  const { error } = await supabase
    .from("network_partners")
    .insert({ network_id: networkId, partner_id: partnerId });
  if (error) throw error;
}

export async function removePartnerFromNetwork(
  networkId: string,
  partnerId: string
): Promise<void> {
  const { error } = await supabase
    .from("network_partners")
    .delete()
    .eq("network_id", networkId)
    .eq("partner_id", partnerId);
  if (error) throw error;
}

/**
 * Partner ids that share at least one network with the given partner
 * (excluding themself). Returns null when the partner belongs to zero
 * networks - the signal to fall back to showing every active partner,
 * matching pre-networks behavior for anyone admin hasn't organized yet.
 */
export async function getSharedNetworkPartnerIds(partnerId: string): Promise<string[] | null> {
  const { data: ownRows, error: ownError } = await supabase
    .from("network_partners")
    .select("network_id")
    .eq("partner_id", partnerId);
  if (ownError) throw ownError;

  const networkIds = (ownRows ?? []).map((row) => row.network_id);
  if (networkIds.length === 0) return null;

  const { data: memberRows, error: memberError } = await supabase
    .from("network_partners")
    .select("partner_id")
    .in("network_id", networkIds);
  if (memberError) throw memberError;

  const ids = new Set((memberRows ?? []).map((row) => row.partner_id));
  ids.delete(partnerId);
  return Array.from(ids);
}

export function buildNetworkUrl(networkSlug: string): string {
  const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, "");
  return `${siteUrl}/network/${networkSlug}`;
}
