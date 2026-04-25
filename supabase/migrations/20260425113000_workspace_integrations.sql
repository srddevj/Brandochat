create table if not exists public.workspace_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null check (provider in ('calendly', 'BrandoChat', 'custom_api')),
  display_name text not null,
  auth_type text not null check (auth_type in ('none', 'api_key', 'oauth', 'service_account_json')),
  status text not null default 'inactive' check (status in ('inactive', 'active', 'error')),
  credentials jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create index if not exists workspace_integrations_workspace_provider_idx
  on public.workspace_integrations (workspace_id, provider);

create index if not exists workspace_integrations_workspace_status_idx
  on public.workspace_integrations (workspace_id, status);

create trigger workspace_integrations_updated_at
  before update on public.workspace_integrations
  for each row execute procedure public.set_updated_at();

alter table public.workspace_integrations enable row level security;

create policy workspace_integrations_all_member
  on public.workspace_integrations for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
