-- BrandoChat-style automation platform — core schema, updated_at, RLS

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  wa_jid text not null,
  phone_e164 text,
  display_name text,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, wa_jid)
);

create index contacts_workspace_idx on public.contacts (workspace_id);
create index contacts_wa_jid_idx on public.contacts (wa_jid);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index message_templates_workspace_idx on public.message_templates (workspace_id);

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default false,
  entry_node_id text not null default 'start',
  graph jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automations_workspace_idx on public.automations (workspace_id);

create table public.contact_flow_state (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  automation_id uuid not null references public.automations (id) on delete cascade,
  current_node_id text not null,
  status text not null default 'running'
    check (status in ('running', 'awaiting_reply', 'completed', 'paused')),
  variables jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, automation_id)
);

create index contact_flow_state_contact_idx on public.contact_flow_state (contact_id);
create index contact_flow_state_automation_idx on public.contact_flow_state (automation_id);

create table public.message_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  wa_message_id text,
  wa_chat_jid text,
  body text,
  automation_id uuid references public.automations (id) on delete set null,
  node_id text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index message_events_workspace_created_idx
  on public.message_events (workspace_id, created_at desc);

create table public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  pairing_status text not null default 'disconnected'
    check (pairing_status in ('disconnected', 'qr', 'connected', 'error')),
  last_error text,
  phone_label text,
  last_connected_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute procedure public.set_updated_at();

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute procedure public.set_updated_at();

create trigger message_templates_updated_at
  before update on public.message_templates
  for each row execute procedure public.set_updated_at();

create trigger automations_updated_at
  before update on public.automations
  for each row execute procedure public.set_updated_at();

create trigger contact_flow_state_updated_at
  before update on public.contact_flow_state
  for each row execute procedure public.set_updated_at();

create trigger whatsapp_instances_updated_at
  before update on public.whatsapp_instances
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: profile row
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- New workspace: creator becomes owner
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute procedure public.handle_new_workspace();

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer)
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner_or_admin(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner_or_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.contacts enable row level security;
alter table public.message_templates enable row level security;
alter table public.automations enable row level security;
alter table public.contact_flow_state enable row level security;
alter table public.message_events enable row level security;
alter table public.whatsapp_instances enable row level security;

-- profiles
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid());

-- workspaces
create policy workspaces_select_member
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy workspaces_insert_authenticated
  on public.workspaces for insert
  with check (auth.uid() is not null);

create policy workspaces_update_admin
  on public.workspaces for update
  using (public.is_workspace_owner_or_admin(id));

create policy workspaces_delete_owner
  on public.workspaces for delete
  using (
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = workspaces.id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

-- workspace_members
create policy workspace_members_select
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy workspace_members_insert_admin
  on public.workspace_members for insert
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy workspace_members_delete_admin_or_self
  on public.workspace_members for delete
  using (
    user_id = auth.uid()
    or public.is_workspace_owner_or_admin(workspace_id)
  );

create policy workspace_members_update_admin
  on public.workspace_members for update
  using (public.is_workspace_owner_or_admin(workspace_id));

-- tenant tables
create policy contacts_all
  on public.contacts for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy message_templates_all
  on public.message_templates for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy automations_all
  on public.automations for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy contact_flow_state_all
  on public.contact_flow_state for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy message_events_all
  on public.message_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- whatsapp_instances: members read; writes come from backend (service role)
create policy whatsapp_instances_select
  on public.whatsapp_instances for select
  using (public.is_workspace_member(workspace_id));

create policy whatsapp_instances_insert_member
  on public.whatsapp_instances for insert
  with check (public.is_workspace_member(workspace_id));

create policy whatsapp_instances_update_member
  on public.whatsapp_instances for update
  using (public.is_workspace_member(workspace_id));

create policy whatsapp_instances_delete_admin
  on public.whatsapp_instances for delete
  using (public.is_workspace_owner_or_admin(workspace_id));
