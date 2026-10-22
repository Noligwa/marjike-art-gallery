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

create policy "Anyone can submit an inquiry"
  on public.inquiries for insert to anon, authenticated
  with check (true);

create policy "Studio admins can read inquiries"
  on public.inquiries for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Studio admins can update inquiries"
  on public.inquiries for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- The gallery media folder stays private: signed links are now created by the
-- site's server, so visitors no longer need direct read access to the bucket.
drop policy if exists "Public can read artwork files" on storage.objects;