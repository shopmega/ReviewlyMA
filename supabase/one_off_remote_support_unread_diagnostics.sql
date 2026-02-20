-- Support unread-state diagnostics (read-only).
-- Use to investigate dashboard alert persistence:
-- "Nouvelle reponse du support / message(s) non lu(s)".

-- 1) Policy inventory for support_tickets updates.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'support_tickets'
order by policyname;

-- 2) Unread tickets by user.
select
  user_id,
  count(*)::bigint as unread_ticket_count
from public.support_tickets
where is_read_by_user = false
group by user_id
order by unread_ticket_count desc
limit 50;

-- 3) Latest unread tickets snapshot.
select
  id,
  user_id,
  status,
  is_read_by_user,
  is_read_by_admin,
  admin_response,
  created_at,
  updated_at
from public.support_tickets
where is_read_by_user = false
order by updated_at desc nulls last
limit 100;

-- 4) Admin messages linked to unread tickets (sanity check).
select
  stm.ticket_id,
  max(stm.created_at) as last_admin_message_at
from public.support_ticket_messages stm
join public.support_tickets st on st.id = stm.ticket_id
where st.is_read_by_user = false
group by stm.ticket_id
order by last_admin_message_at desc
limit 100;
