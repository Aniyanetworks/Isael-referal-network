import { supabase } from "../lib/supabaseClient";
import type { DeviceType, PartnerReferralClick } from "../types";

/** Builds the shareable, permanent referral URL for a partner. */
export function buildPartnerReferralUrl(partnerSlug: string): string {
  const siteUrl = import.meta.env.VITE_SITE_URL.replace(/\/+$/, "");
  return `${siteUrl}/ref/${partnerSlug}`;
}

export interface RecordPartnerClickInput {
  partner_id: string;
  visitor_id: string;
  device: DeviceType;
  user_agent: string;
  ip_address: string;
}

/**
 * Records a click on a partner's referral link via a SECURITY DEFINER RPC
 * (see migration 0002) that checks-and-inserts atomically: the same visitor
 * clicking the same partner's link again within 7 days returns the existing
 * row instead of creating a new one, so refreshes/re-shares within that
 * window don't inflate analytics - after 7 days it counts again.
 */
export async function recordPartnerClick(
  input: RecordPartnerClickInput
): Promise<PartnerReferralClick> {
  const { data, error } = await supabase.rpc("record_partner_click", {
    p_partner_id: input.partner_id,
    p_visitor_id: input.visitor_id,
    p_device: input.device,
    p_user_agent: input.user_agent,
    p_ip_address: input.ip_address,
  });
  if (error) throw error;
  return data as PartnerReferralClick;
}

/** Admin-only (enforced by RLS): clears a partner's click history. */
export async function resetPartnerClicks(partnerId: string): Promise<void> {
  const { error } = await supabase
    .from("partner_referral_clicks")
    .delete()
    .eq("partner_id", partnerId);
  if (error) throw error;
}

// --- Aggregation for dashboards/analytics -----------------------------------
// RLS already scopes these queries: an admin session sees every click, a
// partner session only sees their own. Same functions serve both the admin
// analytics page and a partner's own dashboard.

export interface DateRange {
  from?: string;
  to?: string;
}

async function getClicks(range: DateRange = {}): Promise<PartnerReferralClick[]> {
  let query = supabase.from("partner_referral_clicks").select("*");
  if (range.from) query = query.gte("created_at", range.from);
  if (range.to) query = query.lte("created_at", range.to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getRecentClicks(limit = 10): Promise<PartnerReferralClick[]> {
  const { data, error } = await supabase
    .from("partner_referral_clicks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface AdminOverview {
  totalPartners: number;
  activePartners: number;
  totalClicks: number;
  uniqueClicks: number;
}

export async function getAdminOverview(range: DateRange = {}): Promise<AdminOverview> {
  const [{ count: totalPartners }, { count: activePartners }, clicks] = await Promise.all([
    supabase.from("partners").select("*", { count: "exact", head: true }),
    supabase.from("partners").select("*", { count: "exact", head: true }).eq("status", "active"),
    getClicks(range),
  ]);

  return {
    totalPartners: totalPartners ?? 0,
    activePartners: activePartners ?? 0,
    totalClicks: clicks.length,
    uniqueClicks: new Set(clicks.map((c) => c.visitor_id)).size,
  };
}

export interface PartnerOwnOverview {
  clicksGenerated: number;
  clicksThisMonth: number;
}

export async function getPartnerOwnOverview(partnerId: string): Promise<PartnerOwnOverview> {
  const clicks = await getClicks();
  const ownClicks = clicks.filter((c) => c.partner_id === partnerId);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const clicksThisMonth = ownClicks.filter((c) => new Date(c.created_at) >= monthStart).length;

  return {
    clicksGenerated: ownClicks.length,
    clicksThisMonth,
  };
}

export type ClickGranularity = "day" | "week" | "month";

export interface ClickTimeseriesPoint {
  bucket: string;
  count: number;
}

function bucketKey(date: Date, granularity: ClickGranularity): string {
  if (granularity === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (granularity === "week") {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000);
    const week = Math.ceil((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}

export async function getClicksTimeseries(
  range: DateRange = {},
  granularity: ClickGranularity = "day"
): Promise<ClickTimeseriesPoint[]> {
  const clicks = await getClicks(range);
  const buckets = new Map<string, number>();
  for (const click of clicks) {
    const key = bucketKey(new Date(click.created_at), granularity);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export interface PartnerClickCount {
  partner_id: string;
  clicks: number;
}

export async function getPartnerClickCounts(range: DateRange = {}): Promise<PartnerClickCount[]> {
  const clicks = await getClicks(range);
  const counts = new Map<string, number>();
  for (const click of clicks) {
    counts.set(click.partner_id, (counts.get(click.partner_id) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([partner_id, clicks]) => ({ partner_id, clicks }));
}
