-- Repair stale support unread flags for users.
-- Use when tickets are marked unread without an actual admin response/message.
-- Safe scope:
-- - only unread tickets
-- - only closed/resolved tickets
-- - no admin_response text
-- - no admin message in thread

update public.support_tickets st
set
  is_read_by_user = true,
  updated_at = now()
where st.is_read_by_user = false
  and st.status in ('closed', 'resolved')
  and st.admin_response is null
  and not exists (
    select 1
    from public.support_ticket_messages stm
    join public.profiles p on p.id = stm.sender_id
    where stm.ticket_id = st.id
      and p.role = 'admin'
  );

-- Validation snapshot
select
  id,
  user_id,
  status,
  is_read_by_user,
  is_read_by_admin,
  admin_response,
  updated_at
from public.support_tickets
where user_id = '75d28211-ffa3-4265-b2b0-0d781660cd25'
order by updated_at desc nulls last
limit 50;
