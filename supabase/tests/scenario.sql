-- End-to-end scenario for the launch pipeline. Everything runs inside a
-- transaction that is rolled back, so it is safe to run on any database that
-- has the migration. Run with: psql -v ON_ERROR_STOP=1 -f supabase/tests/scenario.sql
begin;

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

-- people (profiles are normally created by scripts/seed-admin.mjs / the team page)
insert into auth.users (id, email)
select gen_random_uuid(), n || '@test.local' from unnest(array['ceo','pm','pmem','prm','prmem','gm','rdm','gmem','pum','prodm']) n;
insert into ids select split_part(email,'@',1), id from auth.users where email like '%@test.local';
insert into public.ml_profiles (id, full_name, email, role, department)
select (select v from ids where k = x.k), x.nm, x.k || '@test.local', x.r, x.d from (values
 ('ceo','CEO','admin','Administration'),
 ('pm','Product Manager','manager','Product'),
 ('pmem','Product Member','member','Product'),
 ('prm','Procurement Manager','manager','Procurement'),
 ('prmem','Procurement Member','member','Procurement'),
 ('gm','Graphics Manager','manager','Graphics'),
 ('gmem','Graphics Member','member','Graphics'),
 ('rdm','R&D Manager','manager','R&D'),
 ('pum','Purchase Manager','manager','Purchase'),
 ('prodm','Production Manager','manager','Production')) x(k, nm, r, d);

create or replace function pg_temp.as_user(p_key text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select v::text from ids where k = p_key), true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.reset_role() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', true); end $$;
create or replace function pg_temp.expect_fail(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm like p_like then return; end if;
    raise exception 'FAILED WITH WRONG ERROR: % (wanted %)', sqlerrm, p_like;
  end;
  raise exception 'EXPECTED FAILURE DID NOT HAPPEN: %', p_sql;
end $$;
grant execute on function pg_temp.expect_fail(text, text) to authenticated;

-- 1. a Product member can start a launch; a Graphics member cannot
select pg_temp.as_user('gmem');
select pg_temp.expect_fail($$ select public.ml_create_launch('X','Other','',current_date,current_date+60,'[{"name":"A"}]') $$, '%Only Product%');
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ select public.ml_create_launch('X','Other','',current_date,current_date+3,'[{"name":"A"}]') $$, '%at least 7 days%');
select pg_temp.expect_fail($$ select public.ml_create_launch('X','Other','',current_date,current_date+60,'[]') $$, '%at least one product%');
insert into ids select 'launch', public.ml_create_launch('Pulse oximeter PX200','Diagnostics','',current_date,current_date+90,
  '[{"name":"PX200 main unit"},{"name":"Finger probe","kind":"Accessory"}]');
select pg_temp.reset_role();
insert into ids select 'p1', id from public.ml_products where name = 'PX200 main unit';
insert into ids select 'p2', id from public.ml_products where name = 'Finger probe';
do $$ begin
  assert (select count(*) from public.ml_products where launch_id = (select v from ids where k='launch')) = 2, 'two products';
  assert (select stage_schedule ? 'Production' from public.ml_products where id = (select v from ids where k='p1')), 'plan stored';
end $$;

-- 2. Sample stage: Procurement cannot edit it, required fields block submit
select pg_temp.as_user('prmem');
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"brief":"x"}') $$, '%Only the Product team%');
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"nope":"x"}') $$, '%Unknown field%');
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"sample_status":"Bogus"}') $$, '%Choose one%');
select pg_temp.expect_fail($$ select public.ml_submit_stage((select v from ids where k='p1')) $$, '%Product brief%');
select public.ml_save_details((select v from ids where k='p1'), '{"brief":"Fingertip SpO2 monitor, IEC 80601","sample_status":"Sample ready"}');
select public.ml_submit_stage((select v from ids where k='p1'));
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"brief":"edit while in review"}') $$, '%cannot be edited%');

-- 3. approvals: member cannot approve, wrong-team manager cannot, right manager can
select pg_temp.reset_role();
insert into ids select 'a_sample', id from public.ml_approvals where product_id = (select v from ids where k='p1') and stage='Sample';
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ select public.ml_approve((select v from ids where k='a_sample')) $$, '%manager can approve%');
select pg_temp.as_user('prm');
select pg_temp.expect_fail($$ select public.ml_approve((select v from ids where k='a_sample')) $$, '%manager can approve%');
select pg_temp.as_user('pm');
select public.ml_approve((select v from ids where k='a_sample'), 'Looks good');
select pg_temp.expect_fail($$ select public.ml_approve((select v from ids where k='a_sample')) $$, '%already approved%');
select pg_temp.reset_role();
do $$ begin
  assert (select current_stage from public.ml_products where id=(select v from ids where k='p1')) = 'Sourcing', 'moved to Sourcing';
  assert (select count(*) from public.ml_notifications where user_id=(select v from ids where k='prm')) = 1, 'procurement manager notified';
