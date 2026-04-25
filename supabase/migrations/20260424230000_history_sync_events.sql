alter table public.message_events
  add column if not exists whatsapp_instance_id uuid references public.whatsapp_instances (id) on delete set null;

create unique index if not exists message_events_unique_wa_message_idx
  on public.message_events (workspace_id, wa_chat_jid, wa_message_id)
  where wa_message_id is not null;

create index if not exists message_events_instance_created_idx
  on public.message_events (whatsapp_instance_id, created_at desc);
