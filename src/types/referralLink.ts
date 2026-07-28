export interface ReferralLink {
  id: string;
  referrer_partner_id: string;
  target_partner_id: string;
  slug: string;
  qr_code_url: string;
  created_at: string;
}

export type ReferralLinkInput = Pick<
  ReferralLink,
  "referrer_partner_id" | "target_partner_id"
>;
