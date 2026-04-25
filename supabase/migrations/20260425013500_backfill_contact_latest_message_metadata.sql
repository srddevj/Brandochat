with latest_messages as (
  select distinct on (contact_id)
    contact_id,
    created_at,
    body
  from public.message_events
  where contact_id is not null
  order by contact_id, created_at desc
)
update public.contacts as c
set metadata =
  coalesce(c.metadata, '{}'::jsonb)
  || jsonb_build_object(
    'wa_last_message_at', latest_messages.created_at,
    'wa_last_message_body', latest_messages.body
  )
from latest_messages
where c.id = latest_messages.contact_id;

create index if not exists message_events_contact_created_idx
  on public.message_events (contact_id, created_at desc);
