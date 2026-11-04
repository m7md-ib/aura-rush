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
- `index.html` — page shell + all CSS + HTML screens (overlays). Loads `game.js` with `defer`.
- `game.js` — all game logic (~1,400 lines): LEVELS, SECRETS, ASCENSION, CHARS, ACH/Ach, Sound (WebAudio synth music + sample SFX), Supabase `rpc()`, Board, Challenge, Input, Perf, update/draw loop.
- `leaderboard.html` — top-100 page ("عرش الـAURA") with podium, stats, all-time/week tabs.
- `vercel.json` — `{"cleanUrls":true}`.
- `assets/sfx/*.mp3` — 26 Kenney CC0 sound effects (license in `assets/sfx/LICENSE-kenney.txt`). Every SFX falls back to the synth if its file fails to load.
- `sql/accounts_v1.sql` — accounts migration, **NOT applied yet** (see "Next work").

## Git & deploy
- GitHub repo: https://github.com/m7md-ib/aura-rush (branch `main`).
- Vercel project `aura-rush` (team `m7mds-projects-1991906d`, project id `prj_PcObgGInY24vAJGZUAKQnvZ4hgR7`) is connected to the repo: **every push to `main` deploys to production automatically.** Pushes to other branches create preview deployments.
- **The local folder is NOT a git repo yet** (files were uploaded through the GitHub website). First task: connect it without losing local changes:
  ```
  git init
  git remote add origin https://github.com/m7md-ib/aura-rush.git
  git fetch origin
  git checkout -b main
  git reset origin/main
  git status
  ```
  `git status` will then show local changes not yet on GitHub. Expected: the sound update (`game.js`, `README.md`, `assets/sfx/*.mp3`) unless Muhammad already uploaded it, plus `sql/` and this `CLAUDE.md`. Review the diff and show him before committing.

## Backend: Supabase
- Project `aura-rush`, id `neciihvhzlxqijgfddmw`, URL `https://neciihvhzlxqijgfddmw.supabase.co`.
- Client uses the **publishable** key (`sb_publishable_JLUNUppVVhSm5wglgE7QdA_klJ6Jdgt`, already in `game.js`) and calls RPCs: `POST /rest/v1/rpc/<fn>` with header `apikey`.
- **Never ask for, store, or commit the `service_role` / secret key.**
- Security model: tables have RLS on with no policies; all access goes through `SECURITY DEFINER` functions with `set search_path`.
- Live schema today:
  - `runs` (id, player_id uuid, nick, score, level, bosses, duration_s, created_at, "character", title)
  - `challenges` (code pk, player_id unique, created_at)
- Live functions:
  - `aura_score_cap(duration, bosses)`.
  - `submit_score(uuid,text,int,int,int,int,text,text)`: validates level/bosses/duration, "too fast" if duration < 25*(level-1), the score cap, a 10s rate limit, and the character and title allow-lists.
  - `get_leaderboard_v2`, `get_my_rank`, `get_stats`, `create_challenge`, `get_challenge`.
- `"character"` is a reserved word — always quote it in SQL.

## Hard rules
1. **Never push to `main` (= production) without Muhammad's explicit approval.** Work on a branch, give him the Vercel preview link, push or merge to `main` only after he says yes.
2. Don't weaken anti-cheat: score cap, duration checks, rate limits, server-side validation. Mobile and PC must stay under the same scoring rules.
3. Don't change game balance in updates that aren't about balance.
4. Shop items are cosmetic only. No pay-to-win.
5. Keep UI text in Jordanian Arabic and keep RTL working. Test at phone width (360px) and desktop.
6. Before shipping, play-test with Playwright: start a run, check there are no console errors, check boss flow, and check mobile touch.

## Next work (in order)

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