end $$;

-- 4. Sourcing -> Costing; Costing has a CEO gate after the manager
select pg_temp.as_user('prmem');
select public.ml_save_details((select v from ids where k='p1'), '{"materials":"PCB, sensor, casing","materials_in_by":"2027-01-10"}');
select public.ml_submit_stage((select v from ids where k='p1'));
select pg_temp.reset_role();
insert into ids select 'a_src', id from public.ml_approvals where product_id=(select v from ids where k='p1') and stage='Sourcing' and status='PENDING';
select pg_temp.as_user('prm');
select public.ml_approve((select v from ids where k='a_src'));

select pg_temp.as_user('pmem');
select public.ml_save_details((select v from ids where k='p1'), '{"final_sample":"PX200-S3","unit_cost":"842.50"}');
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"unit_cost":"abc"}') $$, '%must be a number%');
select public.ml_submit_stage((select v from ids where k='p1'));
select pg_temp.reset_role();
insert into ids select 'a_cost_m', id from public.ml_approvals where product_id=(select v from ids where k='p1') and stage='Costing' and approval_type='MANAGER';
insert into ids select 'a_cost_l', id from public.ml_approvals where product_id=(select v from ids where k='p1') and stage='Costing' and approval_type='LEADERSHIP';
do $$ begin assert (select status from public.ml_approvals where id=(select v from ids where k='a_cost_l')) = 'NOT_STARTED', 'CEO step waits'; end $$;
select pg_temp.as_user('pm');
select public.ml_approve((select v from ids where k='a_cost_m'));
select pg_temp.expect_fail($$ select public.ml_approve((select v from ids where k='a_cost_l')) $$, '%Only the CEO%');
select pg_temp.reset_role();
do $$ begin
  assert (select current_stage from public.ml_products where id=(select v from ids where k='p1')) = 'Costing', 'still Costing';
  assert (select status from public.ml_approvals where id=(select v from ids where k='a_cost_l')) = 'PENDING', 'CEO step open';
  assert (select count(*) from public.ml_notifications where user_id=(select v from ids where k='ceo') and title = 'CEO approval needed') = 1, 'CEO notified';
end $$;

-- 5. CEO sends it back to Sample with a note; then the loop runs again
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ select public.ml_send_back((select v from ids where k='p1'), 'Sample', 'no') $$, '%manager or the CEO%');
select pg_temp.as_user('ceo');
select pg_temp.expect_fail($$ select public.ml_send_back((select v from ids where k='p1'), 'Sample', '  ') $$, '%Add a note%');
select pg_temp.expect_fail($$ select public.ml_send_back((select v from ids where k='p1'), 'BOM', 'later stage') $$, '%this stage or an earlier%');
select public.ml_send_back((select v from ids where k='p1'), 'Sample', 'Cost is over target, revise the sample');
select pg_temp.reset_role();
do $$ begin
  assert (select current_stage||'/'||stage_status from public.ml_products where id=(select v from ids where k='p1')) = 'Sample/Changes Requested', 'back at Sample';
  assert (select count(*) from public.ml_approvals where product_id=(select v from ids where k='p1') and status in ('PENDING','NOT_STARTED')) = 0, 'old approvals closed';
  assert (select last_review_note from public.ml_products where id=(select v from ids where k='p1')) like 'Cost is over%', 'note kept';
end $$;

-- 6. walk the first product to the end
create or replace function pg_temp.pass_stage(p_prod uuid, p_submitter text, p_patch jsonb, p_mgr text, p_gate boolean) returns void language plpgsql as $f$
declare ap uuid;
begin
  perform pg_temp.as_user(p_submitter);
  perform public.ml_save_details(p_prod, p_patch);
  perform public.ml_submit_stage(p_prod);
  perform pg_temp.reset_role();
  select id into ap from public.ml_approvals where product_id=p_prod and status='PENDING' and approval_type='MANAGER' order by requested_at desc limit 1;
  perform pg_temp.as_user(p_mgr); perform public.ml_approve(ap);
  if p_gate then
    perform pg_temp.reset_role();
    select id into ap from public.ml_approvals where product_id=p_prod and status='PENDING' and approval_type='LEADERSHIP' order by requested_at desc limit 1;
    perform pg_temp.as_user('ceo'); perform public.ml_approve(ap, 'ok');
  end if;
  perform pg_temp.reset_role();
end $f$;
grant execute on function pg_temp.pass_stage(uuid,text,jsonb,text,boolean) to authenticated;

