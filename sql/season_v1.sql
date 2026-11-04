-- Aura Rush season v1: daily shop deals (4 items, 30% off, rotate at Amman midnight) + monthly seasons with exclusive rewards.
-- Cosmetic/coins only. Score validation is untouched.

-- ---------- tables ----------
create table if not exists season_awards (
  account_id uuid not null references accounts(id) on delete cascade,
  season text not null,              -- 'YYYY-MM' (Amman time)
  rank integer not null,
  created_at timestamptz not null default now(),
  primary key (account_id, season)
);
alter table season_awards enable row level security;

-- season-exclusive items (never for sale; handed out by claim_season)
insert into items (id, slot, name, rarity, price, unlock_ach, sort) values
  ('season_crown', 'head',   'تاج بطل الموسم', 'mythic',    null, 'season', 13),
  ('bn_season',    'banner', 'غلاف أبطال الموسم', 'legendary', null, 'season', 94),
  ('fr_season',    'frame',  'إطار الموسم',     'legendary', null, 'season', 83)
on conflict (id) do update set slot = excluded.slot, name = excluded.name, rarity = excluded.rarity,
  price = excluded.price, unlock_ach = excluded.unlock_ach, sort = excluded.sort;

-- ---------- helpers (internal) ----------
create or replace function _season_start() returns timestamptz language sql stable set search_path = public as $$
  select date_trunc('month', now() at time zone 'Asia/Amman') at time zone 'Asia/Amman';
$$;

create or replace function _season_json() returns json language sql stable set search_path = public as $$
  select json_build_object('id', to_char(now() at time zone 'Asia/Amman', 'YYYY-MM'),
    'starts', _season_start(),
    'ends', (date_trunc('month', now() at time zone 'Asia/Amman') + interval '1 month') at time zone 'Asia/Amman');
$$;

-- today's 4 deals: same for everyone, changes at Amman midnight, 30% off rounded to 10
create or replace function _deals(p_day date) returns table(item_id text, deal_price int)
language sql stable set search_path = public as $$
  select id, greatest(10, (round(price * 0.7 / 10.0) * 10)::int)
  from items where active and price is not null
  order by md5(id || p_day::text) limit 4;
$$;

-- ---------- me: + current season ----------
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
    'season', _season_json(),
    'achievements', coalesce((select json_agg(ach) from achievements where owner = v_owner), '[]'::json));
end; $$;

-- ---------- shop: + deals ----------
create or replace function get_shop(p_token text default null) returns json
language sql stable security definer set search_path = public as $$
  with me as (select _session_account(p_token) id), d as (select * from _deals(_today()))
  select json_build_object(
    'coins', (select coins from accounts where id = (select id from me)),
    'deals_end', (_today() + 1)::timestamp at time zone 'Asia/Amman',
    'items', coalesce((select json_agg(json_build_object(
        'id', i.id, 'slot', i.slot, 'name', i.name, 'rarity', i.rarity, 'price', i.price, 'unlock_ach', i.unlock_ach,
        'deal_price', d.deal_price,
        'owned', inv.item_id is not null, 'equipped', eq.item_id is not null) order by i.sort)
      from items i
      left join d on d.item_id = i.id
      left join inventory inv on inv.item_id = i.id and inv.account_id = (select id from me)
      left join equipped eq on eq.item_id = i.id and eq.account_id = (select id from me)
      where i.active), '[]'::json));
$$;

