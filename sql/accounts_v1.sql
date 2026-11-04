-- Aura Rush accounts v1: username + password, server-side achievements, account-owned runs.
-- All access goes through SECURITY DEFINER RPCs; tables have RLS on with no policies.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  pass_hash text not null,
  recovery_hash text not null,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists accounts_username_lower on accounts (lower(username));

create table if not exists sessions (
  token_hash text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);
create index if not exists sessions_account on sessions (account_id);

create table if not exists auth_events (
  id bigserial primary key,
  kind text not null,          -- 'fail' | 'signup' | 'reset_fail'
  username text,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists auth_events_user on auth_events (lower(username), created_at);
create index if not exists auth_events_ip on auth_events (ip, created_at);

create table if not exists achievements (
  owner uuid not null,          -- account id, or guest player id
  ach text not null,
  created_at timestamptz not null default now(),
  primary key (owner, ach)
);

alter table runs add column if not exists account_id uuid references accounts(id) on delete set null;
alter table runs add column if not exists near integer not null default 0;
create index if not exists runs_owner on runs ((coalesce(account_id, player_id)), score desc);

alter table accounts enable row level security;
alter table sessions enable row level security;
alter table auth_events enable row level security;
alter table achievements enable row level security;

-- ---------- helpers (not callable by clients) ----------
create or replace function _ip() returns text language sql stable set search_path = public as $$
  select coalesce(
    nullif(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1), ''),
    current_setting('request.headers', true)::json->>'cf-connecting-ip', 'unknown');
$$;

create or replace function _hash_token(p text) returns text language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(p, 'UTF8')), 'hex');
$$;

create or replace function _session_account(p_token text) returns uuid language sql stable security definer set search_path = public as $$
  select account_id from sessions where p_token is not null and token_hash = _hash_token(p_token) and expires_at > now();
$$;

create or replace function _new_session(p_account uuid) returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_tok text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into sessions (token_hash, account_id) values (_hash_token(v_tok), p_account);
  delete from sessions where account_id = p_account and expires_at < now();
  return v_tok;
end; $$;

create or replace function _new_recovery() returns text language sql volatile set search_path = public, extensions as $$
  -- 10 chars, no look-alike letters
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 31), 1), '')
  from (select extensions.gen_random_bytes(10) b) x, generate_series(0, 9) i;
$$;

