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

    -------

    -- =====================================================================
-- RPC: start_turn(room_code)
--  - Kimler çağırabilir? authenticated (login olanlar)
--  - Kim başlatabilir? Oda sahibi ya da teams içinde kayıtlı bir oyuncu
--  - Ne yapar?
--      * active_team boşsa 'Kırmızı' ile başlar
--      * Sıradaki anlatan (explainer) ve kontrol (controller) oyuncularını belirler
--      * starts_at = now(), ends_at = now() + round_second
--      * passes_used = 0
--      * rooms satırını günceller ve güncel satırı döner
--  - Not: RLS, SECURITY DEFINER altında tablo sahibi tarafından bypass edilir
-- =====================================================================

create or replace function public.start_turn(p_room_code text)
returns public.rooms
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_room public.rooms;
  v_active team_color;
  v_self uuid[];    -- aktif takım oyuncuları (sıralı)
  v_other uuid[];   -- karşı takım oyuncuları (sıralı)
  v_next_explainer uuid;
  v_next_controller uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- İlgili odayı kilitleyerek al
  select *
    into v_room
    from public.rooms
   where code = upper(p_room_code)
   for update;

  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  -- Yetki: oda sahibi ya da teams içinde oyuncu olmalı
  if v_room.owner_id <> v_uid and not exists (
    select 1
      from jsonb_array_elements(v_room.teams) t
      cross join jsonb_array_elements(t->'players') with ordinality p(player, ord)
     where (player->>'id')::uuid = v_uid
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Aktif takım: ilk turda boşsa Kırmızı
  v_active := coalesce(v_room.active_team, 'Kırmızı'::team_color);

  -- Aktif takım oyuncuları (sıralı)
  select coalesce(array_agg((p->>'id')::uuid order by ord), '{}')
    into v_self
    from jsonb_array_elements(v_room.teams) t,
         jsonb_array_elements(t->'players') with ordinality p(p, ord)
   where t->>'color' = v_active::text;

  -- Karşı takım oyuncuları (sıralı)
  select coalesce(array_agg((p->>'id')::uuid order by ord), '{}')
    into v_other
    from jsonb_array_elements(v_room.teams) t,
         jsonb_array_elements(t->'players') with ordinality p(p, ord)
   where t->>'color' <> v_active::text;

  -- Sıradaki anlatan: mevcut explainer_id'den sonra gelen
  if array_length(v_self,1) is null then
    v_next_explainer := null;
  else
    v_next_explainer := coalesce(
      v_self[coalesce(array_position(v_self, v_room.explainer_id), 0) + 1],
      v_self[1]
    );
  end if;

  -- Sıradaki kontrol: karşı takımda mevcut controller_id'den sonra gelen
  if array_length(v_other,1) is null then
    v_next_controller := null;
  else
    v_next_controller := coalesce(
      v_other[coalesce(array_position(v_other, v_room.controller_id), 0) + 1],
      v_other[1]
    );
  end if;

  update public.rooms
     set active_team   = v_active,
         explainer_id  = v_next_explainer,
         controller_id = v_next_controller,
         starts_at     = now(),
         ends_at       = now() + make_interval(secs => round_second),
         passes_used   = 0,
         updated_at    = now()
   where id = v_room.id
   returning * into v_room;

  return v_room;
end;
$$;

-- Yetkiler: sadece authenticated çağırabilsin
revoke all on function public.start_turn (text) from public;

grant execute on function public.start_turn (text) to authenticated;

-- (Opsiyonel) Açıklama
comment on function public.start_turn (text) is 'Starts a turn for the given room code: rotates explainer/controller, sets starts_at/ends_at, resets passes_used.';

-- =====================================================================
-- Realtime Publication (idempotent): rooms tablosu yayında değilse ekle
--  - Supabase varsayılan yayını: supabase_realtime
--  - Tablo zaten yayındaysa sessizce geç
-- =====================================================================
do $$
begin
  perform 1
    from pg_publication
   where pubname = 'supabase_realtime';

  if not found then
    -- publication yoksa sessiz geç (local/dev ortamında olabilir)
    return;
  end if;

  -- rooms zaten yayında ise duplicate_object fırlatır; yutalım
  begin
    execute 'alter publication supabase_realtime add table public.rooms';
  exception
    when duplicate_object then
      null;
    when undefined_object then
      -- tablo ya da publication yoksa sessiz geç
      null;
  end;
end$$;

-- =====================================================================
-- RPC: finish_turn(room_code)
--  - Kimler çağırabilir? authenticated (login olanlar)
--  - Yetki: Oda sahibi ya da rooms.teams içindeki bir oyuncu
--  - Ne yapar?
--      * active_team'i karşı takıma çevirir (Kırmızı <-> Mavi)
--      * current_card_id doluysa used_card_ids'e ekler (duplicate'siz)
--      * starts_at/ends_at'i sıfırlar, passes_used=0 yapar
--      * güncellenmiş rooms satırını döner
-- =====================================================================

