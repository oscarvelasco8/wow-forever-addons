begin;
alter table public.addons add column installation_instructions text not null default ''
  constraint addon_installation_length check (length(installation_instructions) <= 30000);
comment on column public.addons.installation_instructions is 'Plain-text installation instructions, scoped to this addon. Inherits existing RLS.';
commit;
