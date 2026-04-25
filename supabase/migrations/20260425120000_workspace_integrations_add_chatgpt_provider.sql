alter table public.workspace_integrations
  drop constraint if exists workspace_integrations_provider_check;

alter table public.workspace_integrations
  add constraint workspace_integrations_provider_check
  check (provider in ('calendly', 'BrandoChat', 'custom_api', 'chatgpt'));
