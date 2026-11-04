export type NetworkJoinMode = "invite_only" | "request_to_join" | "open";
export type NetworkMembershipStatus = "invited" | "requested" | "active" | "removed";
export type NetworkMembershipRole = "owner" | "admin" | "member";

export interface Network {
  id: string;
  name: string;
  slug: string;
  description: string;
  join_mode: NetworkJoinMode;
  owner_partner_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NetworkInput = Pick<Network, "name" | "description" | "join_mode">;

export interface NetworkMembership {
  network_id: string;
  partner_id: string;
  status: NetworkMembershipStatus;
  role: NetworkMembershipRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}