create or replace function buy_item(p_token text, p_item text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_item items; v_price int; v_left int;
begin
  if v_id is null then raise exception 'not signed in'; end if;
  select * into v_item from items where id = p_item and active;
  if v_item.id is null then raise exception 'no such item'; end if;
  if v_item.price is null then raise exception 'not for sale'; end if;
  if exists (select 1 from inventory where account_id = v_id and item_id = v_item.id) then raise exception 'already owned'; end if;
  v_price := coalesce((select deal_price from _deals(_today()) where item_id = v_item.id), v_item.price);
  update accounts set coins = coins - v_price where id = v_id and coins >= v_price returning coins into v_left;
  if v_left is null then raise exception 'not enough coins'; end if;
  insert into coin_ledger (account_id, delta, reason, ref) values (v_id, -v_price, 'buy', v_item.id);
  insert into inventory (account_id, item_id, source) values (v_id, v_item.id, 'buy');
  return json_build_object('coins', v_left, 'item', v_item.id, 'paid', v_price);
end; $$;

-- ---------- leaderboards: p_period 'all' | 'week' (rolling 7 days) | 'season' (this month, Amman) ----------
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
    where case p_period when 'all' then true when 'season' then r.created_at >= _season_start()
               else r.created_at > now() - interval '7 days' end
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

create or replace function get_my_rank_v3(p_player uuid, p_period text default 'all', p_token text default null)
returns json language sql stable security definer set search_path = public as $$
  with me as (select coalesce(_session_account(p_token),
                 (select account_id from runs where player_id = p_player and account_id is not null order by created_at desc limit 1),
                 p_player) o),
  best as (
    select coalesce(account_id, player_id) o, max(score) best from runs
    where case p_period when 'all' then true when 'season' then created_at >= _season_start()
               else created_at > now() - interval '7 days' end
    group by 1
  ), mine as (select best from best where o = (select o from me))
  select case when (select best from mine) is null then null
    else json_build_object('best', (select best from mine), 'rank', 1 + (select count(*) from best where best > (select best from mine))) end;
$$;

-- ---------- season rewards: last month's ranking, paid once per account ----------
create or replace function claim_season(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare v_id uuid := _session_account(p_token); v_end timestamptz; v_start timestamptz; v_sid text; v_rank int; v_coins int; v_items text[] := '{}'; v_ins text;
begin
  if v_id is null then raise exception 'not signed in'; end if;
  v_end := _season_start();
  v_start := date_trunc('month', (now() at time zone 'Asia/Amman') - interval '1 month') at time zone 'Asia/Amman';
  v_sid := to_char(v_start at time zone 'Asia/Amman', 'YYYY-MM');
  if exists (select 1 from season_awards where account_id = v_id and season = v_sid) then
    return json_build_object('season', v_sid, 'reward', 0, 'claimed', true);
  end if;
  select rk into v_rank from (
    select coalesce(account_id, player_id) o, rank() over (order by max(score) desc) rk
    from runs where created_at >= v_start and created_at < v_end group by 1
  ) x where o = v_id;
  if v_rank is null or v_rank > 50 then return json_build_object('season', v_sid, 'rank', v_rank, 'reward', 0); end if;
  insert into season_awards (account_id, season, rank) values (v_id, v_sid, v_rank) on conflict do nothing returning season into v_ins;
  if v_ins is null then return json_build_object('season', v_sid, 'reward', 0, 'claimed', true); end if;
  v_coins := case when v_rank = 1 then 2000 when v_rank <= 3 then 1200 when v_rank <= 10 then 600 else 200 end;
  perform _add_coins(v_id, v_coins, 'season', v_sid);
  if v_rank = 1 then v_items := array_append(v_items, 'season_crown'); end if;
  if v_rank <= 3 then v_items := array_append(v_items, 'bn_season'); end if;
  if v_rank <= 10 then v_items := array_append(v_items, 'fr_season'); end if;
  insert into inventory (account_id, item_id, source) select v_id, unnest(v_items), 'season' on conflict do nothing;
  return json_build_object('season', v_sid, 'rank', v_rank, 'reward', v_coins, 'items', to_json(v_items),
    'coins', (select coins from accounts where id = v_id));
end; $$;

-- ---------- profile: + season trophies ----------
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
    'seasons', coalesce((select json_agg(json_build_object('season', season, 'rank', rank) order by season desc) from season_awards where account_id = v_acc.id), '[]'::json),
    'achievements', coalesce((select json_agg(json_build_object('id', ach, 'at', created_at) order by created_at) from achievements where owner = v_acc.id), '[]'::json),
    'recent', coalesce((select json_agg(x) from (select score, level, bosses, "character", created_at from runs where account_id = v_acc.id order by created_at desc limit 10) x), '[]'::json));
end; $$;

-- public: current season info (leaderboard page countdown)
create or replace function get_season() returns json language sql stable security definer set search_path = public as $$
  select _season_json();
$$;

-- ---------- lock down ----------
revoke all on function _season_start(), _season_json(), _deals(date) from public, anon, authenticated;
grant execute on function claim_season(text), get_season() to anon, authenticated;
