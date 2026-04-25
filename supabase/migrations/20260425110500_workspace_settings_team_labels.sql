create extension if not exists "pgcrypto";

alter table public.workspaces
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists timezone text not null default 'UTC';

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_invitations_workspace_status_idx
  on public.workspace_invitations (workspace_id, status, created_at desc);

create unique index if not exists workspace_invitations_pending_email_idx
  on public.workspace_invitations (workspace_id, lower(email))
  where status = 'pending';

create table if not exists public.workspace_labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null default '#10b981',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index if not exists workspace_labels_workspace_idx
  on public.workspace_labels (workspace_id, name);

create table if not exists public.conversation_labels (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  label_id uuid not null references public.workspace_labels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, label_id)
);

create index if not exists conversation_labels_workspace_idx
  on public.conversation_labels (workspace_id, label_id);

create trigger workspace_invitations_updated_at
  before update on public.workspace_invitations
  for each row execute procedure public.set_updated_at();

create trigger workspace_labels_updated_at
  before update on public.workspace_labels
  for each row execute procedure public.set_updated_at();

alter table public.workspace_invitations enable row level security;
alter table public.workspace_labels enable row level security;
alter table public.conversation_labels enable row level security;

create policy workspace_invitations_select_member
  on public.workspace_invitations for select
  using (public.is_workspace_member(workspace_id));

create policy workspace_invitations_insert_admin
  on public.workspace_invitations for insert
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy workspace_invitations_update_admin
  on public.workspace_invitations for update
  using (public.is_workspace_owner_or_admin(workspace_id))
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy workspace_invitations_delete_admin
  on public.workspace_invitations for delete
  using (public.is_workspace_owner_or_admin(workspace_id));

create policy workspace_labels_all_member
  on public.workspace_labels for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy conversation_labels_all_member
  on public.conversation_labels for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
