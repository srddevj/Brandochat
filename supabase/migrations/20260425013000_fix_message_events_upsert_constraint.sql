drop index if exists public.message_events_unique_wa_message_idx;

create unique index if not exists message_events_unique_wa_message_idx
  on public.message_events (workspace_id, wa_chat_jid, wa_message_id);
