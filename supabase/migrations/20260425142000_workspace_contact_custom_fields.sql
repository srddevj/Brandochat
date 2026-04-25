create table if not exists public.workspace_contact_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  key text not null,
  label text not null,
  type text not null check (type in ('string', 'date', 'datetime', 'url', 'integer')),
  required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create index if not exists workspace_contact_fields_workspace_idx
  on public.workspace_contact_fields (workspace_id, created_at asc);

create trigger workspace_contact_fields_updated_at
  before update on public.workspace_contact_fields
  for each row execute procedure public.set_updated_at();

alter table public.workspace_contact_fields enable row level security;

create policy workspace_contact_fields_select_member
  on public.workspace_contact_fields for select
  using (public.is_workspace_member(workspace_id));

create policy workspace_contact_fields_insert_admin
  on public.workspace_contact_fields for insert
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy workspace_contact_fields_update_admin
  on public.workspace_contact_fields for update
  using (public.is_workspace_owner_or_admin(workspace_id))
  with check (public.is_workspace_owner_or_admin(workspace_id));

create policy workspace_contact_fields_delete_admin
  on public.workspace_contact_fields for delete
  using (public.is_workspace_owner_or_admin(workspace_id));