create or replace function public.finish_turn(p_room_code text)
returns public.rooms
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_room public.rooms;

v_uid uuid := auth.uid ();

v_next team_color;

begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- Odayı kilitleyerek al
  select *
    into v_room
    from public.rooms
   where code = upper(p_room_code)
   for update;

  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  -- Yetki: owner veya teams içinde oyuncu olmalı
  if v_room.owner_id <> v_uid and not exists (
    select 1
      from jsonb_array_elements(v_room.teams) t
      cross join jsonb_array_elements(t->'players') with ordinality p(player, ord)
     where (player->>'id')::uuid = v_uid
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Sıradaki aktif takım (boş ise Kırmızı kabul edip Mavi'ye geçir)
  v_next := case coalesce(v_room.active_team, 'Kırmızı'::team_color)
              when 'Kırmızı' then 'Mavi'::team_color
              else 'Kırmızı'::team_color
            end;

  -- Güncelleme:
  -- - current_card_id varsa used_card_ids'e bir kez ekle
  -- - zaman ve sayaçları sıfırla
  update public.rooms
     set active_team     = v_next,
         used_card_ids   = case
                             when v_room.current_card_id is not null
                              and not (v_room.current_card_id = any(used_card_ids))
                             then used_card_ids || v_room.current_card_id
                             else used_card_ids
                           end,
         current_card_id  = null,
         starts_at        = null,
         ends_at          = null,
         passes_used      = 0,
         updated_at       = now()
   where id = v_room.id
   returning * into v_room;

  return v_room;
end;

$$;

-- Yetkiler: sadece authenticated çağırabilsin
revoke all on function public.finish_turn (text) from public;

grant execute on function public.finish_turn (text) to authenticated;

comment on function public.finish_turn (text) is 'Finishes the current turn: toggles active_team, appends current_card_id to used_card_ids if present, clears timers and counters, and returns updated room row.';

create or replace function public.server_now()
returns timestamptz language sql stable as $$ select now() $$;

grant
execute on function public.server_now () to anon,
authenticated;

-----------------------

-- =====================================================================
-- RPC: draw_card(room_code)
--  - Kimler çağırabilir? authenticated
--  - Yetki: Oda sahibi ya da rooms.teams içinde kayıtlı bir oyuncu
--  - Ne yapar?
--      * rooms.category_id içinden, used_card_ids + current_card_id HARİÇ rastgele kart seçer
--      * daha önce görünen current_card_id varsa used_card_ids'e EKLER (duplicate'siz)
--      * rooms.current_card_id'yi yeni kartla günceller
--      * SEÇİLEN kartı (public.cards satırı) döner
--      * Uygun kart yoksa "no_available_card" hatası fırlatır
-- =====================================================================

create or replace function public.draw_card(p_room_code text)
returns public.cards
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_room public.rooms;
  v_card public.cards;
  v_uid  uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- Odayı kilitleyerek al
  select *
    into v_room
    from public.rooms
   where code = upper(p_room_code)
   for update;

  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  -- Yetki kontrolü: owner veya teams içinde oyuncu olmalı
  if v_room.owner_id <> v_uid and not exists (
    select 1
      from jsonb_array_elements(v_room.teams) t
      cross join jsonb_array_elements(t->'players') with ordinality p(player, ord)
     where (player->>'id')::uuid = v_uid
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Kategori içinden, used_card_ids + current_card_id HARİÇ rastgele kart seç
  select c.*
    into v_card
    from public.cards c
   where c.category_id = v_room.category_id
     and (v_room.current_card_id is null or c.id <> v_room.current_card_id)
     and c.id <> all(v_room.used_card_ids)  -- boş array ise zaten TRUE olur
   order by random()
   limit 1;

  if not found then
    raise exception 'no_available_card' using errcode = 'P0001';
  end if;

  -- Önce: mevcut current_card_id varsa ve used_card_ids'te yoksa ekle
  update public.rooms
     set used_card_ids = case
                           when v_room.current_card_id is not null
                             and not (v_room.current_card_id = any(used_card_ids))
                           then used_card_ids || v_room.current_card_id
                           else used_card_ids
                         end,
         current_card_id = v_card.id,
         updated_at      = now()
   where id = v_room.id;

  return v_card;
end;
$$;

revoke all on function public.draw_card (text) from public;

grant execute on function public.draw_card (text) to authenticated;

comment on function public.draw_card (text) is 'Draws a new card for the room: excludes used_card_ids and current_card_id, appends previous current card to used_card_ids, returns the selected card row.';

----------------------

-- Önce (varsa) draw_card'ı kaldır
drop function if exists public.draw_card (text);

-- start_turn: tur başlatırken otomatik kart seçsin
create or replace function public.start_turn(p_room_code text)
returns public.rooms
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_room public.rooms;
  v_active team_color;
  v_self uuid[];    -- aktif takım oyuncuları (sıralı)
  v_other uuid[];   -- karşı takım oyuncuları (sıralı)
  v_next_explainer uuid;
  v_next_controller uuid;
  v_uid uuid := auth.uid();
  v_card public.cards;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '28000';
  end if;

  -- Odayı kilitleyerek al
  select *
    into v_room
    from public.rooms
   where code = upper(p_room_code)
   for update;

  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;

  -- Yetki: owner veya odadaki oyuncu
  if v_room.owner_id <> v_uid and not exists (
    select 1
      from jsonb_array_elements(v_room.teams) t
      cross join jsonb_array_elements(t->'players') with ordinality p(player, ord)
     where (player->>'id')::uuid = v_uid
  ) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Aktif takım: ilk turda boşsa Kırmızı
  v_active := coalesce(v_room.active_team, 'Kırmızı'::team_color);

  -- Aktif takım oyuncuları (sıralı)
  select coalesce(array_agg((p->>'id')::uuid order by ord), '{}')
    into v_self
    from jsonb_array_elements(v_room.teams) t,
         jsonb_array_elements(t->'players') with ordinality p(p, ord)
   where t->>'color' = v_active::text;

  -- Karşı takım oyuncuları (sıralı)
  select coalesce(array_agg((p->>'id')::uuid order by ord), '{}')
    into v_other
    from jsonb_array_elements(v_room.teams) t,
         jsonb_array_elements(t->'players') with ordinality p(p, ord)
   where t->>'color' <> v_active::text;

  -- Sıradaki roller
  if array_length(v_self,1) is null then
    v_next_explainer := null;
  else
    v_next_explainer := coalesce(
      v_self[coalesce(array_position(v_self, v_room.explainer_id), 0) + 1],
      v_self[1]
    );
  end if;

  if array_length(v_other,1) is null then
    v_next_controller := null;
  else
    v_next_controller := coalesce(
      v_other[coalesce(array_position(v_other, v_room.controller_id), 0) + 1],
      v_other[1]
    );
  end if;

  -- Kategori içinden, used_card_ids + current_card_id HARİÇ rastgele kart seç
  select c.*
    into v_card
    from public.cards c
   where c.category_id = v_room.category_id
     and (v_room.current_card_id is null or c.id <> v_room.current_card_id)
     and c.id <> all(v_room.used_card_ids)
   order by random()
   limit 1;

  if not found then
    raise exception 'no_available_card' using errcode = 'P0001';
  end if;

  -- Güncelle: zamanlar, roller, kart ve used_card_ids (önceki kartı ekle)
  update public.rooms
     set active_team   = v_active,
         explainer_id  = v_next_explainer,
         controller_id = v_next_controller,
         starts_at     = now(),
         ends_at       = now() + make_interval(secs => round_second),
         passes_used   = 0,
         used_card_ids = case
                           when v_room.current_card_id is not null
                             and not (v_room.current_card_id = any(used_card_ids))
                           then used_card_ids || v_room.current_card_id
                           else used_card_ids
                         end,
         current_card_id = v_card.id,
         updated_at     = now()
   where id = v_room.id
   returning * into v_room;

  return v_room;
end;
$$;

-- Yetkiler (güvence altına al)
revoke all on function public.start_turn (text) from public;

grant execute on function public.start_turn (text) to authenticated;

comment on function public.start_turn (text) is 'Starts a turn and automatically draws a new card (category-scoped, no repeats).';