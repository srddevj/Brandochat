create table if not exists public.workspace_calendly_webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  integration_id uuid not null references public.workspace_integrations (id) on delete cascade,
  scope text not null check (scope in ('organization', 'user', 'group')),
  organization_uri text not null,
  user_uri text,
  group_uri text,
  events text[] not null default '{}',
  callback_url text not null,
  signing_key text,
  state text not null default 'active' check (state in ('active', 'disabled')),
  calendly_webhook_uri text not null,
  retry_started_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, calendly_webhook_uri)
);

create index if not exists workspace_calendly_webhooks_workspace_idx
  on public.workspace_calendly_webhooks (workspace_id, updated_at desc);

create index if not exists workspace_calendly_webhooks_integration_idx
  on public.workspace_calendly_webhooks (integration_id, created_at desc);

create trigger workspace_calendly_webhooks_updated_at
  before update on public.workspace_calendly_webhooks
  for each row execute procedure public.set_updated_at();

create table if not exists public.calendly_webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  integration_id uuid references public.workspace_integrations (id) on delete set null,
  webhook_id uuid references public.workspace_calendly_webhooks (id) on delete set null,
  calendly_webhook_uri text,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  delivery_id text,
  idempotency_key text not null,
  occurred_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create index if not exists calendly_webhook_events_workspace_created_idx
  on public.calendly_webhook_events (workspace_id, created_at desc);

create index if not exists calendly_webhook_events_workspace_status_idx
  on public.calendly_webhook_events (workspace_id, processing_status, created_at desc);

create index if not exists calendly_webhook_events_delivery_idx
  on public.calendly_webhook_events (workspace_id, delivery_id)
  where delivery_id is not null;

create trigger calendly_webhook_events_updated_at
  before update on public.calendly_webhook_events
  for each row execute procedure public.set_updated_at();

alter table public.workspace_calendly_webhooks enable row level security;
alter table public.calendly_webhook_events enable row level security;

create policy workspace_calendly_webhooks_all_member
  on public.workspace_calendly_webhooks for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy calendly_webhook_events_all_member
  on public.calendly_webhook_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
