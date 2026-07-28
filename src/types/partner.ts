export type PartnerStatus = "active" | "inactive";

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
}

export interface Partner {
  id: string;
  company_name: string;
  partner_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  category_id: string;
  slug: string;
  description: string;
  logo_url: string;
  social_links: SocialLinks;
  status: PartnerStatus;
  created_at: string;
  updated_at: string;
}

export type PartnerInput = Omit<
  Partner,
  "id" | "slug" | "created_at" | "updated_at"
>;

export interface PartnerFilters {
  search?: string;
  category_id?: string;
  status?: PartnerStatus;
}
