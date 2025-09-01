-- Kullanıcı sign-up olurken unique username eklenmesi
-- Supabase SQL — FINAL (case-insensitive usernames; visible to other signed-in users)

BEGIN;

-- ============ TABLE ============

create table if not exists public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    -- Original (displayed) username typed by the user
    username text not null,
    -- Case-insensitive key for uniqueness/search (trim + lower)
    username_ci text generated always as (lower(btrim (username))) stored,
    created_at timestamptz not null default now(),
    -- Allowed: letters, numbers, underscore; 3..20 chars
    constraint profiles_username_format_chk check (
        username ~ '^[A-Za-z0-9_]{3,20}$'
    )
);

-- Enforce case-insensitive uniqueness (Ali ≡ ali)
create unique index if not exists profiles_username_ci_unique on public.profiles (username_ci);

comment on
table public.profiles is '1:1 with auth.users; public game handle lives here';

comment on column public.profiles.username is 'Displayed username (case kept)';

comment on column public.profiles.username_ci is 'Lowercased username for uniqueness/search';

-- ============ RLS ============

alter table public.profiles enable row level security;

-- Clean rebuild of policies (idempotent)
drop policy if exists "profiles_select_auth" on public.profiles;

drop policy if exists "profiles_insert_own" on public.profiles;

drop policy if exists "profiles_update_own" on public.profiles;

-- Authenticated users can read all profiles (to show names in-game)
create policy "profiles_select_auth" on public.profiles for
select to authenticated using (true);

-- Only the owner can insert their own row
create policy "profiles_insert_own" on public.profiles for
insert
    to authenticated
with
    check (user_id = auth.uid ());

-- Only the owner can update their row (username locked by trigger below)
create policy "profiles_update_own" on public.profiles for
update to authenticated using (user_id = auth.uid ())
with
    check (user_id = auth.uid ());

-- ============ TRIGGERS ============

-- Prevent changing username after it is set
create or replace function public.tg_lock_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'username cannot be changed once set';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_username on public.profiles;

create trigger profiles_lock_username
  before update of username on public.profiles
  for each row
  execute procedure public.tg_lock_username();

-- ============ RPCs ============

-- Case-insensitive availability check
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1
    from public.profiles
    where username_ci = lower(btrim(p_username))
  );
$$;

-- Create profile for current user after sign-up
create or replace function public.create_profile(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_username text := btrim(p_username);
  v_row public.profiles;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if v_username is null or length(v_username) < 3 or length(v_username) > 20
     or v_username !~ '^[A-Za-z0-9_]+$' then
    raise exception 'invalid username format';
  end if;

  insert into public.profiles (user_id, username)
  values (v_user, v_username)
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'username is taken';
end;
$$;

-- ============ GRANTS ============

grant usage on schema public to anon, authenticated;

grant select on table public.profiles to authenticated;

grant insert , update on table public.profiles to authenticated;

grant
execute on function public.username_available (text) to anon,
authenticated;

grant
execute on function public.create_profile (text) to authenticated;

COMMIT;

-- Kategori ve Kart tablolarının oluşturulması

-- UUID üretimi için (Supabase'te genelde açıktır ama garanti edelim)
create extension if not exists pgcrypto;

-- ========== TABLES ==========

-- categories
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid (),
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- case-insensitive unique index for category name
create unique index if not exists categories_name_unique_ci on public.categories (lower(name));

-- cards
create table if not exists public.cards (
  id           uuid primary key default gen_random_uuid(),
  word         text not null,
  taboo_words  text[] not null
               check (array_length(taboo_words, 1) is not null and array_length(taboo_words, 1) >= 3),
  category_id  uuid not null references public.categories(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- aynı kategoride aynı kelimeyi (case-insensitive) engellemek için unique index
create unique index if not exists cards_word_unique_per_category_ci on public.cards (lower(word), category_id);

-- updated_at otomatik güncelleme
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_categories_set_updated_at on public.categories;

create trigger trg_categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_cards_set_updated_at on public.cards;

create trigger trg_cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

-- ========== RLS ==========

alter table public.categories enable row level security;

alter table public.cards enable row level security;

-- sadece SELECT (client read-only)
drop policy if exists categories_read_all on public.categories;

create policy categories_read_all on public.categories for
select to anon, authenticated using (true);

drop policy if exists cards_read_all on public.cards;

create policy cards_read_all on public.cards for
select to anon, authenticated using (true);

-- Rooms tablosu oluşturma

-- UUID ve random bytes için
create extension if not exists pgcrypto;

-- Takım enumu
do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_color') then
    create type team_color as enum ('Kırmızı', 'Mavi');

end if;

end $$;

-- updated_at için ortak trigger fonksiyonu
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ROOMS


create table if not exists public.rooms (
  id               uuid primary key default gen_random_uuid(),
  code             text not null
                     default upper(encode(gen_random_bytes(3), 'hex')),
  owner_id         uuid not null references auth.users(id) on delete cascade,
  stream_url       text null,

  round_second     integer not null check (round_second > 0),
  pass_limit       integer not null check (pass_limit >= 0),

  active_team      team_color null,
  explainer_id     uuid null references auth.users(id) on delete set null,
  controller_id    uuid null references auth.users(id) on delete set null,

  current_card_id  uuid null references public.cards(id) on delete set null,
  used_card_ids    uuid[] not null default '{}',
  passes_used      integer not null default 0 check (passes_used >= 0),

  teams            jsonb not null default '[]',
  starts_at        timestamptz null,
  ends_at          timestamptz null,

  category_id      uuid not null references public.categories(id) on delete restrict,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

-- code formatı ve benzersizlik
constraint rooms_code_format check (code ~ '^[0-9A-F]{6}$'),
constraint rooms_code_unique unique (code),

-- teams alanı bir JSON array olmalı
constraint rooms_teams_is_array check (
    jsonb_typeof (teams) = 'array'
),

-- zaman tutarlılığı (ikisi de doluysa ends_at >= starts_at)
constraint rooms_time_order check (
    starts_at is null
    or ends_at is null
    or ends_at >= starts_at
),

-- current_card_id, used_card_ids içinde olmamalı (varsa)
constraint rooms_current_not_used check (
    current_card_id is null
    or not(
        current_card_id = any (used_card_ids)
    )
),

-- passes_used, pass_limit'i aşmasın (ikisi de doluysa)
constraint rooms_pass_limit_guard check (
    pass_limit is null or passes_used <= pass_limit
  )
);

-- updated_at trigger
drop trigger if exists trg_rooms_set_updated_at on public.rooms;

create trigger trg_rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

-- === RLS: client read-only ===
alter table public.rooms enable row level security;

drop policy if exists rooms_read_all on public.rooms;

create policy rooms_read_all on public.rooms for
select to anon, authenticated using (true);

-- (Opsiyonel) Realtime yayınını aç — hata verirse sessiz yut
do $$ begin perform 1
from pg_publication
where
    pubname = 'supabase_realtime';

if found then
execute 'alter publication supabase_realtime add table public.rooms';

end if;

exception when others then
-- publication yoksa sorun değil
null;

end $$;

-- rooms: sadece INSERT izni (authenticated), owner_id = auth.uid() şartı
drop policy if exists rooms_insert_own on public.rooms;

create policy rooms_insert_own on public.rooms for
insert
    to authenticated
with
    check (owner_id = auth.uid ());