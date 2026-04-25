alter table public.whatsapp_instances
  drop constraint if exists whatsapp_instances_workspace_id_key;

alter table public.whatsapp_instances
  add column if not exists display_name text,
  add column if not exists is_default boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

update public.whatsapp_instances
set
  display_name = coalesce(display_name, phone_label, 'Primary WhatsApp'),
  is_default = true
where display_name is null or is_default is false;

create index if not exists whatsapp_instances_workspace_idx
  on public.whatsapp_instances (workspace_id);

create unique index if not exists whatsapp_instances_one_default_per_workspace_idx
  on public.whatsapp_instances (workspace_id)
  where is_default;
