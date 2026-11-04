// Future-ready reads (Phase 5). These query real, empty-by-default tables
// (migration 0010) so the UI can show "Connect plan" / "no integration
// connected" today without error. Nothing here activates or calls Stripe
// or GoHighLevel - that's deliberately out of scope for MVP 1.0. A
// subscription/integration only ever gets a non-default row through a
// future, separate piece of work (a Stripe webhook handler, a GoHighLevel
// OAuth callback), both of which must run server-side (Supabase Edge
// Functions), never from this browser client.

import { supabase } from "../lib/supabaseClient";
import type { Integration, Plan, RewardCredit, Subscription } from "../types";

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from("plans").select("*").order("price_cents");
  if (error) throw error;
  return data ?? [];
}

export async function getSubscriptionForPartner(partnerId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getIntegrationsForPartner(partnerId: string): Promise<Integration[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("partner_id", partnerId);
  if (error) throw error;
  return data ?? [];
}

export async function getRewardCredits(partnerId: string): Promise<RewardCredit[]> {
  const { data, error } = await supabase
    .from("reward_credits")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function getRewardBalanceCents(credits: RewardCredit[]): number {
  return credits.reduce((sum, c) => sum + c.amount_cents, 0);
}

/** The partner's current plan code ('connect' if they have no active
 * subscription) via the partner_plan_code() SQL function (migration 0010). */
export async function getPartnerPlanCode(partnerId: string): Promise<string> {
  const { data, error } = await supabase.rpc("partner_plan_code", { p_partner_id: partnerId });
  if (error) throw error;
  return data as string;
}
