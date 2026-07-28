export type UserRole = "admin" | "partner";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  /**
   * FK to the partner record this profile logs in as. Only set when role
   * is "partner" - not in the original spec's profiles table, but required
   * to know which partner a logged-in partner user represents.
   */
  partner_id: string | null;
  created_at: string;
}
