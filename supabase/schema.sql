create table if not exists public.rooms (
  room_code text primary key,
  room_token text not null,
  host_player_id text,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms add column if not exists room_token text;
alter table public.rooms add column if not exists host_player_id text;

create table if not exists public.room_players (
  room_code text not null references public.rooms(room_code) on delete cascade,
  player_id text not null,
  nickname text not null,
  team text,
  is_clue_giver boolean not null default false,
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (room_code, player_id)
);

create table if not exists public.room_events (
  room_code text primary key references public.rooms(room_code) on delete cascade,
  version bigint not null default 0
);

create table if not exists public.room_action_audit (
  id bigserial primary key,
  room_code text not null references public.rooms(room_code) on delete cascade,
  player_id text,
  action text not null,
  status text not null,
  reason text,
  actor_ip text,
  created_at timestamptz not null default now()
);

create table if not exists public.room_rate_limits (
  id bigserial primary key,
  scope_key text not null unique,
  room_code text not null references public.rooms(room_code) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  action_count int not null default 0,
  updated_at timestamptz not null default now()
);

do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.room_players;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.room_events;
exception when duplicate_object then null;
end $$;

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_events enable row level security;
alter table public.room_action_audit enable row level security;
alter table public.room_rate_limits enable row level security;

drop policy if exists "allow all room reads" on public.rooms;
drop policy if exists "allow all room writes" on public.rooms;
drop policy if exists "allow all player reads" on public.room_players;
drop policy if exists "allow all player writes" on public.room_players;
drop policy if exists "token room read" on public.rooms;
drop policy if exists "token room insert" on public.rooms;
drop policy if exists "token room update" on public.rooms;
drop policy if exists "token player read" on public.room_players;
drop policy if exists "token player write" on public.room_players;
drop policy if exists "token events read" on public.room_events;
drop policy if exists "no direct audit access" on public.room_action_audit;
drop policy if exists "no direct rate-limit access" on public.room_rate_limits;

create policy "token room read" on public.rooms
for select
using ((current_setting('request.headers', true)::jsonb ->> 'x-room-token') = room_token);

create policy "token room insert" on public.rooms
for insert
with check ((current_setting('request.headers', true)::jsonb ->> 'x-room-token') = room_token);

create policy "token room update" on public.rooms
for update
using ((current_setting('request.headers', true)::jsonb ->> 'x-room-token') = room_token)
with check ((current_setting('request.headers', true)::jsonb ->> 'x-room-token') = room_token);

create policy "token player read" on public.room_players
for select
using (
  exists (
    select 1 from public.rooms r
    where r.room_code = room_players.room_code
      and r.room_token = (current_setting('request.headers', true)::jsonb ->> 'x-room-token')
  )
);

create policy "token player write" on public.room_players
for all
using (
  exists (
    select 1 from public.rooms r
    where r.room_code = room_players.room_code
      and r.room_token = (current_setting('request.headers', true)::jsonb ->> 'x-room-token')
  )
)
with check (
  exists (
    select 1 from public.rooms r
    where r.room_code = room_players.room_code
      and r.room_token = (current_setting('request.headers', true)::jsonb ->> 'x-room-token')
  )
);

create policy "token events read" on public.room_events
for select
using (
  exists (
    select 1 from public.rooms r
    where r.room_code = room_events.room_code
      and r.room_token = (current_setting('request.headers', true)::jsonb ->> 'x-room-token')
  )
);

create policy "no direct audit access" on public.room_action_audit
for all
using (false)
with check (false);

create policy "no direct rate-limit access" on public.room_rate_limits
for all
using (false)
with check (false);
