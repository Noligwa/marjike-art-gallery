/** Client-safe: the one-time SQL the artist pastes into her own project. */
export const EXTERNAL_SETUP_SQL = `-- Marjike gallery — one-time setup for your own database.
-- Paste this into your project's SQL editor and run it once.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  medium text not null default '',
  dimensions text not null default '',
  year text not null default '',
  price text not null default '',
  description text not null default '',
  image_path text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  label text not null default '',
  value text not null default '',
  multiline boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_content (key, label, value, multiline, sort_order)
values ('hero_video_path', 'Landing page video', '', false, 90)
on conflict (key) do nothing;

insert into public.site_content (key, label, value, multiline, sort_order)
values ('commission_notify_email', 'Commission inquiries sent to (email)', 'marikeholscher@gmail.com', false, 92)
on conflict (key) do nothing;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $fn$
begin new.updated_at = now(); return new; end; $fn$;

drop trigger if exists artworks_updated_at on public.artworks;
create trigger artworks_updated_at before update on public.artworks
for each row execute function public.set_updated_at();

drop trigger if exists site_content_updated_at on public.site_content;
create trigger site_content_updated_at before update on public.site_content
for each row execute function public.set_updated_at();

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.user_roles
                 where user_id = _user_id and role = _role);
$fn$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- Only the two studio emails can claim the admin role.
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return false; end if;
  if lower(coalesce(auth.jwt()->>'email','')) not in ('lbadenhorst@gmail.com','marikeholscher@gmail.com') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin')
  on conflict do nothing;
  return true;
end; $fn$;
revoke execute on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

grant select on public.artworks to anon, authenticated;
grant select, insert, update, delete on public.artworks to authenticated;
grant all on public.artworks to service_role;

grant select on public.site_content to anon, authenticated;
grant select, insert, update on public.site_content to authenticated;
grant all on public.site_content to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.artworks enable row level security;
alter table public.site_content enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "Anyone can view published artworks" on public.artworks;
create policy "Anyone can view published artworks" on public.artworks
for select to anon, authenticated using (published = true);

drop policy if exists "Admins can view all artworks" on public.artworks;
create policy "Admins can view all artworks" on public.artworks
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert artworks" on public.artworks;
create policy "Admins can insert artworks" on public.artworks
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update artworks" on public.artworks;
create policy "Admins can update artworks" on public.artworks
for update to authenticated using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete artworks" on public.artworks;
create policy "Admins can delete artworks" on public.artworks
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Anyone can view site content" on public.site_content;
create policy "Anyone can view site content" on public.site_content
for select to anon, authenticated using (true);

drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content" on public.site_content
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content" on public.site_content
for update to authenticated using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Users can view their own roles" on public.user_roles;
create policy "Users can view their own roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

-- Private photo folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('artworks', 'artworks', false, 26214400)
on conflict (id) do nothing;

-- Photos stay private: the site's server signs the links, so visitors never
-- read the bucket directly. No anonymous read policy is created here.

drop policy if exists "Admins can upload artwork files" on storage.objects;
create policy "Admins can upload artwork files" on storage.objects
for insert to authenticated
with check (bucket_id = 'artworks' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update artwork files" on storage.objects;
create policy "Admins can update artwork files" on storage.objects
for update to authenticated
using (bucket_id = 'artworks' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete artwork files" on storage.objects;
create policy "Admins can delete artwork files" on storage.objects
for delete to authenticated
using (bucket_id = 'artworks' and public.has_role(auth.uid(), 'admin'));

-- Admin-only settings (e.g. cPanel upload key).
create table if not exists public.private_settings (key text primary key, value text not null default '', updated_at timestamptz not null default now());
grant select, insert, update, delete on public.private_settings to authenticated;
grant all on public.private_settings to service_role;
alter table public.private_settings enable row level security;
drop policy if exists "Admins manage private settings" on public.private_settings;
create policy "Admins manage private settings" on public.private_settings for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Commission inquiries: visitors submit, only studio admins read and reply.
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  message text not null default '',
  reply text not null default '',
  status text not null default 'new' check (status in ('new','replied','archived')),
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

grant insert on public.inquiries to anon;
grant select, update on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;

drop policy if exists "Anyone can submit an inquiry" on public.inquiries;
create policy "Anyone can submit an inquiry" on public.inquiries
for insert to anon, authenticated with check (true);

drop policy if exists "Studio admins can read inquiries" on public.inquiries;
create policy "Studio admins can read inquiries" on public.inquiries
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Studio admins can update inquiries" on public.inquiries;
create policy "Studio admins can update inquiries" on public.inquiries
for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Commission works: shown on the Commission part of the site, managed like artworks.
create table if not exists public.commission_works (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled',
  medium text not null default '',
  dimensions text not null default '',
  year text not null default '',
  price text not null default '',
  description text not null default '',
  image_path text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.commission_works to anon, authenticated;
grant select, insert, update, delete on public.commission_works to authenticated;
grant all on public.commission_works to service_role;
alter table public.commission_works enable row level security;

drop policy if exists "Anyone can view published commission works" on public.commission_works;
create policy "Anyone can view published commission works" on public.commission_works
for select to anon, authenticated using (published = true);

drop policy if exists "Admins can view all commission works" on public.commission_works;
create policy "Admins can view all commission works" on public.commission_works
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert commission works" on public.commission_works;
create policy "Admins can insert commission works" on public.commission_works
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update commission works" on public.commission_works;
create policy "Admins can update commission works" on public.commission_works
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete commission works" on public.commission_works;
create policy "Admins can delete commission works" on public.commission_works
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists commission_works_updated_at on public.commission_works;
create trigger commission_works_updated_at before update on public.commission_works
for each row execute function public.set_updated_at();
`;
