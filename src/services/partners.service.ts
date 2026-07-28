import { supabase } from "../lib/supabaseClient";
import { slugify } from "../lib/slugify";
import type { Partner, PartnerFilters, PartnerInput } from "../types";

const UNIQUE_VIOLATION = "23505";

export async function getPartners(filters: PartnerFilters = {}): Promise<Partner[]> {
  let query = supabase.from("partners").select("*").order("company_name");
  if (filters.category_id) {
    query = query.eq("category_id", filters.category_id);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  const term = filters.search?.trim();
  if (term) {
    query = query.or(
      `company_name.ilike.%${term}%,partner_name.ilike.%${term}%,email.ilike.%${term}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const baseSlug = slugify(input.company_name);

  const { data, error } = await supabase
    .from("partners")
    .insert({ ...input, slug: baseSlug })
    .select()
    .single();

  if (!error) return data;

  if (error.code === UNIQUE_VIOLATION) {
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const retry = await supabase
      .from("partners")
      .insert({ ...input, slug })
      .select()
      .single();
    if (retry.error) throw retry.error;
    return retry.data;
  }

  throw error;
}

export async function updatePartner(
  id: string,
  input: Partial<PartnerInput>
): Promise<Partner> {
  const { data, error } = await supabase
    .from("partners")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function togglePartnerStatus(id: string): Promise<Partner> {
  const partner = await getPartnerById(id);
  if (!partner) {
    throw new Error(`Partner ${id} not found`);
  }
  return updatePartner(id, {
    status: partner.status === "active" ? "inactive" : "active",
  });
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) throw error;
}
