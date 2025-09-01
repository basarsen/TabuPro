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