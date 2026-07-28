export type DeviceType = "desktop" | "mobile" | "tablet";

export interface ReferralClick {
  id: string;
  referral_link_id: string;
  visitor_id: string;
  ip_address: string;
  device: DeviceType;
  user_agent: string;
  created_at: string;
}

export type ReferralClickInput = Pick<
  ReferralClick,
  "referral_link_id" | "visitor_id"
>;
