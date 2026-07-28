export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export type CategoryInput = Omit<Category, "id" | "created_at">;
