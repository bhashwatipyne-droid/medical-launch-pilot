-- Live pilot storage for the prototype's screens.
--
-- The app runs the prototype's own launch rules on the server (app/api) and
-- keeps its records here: one row per record, grouped by collection
-- (projects = launches, deliverables = products, approvalItems, notifications,
-- users, ...). Only the server touches these tables, with the secret key; the
-- browser has no access at all. Every save is one atomic commit that checks a
-- version number, so two people saving at once can never overwrite each other.

create table public.ml_ws_meta (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0,
  counters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.ml_ws_records (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
comment on table public.ml_ws_records is 'Launch tracker records (launches, products, approvals, people, notifications), one row each, keyed by collection and id.';

alter table public.ml_ws_meta enable row level security;
alter table public.ml_ws_records enable row level security;
revoke all on public.ml_ws_meta, public.ml_ws_records from anon, authenticated;

-- Applies one request's changes if nobody else saved since it read the data.
-- Returns the new version, or null when the version moved (the server retries).
create or replace function public.ml_ws_commit(p_version bigint, p_counters jsonb, p_upserts jsonb, p_deletes jsonb)
returns bigint language plpgsql set search_path = '' as $$
declare v bigint;
begin
  update public.ml_ws_meta set version = version + 1, counters = coalesce(p_counters, counters), updated_at = now()
   where id = 1 and version = p_version
   returning version into v;
  if v is null then return null; end if;

  insert into public.ml_ws_records (collection, id, data, updated_at)
  select r ->> 'c', r ->> 'id', r -> 'data', now() from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb)) r
  on conflict (collection, id) do update set data = excluded.data, updated_at = now();

  delete from public.ml_ws_records t
   using jsonb_array_elements(coalesce(p_deletes, '[]'::jsonb)) d
   where t.collection = d ->> 'c' and t.id = d ->> 'id';
  return v;
end $$;
revoke execute on function public.ml_ws_commit(bigint, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.ml_ws_commit(bigint, jsonb, jsonb, jsonb) to service_role;

-- Start: the product divisions launches belong to, and the people already set
-- up (the CEO account), as the prototype's users.
insert into public.ml_ws_meta (id, version, counters) values (1, 0, '{"project":0,"deliverable":0,"work":0,"approval":0}');

insert into public.ml_ws_records (collection, id, data)
select 'clients', c.id, jsonb_build_object('id', c.id, 'name', c.name, 'contact_person', '', 'contact_persons', '[]'::jsonb, 'status', 'Active')
from (values ('c-diag', 'Diagnostics'), ('c-resp', 'Respiratory Care'), ('c-monitor', 'Patient Monitoring'), ('c-mobility', 'Mobility & Rehab')) c(id, name);

insert into public.ml_ws_records (collection, id, data)
select 'users', p.id::text, jsonb_build_object(
  'id', p.id::text, 'name', p.full_name, 'username', split_part(p.email, '@', 1), 'email', p.email,
  'role', p.role, 'department', p.department, 'active', p.active, 'removed', false)
from public.ml_profiles p;
