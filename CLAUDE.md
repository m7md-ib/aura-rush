# Aura Rush — project handoff

Read this whole file before doing anything. It is the full history and the rules of this project.

## Who you're working with
- Owner: Muhammad (GitHub `m7md-ib`), in Jordan. He writes in **Jordanian Arabic** — reply to him in Arabic, short and clear. He is not a developer: explain steps simply, do the technical work yourself.
- Machine: Windows. Project folder: **`C:\Users\NITRO\Documents\aura-rush`**.

## What the game is
Aura Rush (https://aura-rush.vercel.app) — a fast arcade browser game about "aura and ego". Plain HTML5 Canvas 2D, no framework, no build step. Arabic RTL UI in Jordanian dialect (fonts: Lalezar + Tajawal from Google Fonts). Works on PC (mouse/keyboard) and mobile (touch drag, FLEX button) under identical scoring rules.

Gameplay summary:
- Collect aura shards, avoid "cringe", build combo, FLEX (tiers: normal / Super ≥80 ego / Perfect ≥95). Ego over 100 explodes.
- 5 stages, each ends with a boss (unique look, ability, rage at 30% HP). After boss 5 the game loops into **Ascension** levels 1–3 (harder; rage at 50%).
- 3 secret bosses replacing a stage boss: `bots` (2.5% from stage 2), `algo` (2.5% from stage 3), `og` (0.4% from stage 4); ×1.5 chance in ascension.
- 5 characters: sigma, menace, magnet, ghost, gambler (each with a perk + drawback).
- Power-ups: shield, magnet, freeze, mythic.
- 11 achievements, each unlocks a title shown on the leaderboard: first, combo50, sigma, untouch, slayer, survivor, ascend, king, grass, hunter, legend.
- Challenge links: `/?c=code`.

## Files (repo root)
- `index.html` — page shell + all CSS + HTML screens (overlays: start, account, shop, achievements, board, pause, game over). Loads `cosmetics.js` then `game.js` with `defer`.
- `game.js` — all game logic: LEVELS, SECRETS, ASCENSION, CHARS, ACH/Ach (server-granted; local fallback when offline), Sound, Supabase `rpc()`, Acct (session token, coins, equipped items), Board (leaderboard v4), Challenge, account screen, daily reward, Shop, Input, Perf, update/draw loop.
- `cosmetics.js` — `window.AuraCos`: canvas drawing for outfits, trails, FLEX effects, animated shop previews, profile avatar. Visual only.
- `cosmetics.css` — name effects (`nm-*`), profile frames (`fr-*`) and banners (`bn-*`). Used by index, leaderboard and profile.
- `leaderboard.html` — top-100 page ("عرش الـAURA"): ✓ badge, name effects, links to profiles.
- `profile.html` — `/profile?u=name`: stats, achievements, recent runs, equipped frame/banner/name/outfit.
- `vercel.json` — `{"cleanUrls":true}`. `.vercelignore` keeps `CLAUDE.md` and `sql/` off the public site.
- `assets/sfx/*.mp3` — 26 Kenney CC0 sound effects (license in `assets/sfx/LICENSE-kenney.txt`). Every SFX falls back to the synth if its file fails to load.
- `sql/accounts_v1.sql`, `sql/shop_v1.sql` — both **applied** to Supabase on 2026-11-04. `shop_v1` re-creates signup, login, me, import_legacy_achievements, submit_score_v3 and get_profile, so it holds the current version of those.

## Git & deploy
- GitHub repo: https://github.com/m7md-ib/aura-rush (branch `main`). The local folder is a git clone of it.
- Vercel project `aura-rush` (team `m7mds-projects-1991906d`, project id `prj_PcObgGInY24vAJGZUAKQnvZ4hgR7`): **every push to `main` deploys to production automatically.** Other branches get preview deployments. Previews are protected: make a 23-hour share link for Muhammad with the Vercel MCP `get_access_to_vercel_url`.

## Backend: Supabase
- Project `aura-rush`, id `neciihvhzlxqijgfddmw`, URL `https://neciihvhzlxqijgfddmw.supabase.co`.
- Client uses the **publishable** key (`sb_publishable_JLUNUppVVhSm5wglgE7QdA_klJ6Jdgt`, already in `game.js`) and calls RPCs: `POST /rest/v1/rpc/<fn>` with header `apikey`.
- **Never ask for, store, or commit the `service_role` / secret key.**
- Security model: tables have RLS on with no policies; all access goes through `SECURITY DEFINER` functions with `set search_path`. Internal helpers start with `_` and have EXECUTE revoked from anon/authenticated.
- Client IP for rate limits comes from `cf-connecting-ip`. The first `x-forwarded-for` entry is client-controlled — never trust it.
- Tables: `runs` (+ account_id, near), `challenges`, `accounts` (+ coins, streak, last_daily), `sessions`, `auth_events`, `achievements`, `items` (shop catalog — change prices here), `inventory`, `equipped`, `coin_ledger` (unique per account/reason/ref, so each reward pays once).
- Score validation (all submit functions): level/bosses/duration checks, "too fast" if duration < 25*(level-1), `aura_score_cap(duration, bosses)`, 10s rate limit, character + title allow-lists.
- RPCs the current client uses: `signup`, `login`, `logout`, `reset_password`, `change_password` (no UI yet), `me`, `import_legacy_achievements`, `submit_score_v3`, `get_leaderboard_v4`, `get_my_rank_v3`, `get_profile`, `get_stats`, `create_challenge`, `get_challenge`, `get_shop`, `buy_item`, `equip_item`, `claim_daily`, `claim_weekly`.
- Old RPCs kept only for old cached clients: `submit_score`, `get_leaderboard_v2`, `get_my_rank`, `get_leaderboard_v3`. Drop them in a later migration.
- Economy (all server-side, accounts only): run coins = score/100, max 80 per run and 400 per day (Amman day); achievement coins 50–1000, once each; daily reward 20 → 80 with a 7-day streak; last week's top 10 (Mon–Sun, Amman): 500 / 300 / 150.
- `"character"` is a reserved word — always quote it in SQL.

## Hard rules
1. **Never push to `main` (= production) without Muhammad's explicit approval.** Work on a branch, give him the Vercel preview link, push or merge to `main` only after he says yes.
2. Don't weaken anti-cheat: score cap, duration checks, rate limits, server-side validation. Mobile and PC must stay under the same scoring rules.
3. Don't change game balance in updates that aren't about balance.
4. Shop items are cosmetic only. No pay-to-win.
5. Keep UI text in Jordanian Arabic and keep RTL working. Test at phone width (360px) and desktop.
6. Before shipping, play-test with Playwright: start a run, check there are no console errors, check boss flow, and check mobile touch.

## Status
- **Live since 2026-11-04:** sound update; Phase 1 accounts (everything below); Phase 2 coins + cosmetic shop (27 items; 4 achievement-exclusive: `og_crown`/legend, `nm_king`/king, `fr_slayer`/slayer, `bn_hunter`/hunter).
- **Still to do:** drop the old RPCs listed above in a later migration; optional change-password UI; Phase 3.

## Original plan (Phases 1–2 done; kept for reference)

### Phase 1 — Accounts (username + password only, no email)
1. **Apply `sql/accounts_v1.sql`** in Supabase (SQL Editor, or Supabase MCP/CLI if available). It only adds things:
   - Tables: `accounts`, `sessions`, `auth_events`, `achievements`; new columns `runs.account_id` and `runs.near`.
   - Auth: bcrypt passwords via pgcrypto; session tokens of 32 random bytes, stored as sha256; lockout after 8 failed logins in 15 minutes; a 10-character recovery code instead of email; guest runs and achievements claimed on signup/login.
   - RPCs: `signup`, `login`, `logout`, `reset_password`, `change_password`, `me`, `import_legacy_achievements`, `submit_score_v3`, `get_leaderboard_v3` (grouped by account, with a `verified` flag), `get_my_rank_v3`, `get_profile`. It also replaces `get_stats` and `get_challenge`.
   - Achievements are granted server-side in `_grant_achievements`.

   After applying, verify with test calls (signup, login, wrong password, submit, leaderboard), then delete the test accounts.
2. **Client changes:**
   - Login / signup / forgot-password screens. Show the recovery code once after signup, with a clear "save this" message.
   - Store the session token in localStorage; show an account button on the start screen.
   - Switch to `submit_score_v3` (send the token, the achievement ids unlocked this run, and the near-miss count).
   - Switch to `get_leaderboard_v3` / `get_my_rank_v3`; show a verified badge for accounts.
   - Make achievements and titles come from the server (`me`, and the submit response). Call `import_legacy_achievements` once for existing local data.
   - Signed-in players use their username as nick; guests keep the free nickname.
   - Update `leaderboard.html` to v3 too.
3. **Profile page** `profile.html` (`/profile?u=name`): username, join date, best score, rank, runs, bosses, playtime, favourite character, title, achievements, recent runs. Link to it from leaderboard names.
4. Keep the old RPCs until the new client is live; drop the old ones in a later migration.

### Phase 2 — AURA Coins + Shop (cosmetic)
- Coins are earned only by playing, computed server-side: per run from the validated score with a daily cap, plus achievements, a daily login streak, and weekly top-10 rewards. `accounts.coins` already exists. Real money: not now, but keep the design open to it.
- Items:
  - Outfits drawn on the player in canvas: sunglasses, gold chain, crown, cap, hoodie, royal cape.
  - Name colours/effects on the leaderboard: gold, gradient, glow, animated rainbow.
  - Profile frames and banners.
  - Movement trails: fire, neon, glitch, money.
  - FLEX effects.
- Rarity tiers: common / rare / legendary / mythic. Some items are exclusive and can't be bought: only for season champions and the hardest achievements.
- Tables: items, inventory, equipped; RPCs to buy and equip, all validated server-side.

### Phase 3
- Daily rotating shop (4 items), monthly seasons with exclusive rewards, maybe a battle pass later.
