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
  // Two plain queries rather than a single PostgREST embedded-resource
  // join (`.select("partners(*)")`): with three overlapping RLS policies
  // on network_partners, the embedded join was triggering a Postgres
  // recursion error for networks with real rows, even after the policy
  // fix in migration 0011 - this sidesteps that failure mode entirely.
  const partnerIds = await getNetworkMemberIds(networkId);
  if (partnerIds.length === 0) return [];

  const { data, error } = await supabase.from("partners").select("*").in("id", partnerIds);
  if (error) throw error;
  return data ?? [];
}

export async function getNetworksForPartner(partnerId: string): Promise<Network[]> {
  // Two plain queries rather than an embedded-resource join - see
  // getNetworkMembers above.
  const { data: memberships, error } = await supabase
    .from("network_partners")
    .select("network_id")
    .eq("partner_id", partnerId)
    .eq("status", "active");
  if (error) throw error;
  const networkIds = (memberships ?? []).map((m) => m.network_id);
  if (networkIds.length === 0) return [];

  const { data, error: networksError } = await supabase
    .from("networks")
    .select("*")
    .in("id", networkIds);
  if (networksError) throw networksError;
  return data ?? [];
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
 * owner/admin of that network, their own row always). Two plain queries
 * rather than an embedded-resource join - see getNetworkMembers above. */
export async function getNetworkMembershipsDetailed(
  networkId: string
): Promise<NetworkMembershipWithPartner[]> {
  const { data: memberships, error } = await supabase
    .from("network_partners")
    .select("*")
    .eq("network_id", networkId);
  if (error) throw error;
  if (!memberships || memberships.length === 0) return [];

  const partnerIds = memberships.map((m) => m.partner_id);
  const { data: partners, error: partnersError } = await supabase
    .from("partners")
    .select("*")
    .in("id", partnerIds);
  if (partnersError) throw partnersError;

  const partnerById = new Map((partners ?? []).map((p) => [p.id, p]));
  return memberships
    .map((m) => {
      const partner = partnerById.get(m.partner_id);
      return partner ? { ...m, partners: partner } : null;
    })
    .filter((row): row is NetworkMembershipWithPartner => row !== null);
}

/** Networks this partner owns or admins (active membership only) - the
 * scope for everything an "owner" should be notified about below. */
async function getManagedNetworks(partnerId: string): Promise<Network[]> {
  const { data: managed, error: managedError } = await supabase
    .from("network_partners")
    .select("network_id")
    .eq("partner_id", partnerId)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);
  if (managedError) throw managedError;

  const networkIds = (managed ?? []).map((m) => m.network_id);
  if (networkIds.length === 0) return [];

  const { data: networks, error: networksError } = await supabase
    .from("networks")
    .select("*")
    .in("id", networkIds);
  if (networksError) throw networksError;
  return networks ?? [];
}

/** Count of join requests awaiting this partner's approval, across every
 * group they own or admin - drives the "My Groups" sidebar badge. */
export async function getPendingRequestCountForPartner(partnerId: string): Promise<number> {
  const managed = await getManagedNetworks(partnerId);
  if (managed.length === 0) return 0;

  const { count, error } = await supabase
    .from("network_partners")
    .select("*", { count: "exact", head: true })
    .in(
      "network_id",
      managed.map((n) => n.id)
    )
    .eq("status", "requested");
  if (error) throw error;
  return count ?? 0;
}

/** Pending join-request count per network, for showing a hint directly on
 * each group's card without expanding "Manage group" to find out. */
export async function getPendingRequestCountsByNetwork(
  networkIds: string[]
): Promise<Record<string, number>> {
  if (networkIds.length === 0) return {};

  const { data, error } = await supabase
    .from("network_partners")
    .select("network_id")
    .in("network_id", networkIds)
    .eq("status", "requested");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.network_id] = (counts[row.network_id] ?? 0) + 1;
  }
  return counts;
}

export interface OwnerNotification {
  /** "requested" needs the owner to act (approve/reject); "joined" is just
   * an FYI for an open group someone joined instantly. */
  type: "requested" | "joined";
  network_id: string;
  network_name: string;
  partner_id: string;
  partner_name: string;
  at: string;
}

/** Everything an owner/admin should be notified about: pending join
 * requests on their invite-only/request-to-join groups, and recent
 * instant joins on their open groups. No dedicated notifications table -
 * this is derived straight from network_partners each time it's read. */
export async function getOwnerNotifications(partnerId: string): Promise<OwnerNotification[]> {
  const managed = await getManagedNetworks(partnerId);
  if (managed.length === 0) return [];

  const networkById = new Map(managed.map((n) => [n.id, n]));
  const networkIds = managed.map((n) => n.id);
  const openNetworkIds = managed.filter((n) => n.join_mode === "open").map((n) => n.id);

  const { data: requested, error: requestedError } = await supabase
    .from("network_partners")
    .select("network_id, partner_id, created_at")
    .in("network_id", networkIds)
    .eq("status", "requested")
    .order("created_at", { ascending: false });
  if (requestedError) throw requestedError;

  let joined: { network_id: string; partner_id: string; created_at: string }[] = [];
  if (openNetworkIds.length > 0) {
    const { data, error } = await supabase
      .from("network_partners")
      .select("network_id, partner_id, created_at")
      .in("network_id", openNetworkIds)
      .eq("status", "active")
      .neq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    joined = data ?? [];
  }

  const rows = [...(requested ?? []), ...joined];
  if (rows.length === 0) return [];

  const partnerIds = Array.from(new Set(rows.map((r) => r.partner_id)));
  const { data: partners, error: partnersError } = await supabase
    .from("partners")
    .select("id, company_name")
    .in("id", partnerIds);
  if (partnersError) throw partnersError;
  const nameByPartnerId = new Map((partners ?? []).map((p) => [p.id, p.company_name as string]));

  const items: OwnerNotification[] = [
    ...(requested ?? []).map((r) => ({
      type: "requested" as const,
      network_id: r.network_id,
      network_name: networkById.get(r.network_id)?.name ?? "",
      partner_id: r.partner_id,
      partner_name: nameByPartnerId.get(r.partner_id) ?? "A business",
      at: r.created_at,
    })),
    ...joined.map((r) => ({
      type: "joined" as const,
      network_id: r.network_id,
      network_name: networkById.get(r.network_id)?.name ?? "",
      partner_id: r.partner_id,
      partner_name: nameByPartnerId.get(r.partner_id) ?? "A business",
      at: r.created_at,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return items.slice(0, 30);
}

export interface NetworkMembershipWithNetwork extends NetworkMembership {
  networks: Network;
}

/** Every membership row for a partner, any status - active groups, pending
 * invites received and pending requests they've sent, all in one query. */
export async function getMembershipsForPartner(
  partnerId: string
): Promise<NetworkMembershipWithNetwork[]> {
  // Two plain queries rather than an embedded-resource join - see
  // getNetworkMembers above.
  const { data: memberships, error } = await supabase
    .from("network_partners")
    .select("*")
    .eq("partner_id", partnerId)
    .neq("status", "removed");
  if (error) throw error;
  if (!memberships || memberships.length === 0) return [];

  const networkIds = memberships.map((m) => m.network_id);
  const { data: networks, error: networksError } = await supabase
    .from("networks")
    .select("*")
    .in("id", networkIds);
  if (networksError) throw networksError;

  const networkById = new Map((networks ?? []).map((n) => [n.id, n]));
  return memberships
    .map((m) => {
      const network = networkById.get(m.network_id);
      return network ? { ...m, networks: network } : null;
    })
    .filter((row): row is NetworkMembershipWithNetwork => row !== null);
}