-- claim this device's guest runs + achievements for the account
create or replace function _claim_guest(p_account uuid, p_player uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_player is null then return; end if;
  update runs set account_id = p_account where player_id = p_player and account_id is null;
  insert into achievements (owner, ach, created_at)
    select p_account, ach, created_at from achievements where owner = p_player
    on conflict do nothing;
  delete from achievements where owner = p_player;
end; $$;

-- server-side achievement check for one run. Returns ids newly granted.
create or replace function _grant_achievements(p_owner uuid, p_claims text[], p_score int, p_level int, p_bosses int, p_duration int)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_ok text[] := '{}'; v_new text[]; v_time bigint; v_near bigint;
begin
  -- verifiable from the run itself
  if p_score >= 100 then v_ok := array_append(v_ok, 'first'); end if;
  if p_score >= 20000 then v_ok := array_append(v_ok, 'king'); end if;
  if p_bosses >= 5 then v_ok := array_append(v_ok, 'slayer'); end if;
  if p_level >= 6 then v_ok := array_append(v_ok, 'ascend'); end if;
  -- event-based: accepted when the run makes them possible
  if 'sigma' = any(p_claims) and p_duration >= 10 then v_ok := array_append(v_ok, 'sigma'); end if;
  if 'combo50' = any(p_claims) and p_duration >= 20 then v_ok := array_append(v_ok, 'combo50'); end if;
  if 'untouch' = any(p_claims) and p_bosses >= 1 then v_ok := array_append(v_ok, 'untouch'); end if;
  if 'hunter' = any(p_claims) and p_bosses >= 2 then v_ok := array_append(v_ok, 'hunter'); end if;
  if 'legend' = any(p_claims) and p_bosses >= 4 then v_ok := array_append(v_ok, 'legend'); end if;
  -- cumulative, computed from stored runs
  select coalesce(sum(duration_s), 0), coalesce(sum(near), 0) into v_time, v_near
    from runs where coalesce(account_id, player_id) = p_owner;
  if v_time >= 1800 then v_ok := array_append(v_ok, 'grass'); end if;
  if v_near >= 50 then v_ok := array_append(v_ok, 'survivor'); end if;

  with ins as (
    insert into achievements (owner, ach) select p_owner, unnest(v_ok)
    on conflict do nothing returning ach
  ) select coalesce(array_agg(ach), '{}') into v_new from ins;
  return v_new;
end; $$;

create or replace function _title_for(p_ach text) returns text language sql immutable as $$
  select case p_ach
    when 'first' then 'جديد بالحارة' when 'combo50' then 'ماكينة كومبو' when 'sigma' then 'سيغما'
    when 'untouch' then 'ما بنلمس' when 'slayer' then 'قاتل الزعماء' when 'survivor' then 'ناجي من الكرنج'
    when 'ascend' then 'ما بيوقف' when 'king' then 'ملك الهالة' when 'grass' then 'اطلع شم هوا'
    when 'hunter' then 'صياد الأسرار' when 'legend' then 'الأسطورة' end;
$$;

-- ---------- auth RPCs ----------
create or replace function signup(p_username text, p_password text, p_player uuid default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_user text := btrim(coalesce(p_username, '')); v_id uuid; v_rec text; v_ip text := _ip();
begin
  if v_user !~ '^[A-Za-z0-9_ء-ي٠-٩]{3,16}$' then raise exception 'bad username'; end if;
  if char_length(coalesce(p_password, '')) < 6 or char_length(p_password) > 72 then raise exception 'bad password'; end if;
  if (select count(*) from auth_events where kind = 'signup' and ip = v_ip and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many signups';
  end if;
  if exists (select 1 from accounts where lower(username) = lower(v_user)) then raise exception 'username taken'; end if;
  v_rec := _new_recovery();
  insert into accounts (username, pass_hash, recovery_hash)
    values (v_user, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), extensions.crypt(v_rec, extensions.gen_salt('bf', 8)))
    returning id into v_id;
  insert into auth_events (kind, username, ip) values ('signup', v_user, v_ip);
  perform _claim_guest(v_id, p_player);
  return json_build_object('token', _new_session(v_id), 'username', v_user, 'recovery', v_rec);
exception when unique_violation then raise exception 'username taken';
end; $$;

create or replace function login(p_username text, p_password text, p_player uuid default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_acc accounts; v_ip text := _ip();
begin
  if (select count(*) from auth_events where kind = 'fail' and lower(username) = lower(btrim(coalesce(p_username,''))) and created_at > now() - interval '15 minutes') >= 8
     or (select count(*) from auth_events where kind = 'fail' and ip = v_ip and created_at > now() - interval '15 minutes') >= 30 then
    raise exception 'locked';
  end if;
  select * into v_acc from accounts where lower(username) = lower(btrim(coalesce(p_username, '')));
  if v_acc.id is null or v_acc.pass_hash <> extensions.crypt(coalesce(p_password, ''), v_acc.pass_hash) then
    insert into auth_events (kind, username, ip) values ('fail', btrim(coalesce(p_username,'')), v_ip);
    raise exception 'wrong login';
  end if;
  perform _claim_guest(v_acc.id, p_player);
  return json_build_object('token', _new_session(v_acc.id), 'username', v_acc.username);
end; $$;

create or replace function logout(p_token text) returns void language sql security definer set search_path = public as $$
  delete from sessions where token_hash = _hash_token(p_token);
$$;

create or replace function reset_password(p_username text, p_recovery text, p_new text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_acc accounts; v_rec text; v_ip text := _ip();
begin
  if (select count(*) from auth_events where kind = 'reset_fail' and (lower(username) = lower(btrim(coalesce(p_username,''))) or ip = v_ip) and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'locked';
  end if;
  if char_length(coalesce(p_new, '')) < 6 or char_length(p_new) > 72 then raise exception 'bad password'; end if;
  select * into v_acc from accounts where lower(username) = lower(btrim(coalesce(p_username, '')));
  if v_acc.id is null or v_acc.recovery_hash <> extensions.crypt(upper(btrim(coalesce(p_recovery, ''))), v_acc.recovery_hash) then
    insert into auth_events (kind, username, ip) values ('reset_fail', btrim(coalesce(p_username,'')), v_ip);
    raise exception 'wrong recovery';
  end if;
  v_rec := _new_recovery();
  update accounts set pass_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)),
                      recovery_hash = extensions.crypt(v_rec, extensions.gen_salt('bf', 8)) where id = v_acc.id;
  delete from sessions where account_id = v_acc.id;   -- sign out everywhere
  return json_build_object('token', _new_session(v_acc.id), 'username', v_acc.username, 'recovery', v_rec);
end; $$;

create or replace function change_password(p_token text, p_old text, p_new text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := _session_account(p_token); v_hash text;
begin
  if v_id is null then raise exception 'not signed in'; end if;
  if char_length(coalesce(p_new, '')) < 6 or char_length(p_new) > 72 then raise exception 'bad password'; end if;
  select pass_hash into v_hash from accounts where id = v_id;
  if v_hash <> extensions.crypt(coalesce(p_old, ''), v_hash) then raise exception 'wrong login'; end if;
  update accounts set pass_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where id = v_id;
  delete from sessions where account_id = v_id;
  return json_build_object('token', _new_session(v_id));
end; $$;

-- who am I + my achievements (works for guests too, via player id)
create or replace function me(p_token text, p_player uuid default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_owner uuid; v_user text; v_coins int;
begin
  v_owner := coalesce(v_id, p_player);
  if v_id is not null then select username, coins into v_user, v_coins from accounts where id = v_id; end if;
  return json_build_object(
    'signed_in', v_id is not null, 'username', v_user, 'coins', coalesce(v_coins, 0),
    'achievements', coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json));
end; $$;

-- one-time import of achievements a guest earned before accounts existed (cosmetic titles only)
create or replace function import_legacy_achievements(p_player uuid, p_achs text[])
returns json language plpgsql security definer set search_path = public as $$
declare v_owner uuid; r record;
begin
  if p_player is null then return '[]'::json; end if;
  select coalesce(account_id, player_id) into v_owner from runs where player_id = p_player limit 1;
  if v_owner is null then return '[]'::json; end if;
  if exists (select 1 from achievements where owner = v_owner) then
    return (select json_agg(ach) from achievements where owner = v_owner);
  end if;
  select max(score) s, max(level) l, max(bosses) b, sum(duration_s) d into r
    from runs where player_id = p_player and created_at < '2026-11-10';
  if r.s is null then return '[]'::json; end if;
  perform _grant_achievements(v_owner, coalesce(p_achs, '{}'), r.s, r.l, r.b, r.d::int);
  return coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json);
end; $$;

-- ---------- scores ----------
create or replace function submit_score_v3(p_player uuid, p_token text, p_nick text, p_score int, p_level int, p_bosses int,
  p_duration int, p_character text, p_title text, p_achs text[] default '{}', p_near int default 0)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_acc uuid := _session_account(p_token);
  v_owner uuid;
  v_nick text := btrim(regexp_replace(coalesce(p_nick, ''), '[[:cntrl:]<>]', '', 'g'));
  v_char text := case when p_character in ('sigma','menace','magnet','ghost','gambler') then p_character else 'sigma' end;
  v_near int := least(greatest(coalesce(p_near, 0), 0), coalesce(p_duration, 0) * 3);
  v_title text; v_new text[]; v_best int; v_rank int; v_run runs.id%type;
begin
  if p_player is null then raise exception 'missing player'; end if;
  v_owner := coalesce(v_acc, p_player);
  if v_acc is not null then
    select username into v_nick from accounts where id = v_acc;
  else
    if char_length(v_nick) = 0 then v_nick := 'لاعب مجهول'; end if;
    v_nick := left(v_nick, 16);
    -- guests can't wear a registered username
    if exists (select 1 from accounts where lower(username) = lower(v_nick)) then v_nick := left(v_nick, 15) || '؟'; end if;
  end if;
  if p_level < 1 or p_level > 60 then raise exception 'bad level'; end if;
  if p_bosses < 0 or p_bosses > p_level then raise exception 'bad bosses'; end if;
  if p_bosses < p_level - 1 then raise exception 'bad bosses'; end if;
  if p_duration < 3 or p_duration > 14400 then raise exception 'bad duration'; end if;
  if p_duration < 25 * (p_level - 1) then raise exception 'too fast'; end if;
  if p_score < 0 or p_score > public.aura_score_cap(p_duration, p_bosses) then raise exception 'score not plausible'; end if;
  if exists (select 1 from runs where coalesce(account_id, player_id) = v_owner and created_at > now() - interval '10 seconds') then
    raise exception 'too many submissions';
  end if;

  insert into runs (player_id, account_id, nick, score, level, bosses, duration_s, "character", title, near)
  values (p_player, v_acc, v_nick, p_score, p_level, p_bosses, p_duration, v_char, null, v_near) returning id into v_run;

  v_new := _grant_achievements(v_owner, coalesce(p_achs, '{}'), p_score, p_level, p_bosses, p_duration);
  -- title must be one this owner actually earned
  select _title_for(ach) into v_title from achievements where owner = v_owner and _title_for(ach) = p_title limit 1;
  update runs set title = v_title where id = v_run;

  select max(score) into v_best from runs where coalesce(account_id, player_id) = v_owner;
  select 1 + count(*) into v_rank from (
    select coalesce(account_id, player_id) o, max(score) best from runs group by 1
  ) b where b.best > v_best;

  return json_build_object('best', v_best, 'rank', v_rank, 'new_best', p_score >= v_best, 'new_achievements', to_json(v_new),
    'achievements', coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json));
end; $$;

-- leaderboard grouped by owner (account or guest device); accounts show their live username
create or replace function get_leaderboard_v3(p_limit int default 100, p_player uuid default null, p_period text default 'all', p_token text default null)
returns table(rank int, nick text, score int, level int, bosses int, is_me boolean, achieved_at timestamptz, "character" text, title text, verified boolean)
language sql stable security definer set search_path = public as $$
  with me as (select coalesce(_session_account(p_token),
                 (select account_id from runs where player_id = p_player and account_id is not null order by created_at desc limit 1),
                 p_player) o),
  best as (
    select distinct on (coalesce(r.account_id, r.player_id)) coalesce(r.account_id, r.player_id) o, r.account_id, r.nick, r.score, r.level,
           r.bosses, r.created_at, r."character" ch, r.title ttl
    from runs r
    where p_period = 'all' or r.created_at > now() - interval '7 days'
    order by coalesce(r.account_id, r.player_id), r.score desc, r.created_at asc
  )
  select (row_number() over (order by b.score desc, b.created_at asc))::int,
         coalesce(a.username, b.nick), b.score, b.level, b.bosses, b.o = (select o from me), b.created_at, b.ch, b.ttl, a.id is not null
  from best b left join accounts a on a.id = b.account_id
  order by b.score desc, b.created_at asc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

create or replace function get_my_rank_v3(p_player uuid, p_period text default 'all', p_token text default null)
returns json language sql stable security definer set search_path = public as $$
  with me as (select coalesce(_session_account(p_token),
                 (select account_id from runs where player_id = p_player and account_id is not null order by created_at desc limit 1),
                 p_player) o),
  best as (
    select coalesce(account_id, player_id) o, max(score) best from runs
    where p_period = 'all' or created_at > now() - interval '7 days' group by 1
  ), mine as (select best from best where o = (select o from me))
  select case when (select best from mine) is null then null
    else json_build_object('best', (select best from mine), 'rank', 1 + (select count(*) from best where best > (select best from mine))) end;
$$;

create or replace function get_stats() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'runs', count(*), 'players', count(distinct coalesce(account_id, player_id)),
    'bosses', coalesce(sum(bosses), 0), 'max_level', coalesce(max(level), 0),
    'runs_today', count(*) filter (where created_at > now() - interval '24 hours'),
    'top_score', coalesce(max(score), 0),
    'accounts', (select count(*) from accounts)) from runs;
$$;

-- public profile
create or replace function get_profile(p_username text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_acc accounts; v_best int;
begin
  select * into v_acc from accounts where lower(username) = lower(btrim(coalesce(p_username, '')));
  if v_acc.id is null then return null; end if;
  select max(score) into v_best from runs where account_id = v_acc.id;
  return json_build_object(
    'username', v_acc.username, 'joined', v_acc.created_at,
    'best', v_best,
    'rank', case when v_best is null then null else 1 + (select count(*) from (select coalesce(account_id, player_id) o, max(score) b from runs group by 1) x where x.b > v_best) end,
    'runs', (select count(*) from runs where account_id = v_acc.id),
    'bosses', (select coalesce(sum(bosses), 0) from runs where account_id = v_acc.id),
    'max_level', (select coalesce(max(level), 0) from runs where account_id = v_acc.id),
    'playtime', (select coalesce(sum(duration_s), 0) from runs where account_id = v_acc.id),
    'fav_character', (select "character" from runs where account_id = v_acc.id group by 1 order by count(*) desc limit 1),
    'title', (select title from runs where account_id = v_acc.id and title is not null order by created_at desc limit 1),
    'achievements', coalesce((select json_agg(json_build_object('id', ach, 'at', created_at) order by created_at) from achievements where owner = v_acc.id), '[]'::json),
    'recent', coalesce((select json_agg(x) from (select score, level, bosses, "character", created_at from runs where account_id = v_acc.id order by created_at desc limit 10) x), '[]'::json));
end; $$;

-- challenges follow the owner too
create or replace function get_challenge(p_code text) returns json language sql stable security definer set search_path = public as $$
  select json_build_object('nick', coalesce(a.username, r.nick), 'score', r.score, 'level', r.level)
  from challenges c
  join lateral (
    select nick, score, level, account_id from runs
    where coalesce(account_id, player_id) = coalesce((select account_id from runs where player_id = c.player_id and account_id is not null limit 1), c.player_id)
    order by score desc, created_at asc limit 1) r on true
  left join accounts a on a.id = r.account_id
  where c.code = lower(p_code);
$$;

-- lock down: helpers are internal, RPCs are public
revoke all on function _ip(), _hash_token(text), _session_account(text), _new_session(uuid), _new_recovery(),
  _claim_guest(uuid, uuid), _grant_achievements(uuid, text[], int, int, int, int), _title_for(text) from public, anon, authenticated;
grant execute on function signup(text, text, uuid), login(text, text, uuid), logout(text), reset_password(text, text, text),
  change_password(text, text, text), me(text, uuid), import_legacy_achievements(uuid, text[]),
  submit_score_v3(uuid, text, text, int, int, int, int, text, text, text[], int),
  get_leaderboard_v3(int, uuid, text, text), get_my_rank_v3(uuid, text, text), get_profile(text) to anon, authenticated;
