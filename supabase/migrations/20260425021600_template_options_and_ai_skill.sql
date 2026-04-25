alter table public.message_templates
  add column if not exists options jsonb not null default '[]'::jsonb;
