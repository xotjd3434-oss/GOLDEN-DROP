select policyname, cmd, roles, qual, with_check from pg_policies where (schemaname = 'public' and tablename = 'GOLDEN DROP') or (schemaname = 'storage' and tablename = 'objects');
select relrowsecurity from pg_class where oid = 'public."GOLDEN DROP"'::regclass;
select pg_get_functiondef(oid) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'is_admin';

begin;
create or replace function public.is_admin() returns boolean language sql stable security invoker set search_path = '' as $$ select coalesce(auth.uid() = 'REPLACE_WITH_ADMIN_UID'::uuid, false); $$;
alter table public."GOLDEN DROP" add column if not exists origin text;
alter table public."GOLDEN DROP" enable row level security;
drop policy if exists "golden_drop_admin_insert" on public."GOLDEN DROP";
create policy "golden_drop_admin_insert" on public."GOLDEN DROP" for insert to authenticated with check (public.is_admin());
drop policy if exists "golden_drop_image_upload" on storage.objects;
drop policy if exists "golden_drop_public_image_upload" on storage.objects;
drop policy if exists "golden_drop_admin_image_insert" on storage.objects;
drop policy if exists "golden_drop_admin_image_delete" on storage.objects;
drop policy if exists "golden_drop_admin_image_select" on storage.objects;
create policy "golden_drop_admin_image_insert" on storage.objects for insert to authenticated with check (bucket_id = 'GOLDEN DROP-images' and public.is_admin());
create policy "golden_drop_admin_image_select" on storage.objects for select to authenticated using (bucket_id = 'GOLDEN DROP-images' and public.is_admin());
create policy "golden_drop_admin_image_delete" on storage.objects for delete to authenticated using (bucket_id = 'GOLDEN DROP-images' and public.is_admin());
commit;
