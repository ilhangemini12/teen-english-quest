alter table public.user_preferences
  add column if not exists active_language text not null default 'en'
    check (active_language = any (array['en','es','de','ru'])),
  add column if not exists language_levels jsonb not null
    default '{"en":"auto","es":"A1","de":"A1","ru":"A1"}'::jsonb;
