export type ReferralEventType = "directory_visit" | "profile_view" | "contact_click" | "service_request";
export type ContactClickType =
  | "call"
  | "website"
  | "directions"
  | "save_contact"
  | "facebook"
  | "instagram"
  | "linkedin";

export interface ReferralEvent {
  id: string;
  event_type: ReferralEventType;
  contact_type: ContactClickType | null;
  target_partner_id: string | null;
  network_id: string | null;
  referrer_partner_id: string | null;
  service_request_id: string | null;
  visitor_id: string;
  device: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}
