-- Staff-admin helper: SECURITY DEFINER so it bypasses RLS (no recursion)
create or replace function public.is_evidly_staff_admin()
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (
  select 1 from user_profiles
  where id = auth.uid() and evidly_staff_role in ('super_admin','admin')
); $$;

-- Staff-admins can read all staff profiles
drop policy if exists up_staff_admin_read_all on public.user_profiles;
create policy up_staff_admin_read_all on public.user_profiles
  for select using ( public.is_evidly_staff_admin() );
