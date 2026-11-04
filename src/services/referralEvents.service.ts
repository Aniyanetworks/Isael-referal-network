import { supabase } from "../lib/supabaseClient";
import type { ContactClickType, ServiceRequest, ServiceRequestStatus } from "../types";

export interface RecordEventInput {
  eventType: "directory_visit" | "profile_view" | "contact_click";
  contactType?: ContactClickType;
  targetPartnerId?: string | null;
  networkId?: string | null;
  referrerPartnerId?: string | null;
  visitorId: string;
  device: string;
  userAgent: string;
  ipAddress: string;
}

/**
 * Fire-and-forget by design at every call site: a failed analytics write
 * must never block or break the page a customer is actually using. Errors
 * are swallowed here (not re-thrown) - see record_referral_event in
 * migration 0009 for the server-side dedupe rules.
 */
export async function recordReferralEvent(input: RecordEventInput): Promise<void> {
  const { error } = await supabase.rpc("record_referral_event", {
    p_event_type: input.eventType,
    p_contact_type: input.contactType ?? null,
    p_target_partner_id: input.targetPartnerId ?? null,
    p_network_id: input.networkId ?? null,
    p_referrer_partner_id: input.referrerPartnerId ?? null,
    p_visitor_id: input.visitorId,
    p_device: input.device,
    p_user_agent: input.userAgent,
    p_ip_address: input.ipAddress,
  });
  if (error) {
    console.warn("recordReferralEvent failed:", error.message);
  }
}

export interface SubmitServiceRequestInput {
  partnerId: string;
  networkId?: string | null;
  referrerPartnerId?: string | null;
  visitorId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  message?: string;
  device: string;
  userAgent: string;
  ipAddress: string;
}

export async function submitServiceRequest(input: SubmitServiceRequestInput): Promise<string> {
  const { data, error } = await supabase.rpc("submit_service_request", {
    p_partner_id: input.partnerId,
    p_network_id: input.networkId ?? null,
    p_referrer_partner_id: input.referrerPartnerId ?? null,
    p_visitor_id: input.visitorId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_customer_email: input.customerEmail ?? "",
    p_message: input.message ?? "",
    p_device: input.device,
    p_user_agent: input.userAgent,
    p_ip_address: input.ipAddress,
  });
  if (error) throw error;
  return data as string;
}

// --- Lead inbox (partner-facing) --------------------------------------------

export async function getLeadsForPartner(partnerId: string): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Admin-only (enforced by RLS): every lead across the whole platform. */
export async function getAllLeads(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateServiceRequest(
  id: string,
  input: { status?: ServiceRequestStatus; note?: string }
): Promise<ServiceRequest> {
  const { data, error } = await supabase
    .from("service_requests")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Referral-event counts (for "referrer sees counts only") ---------------

export interface ReferralEventCounts {
  directoryVisits: number;
  profileViews: number;
  contactClicks: number;
  serviceRequests: number;
}

function summarize(rows: { event_type: string }[]): ReferralEventCounts {
  return {
    directoryVisits: rows.filter((r) => r.event_type === "directory_visit").length,
    profileViews: rows.filter((r) => r.event_type === "profile_view").length,
    contactClicks: rows.filter((r) => r.event_type === "contact_click").length,
    serviceRequests: rows.filter((r) => r.event_type === "service_request").length,
  };
}

/** Events where this partner is the one who referred the visitor - RLS
 * (migration 0009) returns these rows with no customer PII attached, which
 * is exactly what "a referrer sees counts only" requires. */
export async function getReferralEventCountsAsReferrer(
  partnerId: string
): Promise<ReferralEventCounts> {
  const { data, error } = await supabase
    .from("referral_events")
    .select("event_type")
    .eq("referrer_partner_id", partnerId);
  if (error) throw error;
  return summarize(data ?? []);
}

/** Events where this partner was the one visited/contacted. */
export async function getReferralEventCountsAsTarget(
  partnerId: string
): Promise<ReferralEventCounts> {
  const { data, error } = await supabase
    .from("referral_events")
    .select("event_type")
    .eq("target_partner_id", partnerId);
  if (error) throw error;
  return summarize(data ?? []);
}

/** Events attributed to a group - for a group owner/admin's "group total". */
export async function getReferralEventCountsForNetwork(
  networkId: string
): Promise<ReferralEventCounts> {
  const { data, error } = await supabase
    .from("referral_events")
    .select("event_type")
    .eq("network_id", networkId);
  if (error) throw error;
  return summarize(data ?? []);
}

/** Count-only query for the sidebar's "Leads" badge - cheaper than fetching
 * every lead just to count the new ones. */
export async function getNewLeadsCountForPartner(partnerId: string): Promise<number> {
  const { count, error } = await supabase
    .from("service_requests")
    .select("*", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}
