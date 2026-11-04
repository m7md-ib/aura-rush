-- Aura Rush shop v1: AURA coins (earned only by playing, computed server-side) + cosmetic items.
-- Nothing here touches gameplay or scoring. All access through SECURITY DEFINER RPCs; tables have RLS on, no policies.

-- ---------- tables ----------
create table if not exists items (
  id text primary key,
  slot text not null check (slot in ('head','face','neck','body','trail','name','flex','frame','banner')),
  name text not null,
  rarity text not null check (rarity in ('common','rare','legendary','mythic')),
  price integer check (price is null or price > 0),   -- null = can't be bought
  unlock_ach text,                                     -- exclusive: granted by this achievement
  sort integer not null default 0,
  active boolean not null default true
);

create table if not exists inventory (
  account_id uuid not null references accounts(id) on delete cascade,
  item_id text not null references items(id),
  source text not null,              -- 'buy' | 'ach'
  created_at timestamptz not null default now(),
  primary key (account_id, item_id)
);

create table if not exists equipped (
  account_id uuid not null references accounts(id) on delete cascade,
  slot text not null,
  item_id text not null references items(id),
  primary key (account_id, slot)
);

-- every coin movement; (account, reason, ref) is unique when ref is set, so rewards can't be paid twice
create table if not exists coin_ledger (
  id bigserial primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  delta integer not null,
  reason text not null,              -- 'run' | 'ach' | 'daily' | 'weekly' | 'buy'
  ref text,
  created_at timestamptz not null default now()
);
create unique index if not exists coin_ledger_once on coin_ledger (account_id, reason, ref) where ref is not null;
create index if not exists coin_ledger_acc_time on coin_ledger (account_id, reason, created_at);

alter table accounts add column if not exists streak integer not null default 0;
alter table accounts add column if not exists last_daily date;

alter table items enable row level security;
alter table inventory enable row level security;
alter table equipped enable row level security;
alter table coin_ledger enable row level security;

-- ---------- catalog ----------
insert into items (id, slot, name, rarity, price, unlock_ach, sort) values
  ('cap',        'head',   'كاب',                 'common',    250,  null,     10),
  ('crown',      'head',   'تاج دهب',             'legendary', 2500, null,     11),
  ('og_crown',   'head',   'تاج الأورا الأصلية',  'mythic',    null, 'legend', 12),
  ('shades',     'face',   'نظارة سودا',          'common',    200,  null,     20),
  ('shades_neon','face',   'نظارة نيون',          'rare',      700,  null,     21),
  ('chain',      'neck',   'سلسال دهب',           'rare',      600,  null,     30),
  ('hoodie',     'body',   'هودي',                'rare',      500,  null,     40),
  ('cape',       'body',   'عباية ملكية',         'legendary', 1800, null,     41),
  ('tr_fire',    'trail',  'أثر نار',             'rare',      800,  null,     50),
  ('tr_neon',    'trail',  'أثر نيون',            'rare',      800,  null,     51),
  ('tr_glitch',  'trail',  'أثر غلتش',            'legendary', 1600, null,     52),
  ('tr_money',   'trail',  'أثر مصاري',           'legendary', 2200, null,     53),
  ('nm_gold',    'name',   'اسم دهبي',            'rare',      700,  null,     60),
  ('nm_grad',    'name',   'اسم متدرّج',          'rare',      900,  null,     61),
  ('nm_glow',    'name',   'اسم بيتوهّج',         'legendary', 1600, null,     62),
  ('nm_rainbow', 'name',   'اسم قوس قزح',         'mythic',    5000, null,     63),
  ('nm_king',    'name',   'اسم الملك',           'legendary', null, 'king',   64),
  ('fx_gold',    'flex',   'FLEX مطر دهب',        'rare',      900,  null,     70),
  ('fx_bolt',    'flex',   'FLEX برق',            'legendary', 1800, null,     71),
  ('fx_galaxy',  'flex',   'FLEX مجرّة',          'mythic',    4500, null,     72),
  ('fr_gold',    'frame',  'إطار دهبي',           'rare',      600,  null,     80),
  ('fr_neon',    'frame',  'إطار نيون',           'rare',      600,  null,     81),
  ('fr_slayer',  'frame',  'إطار قاتل الزعماء',   'legendary', null, 'slayer', 82),
  ('bn_city',    'banner', 'غلاف: المدينة بالليل','common',    300,  null,     90),
  ('bn_sunset',  'banner', 'غلاف: غروب',          'rare',      650,  null,     91),
  ('bn_galaxy',  'banner', 'غلاف: مجرّة',         'legendary', 1500, null,     92),
  ('bn_hunter',  'banner', 'غلاف: صياد الأسرار',  'legendary', null, 'hunter', 93)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, rarity = excluded.rarity,
  price = excluded.price, unlock_ach = excluded.unlock_ach, sort = excluded.sort;

