// Future-ready types (Phase 5). Nothing in this file is wired to Stripe or
// GoHighLevel yet - see src/services/billing.service.ts.

export type PlanCode = "connect" | "growth" | "pro_ai";

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  price_cents: number;
  billing_interval: "month" | "year";
  features: string[];
  created_at: string;
}

export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  partner_id: string;
  plan_id: string;
  provider: "stripe";
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export type IntegrationProvider = "gohighlevel";
export type IntegrationStatus = "not_connected" | "connected" | "error";

export interface Integration {
  id: string;
  partner_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  external_account_id: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardCredit {
  id: string;
  partner_id: string;
  amount_cents: number;
  reason: string;
  related_service_request_id: string | null;
  created_at: string;
}
