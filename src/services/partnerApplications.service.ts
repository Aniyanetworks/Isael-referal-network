import { supabase } from "../lib/supabaseClient";
import type { Partner } from "../types";

export interface PartnerApplicationInput {
  company_name: string;
  partner_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  category_id: string;
  description: string;
  logo_url: string;
}

/**
 * Submits a new partner application: creates a real (status='pending')
 * partner row and links it to the caller's own profile, atomically, via a
 * SECURITY DEFINER RPC (see migration 0004) - a fresh signup has no
 * permission to insert into partners or update profiles directly.
 */
export async function applyAsPartner(input: PartnerApplicationInput): Promise<Partner> {
  const { data, error } = await supabase.rpc("apply_as_partner", {
    p_company_name: input.company_name,
    p_partner_name: input.partner_name,
    p_email: input.email,
    p_phone: input.phone,
    p_website: input.website,
    p_address: input.address,
    p_category_id: input.category_id,
    p_description: input.description,
    p_logo_url: input.logo_url,
  });
  if (error) throw error;
  return data as Partner;
}