-- ---------- helpers (internal) ----------
create or replace function _today() returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Amman')::date;
$$;

-- add coins once per (reason, ref); returns the amount actually added
create or replace function _add_coins(p_acc uuid, p_delta int, p_reason text, p_ref text) returns int
language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if p_acc is null or p_delta = 0 then return 0; end if;
  insert into coin_ledger (account_id, delta, reason, ref) values (p_acc, p_delta, p_reason, p_ref)
    on conflict do nothing returning id into v_id;
  if v_id is null then return 0; end if;
  update accounts set coins = coins + p_delta where id = p_acc;
  return p_delta;
end; $$;

create or replace function _ach_reward(p_ach text) returns int language sql immutable set search_path = public as $$
  select case p_ach when 'first' then 50 when 'combo50' then 100 when 'sigma' then 100 when 'untouch' then 150
    when 'survivor' then 150 when 'grass' then 150 when 'slayer' then 300 when 'ascend' then 300
    when 'king' then 400 when 'hunter' then 300 when 'legend' then 1000 else 0 end;
$$;

-- pay achievement coins + hand out exclusive items for every achievement the account owns (idempotent)
create or replace function _sync_rewards(p_acc uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_total int := 0; r record;
begin
  if p_acc is null then return 0; end if;
  for r in select ach from achievements where owner = p_acc loop
    v_total := v_total + _add_coins(p_acc, _ach_reward(r.ach), 'ach', r.ach);
  end loop;
  insert into inventory (account_id, item_id, source)
    select p_acc, i.id, 'ach' from items i join achievements a on a.owner = p_acc and a.ach = i.unlock_ach
    where i.active on conflict do nothing;
  return v_total;
end; $$;

create or replace function _equipped(p_acc uuid) returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(slot, item_id), '{}'::json) from equipped where account_id = p_acc;
$$;

-- ---------- auth RPCs: same as accounts_v1, plus reward sync after claiming guest data ----------
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
  perform _sync_rewards(v_id);
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
  perform _sync_rewards(v_acc.id);
  return json_build_object('token', _new_session(v_acc.id), 'username', v_acc.username);
end; $$;

-- me: + equipped items, daily reward status (not 'stable' anymore: it reads only, but keep it volatile-safe)
create or replace function me(p_token text, p_player uuid default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_owner uuid; v_acc accounts;
begin
  v_owner := coalesce(v_id, p_player);
  if v_id is not null then select * into v_acc from accounts where id = v_id; end if;
  return json_build_object(
    'signed_in', v_id is not null, 'username', v_acc.username, 'coins', coalesce(v_acc.coins, 0),
    'equipped', case when v_id is null then '{}'::json else _equipped(v_id) end,
    'daily_ready', v_id is not null and (v_acc.last_daily is null or v_acc.last_daily < _today()),
    'streak', coalesce(v_acc.streak, 0),
    'achievements', coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json));
end; $$;

create or replace function import_legacy_achievements(p_player uuid, p_achs text[])
returns json language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_acc uuid; r record;
begin
  if p_player is null then return '[]'::json; end if;
  select coalesce(account_id, player_id), account_id into v_owner, v_acc from runs where player_id = p_player limit 1;
  if v_owner is null then return '[]'::json; end if;
  if exists (select 1 from achievements where owner = v_owner) then
    return (select json_agg(ach) from achievements where owner = v_owner);
  end if;
  select max(score) s, max(level) l, max(bosses) b, sum(duration_s) d into r
    from runs where player_id = p_player and created_at < '2026-11-10';
  if r.s is null then return '[]'::json; end if;
  perform _grant_achievements(v_owner, coalesce(p_achs, '{}'), r.s, r.l, r.b, r.d::int);
  if v_acc is not null then perform _sync_rewards(v_acc); end if;
  return coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json);