select pg_temp.pass_stage((select v from ids where k='p1'), 'pmem', '{"sample_status":"Sample ready"}', 'pm', false);   -- Sample
select pg_temp.as_user('prmem'); select public.ml_submit_stage((select v from ids where k='p1'));  -- Sourcing (details already saved)
select pg_temp.reset_role();
do $$ declare ap uuid; begin
  select id into ap from public.ml_approvals where product_id=(select v from ids where k='p1') and status='PENDING' and stage='Sourcing';
  perform set_config('request.jwt.claim.sub',(select v::text from ids where k='prm'),true); set local role authenticated; perform public.ml_approve(ap); reset role;
end $$;
select pg_temp.pass_stage((select v from ids where k='p1'), 'pmem', '{"final_sample":"PX200-S4","unit_cost":"790"}', 'pm', true); -- Costing + CEO
select pg_temp.pass_stage((select v from ids where k='p1'), 'rdm', '{"bom_link":"https://example.com/bom"}', 'ceo', false);   -- BOM (R&D manager submits, CEO approves)
select pg_temp.reset_role();
do $$ begin assert (select current_stage from public.ml_products where id=(select v from ids where k='p1')) = 'Packaging', 'at Packaging'; end $$;

-- Packaging is shared: Product fills its fields, Graphics fills the box design
select pg_temp.as_user('gmem');
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"box_content":"claims"}') $$, '%filled by the Product team%');
select public.ml_save_details((select v from ids where k='p1'), '{"box_design_link":"https://example.com/box"}');
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ select public.ml_save_details((select v from ids where k='p1'), '{"box_design_link":"https://x"}') $$, '%filled by the Graphics team%');
select public.ml_save_details((select v from ids where k='p1'), '{"box_content":"Claims and usage text","launch_projection":"12000"}');
select pg_temp.as_user('gmem');
select public.ml_submit_stage((select v from ids where k='p1'));
select pg_temp.reset_role();
do $$ declare ap uuid; begin
  select id into ap from public.ml_approvals where product_id=(select v from ids where k='p1') and status='PENDING' and stage='Packaging';
  perform set_config('request.jwt.claim.sub',(select v::text from ids where k='gm'),true); set local role authenticated; perform public.ml_approve(ap); reset role;
  select id into ap from public.ml_approvals where product_id=(select v from ids where k='p1') and status='PENDING' and stage='Packaging';
  perform set_config('request.jwt.claim.sub',(select v::text from ids where k='ceo'),true); set local role authenticated; perform public.ml_approve(ap); reset role;
end $$;
select pg_temp.pass_stage((select v from ids where k='p1'), 'pum', '{"po_number":"PO-1001","order_qty":"5000"}', 'ceo', false);  -- Purchase
select pg_temp.pass_stage((select v from ids where k='p1'), 'prodm', '{"qty_ready":"5000","dispatch_date":"2027-03-01"}', 'ceo', false); -- Production
select pg_temp.reset_role();
do $$ begin
  assert (select stage_status from public.ml_products where id=(select v from ids where k='p1')) = 'Completed', 'p1 completed';
  assert (select status from public.ml_launches where id=(select v from ids where k='launch')) = 'Active', 'launch waits for p2';
end $$;

-- 7. second product is still at Sample, so the launch is not complete; adding a product works
select pg_temp.as_user('pm');
select public.ml_add_product((select v from ids where k='launch'), 'Carry case', 'Accessory');
select public.ml_set_stage_dates((select v from ids where k='p2'), 'Sample', current_date, current_date + 10);
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ select public.ml_set_stage_dates((select v from ids where k='p2'), 'Sample', current_date, current_date+1) $$, '%Only a manager%');
select pg_temp.expect_fail($$ select public.ml_update_launch((select v from ids where k='launch'), 'Renamed', 'Other', '', current_date+90, 'Active') $$, '%Product manager or an admin%');

-- 8. row security: no direct writes, notifications are private
select pg_temp.as_user('pmem');
select pg_temp.expect_fail($$ update public.ml_products set current_stage = 'Production' $$, '%permission denied%');
select pg_temp.expect_fail($$ insert into public.ml_launches (name, start_date, target_date) values ('x', current_date, current_date) $$, '%permission denied%');
select pg_temp.expect_fail($$ update public.ml_notifications set title = 'hacked' $$, '%permission denied%');
do $$ begin assert (select count(*) from public.ml_notifications where user_id <> auth.uid()) = 0, 'sees only own notifications'; end $$;
update public.ml_notifications set is_read = true;
select pg_temp.expect_fail($$ select public.ml_notify(auth.uid(), 'a','b',null,null) $$, '%permission denied%');
select pg_temp.reset_role();
set local role anon;
select pg_temp.expect_fail($$ select count(*) from public.ml_launches $$, '%permission denied%');
reset role;

select 'SCENARIO PASSED' as result;
rollback;
