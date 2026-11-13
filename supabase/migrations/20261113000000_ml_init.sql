-- Medical launch pipeline (pilot). Every object is prefixed ml_ so it can live
-- next to other apps in the same Supabase project.
--
-- Model: a LAUNCH is one product programme. It holds PRODUCTS (main unit,
-- variants, accessories, parts, consumables). Each product moves through the
-- seven stages in ml_stages. A team submits a stage, its manager approves, and
-- at the two gate stages the CEO (role admin) approves too. A reviewer can send
-- a product back to an earlier stage. All state changes go through the ml_*
-- functions below; clients cannot write to the tables directly.

-- ---------------------------------------------------------------- config
create table public.ml_stages (
  stage text primary key,
  position int not null unique,
  label text not null,
  department text not null,
  contributor_departments text[] not null default '{}',
  weight int not null check (weight > 0),
  color text not null,
  gate_title text,            -- not null: the CEO must approve before the next stage
  gate_return_to text,        -- where a rejection sends the product by default
  fields jsonb not null default '[]'::jsonb   -- the details this stage records
);
comment on table public.ml_stages is 'The fixed launch pipeline: owner team, weight for the auto timeline, CEO gate, and the form fields each stage records.';

-- ---------------------------------------------------------------- people
create table public.ml_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) > 0),
  email text not null,
  role text not null check (role in ('admin', 'manager', 'member')),
  department text not null check (department in
    ('Product', 'Procurement', 'R&D', 'Graphics', 'Purchase', 'Production', 'Administration')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Administration holds the CEO / admins and nobody else.
  constraint ml_profiles_admin_dept check ((role = 'admin') = (department = 'Administration'))
);

-- ---------------------------------------------------------------- launches
create sequence public.ml_launch_seq;

create table public.ml_launches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('LN-' || lpad(nextval('public.ml_launch_seq')::text, 4, '0')),
  name text not null check (length(btrim(name)) > 0),
  category text not null default 'Other',
  description text not null default '',
  start_date date not null,
  target_date date not null,
  status text not null default 'Active' check (status in ('Active', 'Completed', 'On Hold', 'Scrapped')),
  created_by uuid references public.ml_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ml_launches_window check (target_date >= start_date)
);

