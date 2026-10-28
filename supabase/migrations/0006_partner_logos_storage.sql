-- Public bucket for partner logos. Anyone can view (logos appear on the
-- customer landing pages), only admins can upload/replace/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-logos',
  'partner-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
on conflict (id) do nothing;

create policy partner_logos_select on storage.objects for select
  using (bucket_id = 'partner-logos');

create policy partner_logos_insert on storage.objects for insert
  with check (bucket_id = 'partner-logos' and public.is_admin());

create policy partner_logos_update on storage.objects for update
  using (bucket_id = 'partner-logos' and public.is_admin())
  with check (bucket_id = 'partner-logos' and public.is_admin());

create policy partner_logos_delete on storage.objects for delete
  using (bucket_id = 'partner-logos' and public.is_admin());
