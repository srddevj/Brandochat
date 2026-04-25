create extension if not exists "pgcrypto";

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  wa_chat_jid text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'deleted')),
  assignee text,
  source_whatsapp_instance_id uuid references public.whatsapp_instances (id) on delete set null,
  started_at timestamptz not null default now(),
  last_message_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_workspace_status_idx
  on public.conversations (workspace_id, status, updated_at desc);

create index if not exists conversations_contact_status_idx
  on public.conversations (contact_id, status, updated_at desc);

create unique index if not exists conversations_one_open_per_contact_idx
  on public.conversations (workspace_id, contact_id)
  where status = 'open';

alter table public.message_events
  add column if not exists conversation_id uuid references public.conversations (id) on delete set null;

create index if not exists message_events_conversation_created_idx
  on public.message_events (conversation_id, created_at desc);

alter table public.automations
  add column if not exists trigger_type text not null default 'message.received',
  add column if not exists trigger_config jsonb not null default '{}'::jsonb,
  add column if not exists version integer not null default 1;

create index if not exists automations_trigger_idx
  on public.automations (workspace_id, is_active, trigger_type);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  automation_id uuid not null references public.automations (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'awaiting_reply', 'completed', 'paused', 'failed')),
  current_node_id text not null,
  variables jsonb not null default '{}'::jsonb,
  trigger_type text not null,
  trigger_payload jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists automation_runs_workspace_status_idx
  on public.automation_runs (workspace_id, status, updated_at desc);

create index if not exists automation_runs_contact_status_idx
  on public.automation_runs (contact_id, status, updated_at desc);

create index if not exists automation_runs_conversation_status_idx
  on public.automation_runs (conversation_id, status, updated_at desc);

create table if not exists public.webhook_triggers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  automation_id uuid not null references public.automations (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_triggers_workspace_idx
  on public.webhook_triggers (workspace_id);

create table if not exists public.scheduled_trigger_locks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  automation_id uuid not null references public.automations (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  lock_key text not null,
  fired_at timestamptz not null default now(),
  unique (automation_id, contact_id, lock_key)
);

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();

create trigger automation_runs_updated_at
  before update on public.automation_runs
  for each row execute procedure public.set_updated_at();

create trigger webhook_triggers_updated_at
  before update on public.webhook_triggers
  for each row execute procedure public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.webhook_triggers enable row level security;
alter table public.scheduled_trigger_locks enable row level security;

create policy conversations_select_member
  on public.conversations for select
  using (public.is_workspace_member(workspace_id));

create policy conversations_insert_member
  on public.conversations for insert
  with check (public.is_workspace_member(workspace_id));

create policy conversations_update_member
  on public.conversations for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy automation_runs_select_member
  on public.automation_runs for select
  using (public.is_workspace_member(workspace_id));

create policy webhook_triggers_select_member
  on public.webhook_triggers for select
  using (public.is_workspace_member(workspace_id));

create policy webhook_triggers_insert_admin
  on public.webhook_triggers for insert
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy webhook_triggers_update_admin
  on public.webhook_triggers for update
  using (public.is_workspace_owner_or_admin(workspace_id))
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy scheduled_trigger_locks_select_member
  on public.scheduled_trigger_locks for select
  using (public.is_workspace_member(workspace_id));
