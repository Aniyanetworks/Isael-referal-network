export interface Network {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export type NetworkInput = Omit<Network, "id" | "slug" | "created_at">;
