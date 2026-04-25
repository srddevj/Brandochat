alter table public.whatsapp_instances
  add column if not exists settings jsonb not null default '{}'::jsonb;
