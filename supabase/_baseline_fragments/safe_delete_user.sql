-- Safe user deletion RPC used by admin actions

create or replace function public.safe_delete_user(user_id_param uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb := '{}'::jsonb;
  deleted_count integer;
  is_admin boolean := false;
begin
  is_admin := exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
  if not (is_admin or auth.role() = 'service_role') then
    raise exception 'Not authorized';
  end if;

  with deleted as (
    delete from public.reviews where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('reviews_deleted', deleted_count);

  with deleted as (
    delete from public.business_claims where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('claims_deleted', deleted_count);

  with deleted as (
    delete from public.support_ticket_messages where sender_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('support_messages_deleted', deleted_count);

  with deleted as (
    delete from public.premium_payments where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('payments_deleted', deleted_count);

  with deleted as (
    delete from public.favorites where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('favorites_deleted', deleted_count);

  with deleted as (
    delete from public.notifications where user_id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('notifications_deleted', deleted_count);

  with deleted as (
    delete from public.profiles where id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('profile_deleted', deleted_count);

  with deleted as (
    delete from auth.users where id = user_id_param returning 1
  ) select count(*) into deleted_count from deleted;
  result := result || jsonb_build_object('auth_user_deleted', deleted_count);

  return result;
end;
$$;

grant execute on function public.safe_delete_user(uuid) to service_role;

