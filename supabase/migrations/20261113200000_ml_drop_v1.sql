-- Removes the first design's objects (20261113000000_ml_init.sql).
--
-- The app now keeps everything in ml_ws_records / ml_ws_meta (see
-- 20261113100000_ml_workspace.sql) and runs the launch rules in the server, so
-- the v1 tables and their ml_* functions are unused. They were already dropped
-- from the live project by hand; this migration makes a fresh setup end in the
-- same state, and does nothing where they are already gone.
--
-- The earlier migrations are left as they were: they were applied as written,
-- and ml_workspace.sql seeds the first admin from ml_profiles.

drop table if exists
  public.ml_events,
  public.ml_notifications,
  public.ml_approvals,
  public.ml_products,
  public.ml_launches,
  public.ml_profiles,
  public.ml_stages
cascade;

drop sequence if exists public.ml_launch_seq;

-- The v1 functions, whatever their argument lists.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'ml_touch', 'ml_is_member', 'ml_me', 'ml_notify', 'ml_notify_stage_managers', 'ml_notify_admins',
         'ml_auto_plan', 'ml_create_launch', 'ml_update_launch', 'ml_add_product', 'ml_can_work',
         'ml_save_details', 'ml_submit_stage', 'ml_approve', 'ml_send_back', 'ml_set_stage_dates')
  loop
    execute 'drop function if exists ' || f.sig || ' cascade';
  end loop;
end $$;
