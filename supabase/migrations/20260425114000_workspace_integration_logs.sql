create table if not exists public.workspace_integration_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  integration_id uuid references public.workspace_integrations (id) on delete cascade,
  provider text not null check (provider in ('calendly', 'BrandoChat', 'custom_api')),
  level text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  action text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  source text not null default 'frontend',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists workspace_integration_logs_workspace_created_idx
  on public.workspace_integration_logs (workspace_id, created_at desc);

create index if not exists workspace_integration_logs_integration_created_idx
  on public.workspace_integration_logs (integration_id, created_at desc);

alter table public.workspace_integration_logs enable row level security;

create policy workspace_integration_logs_all_member
  on public.workspace_integration_logs for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
