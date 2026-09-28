-- Teen English Quest: Supabase schema
-- Privacy-first, friends-only competition for teen users.
-- No public directory, no public chat, no location fields.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  invite_code text not null unique default lower(substr(encode(gen_random_bytes(8),'hex'),1,12)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair
on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create table if not exists public.activity_catalog (
  activity_key text primary key,
  kind text not null check (kind in ('mission','boss')),
  xp integer not null check (xp between 1 and 150),
  active boolean not null default true
);

insert into public.activity_catalog(activity_key,kind,xp,active) values
('mission:1','mission',30,true),
('mission:2','mission',25,true),
('mission:3','mission',25,true),
('mission:4','mission',35,true),
('mission:5','mission',25,true),
('mission:6','mission',25,true),
('mission:7','mission',35,true),
('mission:8','mission',30,true),
('mission:9','mission',20,true),
('mission:10','mission',20,true),
('mission:11','mission',25,true),
('mission:12','mission',25,true),
('mission:13','mission',15,true),
('mission:14','mission',20,true),
('mission:15','mission',30,true),
('mission:16','mission',20,true),
('mission:17','mission',25,true),
('mission:18','mission',25,true),
('mission:19','mission',30,true),
('mission:20','mission',25,true),
('mission:21','mission',30,true),
('mission:22','mission',30,true),
('mission:23','mission',30,true),
('mission:24','mission',30,true),
('mission:25','mission',30,true),
('mission:26','mission',25,true),
('mission:27','mission',30,true),
('mission:28','mission',25,true),
('mission:29','mission',25,true),
('mission:30','mission',25,true),
('mission:31','mission',40,true),
('mission:32','mission',30,true),
('mission:33','mission',30,true),
('mission:34','mission',30,true),
('mission:35','mission',35,true),
('mission:36','mission',35,true),
('mission:37','mission',35,true),
('mission:38','mission',40,true),
('boss:1','boss',50,true),
('boss:2','boss',60,true),
('boss:3','boss',60,true),
('boss:4','boss',70,true),
('boss:5','boss',70,true),
('boss:6','boss',70,true),
('boss:7','boss',80,true),
('boss:8','boss',100,true)
on conflict (activity_key) do update
set xp=excluded.xp, kind=excluded.kind, active=excluded.active;

create table if not exists public.xp_claims (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('mission','boss','fresh','duolingo')),
  activity_key text not null,
  xp integer not null check (xp between 1 and 150),
  claimed_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists xp_claims_user_created_idx
on public.xp_claims(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.activity_catalog enable row level security;
alter table public.xp_claims enable row level security;

drop policy if exists "profile read self" on public.profiles;
create policy "profile read self" on public.profiles
for select to authenticated using (id=auth.uid());

drop policy if exists "profile update self" on public.profiles;
create policy "profile update self" on public.profiles
for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists "friendships read own" on public.friendships;
create policy "friendships read own" on public.friendships
for select to authenticated using (requester_id=auth.uid() or addressee_id=auth.uid());

drop policy if exists "catalog read auth" on public.activity_catalog;
create policy "catalog read auth" on public.activity_catalog
for select to authenticated using (active);

drop policy if exists "xp read self" on public.xp_claims;
create policy "xp read self" on public.xp_claims
for select to authenticated using (user_id=auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path=public
as $$
declare
  wanted text;
begin
  wanted := coalesce(nullif(new.raw_user_meta_data->>'username',''),'learner_'||substr(new.id::text,1,8));
  wanted := regexp_replace(wanted,'[^A-Za-z0-9_]','','g');
  if length(wanted)<3 then wanted := 'learner_'||substr(new.id::text,1,8); end if;

  begin
    insert into public.profiles(id,username) values(new.id,left(wanted,20));
  exception when unique_violation then
    insert into public.profiles(id,username) values(new.id,'learner_'||substr(new.id::text,1,8));
  end;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.claim_xp(p_kind text, p_key text)
returns table(awarded integer, total_xp bigint)
language plpgsql
security definer set search_path=public
as $$
declare
  uid uuid := auth.uid();
  pts integer;
  today_count integer;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  if p_kind in ('mission','boss') then
    select xp into pts from public.activity_catalog
    where activity_key=p_key and kind=p_kind and active=true;
    if pts is null then raise exception 'Unknown activity'; end if;

    if exists(select 1 from public.xp_claims where user_id=uid and kind=p_kind and activity_key=p_key) then
      awarded:=0;
    else
      insert into public.xp_claims(user_id,kind,activity_key,xp) values(uid,p_kind,p_key,pts);
      awarded:=pts;
    end if;

  elsif p_kind='duolingo' then
    pts:=10;
    if exists(select 1 from public.xp_claims where user_id=uid and kind='duolingo' and claimed_on=current_date) then
      awarded:=0;
    else
      insert into public.xp_claims(user_id,kind,activity_key,xp)
      values(uid,'duolingo','duolingo:'||current_date,pts);
      awarded:=pts;
    end if;

  elsif p_kind='fresh' then
    pts:=5;
    if exists(select 1 from public.xp_claims where user_id=uid and kind='fresh' and activity_key=p_key) then
      awarded:=0;
    else
      select count(*) into today_count from public.xp_claims
      where user_id=uid and kind='fresh' and claimed_on=current_date;
      if today_count>=3 then raise exception 'Daily fresh XP cap reached'; end if;
      insert into public.xp_claims(user_id,kind,activity_key,xp) values(uid,'fresh',p_key,pts);
      awarded:=pts;
    end if;
  else
    raise exception 'Unsupported activity kind';
  end if;

  select coalesce(sum(xp),0) into total_xp from public.xp_claims where user_id=uid;
  return next;
end $$;

create or replace function public.send_friend_request_by_code(p_code text)
returns text
language plpgsql
security definer set search_path=public
as $$
declare
  uid uuid:=auth.uid();
  target uuid;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select id into target from public.profiles where invite_code=lower(trim(p_code));
  if target is null then return 'not_found'; end if;
  if target=uid then return 'self'; end if;

  insert into public.friendships(requester_id,addressee_id,status)
  values(uid,target,'pending')
  on conflict do nothing;
  return 'sent';
end $$;

create or replace function public.respond_friend_request(p_friendship_id bigint, p_accept boolean)
returns text
language plpgsql
security definer set search_path=public
as $$
begin
  update public.friendships
  set status=case when p_accept then 'accepted' else 'declined' end,
      updated_at=now()
  where id=p_friendship_id and addressee_id=auth.uid() and status='pending';

  if not found then return 'not_found'; end if;
  return case when p_accept then 'accepted' else 'declined' end;
end $$;

create or replace function public.my_friend_requests()
returns table(friendship_id bigint, username text, created_at timestamptz)
language sql
security definer set search_path=public
as $$
  select f.id,p.username,f.created_at
  from public.friendships f
  join public.profiles p on p.id=f.requester_id
  where f.addressee_id=auth.uid() and f.status='pending'
  order by f.created_at desc;
$$;

create or replace function public.friend_leaderboard()
returns table(rank bigint, username text, week_xp bigint, lifetime_xp bigint, is_me boolean)
language sql
security definer set search_path=public
as $$
with friend_ids as (
  select auth.uid() as id
  union
  select case when requester_id=auth.uid() then addressee_id else requester_id end
  from public.friendships
  where status='accepted' and (requester_id=auth.uid() or addressee_id=auth.uid())
),
scores as (
  select p.id,p.username,
    coalesce(sum(x.xp) filter (where x.created_at >= date_trunc('week',now())),0)::bigint week_xp,
    coalesce(sum(x.xp),0)::bigint lifetime_xp
  from friend_ids f
  join public.profiles p on p.id=f.id
  left join public.xp_claims x on x.user_id=p.id
  group by p.id,p.username
)
select dense_rank() over(order by week_xp desc, lifetime_xp desc, username asc) as rank,
       username,week_xp,lifetime_xp,(id=auth.uid()) as is_me
from scores
order by rank,username;
$$;

grant execute on function public.claim_xp(text,text) to authenticated;
grant execute on function public.send_friend_request_by_code(text) to authenticated;
grant execute on function public.respond_friend_request(bigint,boolean) to authenticated;
grant execute on function public.my_friend_requests() to authenticated;
grant execute on function public.friend_leaderboard() to authenticated;