end; $$;

-- ---------- scores: same checks as accounts_v1, plus run coins for accounts ----------
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
  v_today_run int; v_earn int := 0; v_ach_coins int := 0; v_coins int;
begin
  if p_player is null then raise exception 'missing player'; end if;
  v_owner := coalesce(v_acc, p_player);
  if v_acc is not null then
    select username into v_nick from accounts where id = v_acc;
  else
    if char_length(v_nick) = 0 then v_nick := 'لاعب مجهول'; end if;
    v_nick := left(v_nick, 16);
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
  select _title_for(ach) into v_title from achievements where owner = v_owner and _title_for(ach) = p_title limit 1;
  update runs set title = v_title where id = v_run;

  -- coins (accounts only): 1 per 100 aura, max 80 per run, max 400 per day from runs
  if v_acc is not null then
    select coalesce(sum(delta), 0) into v_today_run from coin_ledger
      where account_id = v_acc and reason = 'run' and created_at >= (_today()::timestamp at time zone 'Asia/Amman');
    v_earn := greatest(0, least(p_score / 100, 80, 400 - v_today_run));
    v_earn := _add_coins(v_acc, v_earn, 'run', v_run::text);
    v_ach_coins := _sync_rewards(v_acc);
    select coins into v_coins from accounts where id = v_acc;
  end if;

  select max(score) into v_best from runs where coalesce(account_id, player_id) = v_owner;
  select 1 + count(*) into v_rank from (
    select coalesce(account_id, player_id) o, max(score) best from runs group by 1
  ) b where b.best > v_best;

  return json_build_object('best', v_best, 'rank', v_rank, 'new_best', p_score >= v_best, 'new_achievements', to_json(v_new),
    'achievements', coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json),
    'coins', v_coins, 'coins_run', v_earn, 'coins_ach', v_ach_coins, 'daily_cap_hit', v_acc is not null and v_today_run + v_earn >= 400);
end; $$;

