alter table public.user_preferences
  add column if not exists native_language text not null default 'tr';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_preferences_native_language_check'
      and conrelid = 'public.user_preferences'::regclass
  ) then
    alter table public.user_preferences
      add constraint user_preferences_native_language_check
      check (native_language = any (array['tr'::text,'en'::text,'es'::text,'de'::text,'ru'::text,'ka'::text]));
  end if;
end $$;
