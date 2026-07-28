import { supabase } from "../lib/supabaseClient";
import type { DeviceType, ReferralClick } from "../types";

const UNIQUE_VIOLATION = "23505";

export interface ReferralClickFilters {
  referral_link_id?: string;
  from?: string;
  to?: string;
}

export async function getReferralClicks(
  filters: ReferralClickFilters = {}
): Promise<ReferralClick[]> {
  let query = supabase
    .from("referral_clicks")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.referral_link_id) {
    query = query.eq("referral_link_id", filters.referral_link_id);
  }
  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface RecordClickInput {
  referral_link_id: string;
  visitor_id: string;
  device: DeviceType;
  user_agent: string;
  ip_address: string;
}

/**
 * Records a click. The DB has a unique constraint on
 * (referral_link_id, visitor_id), so a visitor refreshing/re-clicking the
 * same referral link never inflates analytics - a conflict just means the
 * click was already recorded, and we return that existing row instead.
 */
export async function recordClick(input: RecordClickInput): Promise<ReferralClick> {
  const { data, error } = await supabase
    .from("referral_clicks")
    .insert(input)
    .select()
    .single();

  if (!error) return data;

  if (error.code === UNIQUE_VIOLATION) {
    const { data: existing, error: fetchError } = await supabase
      .from("referral_clicks")
      .select("*")
      .eq("referral_link_id", input.referral_link_id)
      .eq("visitor_id", input.visitor_id)
      .single();
    if (fetchError) throw fetchError;
    return existing;
  }

  throw error;
}

// --- Aggregation for dashboards/analytics -----------------------------------
// RLS already scopes these queries: an admin session sees every click, a
// partner session only sees clicks on links where they're the referrer. So
// the same functions below serve both the admin analytics page and a
// partner's own dashboard without needing separate code paths.

export interface DateRange {
  from?: string;
  to?: string;
}

interface ClickWithLink extends ReferralClick {
  referral_links: { referrer_partner_id: string; target_partner_id: string } | null;
}

async function getClicksWithLinks(range: DateRange = {}): Promise<ClickWithLink[]> {
  let query = supabase
    .from("referral_clicks")
    .select("*, referral_links(referrer_partner_id, target_partner_id)");
  if (range.from) query = query.gte("created_at", range.from);
  if (range.to) query = query.lte("created_at", range.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ClickWithLink[];
}

export async function getRecentClicks(limit = 10): Promise<ClickWithLink[]> {
  const { data, error } = await supabase
    .from("referral_clicks")
    .select("*, referral_links(referrer_partner_id, target_partner_id)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ClickWithLink[];
}

export interface AdminOverview {
  totalPartners: number;
  activePartners: number;
  totalClicks: number;
  uniqueClicks: number;
  totalReferralLinks: number;
}

export async function getAdminOverview(range: DateRange = {}): Promise<AdminOverview> {
  const [{ count: totalPartners }, { count: activePartners }, { count: totalReferralLinks }, clicks] =
    await Promise.all([
      supabase.from("partners").select("*", { count: "exact", head: true }),
      supabase.from("partners").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("referral_links").select("*", { count: "exact", head: true }),
      getClicksWithLinks(range),
    ]);

  return {
    totalPartners: totalPartners ?? 0,
    activePartners: activePartners ?? 0,
    totalClicks: clicks.length,
    uniqueClicks: new Set(clicks.map((c) => c.visitor_id)).size,
    totalReferralLinks: totalReferralLinks ?? 0,
  };
}

export interface PartnerOverview {
  linksShared: number;
  clicksGenerated: number;
  clicksThisMonth: number;
}

export async function getPartnerOverview(partnerId: string): Promise<PartnerOverview> {
  const [{ count: linksShared }, clicks] = await Promise.all([
    supabase
      .from("referral_links")
      .select("*", { count: "exact", head: true })
      .eq("referrer_partner_id", partnerId),
    getClicksWithLinks(),
  ]);

  const ownClicks = clicks.filter((c) => c.referral_links?.referrer_partner_id === partnerId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const clicksThisMonth = ownClicks.filter(
    (c) => new Date(c.created_at) >= monthStart
  ).length;

  return {
    linksShared: linksShared ?? 0,
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
  const clicks = await getClicksWithLinks(range);
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

export async function getTargetPartnerClickCounts(
  range: DateRange = {}
): Promise<PartnerClickCount[]> {
  const clicks = await getClicksWithLinks(range);
  const counts = new Map<string, number>();
  for (const click of clicks) {
    const targetId = click.referral_links?.target_partner_id;
    if (!targetId) continue;
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([partner_id, clicks]) => ({ partner_id, clicks }));
}

export async function getReferrerPartnerClickCounts(
  range: DateRange = {}
): Promise<PartnerClickCount[]> {
  const clicks = await getClicksWithLinks(range);
  const counts = new Map<string, number>();
  for (const click of clicks) {
    const referrerId = click.referral_links?.referrer_partner_id;
    if (!referrerId) continue;
    counts.set(referrerId, (counts.get(referrerId) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([partner_id, clicks]) => ({ partner_id, clicks }));
}

export interface ReferralMatrixRow {
  referrer_partner_id: string;
  target_partner_id: string;
  clicks: number;
}

export async function getReferralMatrix(range: DateRange = {}): Promise<ReferralMatrixRow[]> {
  const clicks = await getClicksWithLinks(range);
  const counts = new Map<string, ReferralMatrixRow>();
  for (const click of clicks) {
    const link = click.referral_links;
    if (!link) continue;
    const key = `${link.referrer_partner_id}::${link.target_partner_id}`;
    const existing = counts.get(key);
    if (existing) {
      existing.clicks += 1;
    } else {
      counts.set(key, {
        referrer_partner_id: link.referrer_partner_id,
        target_partner_id: link.target_partner_id,
        clicks: 1,
      });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.clicks - a.clicks);
}