-- ---------- daily + weekly rewards ----------
create or replace function claim_daily(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_acc accounts; v_streak int; v_reward int;
begin
  if v_id is null then raise exception 'not signed in'; end if;
  select * into v_acc from accounts where id = v_id for update;
  if v_acc.last_daily = _today() then
    return json_build_object('claimed', false, 'coins', v_acc.coins, 'streak', v_acc.streak);
  end if;
  v_streak := case when v_acc.last_daily = _today() - 1 then v_acc.streak + 1 else 1 end;
  v_reward := 20 + 10 * least(v_streak - 1, 6);
  update accounts set streak = v_streak, last_daily = _today() where id = v_id;
  perform _add_coins(v_id, v_reward, 'daily', _today()::text);
  return json_build_object('claimed', true, 'reward', v_reward, 'streak', v_streak, 'coins', (select coins from accounts where id = v_id));
end; $$;

-- last calendar week (Mon–Sun, Amman time): top 10 accounts get coins, once per week
create or replace function claim_weekly(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_end timestamptz; v_start timestamptz; v_rank int; v_reward int; v_paid int;
begin
  if v_id is null then raise exception 'not signed in'; end if;
  v_end := date_trunc('week', now() at time zone 'Asia/Amman') at time zone 'Asia/Amman';
  v_start := v_end - interval '7 days';
  select rk into v_rank from (
    select coalesce(account_id, player_id) o, rank() over (order by max(score) desc) rk
    from runs where created_at >= v_start and created_at < v_end group by 1
  ) x where o = v_id;
  if v_rank is null or v_rank > 10 then return json_build_object('rank', v_rank, 'reward', 0); end if;
  v_reward := case when v_rank = 1 then 500 when v_rank <= 3 then 300 else 150 end;
  v_paid := _add_coins(v_id, v_reward, 'weekly', (v_start at time zone 'Asia/Amman')::date::text);
  return json_build_object('rank', v_rank, 'reward', v_paid, 'coins', (select coins from accounts where id = v_id));
end; $$;

-- ---------- shop ----------
create or replace function get_shop(p_token text default null) returns json
language sql stable security definer set search_path = public as $$
  with me as (select _session_account(p_token) id)
  select json_build_object(
    'coins', (select coins from accounts where id = (select id from me)),
    'items', coalesce((select json_agg(json_build_object(
        'id', i.id, 'slot', i.slot, 'name', i.name, 'rarity', i.rarity, 'price', i.price, 'unlock_ach', i.unlock_ach,
        'owned', inv.item_id is not null, 'equipped', eq.item_id is not null) order by i.sort)
      from items i
      left join inventory inv on inv.item_id = i.id and inv.account_id = (select id from me)
      left join equipped eq on eq.item_id = i.id and eq.account_id = (select id from me)
      where i.active), '[]'::json));
$$;

create or replace function buy_item(p_token text, p_item text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_item items; v_left int;
begin
  if v_id is null then raise exception 'not signed in'; end if;
  select * into v_item from items where id = p_item and active;
  if v_item.id is null then raise exception 'no such item'; end if;
  if v_item.price is null then raise exception 'not for sale'; end if;
  if exists (select 1 from inventory where account_id = v_id and item_id = v_item.id) then raise exception 'already owned'; end if;
  update accounts set coins = coins - v_item.price where id = v_id and coins >= v_item.price returning coins into v_left;
  if v_left is null then raise exception 'not enough coins'; end if;
  insert into coin_ledger (account_id, delta, reason, ref) values (v_id, -v_item.price, 'buy', v_item.id);
  insert into inventory (account_id, item_id, source) values (v_id, v_item.id, 'buy');
  return json_build_object('coins', v_left, 'item', v_item.id);
end; $$;

-- p_item null = take off whatever is in that slot
create or replace function equip_item(p_token text, p_slot text, p_item text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token);
begin
  if v_id is null then raise exception 'not signed in'; end if;
  if p_item is null then
    delete from equipped where account_id = v_id and slot = p_slot;
  else
    if not exists (select 1 from inventory inv join items i on i.id = inv.item_id
                   where inv.account_id = v_id and inv.item_id = p_item and i.slot = p_slot and i.active) then
      raise exception 'not owned';
    end if;
    insert into equipped (account_id, slot, item_id) values (v_id, p_slot, p_item)
      on conflict (account_id, slot) do update set item_id = excluded.item_id;
  end if;
  return _equipped(v_id);
end; $$;

-- ---------- leaderboard v4 = v3 + name effect of each account ----------
create or replace function get_leaderboard_v4(p_limit int default 100, p_player uuid default null, p_period text default 'all', p_token text default null)
returns table(rank int, nick text, score int, level int, bosses int, is_me boolean, achieved_at timestamptz, "character" text, title text, verified boolean, name_fx text)
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
         coalesce(a.username, b.nick), b.score, b.level, b.bosses, b.o = (select o from me), b.created_at, b.ch, b.ttl, a.id is not null, e.item_id
  from best b
  left join accounts a on a.id = b.account_id
  left join equipped e on e.account_id = a.id and e.slot = 'name'
  order by b.score desc, b.created_at asc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

-- profile: + equipped cosmetics
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
    'equipped', _equipped(v_acc.id),
    'achievements', coalesce((select json_agg(json_build_object('id', ach, 'at', created_at) order by created_at) from achievements where owner = v_acc.id), '[]'::json),
    'recent', coalesce((select json_agg(x) from (select score, level, bosses, "character", created_at from runs where account_id = v_acc.id order by created_at desc limit 10) x), '[]'::json));
end; $$;

-- ---------- lock down ----------
revoke all on function _today(), _add_coins(uuid, int, text, text), _ach_reward(text), _sync_rewards(uuid), _equipped(uuid)
  from public, anon, authenticated;
grant execute on function claim_daily(text), claim_weekly(text), get_shop(text), buy_item(text, text), equip_item(text, text, text),
  get_leaderboard_v4(int, uuid, text, text) to anon, authenticated;
