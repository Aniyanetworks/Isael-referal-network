import type { DeviceType } from "./referralClick";

/**
 * A click on a partner's own referral link (the simplified, one-link-per-
 * partner model). See src/services/partnerReferrals.service.ts.
 */
export interface PartnerReferralClick {
  id: string;
  partner_id: string;
  visitor_id: string;
  ip_address: string | null;
  device: DeviceType | null;
  user_agent: string | null;
  created_at: string;
}
