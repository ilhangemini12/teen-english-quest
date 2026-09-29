alter table public.user_preferences
  add column if not exists device_presets jsonb not null
    default '{"desktop":"original","tablet":"original","mobile":"original"}'::jsonb,
  add column if not exists kid_hints boolean not null default true;
