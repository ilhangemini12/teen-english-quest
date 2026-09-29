-- BatumHub v4.6: keep school grade separate from English proficiency,
-- and persist the simplified one-tap space preset.
alter table public.user_preferences
  add column if not exists english_level text not null default 'auto'
    check (english_level = any (array['auto','A1','A2','B1','B2','C1'])),
  add column if not exists ui_preset text not null default 'original'
    check (ui_preset = any (array['original','minimal','focus','extended','sat']));
