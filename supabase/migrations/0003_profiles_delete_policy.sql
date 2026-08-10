-- Admins need to be able to remove a partner signup (reject/cancel it)
-- from the Partner Approvals screen. profiles had no delete policy at all,
-- so RLS was silently blocking every delete attempt.
create policy profiles_delete on profiles for delete using (is_admin());
