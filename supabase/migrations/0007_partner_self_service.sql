-- Phase 1 (Company Profiles): companies can edit their own profile and
-- upload their own logo, instead of needing an admin for either. Additive
-- only - existing admin capabilities, data and the partners_write policy
-- are untouched.

-- PARTNERS: a partner can update their own row -----------------------------
-- (partners_write already lets admin do everything; this adds a second,
-- permissive policy scoped to the caller's own partner_id.)
create policy partners_self_update on partners for update
  using (id = (select partner_id from profiles where id = auth.uid()))
  with check (id = (select partner_id from profiles where id = auth.uid()));

-- Even with the policy above, a non-admin must never be able to flip their
-- own status to 'active' or change their slug (which would break printed
-- QR codes/links). RLS policies can't diff OLD vs NEW, so this is enforced
-- with a trigger instead: for any update made by a non-admin, slug and
-- status are silently pinned back to their previous value. Admin writes
-- (is_admin() = true) pass through unchanged.
create or replace function public.protect_partner_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    new.slug := old.slug;
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger partners_protect_admin_fields
  before update on partners
  for each row execute function public.protect_partner_admin_fields();

-- STORAGE: self-service logo upload -----------------------------------------
-- 0006 restricted partner-logos uploads to admins only, which blocks the
-- self-signup form (no partner/session may exist yet) and a logged-in
-- partner editing their own logo. Logos are low-risk (image-only, 2MB cap,
-- public bucket already), so:
--   - insert: anyone (covers the signup form, before an account exists)
--   - update/delete: the uploader (via storage's own `owner` column) or admin
drop policy if exists partner_logos_insert on storage.objects;
drop policy if exists partner_logos_update on storage.objects;
drop policy if exists partner_logos_delete on storage.objects;

create policy partner_logos_insert on storage.objects for insert
  with check (bucket_id = 'partner-logos');

create policy partner_logos_update on storage.objects for update
  using (bucket_id = 'partner-logos' and (owner = auth.uid() or public.is_admin()))
  with check (bucket_id = 'partner-logos' and (owner = auth.uid() or public.is_admin()));

create policy partner_logos_delete on storage.objects for delete
  using (bucket_id = 'partner-logos' and (owner = auth.uid() or public.is_admin()));
