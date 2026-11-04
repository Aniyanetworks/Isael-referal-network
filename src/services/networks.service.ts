import { supabase } from "../lib/supabaseClient";
import { slugify } from "../lib/slugify";
import type {
  Network,
  NetworkInput,
  NetworkMembership,
  NetworkMembershipRole,
  Partner,
} from "../types";

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

/** Admin-only creation (direct insert; admin bypasses RLS). Self-service
 * creation goes through createGroup below instead, which is limit-checked. */
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
    .update({ ...input, updated_at: new Date().toISOString() })
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
  const { data, error } = await supabase
    .from("network_partners")
    .select("network_id")
    .eq("status", "active");
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
    .eq("network_id", networkId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((row) => row.partner_id);
}

export async function getNetworkMembers(networkId: string): Promise<Partner[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("partners(*)")
    .eq("network_id", networkId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((row) => row.partners as unknown as Partner).filter(Boolean);
}

export async function getNetworksForPartner(partnerId: string): Promise<Network[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("networks(*)")
    .eq("partner_id", partnerId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((row) => row.networks as unknown as Network).filter(Boolean);
}

/** Admin add-member (direct upsert; admin bypasses RLS). Reinstates a
 * previously removed member instead of erroring on the row that's still
 * there from before. */
export async function addPartnerToNetwork(networkId: string, partnerId: string): Promise<void> {
  const { error } = await supabase
    .from("network_partners")
    .upsert(
      { network_id: networkId, partner_id: partnerId, status: "active", role: "member" },
      { onConflict: "network_id,partner_id" }
    );
  if (error) throw error;
}

/** Admin remove-member. Soft-delete (status='removed'), consistent with the
 * self-service remove/leave flow - keeps history and lets a later re-add
 * reuse the same row instead of hitting a duplicate-key error. */
export async function removePartnerFromNetwork(
  networkId: string,
  partnerId: string
): Promise<void> {
  const { error } = await supabase
    .from("network_partners")
    .update({ status: "removed", updated_at: new Date().toISOString() })
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
    .eq("partner_id", partnerId)
    .eq("status", "active");
  if (ownError) throw ownError;

  const networkIds = (ownRows ?? []).map((row) => row.network_id);
  if (networkIds.length === 0) return null;

  const { data: memberRows, error: memberError } = await supabase
    .from("network_partners")
    .select("partner_id")
    .in("network_id", networkIds)
    .eq("status", "active");
  if (memberError) throw memberError;

  const ids = new Set((memberRows ?? []).map((row) => row.partner_id));
  ids.delete(partnerId);
  return Array.from(ids);
}

export function buildNetworkUrl(networkSlug: string): string {
  const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, "");
  return `${siteUrl}/network/${networkSlug}`;
}

// --- Self-service group management (Phase 2) --------------------------------

export interface GroupInput {
  name: string;
  description: string;
  join_mode: Network["join_mode"];
}

/** Self-service group creation via RPC: only an approved business may
 * create one, capped at 5 owned groups (see migration 0008). */
export async function createGroup(input: GroupInput): Promise<Network> {
  const { data, error } = await supabase.rpc("create_network", {
    p_name: input.name,
    p_description: input.description,
    p_join_mode: input.join_mode,
  });
  if (error) throw error;
  return data as Network;
}

export async function inviteToNetwork(
  networkId: string,
  partnerId: string
): Promise<NetworkMembership> {
  const { data, error } = await supabase.rpc("invite_to_network", {
    p_network_id: networkId,
    p_partner_id: partnerId,
  });
  if (error) throw error;
  return data as NetworkMembership;
}

export async function requestToJoinNetwork(networkId: string): Promise<NetworkMembership> {
  const { data, error } = await supabase.rpc("request_to_join_network", {
    p_network_id: networkId,
  });
  if (error) throw error;
  return data as NetworkMembership;
}

export async function joinOpenNetwork(networkId: string): Promise<NetworkMembership> {
  const { data, error } = await supabase.rpc("join_open_network", { p_network_id: networkId });
  if (error) throw error;
  return data as NetworkMembership;
}

/** Accept/decline your own invite, or (as an owner/admin) approve/reject
 * someone else's join request - same RPC, the server tells the two cases
 * apart by who's calling and what the target row's status is. */
export async function respondToNetworkMembership(
  networkId: string,
  partnerId: string,
  approve: boolean
): Promise<NetworkMembership> {
  const { data, error } = await supabase.rpc("respond_to_network_membership", {
    p_network_id: networkId,
    p_partner_id: partnerId,
    p_approve: approve,
  });
  if (error) throw error;
  return data as NetworkMembership;
}

/** Remove a member (as owner/admin) or leave a group yourself - same RPC
 * for both; an owner can't remove themself this way (see migration 0008). */
export async function removeNetworkMemberSelfService(
  networkId: string,
  partnerId: string
): Promise<void> {
  const { error } = await supabase.rpc("remove_network_member", {
    p_network_id: networkId,
    p_partner_id: partnerId,
  });
  if (error) throw error;
}

export async function setNetworkMemberRole(
  networkId: string,
  partnerId: string,
  role: Extract<NetworkMembershipRole, "admin" | "member">
): Promise<NetworkMembership> {
  const { data, error } = await supabase.rpc("set_network_member_role", {
    p_network_id: networkId,
    p_partner_id: partnerId,
    p_role: role,
  });
  if (error) throw error;
  return data as NetworkMembership;
}

export interface NetworkMembershipWithPartner extends NetworkMembership {
  partners: Partner;
}

/** Every membership row for a network, any status - RLS limits what comes
 * back to what the caller may see (active rows to anyone, every row to an
 * owner/admin of that network, their own row always). */
export async function getNetworkMembershipsDetailed(
  networkId: string
): Promise<NetworkMembershipWithPartner[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("*, partners(*)")
    .eq("network_id", networkId);
  if (error) throw error;
  return (data ?? []) as unknown as NetworkMembershipWithPartner[];
}

export interface NetworkMembershipWithNetwork extends NetworkMembership {
  networks: Network;
}

/** Every membership row for a partner, any status - active groups, pending
 * invites received and pending requests they've sent, all in one query. */
export async function getMembershipsForPartner(
  partnerId: string
): Promise<NetworkMembershipWithNetwork[]> {
  const { data, error } = await supabase
    .from("network_partners")
    .select("*, networks(*)")
    .eq("partner_id", partnerId)
    .neq("status", "removed");
  if (error) throw error;
  return (data ?? []) as unknown as NetworkMembershipWithNetwork[];
}
