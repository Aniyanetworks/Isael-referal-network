import { supabase } from "../lib/supabaseClient";
import { slugify } from "../lib/slugify";
import type { Category, CategoryInput } from "../types";

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const slug = input.slug || slugify(input.name);
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>
): Promise<Category> {
  const patch: Partial<CategoryInput> = { ...input };
  if (input.name && !input.slug) {
    patch.slug = slugify(input.name);
  }
  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
