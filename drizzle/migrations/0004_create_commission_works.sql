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

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $fn$
begin new.updated_at = now(); return new; end; $fn$;

drop trigger if exists commission_works_updated_at on public.commission_works;
create trigger commission_works_updated_at before update on public.commission_works
for each row execute function public.set_updated_at();
