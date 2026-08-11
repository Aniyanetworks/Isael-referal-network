-- Self-serve signup used to only create a login with no business info,
-- leaving admin to manually pre-create the partner and link the two -
-- signup could never actually produce a new partner application. This lets
-- signup submit full business details, creating a real (status='pending')
-- partner row up front, linked to the signer-upper's profile immediately.
-- Admin then approves (-> 'active') or rejects (deletes both) from the
-- Partner Approvals screen.

alter table partners drop constraint partners_status_check;
alter table partners add constraint partners_status_check
  check (status in ('active', 'inactive', 'pending'));

create or replace function public.apply_as_partner(
  p_company_name text,
  p_partner_name text,
  p_email text,
  p_phone text,
  p_website text,
  p_address text,
  p_category_id uuid,
  p_description text,
  p_logo_url text
)
returns partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_result partners;
  v_base_slug text;
  v_slug text;
  v_attempt int := 0;
begin
  if (select partner_id from profiles where id = auth.uid()) is not null then
    raise exception 'This account is already linked to a business';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(p_company_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'partner';
  end if;
  v_slug := v_base_slug;

  loop
    begin
      insert into partners (
        company_name, partner_name, email, phone, website, address,
        category_id, description, logo_url, status, slug
      ) values (
        p_company_name, p_partner_name, p_email, p_phone, p_website, p_address,
        p_category_id, coalesce(p_description, ''), coalesce(p_logo_url, ''), 'pending', v_slug
      )
      returning id into v_partner_id;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 4);
      if v_attempt > 5 then
        raise;
      end if;
    end;
  end loop;

  update profiles set partner_id = v_partner_id where id = auth.uid();

  select * into v_result from partners where id = v_partner_id;
  return v_result;
end;
$$;

grant execute on function public.apply_as_partner(
  text, text, text, text, text, text, uuid, text, text
) to authenticated;
