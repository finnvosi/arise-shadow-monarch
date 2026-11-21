-- ARISE: Shadow Monarch — Supabase Database Schema
-- Run this once in your Supabase SQL Editor (https://supabase.com/dashboard)

create table if not exists public.hunters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hunter_name text not null default 'Sung Jinwoo',
  hunter_rank text not null default 'E',
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  gold bigint not null default 180 check (gold >= 0),
  crystals integer not null default 30 check (crystals >= 0),
  stage integer not null default 1 check (stage >= 1),
  wave integer not null default 1 check (wave between 1 and 4),
  combat_power bigint not null default 142 check (combat_power >= 0),
  equipped_weapon text not null default 'steel',
  owned_weapons jsonb not null default '["steel"]'::jsonb,
  stats jsonb not null default '{"str":6,"agi":5,"int":4,"vit":5,"per":4}'::jsonb,
  shadows jsonb not null default '{"infantry":1,"igris":0,"tank":0,"beru":0}'::jsonb,
  kills integer not null default 0,
  boss_kills integer not null default 0,
  crits integer not null default 0,
  extractions integer not null default 0,
  claimed_quests jsonb not null default '{}'::jsonb,
  auto_skill boolean not null default true,
  speed smallint not null default 1 check (speed in (1, 2)),
  last_online_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hunters_leaderboard
  on public.hunters (combat_power desc, stage desc);

-- Auto-update updated_at on every save
create or replace function public.touch_hunters_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_hunters_updated_at on public.hunters;
create trigger trg_hunters_updated_at
  before update on public.hunters
  for each row execute function public.touch_hunters_updated_at();

-- Row Level Security: players only read/write their own save row
alter table public.hunters enable row level security;

drop policy if exists "Hunters can view own save" on public.hunters;
create policy "Hunters can view own save"
  on public.hunters for select
  using (auth.uid() = user_id);

drop policy if exists "Hunters can insert own save" on public.hunters;
create policy "Hunters can insert own save"
  on public.hunters for insert
  with check (auth.uid() = user_id);

drop policy if exists "Hunters can update own save" on public.hunters;
create policy "Hunters can update own save"
  on public.hunters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public Hunter Association Leaderboard (read-only view, hides private fields)
create or replace view public.hunter_leaderboard as
  select
    hunter_name,
    hunter_rank,
    level,
    stage,
    combat_power,
    updated_at
  from public.hunters
  order by combat_power desc, stage desc
  limit 50;

grant select on public.hunter_leaderboard to anon, authenticated;

-- Server-authoritative offline time check (prevents device clock spoofing)
create or replace function public.get_server_offline_seconds()
returns integer
language plpgsql
security definer
as $$
declare
  last_seen timestamptz;
  diff_sec integer;
begin
  select last_online_at into last_seen
  from public.hunters
  where user_id = auth.uid();

  if last_seen is null then
    return 0;
  end if;

  diff_sec := greatest(0, least(28800, floor(extract(epoch from (now() - last_seen)))::integer));

  update public.hunters
  set last_online_at = now()
  where user_id = auth.uid();

  return diff_sec;
end;
$$;