create table public.ml_products (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references public.ml_launches (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  kind text not null default 'Main unit'
    check (kind in ('Main unit', 'Variant', 'Accessory', 'Component / part', 'Consumable')),
  position int not null default 0,
  current_stage text not null default 'Sample' references public.ml_stages (stage),
  stage_status text not null default 'In Progress'
    check (stage_status in ('Not Started', 'In Progress', 'Ready for Review', 'Changes Requested', 'Completed')),
  details jsonb not null default '{}'::jsonb,        -- what the stages recorded, flat by field key
  stage_schedule jsonb not null default '{}'::jsonb, -- { Stage: { start_dt, end_dt } }
  last_review_action text,                           -- 'approved' | 'sent_back'
  last_review_note text not null default '',
  last_reviewer_id uuid references public.ml_profiles (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ml_products_launch_idx on public.ml_products (launch_id, position);
create index ml_products_stage_idx on public.ml_products (current_stage, stage_status);

-- One row per approver step of one submission of a stage (a "cycle").
create table public.ml_approvals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ml_products (id) on delete cascade,
  stage text not null references public.ml_stages (stage),
  cycle int not null,
  approval_type text not null check (approval_type in ('MANAGER', 'LEADERSHIP')),
  status text not null default 'PENDING' check (status in ('NOT_STARTED', 'PENDING', 'APPROVED', 'CANCELLED')),
  requested_by uuid references public.ml_profiles (id),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.ml_profiles (id),
  decided_at timestamptz,
  note text not null default ''
);
create index ml_approvals_product_idx on public.ml_approvals (product_id, cycle);
create index ml_approvals_open_idx on public.ml_approvals (status) where status in ('PENDING', 'NOT_STARTED');
create index ml_approvals_requested_by_idx on public.ml_approvals (requested_by);
create index ml_approvals_decided_by_idx on public.ml_approvals (decided_by);

create table public.ml_events (
  id uuid primary key default gen_random_uuid(),
  launch_id uuid not null references public.ml_launches (id) on delete cascade,
  product_id uuid references public.ml_products (id) on delete cascade,
  stage text,
  action text not null,   -- created | product_added | submitted | approved | advanced | sent_back | completed | dates_changed
  actor_id uuid references public.ml_profiles (id),
  from_stage text,
  to_stage text,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index ml_events_launch_idx on public.ml_events (launch_id, created_at desc);
create index ml_events_product_idx on public.ml_events (product_id, created_at desc);
create index ml_events_actor_idx on public.ml_events (actor_id);

create table public.ml_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ml_profiles (id) on delete cascade,
  title text not null,
  body text not null default '',
  launch_id uuid references public.ml_launches (id) on delete cascade,
  product_id uuid references public.ml_products (id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index ml_notifications_user_idx on public.ml_notifications (user_id, is_read, created_at desc);
create index ml_notifications_launch_idx on public.ml_notifications (launch_id);
create index ml_notifications_product_idx on public.ml_notifications (product_id);
create index ml_launches_created_by_idx on public.ml_launches (created_by);
create index ml_products_reviewer_idx on public.ml_products (last_reviewer_id);

-- ---------------------------------------------------------------- seed config
insert into public.ml_stages
  (stage, position, label, department, contributor_departments, weight, color, gate_title, gate_return_to, fields)
values
('Sample', 1, 'Product brief & first sample', 'Product', array[]::text[], 15, '#2b2bb5', null, null,
   '[{"key":"brief","label":"Product brief","type":"area","required":true,"placeholder":"What the product is, key specs, standards to meet"},{"key":"sample_status","label":"Sample status","type":"select","options":["Not started","In making","Sample ready"]},{"key":"spec_link","label":"Spec sheet link","type":"link","placeholder":"https://"},{"key":"sample_files","label":"Drive / files link","type":"link","placeholder":"https://drive.google.com/…"},{"key":"sample_comments","label":"Comments for the approver","type":"area","placeholder":"What changed, what to check, open questions"}]'::jsonb),
  ('Sourcing', 2, 'Raw material sourcing & timeline', 'Procurement', array[]::text[], 15, '#f59e0b', null, null,
   '[{"key":"materials","label":"Raw materials requested","type":"area","required":true,"placeholder":"Materials and components for development"},{"key":"vendors","label":"Vendors","type":"text"},{"key":"materials_in_by","label":"Materials in by","type":"date","required":true},{"key":"sourcing_files","label":"Drive / files link","type":"link","placeholder":"https://drive.google.com/…"},{"key":"sourcing_comments","label":"Comments for the approver","type":"area","placeholder":"What changed, what to check, open questions"}]'::jsonb),
  ('Costing', 3, 'Material & cost verification, final sample', 'Product', array[]::text[], 10, '#5b5bd6', 'CEO approval: sample & cost', 'Sample',
   '[{"key":"material_verified","label":"Material verification","type":"select","options":["Pending","Verified","Partly verified"]},{"key":"final_sample","label":"Final sample ref","type":"text","required":true,"placeholder":"e.g. PX200-S3"},{"key":"unit_cost","label":"Final unit cost (₹)","type":"money","required":true},{"key":"target_cost","label":"Target unit cost (₹)","type":"money"},{"key":"costing_files","label":"Drive / files link","type":"link","placeholder":"https://drive.google.com/…"},{"key":"costing_comments","label":"Comments for the approver","type":"area","placeholder":"What changed, what to check, open questions"}]'::jsonb),
  ('BOM', 4, 'Bill of materials', 'R&D', array[]::text[], 15, '#0891b2', null, null,
   '[{"key":"bom_link","label":"BOM link","type":"link","required":true,"placeholder":"https://"},{"key":"bom_version","label":"BOM version","type":"text","placeholder":"e.g. v1.2"},{"key":"bom_items","label":"Line items","type":"number"},{"key":"bom_files","label":"Drive / files link","type":"link","placeholder":"https://drive.google.com/…"},{"key":"bom_comments","label":"Comments for the approver","type":"area","placeholder":"What changed, what to check, open questions"}]'::jsonb),
  ('Packaging', 5, 'Packaging: box content, approval form, projection & box design', 'Graphics', array['Product']::text[], 21, '#db2777', 'CEO final approval: pack & launch', 'Packaging',
   '[{"key":"box_content","label":"Box content and claims","type":"area","required":true,"group":"Product","placeholder":"Text, claims, usage lines, certifications to print"},{"key":"approval_form","label":"Approval form link","type":"link","group":"Product","placeholder":"https://"},{"key":"launch_projection","label":"Launch projection (units, first 3 months)","type":"number","required":true,"group":"Product"},{"key":"box_design_link","label":"Box design link","type":"link","required":true,"group":"Graphics","placeholder":"https://"},{"key":"artwork_version","label":"Artwork version","type":"text","group":"Graphics","placeholder":"e.g. v2"},{"key":"packaging_files","label":"Drive / files link","type":"link","group":"Both","placeholder":"https://drive.google.com/…"},{"key":"packaging_comments","label":"Comments for the approver","type":"area","group":"Both","placeholder":"What changed, what to check, open questions"}]'::jsonb),
  ('Purchase', 6, 'Purchase order for first launch', 'Purchase', array[]::text[], 15, '#16a34a', null, null,
   '[{"key":"po_number","label":"PO number","type":"text","required":true},{"key":"order_qty","label":"First order quantity","type":"number","required":true},{"key":"suppliers","label":"Supplier(s)","type":"text"},{"key":"purchase_files","label":"Drive / files link","type":"link","placeholder":"https://drive.google.com/…"},{"key":"purchase_comments","label":"Comments for the approver","type":"area","placeholder":"What changed, what to check, open questions"}]'::jsonb),
  ('Production', 7, 'Production for dispatch', 'Production', array[]::text[], 10, '#0f766e', null, null,
   '[{"key":"qty_ready","label":"Quantity ready","type":"number","required":true},{"key":"dispatch_date","label":"Ready for dispatch on","type":"date","required":true},{"key":"factory_line","label":"Factory line","type":"text","placeholder":"e.g. Line 2, Unit B"},{"key":"production_files","label":"Drive / files link","type":"link","placeholder":"https://drive.google.com/…"},{"key":"production_comments","label":"Comments for the approver","type":"area","placeholder":"What changed, what to check, open questions"}]'::jsonb);

-- ---------------------------------------------------------------- helpers
create or replace function public.ml_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger ml_launches_touch before update on public.ml_launches
  for each row execute function public.ml_touch();
create trigger ml_products_touch before update on public.ml_products
  for each row execute function public.ml_touch();

-- True for a signed-in, active member of this app. Used by every read policy.
create or replace function public.ml_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ml_profiles p where p.id = auth.uid() and p.active);
$$;

create or replace function public.ml_me() returns public.ml_profiles
language plpgsql stable security definer set search_path = '' as $$
declare me public.ml_profiles;
begin
  select * into me from public.ml_profiles where id = auth.uid() and active;
  if not found then raise exception 'Not signed in or account is inactive' using errcode = '28000'; end if;
  return me;
end $$;

create or replace function public.ml_notify(p_user uuid, p_title text, p_body text, p_launch uuid, p_product uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.ml_notifications (user_id, title, body, launch_id, product_id)
  values (p_user, p_title, p_body, p_launch, p_product);
$$;

-- Tell the managers of a stage's team; when the team has no active manager,
-- tell the admins so nothing waits unseen.
create or replace function public.ml_notify_stage_managers(p_stage text, p_title text, p_body text, p_launch uuid, p_product uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare dept text; n int;
begin
  select department into dept from public.ml_stages where stage = p_stage;
  insert into public.ml_notifications (user_id, title, body, launch_id, product_id)
    select id, p_title, p_body, p_launch, p_product from public.ml_profiles
    where active and role = 'manager' and department = dept;
  get diagnostics n = row_count;
  if n = 0 then
    insert into public.ml_notifications (user_id, title, body, launch_id, product_id)
      select id, p_title, p_body, p_launch, p_product from public.ml_profiles where active and role = 'admin';
  end if;
end $$;

create or replace function public.ml_notify_admins(p_title text, p_body text, p_launch uuid, p_product uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.ml_notifications (user_id, title, body, launch_id, product_id)
  select id, p_title, p_body, p_launch, p_product from public.ml_profiles where active and role = 'admin';
$$;

-- The auto timeline: the launch window split across the stages by weight.
-- Returns {} when the window is missing or shorter than one day per stage.
create or replace function public.ml_auto_plan(p_start date, p_end date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  total int; wsum int; cnt int; acc int := 0; cur int := 0; i int := 0; endday int;
  r record; res jsonb := '{}'::jsonb;
begin
  if p_start is null or p_end is null or p_end < p_start then return res; end if;
  total := (p_end - p_start) + 1;
  select sum(weight), count(*) into wsum, cnt from public.ml_stages;
  if total < cnt then return res; end if;
  for r in select * from public.ml_stages order by position loop
    i := i + 1;
    acc := acc + r.weight;
    if i = cnt then endday := total;
    else endday := greatest(cur + 1, round(acc::numeric / wsum * total)::int);
    end if;
    res := res || jsonb_build_object(r.stage, jsonb_build_object(
      'start_dt', (p_start + cur)::text, 'end_dt', (p_start + endday - 1)::text));
    cur := endday;
  end loop;
  return res;
end $$;

-- ---------------------------------------------------------------- launches
create or replace function public.ml_create_launch(
  p_name text, p_category text, p_description text, p_start date, p_target date, p_products jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me public.ml_profiles; l_id uuid; plan jsonb; item jsonb; pos int := 0; p_id uuid; kind_ text;
begin
  me := public.ml_me();
  if not (me.role = 'admin' or me.department = 'Product') then
    raise exception 'Only Product or an admin can start a launch';
  end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Give the launch a name'; end if;
  if p_start is null or p_target is null then raise exception 'Choose a start and a target launch date'; end if;
  if p_target < p_start then raise exception 'The target date is before the start date'; end if;
  plan := public.ml_auto_plan(p_start, p_target);
  if plan = '{}'::jsonb then raise exception 'The timeline must be at least 7 days so each stage gets a day'; end if;
  if p_products is null or jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) = 0 then
    raise exception 'Add at least one product to the launch';
  end if;

  insert into public.ml_launches (name, category, description, start_date, target_date, created_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_category), ''), 'Other'), coalesce(p_description, ''), p_start, p_target, me.id)
  returning id into l_id;

  for item in select * from jsonb_array_elements(p_products) loop
    if btrim(coalesce(item ->> 'name', '')) = '' then raise exception 'Every product needs a name'; end if;
    kind_ := coalesce(nullif(item ->> 'kind', ''), 'Main unit');
    insert into public.ml_products (launch_id, name, kind, position, stage_schedule)
    values (l_id, btrim(item ->> 'name'), kind_, pos, plan)
    returning id into p_id;
    pos := pos + 1;
    insert into public.ml_events (launch_id, product_id, stage, action, actor_id, note)
    values (l_id, p_id, 'Sample', 'created', me.id, 'Product added to the launch');
  end loop;
  return l_id;
end $$;

create or replace function public.ml_update_launch(
  p_id uuid, p_name text, p_category text, p_description text, p_target date, p_status text
) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.ml_profiles; l public.ml_launches;
begin
  me := public.ml_me();
  if not (me.role = 'admin' or (me.role = 'manager' and me.department = 'Product')) then
    raise exception 'Only the Product manager or an admin can edit a launch';
  end if;
  select * into l from public.ml_launches where id = p_id for update;
  if not found then raise exception 'Launch not found'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Give the launch a name'; end if;
  if p_target < l.start_date then raise exception 'The target date is before the start date'; end if;
  if p_status not in ('Active', 'Completed', 'On Hold', 'Scrapped') then raise exception 'Unknown status'; end if;
  update public.ml_launches set name = btrim(p_name), category = coalesce(nullif(btrim(p_category), ''), 'Other'),
    description = coalesce(p_description, ''), target_date = p_target, status = p_status where id = p_id;
end $$;

create or replace function public.ml_add_product(p_launch uuid, p_name text, p_kind text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me public.ml_profiles; l public.ml_launches; p_id uuid; pos int;
begin
  me := public.ml_me();
  if not (me.role = 'admin' or me.department = 'Product') then
    raise exception 'Only Product or an admin can add products';
  end if;
  select * into l from public.ml_launches where id = p_launch for update;
  if not found then raise exception 'Launch not found'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'Every product needs a name'; end if;
  select coalesce(max(position) + 1, 0) into pos from public.ml_products where launch_id = p_launch;
  insert into public.ml_products (launch_id, name, kind, position, stage_schedule)
  values (p_launch, btrim(p_name), coalesce(nullif(p_kind, ''), 'Main unit'), pos, public.ml_auto_plan(l.start_date, l.target_date))
  returning id into p_id;
  insert into public.ml_events (launch_id, product_id, stage, action, actor_id, note)
  values (p_launch, p_id, 'Sample', 'product_added', me.id, btrim(p_name));
  if l.status = 'Completed' then update public.ml_launches set status = 'Active' where id = p_launch; end if;
  return p_id;
end $$;

-- ---------------------------------------------------------------- stage work
-- Who may work on a stage: its owner team and any contributor team. Admins can
-- step in. Fields tagged with a group are limited to that team inside a stage
-- two teams share.
create or replace function public.ml_can_work(p_me public.ml_profiles, p_stage text) returns boolean
language sql stable set search_path = '' as $$
  select p_me.active and (p_me.role = 'admin' or exists (
    select 1 from public.ml_stages s
    where s.stage = p_stage and (s.department = p_me.department or p_me.department = any (s.contributor_departments))));
$$;

create or replace function public.ml_save_details(p_product uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me public.ml_profiles; pr public.ml_products; st public.ml_stages;
  k text; v jsonb; fld jsonb; allowed boolean; merged jsonb;
begin
  me := public.ml_me();
  select * into pr from public.ml_products where id = p_product for update;
  if not found then raise exception 'Product not found'; end if;
  if pr.stage_status not in ('Not Started', 'In Progress', 'Changes Requested') then
    raise exception 'This stage is % and cannot be edited', lower(pr.stage_status);
  end if;
  if not public.ml_can_work(me, pr.current_stage) then
    raise exception 'Only the % team can edit this stage', (select department from public.ml_stages where stage = pr.current_stage);
  end if;
  select * into st from public.ml_stages where stage = pr.current_stage;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'Nothing to save'; end if;

  merged := pr.details;
  for k, v in select * from jsonb_each(p_patch) loop
    select f into fld from jsonb_array_elements(st.fields) f where f ->> 'key' = k;
    if fld is null then raise exception 'Unknown field "%" for the % stage', k, st.stage; end if;
    if jsonb_typeof(v) not in ('string', 'number', 'null') then raise exception 'Field "%" must be text or a number', k; end if;
    if length(v::text) > 5000 then raise exception 'Field "%" is too long', k; end if;
    allowed := me.role = 'admin' or coalesce(fld ->> 'group', 'Both') in ('Both', me.department);
    if not allowed then
      raise exception '"%" is filled by the % team', fld ->> 'label', fld ->> 'group';
    end if;
    if fld ->> 'type' = 'select' and jsonb_typeof(v) = 'string' and btrim(v #>> '{}') <> ''
       and not (fld -> 'options') @> to_jsonb(v #>> '{}') then
      raise exception 'Choose one of the listed options for "%"', fld ->> 'label';
    end if;
    if fld ->> 'type' in ('number', 'money') and jsonb_typeof(v) = 'string' and btrim(v #>> '{}') <> '' then
      begin perform (v #>> '{}')::numeric; exception when others then
        raise exception '"%" must be a number', fld ->> 'label';
      end;
    end if;
    merged := merged || jsonb_build_object(k, case when jsonb_typeof(v) = 'string' then to_jsonb(btrim(v #>> '{}')) else v end);
  end loop;

  update public.ml_products
     set details = merged,
         stage_status = case when stage_status = 'Not Started' then 'In Progress' else stage_status end
   where id = p_product;
  return merged;
end $$;

create or replace function public.ml_submit_stage(p_product uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.ml_profiles; pr public.ml_products; st public.ml_stages;
  fld jsonb; cyc int; l_name text;
begin
  me := public.ml_me();
  select * into pr from public.ml_products where id = p_product for update;
  if not found then raise exception 'Product not found'; end if;
  if pr.stage_status not in ('In Progress', 'Changes Requested') then
    raise exception 'This stage is % and cannot be submitted', lower(pr.stage_status);
  end if;
  if not public.ml_can_work(me, pr.current_stage) then
    raise exception 'Only the % team can submit this stage', (select department from public.ml_stages where stage = pr.current_stage);
  end if;
  select * into st from public.ml_stages where stage = pr.current_stage;

  for fld in select * from jsonb_array_elements(st.fields) loop
    if (fld ->> 'required')::boolean is true and btrim(coalesce(pr.details ->> (fld ->> 'key'), '')) = '' then
      raise exception 'Fill in "%" before submitting', fld ->> 'label';
    end if;
  end loop;

  select coalesce(max(cycle), 0) + 1 into cyc from public.ml_approvals where product_id = p_product;
  insert into public.ml_approvals (product_id, stage, cycle, approval_type, status, requested_by)
  values (p_product, st.stage, cyc, 'MANAGER', 'PENDING', me.id);
  if st.gate_title is not null then
    insert into public.ml_approvals (product_id, stage, cycle, approval_type, status, requested_by)
    values (p_product, st.stage, cyc, 'LEADERSHIP', 'NOT_STARTED', me.id);
  end if;

  update public.ml_products set stage_status = 'Ready for Review' where id = p_product;
  insert into public.ml_events (launch_id, product_id, stage, action, actor_id, note)
  values (pr.launch_id, p_product, st.stage, 'submitted', me.id, st.label);
  select name into l_name from public.ml_launches where id = pr.launch_id;
  perform public.ml_notify_stage_managers(st.stage, st.stage || ' approval ready',
    pr.name || ' (' || l_name || ') is waiting for your approval.', pr.launch_id, p_product);
end $$;

-- ---------------------------------------------------------------- approvals
create or replace function public.ml_approve(p_approval uuid, p_note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.ml_profiles; ap public.ml_approvals; pr public.ml_products; st public.ml_stages; nx public.ml_stages;
  l_name text; waiting uuid; open_left int;
begin
  me := public.ml_me();
  select * into ap from public.ml_approvals where id = p_approval for update;
  if not found then raise exception 'Approval not found'; end if;
  if ap.status <> 'PENDING' then raise exception 'This approval is already %', lower(ap.status); end if;
  select * into st from public.ml_stages where stage = ap.stage;
  select * into pr from public.ml_products where id = ap.product_id for update;
  if pr.current_stage <> ap.stage or pr.stage_status <> 'Ready for Review' then
    raise exception 'This product is no longer waiting on that review';
  end if;

  if ap.approval_type = 'LEADERSHIP' then
    if me.role <> 'admin' then raise exception 'Only the CEO can approve this gate'; end if;
  else
    if not (me.role = 'admin' or (me.role = 'manager' and me.department = st.department)) then
      raise exception 'Only the % manager can approve this stage', st.department;
    end if;
    if me.role <> 'admin' and ap.requested_by = me.id then
      raise exception 'You submitted this stage, so another manager or the CEO must approve it';
    end if;
  end if;

  update public.ml_approvals set status = 'APPROVED', decided_by = me.id, decided_at = now(), note = coalesce(p_note, '')
   where id = p_approval;
  insert into public.ml_events (launch_id, product_id, stage, action, actor_id, note)
  values (pr.launch_id, pr.id, st.stage, 'approved', me.id,
          (case when ap.approval_type = 'LEADERSHIP' then 'CEO approved' else 'Manager approved' end)
          || case when btrim(coalesce(p_note, '')) = '' then '' else ': ' || btrim(p_note) end);
  select name into l_name from public.ml_launches where id = pr.launch_id;

  -- Open the next approver, if any.
  select id into waiting from public.ml_approvals
   where product_id = pr.id and cycle = ap.cycle and status = 'NOT_STARTED' order by approval_type limit 1;
  if waiting is not null then
    update public.ml_approvals set status = 'PENDING', requested_at = now() where id = waiting;
    perform public.ml_notify_admins('CEO approval needed',
      pr.name || ' (' || l_name || ') is waiting for your approval: ' || coalesce(st.gate_title, st.label) || '.',
      pr.launch_id, pr.id);
    return;
  end if;

  select count(*) into open_left from public.ml_approvals
   where product_id = pr.id and cycle = ap.cycle and status in ('PENDING', 'NOT_STARTED');
  if open_left > 0 then return; end if;

  -- Everything approved: hand over to the next stage, or finish.
  select * into nx from public.ml_stages where position = st.position + 1;
  if found then
    update public.ml_products set current_stage = nx.stage, stage_status = 'In Progress',
      last_review_action = 'approved', last_review_note = '', last_reviewer_id = me.id where id = pr.id;
    insert into public.ml_events (launch_id, product_id, stage, action, actor_id, from_stage, to_stage, note)
    values (pr.launch_id, pr.id, st.stage, 'advanced', me.id, st.stage, nx.stage, 'Handed to ' || nx.department);
    perform public.ml_notify_stage_managers(nx.stage, nx.stage || ' has a new product',
      pr.name || ' (' || l_name || ') has moved to ' || nx.label || '.', pr.launch_id, pr.id);
  else
    update public.ml_products set stage_status = 'Completed', completed_at = now(),
      last_review_action = 'approved', last_review_note = '', last_reviewer_id = me.id where id = pr.id;
    insert into public.ml_events (launch_id, product_id, stage, action, actor_id, note)
    values (pr.launch_id, pr.id, st.stage, 'completed', me.id, 'Ready for dispatch');
    if not exists (select 1 from public.ml_products where launch_id = pr.launch_id and stage_status <> 'Completed') then
      update public.ml_launches set status = 'Completed' where id = pr.launch_id and status = 'Active';
      perform public.ml_notify_admins('Launch complete', l_name || ' is ready for dispatch.', pr.launch_id, null);
    end if;
  end if;
end $$;

create or replace function public.ml_send_back(p_product uuid, p_to_stage text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me public.ml_profiles; pr public.ml_products; cur public.ml_stages; dest public.ml_stages; l_name text;
begin
  me := public.ml_me();
  select * into pr from public.ml_products where id = p_product for update;
  if not found then raise exception 'Product not found'; end if;
  if pr.stage_status <> 'Ready for Review' then raise exception 'Only a stage that is waiting for review can be sent back'; end if;
  select * into cur from public.ml_stages where stage = pr.current_stage;
  if not (me.role = 'admin' or (me.role = 'manager' and me.department = cur.department)) then
    raise exception 'Only the % manager or the CEO can send this back', cur.department;
  end if;
  select * into dest from public.ml_stages where stage = p_to_stage;
  if not found then raise exception 'Unknown stage'; end if;
  if dest.position > cur.position then raise exception 'Send it back to this stage or an earlier one'; end if;
  if btrim(coalesce(p_note, '')) = '' then raise exception 'Add a note so the team knows what to change'; end if;

  update public.ml_approvals set status = 'CANCELLED'
   where product_id = p_product and status in ('PENDING', 'NOT_STARTED');
  update public.ml_products set current_stage = dest.stage, stage_status = 'Changes Requested',
    stage_schedule = stage_schedule || jsonb_build_object(dest.stage,
      jsonb_build_object('start_dt', current_date::text, 'end_dt', (current_date + 5)::text)),
    last_review_action = 'sent_back', last_review_note = btrim(p_note), last_reviewer_id = me.id
   where id = p_product;
  insert into public.ml_events (launch_id, product_id, stage, action, actor_id, from_stage, to_stage, note)
  values (pr.launch_id, p_product, cur.stage, 'sent_back', me.id, cur.stage, dest.stage, btrim(p_note));
  select name into l_name from public.ml_launches where id = pr.launch_id;
  perform public.ml_notify_stage_managers(dest.stage, 'Sent back for rework',
    me.full_name || ' sent ' || pr.name || ' (' || l_name || ') back to ' || dest.stage || ': ' || btrim(p_note),
    pr.launch_id, p_product);
end $$;

create or replace function public.ml_set_stage_dates(p_product uuid, p_stage text, p_start date, p_end date) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.ml_profiles; pr public.ml_products; st public.ml_stages;
begin
  me := public.ml_me();
  select * into st from public.ml_stages where stage = p_stage;
  if not found then raise exception 'Unknown stage'; end if;
  if not (me.role = 'admin' or (me.role = 'manager' and me.department in (st.department, 'Product'))) then
    raise exception 'Only a manager of this stage, the Product manager or the CEO can change its dates';
  end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'The end date is before the start date'; end if;
  select * into pr from public.ml_products where id = p_product for update;
  if not found then raise exception 'Product not found'; end if;
  update public.ml_products set stage_schedule = stage_schedule || jsonb_build_object(p_stage,
    jsonb_build_object('start_dt', p_start::text, 'end_dt', p_end::text)) where id = p_product;
  insert into public.ml_events (launch_id, product_id, stage, action, actor_id, note)
  values (pr.launch_id, p_product, p_stage, 'dates_changed', me.id, p_start::text || ' to ' || p_end::text);
end $$;

-- ---------------------------------------------------------------- security
alter table public.ml_stages enable row level security;
alter table public.ml_profiles enable row level security;
alter table public.ml_launches enable row level security;
alter table public.ml_products enable row level security;
alter table public.ml_approvals enable row level security;
alter table public.ml_events enable row level security;
alter table public.ml_notifications enable row level security;

create policy ml_stages_read on public.ml_stages for select to authenticated using ((select public.ml_is_member()));
create policy ml_profiles_read on public.ml_profiles for select to authenticated using ((select public.ml_is_member()));
create policy ml_launches_read on public.ml_launches for select to authenticated using ((select public.ml_is_member()));
create policy ml_products_read on public.ml_products for select to authenticated using ((select public.ml_is_member()));
create policy ml_approvals_read on public.ml_approvals for select to authenticated using ((select public.ml_is_member()));
create policy ml_events_read on public.ml_events for select to authenticated using ((select public.ml_is_member()));
create policy ml_notifications_read on public.ml_notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy ml_notifications_mark on public.ml_notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- No direct writes from the browser: only the ml_* functions change data
-- (marking your own notifications read is the one exception).
revoke all on public.ml_stages, public.ml_profiles, public.ml_launches, public.ml_products,
  public.ml_approvals, public.ml_events, public.ml_notifications from anon, authenticated;
grant select on public.ml_stages, public.ml_profiles, public.ml_launches, public.ml_products,
  public.ml_approvals, public.ml_events, public.ml_notifications to authenticated;
grant update (is_read) on public.ml_notifications to authenticated;
revoke all on sequence public.ml_launch_seq from anon, authenticated;

-- Functions: signed-in users only. Internal helpers are not callable at all.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'ml\_%' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
grant execute on function
  public.ml_is_member(),
  public.ml_auto_plan(date, date),
  public.ml_create_launch(text, text, text, date, date, jsonb),
  public.ml_update_launch(uuid, text, text, text, date, text),
  public.ml_add_product(uuid, text, text),
  public.ml_save_details(uuid, jsonb),
  public.ml_submit_stage(uuid),
  public.ml_approve(uuid, text),
  public.ml_send_back(uuid, text, text),
  public.ml_set_stage_dates(uuid, text, date, date)
to authenticated;
