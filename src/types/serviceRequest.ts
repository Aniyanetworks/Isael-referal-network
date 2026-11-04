export type ServiceRequestStatus = "new" | "contacted" | "won" | "lost" | "spam";

export interface ServiceRequest {
  id: string;
  partner_id: string;
  network_id: string | null;
  referrer_partner_id: string | null;
  visitor_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  message: string;
  status: ServiceRequestStatus;
  note: string;
  created_at: string;
  updated_at: string;
}
