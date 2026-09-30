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

alter table public.ai_usage_daily
  add column if not exists voice_request_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_usage_daily_voice_request_count_check'
      and conrelid = 'public.ai_usage_daily'::regclass
  ) then
    alter table public.ai_usage_daily
      add constraint ai_usage_daily_voice_request_count_check
      check (voice_request_count >= 0);
  end if;
end $$;

create or replace function public.consume_voice_quota(p_limit integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Tbilisi')::date;
  v_count integer;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_limit < 1 or p_limit > 200 then raise exception 'invalid quota limit'; end if;

  insert into public.ai_usage_daily(user_id, usage_date, request_count, voice_request_count, updated_at)
  values (v_uid, v_day, 0, 1, now())
  on conflict (user_id, usage_date)
  do update
    set voice_request_count = public.ai_usage_daily.voice_request_count + 1,
        updated_at = now()
    where public.ai_usage_daily.voice_request_count < p_limit
  returning voice_request_count into v_count;

  if v_count is null then
    select voice_request_count into v_count
    from public.ai_usage_daily
    where user_id = v_uid and usage_date = v_day;

    return jsonb_build_object(
      'allowed', false, 'used', coalesce(v_count, p_limit),
      'remaining', greatest(p_limit - coalesce(v_count, p_limit), 0),
      'limit', p_limit, 'date', v_day
    );
  end if;

  return jsonb_build_object(
    'allowed', true, 'used', v_count,
    'remaining', greatest(p_limit - v_count, 0),
    'limit', p_limit, 'date', v_day
  );
end;
$$;

grant execute on function public.consume_voice_quota(integer) to authenticated;
