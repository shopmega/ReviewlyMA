-- Harden function search_path for Supabase linter (0011_function_search_path_mutable)
-- Applies to existing public functions by name, regardless of argument signature.

do $$
declare
  r record;
  v_target_names text[] := array[
    'salary_sector_slug',
    'set_salary_sector_slug',
    'recalculate_business_rating',
    'handle_review_rating_sync',
    'sync_business_legacy_columns',
    'handle_new_user',
    'replace_business_hours',
    'handle_review_vote_change',
    'update_support_ticket_updated_at',
    'handle_business_reports_updated_at',
    'log_admin_action',
    'update_updated_at_column',
    'toggle_user_premium',
    'update_claim_proof_status',
    'safe_delete_user'
  ];
begin
  for r in
    select p.oid::regprocedure as fn_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(v_target_names)
  loop
    execute format('alter function %s set search_path = public', r.fn_signature);
  end loop;
end
$$;
