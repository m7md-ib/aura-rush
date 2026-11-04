(() => {
const $ = id => document.getElementById(id);
const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
const scEl = $('sc'), egoFill = $('egofill'), multEl = $('mult'), livesEl = $('lives'), flexBtn = $('flex');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = { gold:'#ffc94d', cyan:'#6ee7ff', cringe:'#ff4f7b', text:'#f4effe', ink:'#110a22', pink:'#ff8fd1', rage:'#ff3b3b', dark:'#b06cff' };
const store = { get(k,d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
                set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} } };
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ---------- levels & bosses ---------- */
const LEVELS = [
  { name:'الحارة',        bg:'#150d2b', glow:[190,170,255], dur:28, speed:200, root:45,
    boss:{ name:'الـNPC الكبير', hp:45, color:'#b9a6ff', pats:['aim','fan'], ability:'clones', abilityName:'NPC Mode',
      taunt:'«أنا مش زعيم... أنا بس مارق من هون.»', rageTaunt:'«خلص! صرت main character!»',
      death:'الـNPC الكبير خلّص عليك. يعني إنت الـNPC هون.' } },
  { name:'المدرسة',       bg:'#0c172c', glow:[110,200,255], dur:30, speed:245, root:43,
    boss:{ name:'أبو التريند', hp:65, color:'#ff9f43', pats:['fan','aim','rain'], ability:'steal', abilityName:'Trend Theft',
      taunt:'«ترند اليوم إنت... بس بكرا مين بتكون؟»', rageTaunt:'«رح أعمل منك ميم!»', ragePat:'wall',
      death:'أبو التريند عمل منك ترند... بس ترند فاشل.' } },
  { name:'الجامعة',       bg:'#0b2124', glow:[110,240,190], dur:32, speed:290, root:41,
    boss:{ name:'المتفلسف', hp:85, color:'#7bed9f', pats:['spiral','aim','fan'], ability:'think', abilityName:'Overthinking',
      taunt:'«قبل ما تضربني... سألت حالك ليش؟»', rageTaunt:'«خلص، بطّلت أفكر.»', ragePat:'freeze',
      death:'المتفلسف أقنعك إنك خسرت. وصدّقته.' } },
  { name:'السوشال ميديا', bg:'#260c22', glow:[255,110,170], dur:34, speed:335, root:47,
    boss:{ name:'ملك الكرنج', hp:110, color:'#ff4f7b', pats:['rain','spiral','fan','aim'], ability:'storm', abilityName:'Cringe Storm',
      taunt:'«ولا يهمك، الكرنج عندي ببلاش.»', rageTaunt:'«استحي على حالك!»',
      death:'ملك الكرنج غرّقك بالكرنج.' } },
  { name:'عرش الهالة',    bg:'#1d1406', glow:[255,201,77], dur:36, speed:380, root:40,
    boss:{ name:'الإيجو الأسود', hp:150, color:'#6ee7ff', pats:['spiral','fan','rain','aim'], ability:'corrupt', abilityName:'Aura Corruption',
      taunt:'«هالتك؟ أنا اللي عطيتك إياها.»', rageTaunt:'«ما في عرش إلا إلي.»',
      death:'الإيجو الأسود أكل هالتك.' } },
];
function levelCfg(i){
  const b = LEVELS[i % 5], loop = Math.floor(i / 5);
  return { ...b, idx:i % 5, num:i + 1, loop, speed:b.speed + loop*70,
           bossName: b.boss.name + (loop ? ' ' + (loop+1) : ''), bossHp: Math.round(b.boss.hp * (1 + loop*.7)) };
}

/* ---------- secret bosses: rare encounters that replace a stage boss ---------- */
const SECRETS = [
  { key:'bots', idx:6, name:'مزرعة البوتات', hp:180, color:'#9aa4ff', pats:['fan','aim','rain'], ability:'swarm', abilityName:'Bot Swarm', minStage:1, chance:.025, bonus:2000,
    taunt:'«عندي 10 آلاف حساب... وكلهم بكرهوك.»', rageTaunt:'«فعّلت الحسابات النايمة!»', death:'البوتات عملولك ريبورت جماعي.' },
  { key:'algo', idx:5, name:'THE ALGORITHM', hp:220, color:'#3dff9a', pats:['feed','aim','spiral'], ability:'shadowban', abilityName:'Shadowban', minStage:2, chance:.025, bonus:2500,
    taunt:'«شفتك... وقررت إنك ما بتظهر لحدا.»', rageTaunt:'«تحديث جديد: إنت محذوف.»', death:'الخوارزمية دفنتك بالـExplore.' },
  { key:'og', idx:7, name:'الأورا الأصلية', hp:320, color:'#ffd86b', pats:['ring','aim','fan','spiral'], ability:'mirror', abilityName:'Mirror FLEX', minStage:3, chance:.004, bonus:8000,
    taunt:'«قبل ما تعرف شو يعني أورا... كنت أنا.»', rageTaunt:'«هلأ بتشوف أورا حقيقية.»', death:'الأورا الأصلية ذكّرتك مين الملك.' },
];
function rollSecret(c){
  const stage = c.idx + c.loop*5, boost = c.loop ? 1.5 : 1;
  const og = SECRETS[2]; if (stage >= og.minStage && Math.random() < og.chance*boost) return og;
  for (const sc of [SECRETS[0], SECRETS[1]]) if (stage >= sc.minStage && Math.random() < sc.chance*boost) return sc;
  return null;
}
/* ---------- ascension: what changes after the 5th boss ---------- */
const ASCENSION = [ null,
  { name:'التصعيد 1', desc:'الزعماء بيغضبوا عند 50% · قدرات أسرع · الـL بتلاحقك' },
  { name:'التصعيد 2', desc:'كل زعيم بيستعير قدرة زعيم ثاني · رصاص أسرع' },
  { name:'التصعيد 3', desc:'انقطاع كهربا كل شوي · كل إشي أسرع' } ];
const ascOf = c => Math.min(c.loop, 3);
/* ---------- characters (cosmetic look + one strength, one weakness) ---------- */
const CHARS = {
  sigma:  { name:'Sigma',       desc:'متوازن · FLEX أقوى 10%' },
  menace: { name:'The Menace',  desc:'ضرر الزعماء +20% · بتبلش بقلبين بس' },
  magnet: { name:'The Magnet',  desc:'بيسحب الألماس من بعيد · هالة الألماس −15%' },
  ghost:  { name:'The Ghost',   desc:'حماية أطول بعد الضربة · حركة أبطأ 15%' },
  gambler:{ name:'The Gambler', desc:'التاج +30 إيجو · الانفجار بيخسّرك 40%' },
};
let charId = store.get('auraChar', 'sigma'); if (!CHARS[charId]) charId = 'sigma';
const isChar = id => !!S && S.char === id;
const charDmg = () => (isChar('menace') ? 1.2 : 1) * (isChar('sigma') ? 1.1 : 1);
/* ---------- achievements & titles ---------- */
const ACH = [
  { id:'first',    name:'First Aura',      title:'جديد بالحارة',   desc:'اجمع 100 هالة بجولة' },
  { id:'combo50',  name:'Combo Machine',   title:'ماكينة كومبو',   desc:'وصّل كومبو 50' },
  { id:'sigma',    name:'Sigma Mode',      title:'سيغما',          desc:'اعمل PERFECT FLEX' },
  { id:'untouch',  name:'Untouchable',     title:'ما بنلمس',       desc:'اهزم زعيم بدون ولا ضربة' },
  { id:'slayer',   name:'Boss Slayer',     title:'قاتل الزعماء',   desc:'اهزم 5 زعماء بجولة وحدة' },
  { id:'survivor', name:'Cringe Survivor', title:'ناجي من الكرنج', desc:'50 Near Miss (مجموع)' },
  { id:'ascend',   name:'Ascension',       title:'ما بيوقف',       desc:'وصّل التصعيد الأول' },
  { id:'king',     name:'Aura King',       title:'ملك الهالة',     desc:'اجمع 20,000 هالة بجولة' },
  { id:'grass',    name:'Touch Grass',     title:'اطلع شم هوا',    desc:'العب 30 دقيقة (مجموع)' },
  { id:'hunter',   name:'Secret Hunter',   title:'صياد الأسرار',   desc:'اهزم زعيم سري' },
  { id:'legend',   name:'Legend',          title:'الأسطورة',       desc:'اهزم الأورا الأصلية' },
];
/* Achievements are granted by the server. srv = ids the server says we own (null until loaded / offline → local fallback).
   During a run, unlocks are collected in S.claims and sent with the score; the server re-checks them. */
const Ach = {
  d: Object.assign({ got:{}, near:0, time:0 }, store.get('auraAch', {})),
  srv: null,
  save(){ store.set('auraAch', this.d); },
  has(id){ return this.srv ? this.srv.has(id) : !!this.d.got[id]; },
  setServer(list){ this.srv = new Set((list || []).filter(id => ACH.some(a => a.id === id))); renderTitles(); },
  unlock(id){
    if (S && S.claims) S.claims.add(id);
    if (!this.d.got[id]){ this.d.got[id] = Date.now(); this.save(); if (!this.srv) renderTitles(); }
    if (this.has(id) || (S && S.toasted && S.toasted.has(id))) return;
    if (this.srv && (id === 'grass' || id === 'survivor')) return;   // totals: the server decides after the run
    const a = ACH.find(x => x.id === id);
    if (a && S){ if (S.toasted) S.toasted.add(id); S.toast = { txt:'إنجاز جديد: ' + a.name + ' · لقب «' + a.title + '»', t:0 }; Sound.refund(); }
  },
  tick(dt){ if (!S || !S.run || S.paused) return; this.d.time += dt; this._s = (this._s || 0) + dt; if (this._s > 10){ this._s = 0; this.save(); } if (this.d.time >= 1800) this.unlock('grass'); },
  near(){ this.d.near++; if (this.d.near >= 50) this.unlock('survivor'); },
  titles(){ return ACH.filter(a => this.has(a.id)).map(a => a.title); }
};

/* ---------- sound ---------- */
const Sound = (() => {
  let ac = null, master, music, sfx, nbuf, muted = store.get('auraMute', false), timer = null, step = 0, nextT = 0, mode = 'level', lvl = 0, lastHit = 0;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init(){
    if (ac){ ac.resume && ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : .8; master.connect(ac.destination);
    music = ac.createGain(); music.gain.value = .32; music.connect(master);
    sfx = ac.createGain(); sfx.gain.value = .65; sfx.connect(master);
    loadSamples();
    nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
  }
  function tone(f, dur, o = {}){
    if (!ac) return; const t = o.t ?? ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    g.gain.setValueAtTime(o.vol ?? .15, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g); g.connect(o.dest || sfx); osc.start(t); osc.stop(t + dur + .03);
  }
  function noise(dur, o = {}){
    if (!ac) return; const t = o.t ?? ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; f.type = o.type || 'lowpass'; f.frequency.value = o.freq || 1000;
    g.gain.setValueAtTime(o.vol ?? .3, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.dest || sfx); s.start(t); s.stop(t + dur + .03);
  }
  /* Kenney CC0 samples (assets/sfx). Each event falls back to the synth if its file hasn't loaded. */
  const SAMPLES = ['hit1','hit2','hit3','bhit1','bhit2','flex','sflex','pflex','rage','boom','intro','bdie','dark','crown','refund','level','heart','dcrown','deny','over','tele','steal','puff','secret','toggle','click'];
  const buf = {};
  function loadSamples(){
    SAMPLES.forEach(n => {
      fetch('assets/sfx/' + n + '.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(a => new Promise((ok, no) => ac.decodeAudioData(a, ok, no)))
        .then(b => { buf[n] = b; }).catch(() => {});
    });
  }
  function samp(names, vol = .7, o = {}){
    if (!ac) return false;
    const list = Array.isArray(names) ? names : [names], n = list[Math.floor(Math.random()*list.length)], b = buf[n];
    if (!b) return false;
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = b; src.playbackRate.value = (o.rate || 1) * (o.vary ? 1 + (Math.random() - .5) * o.vary : 1);
    g.gain.value = vol; src.connect(g); g.connect(sfx); src.start(o.t ?? ac.currentTime);
    return true;
  }
  function arp(notes, gap, o){ if (!ac) return; const t = ac.currentTime; notes.forEach((f,i) => tone(f, o.dur || .15, { ...o, t: t + i*gap })); }

  const BASS = { level:[0,null,0,null, 12,null,0,null, 0,null,0,null, 10,null,7,null],
                 boss: [0,0,12,0, 0,0,12,0, 3,3,15,3, 5,5,17,5],
                 rage: [0,0,12,0, 1,1,13,1, 0,0,12,0, 6,6,18,7] };
  function playStep(s, t){
    const root = LEVELS[lvl % 5].root, boss = mode === 'boss', rage = mode === 'rage', fight = boss || rage;
    const b = BASS[mode === 'intro' ? 'level' : mode][s];
    if (mode === 'intro'){ if (s % 4 === 0) tone(mtof(root - 12), .5, { type:'sawtooth', vol:.12, t, dest:music }); return; }
    if (b != null){
      const osc = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = mtof(root + b); f.type = 'lowpass'; f.frequency.value = rage ? 1500 : boss ? 900 : 600;
      g.gain.setValueAtTime(rage ? .19 : .16, t); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
      osc.connect(f); f.connect(g); g.connect(music); osc.start(t); osc.stop(t + .16);
    }
    if (s % 4 === 0 || (boss && s === 14) || (rage && s % 2 === 0)) tone(150, .14, { type:'sine', vol:.55, slide:40, t, dest:music });
    if (fight ? s % 2 === 1 : s % 4 === 2) noise(.04, { type:'highpass', freq:7000, vol:.12, t, dest:music });
    if (s === 4 || s === 12) noise(.12, { type:'bandpass', freq:1800, vol:.18, t, dest:music });
    if (boss && s % 3 === 0){ const tri = [0,3,7,12][(s/3) % 4]; tone(mtof(root + 24 + tri), .1, { type:'triangle', vol:.06, t, dest:music }); }
    if (rage && s % 2 === 0){ const tri = [0,3,7,10,12,10,7,3][(s/2) % 8]; tone(mtof(root + 24 + tri), .09, { type:'square', vol:.05, t, dest:music }); }
  }
  function startMusic(){
    if (!ac || timer) return; nextT = ac.currentTime + .05;
    timer = setInterval(() => {
      const bpm = mode === 'rage' ? 170 : mode === 'boss' ? 142 + (lvl % 5)*4 : mode === 'intro' ? 90 : 116 + (lvl % 5)*6, sd = 60 / bpm / 4;
      while (nextT < ac.currentTime + .12){ playStep(step, nextT); nextT += sd; step = (step + 1) % 16; }
    }, 25);
  }
  function stopMusic(){ clearInterval(timer); timer = null; }
  return {
    init, startMusic, stopMusic,
    get muted(){ return muted; },
    toggle(){ muted = !muted; store.set('auraMute', muted); if (master) master.gain.value = muted ? 0 : .8; return muted; },
    setMode(m, l){ mode = m; lvl = l; },
    click(){ samp('click', .5); },
    pickup(c){ tone(880 * Math.pow(2, Math.min(c, 18)/24), .09, { type:'triangle', vol:.2 }); },
    crown(){ if (samp('crown', .55)) return; arp([523, 784, 1046], .06, { type:'square', vol:.08, dur:.16 }); },
    darkCrown(){ if (samp('dcrown', .6)) return; arp([392, 311, 233], .07, { type:'sawtooth', vol:.1, dur:.18 }); },
    heart(){ if (samp('heart', .6)) return; arp([660, 880, 1320], .07, { type:'triangle', vol:.15 }); },
    hit(){ if (samp(['hit1','hit2','hit3'], .9, { vary:.1 })){ tone(180, .25, { type:'sawtooth', vol:.12, slide:50 }); return; } noise(.3, { vol:.5, freq:700 }); tone(180, .3, { type:'sawtooth', vol:.25, slide:50 }); },
    flex(){ samp('flex', .55, { vary:.06 }); tone(180, .45, { type:'sawtooth', vol:.2, slide:1400 }); noise(.4, { type:'bandpass', freq:3000, vol:.25 }); },
    superFlex(){ this.flex(); samp('sflex', .6); tone(2200, .3, { type:'triangle', vol:.12, slide:3200 }); },
    perfectFlex(){ this.flex(); samp('pflex', .5); arp([784, 988, 1175, 1568, 1976], .05, { type:'triangle', vol:.16, dur:.22 }); },
    deny(){ if (samp('deny', .35)) return; tone(140, .12, { vol:.1 }); },
    egoTick(e){ tone(500 + (e - 90)*70, .07, { vol:.06 }); },
    egoBoom(){ samp('boom', .9); noise(.8, { vol:.6, freq:300 }); tone(90, .7, { vol:.2, slide:30 }); },
    near(){ noise(.09, { type:'bandpass', freq:2600, vol:.14 }); tone(1200, .08, { type:'triangle', vol:.06, slide:1900 }); },
    tele(){ if (samp('tele', .5, { vary:.1 })) return; arp([440, 660], .12, { type:'triangle', vol:.12, dur:.14 }); },
    intro(){ if (!ac) return; samp('intro', .8, { rate:.8 }); noise(1.4, { vol:.55, freq:180 }); tone(70, 1.2, { type:'sine', vol:.5, slide:35 }); tone(140, .9, { type:'sawtooth', vol:.08, slide:60, t:ac.currentTime + .5 }); },
    rageOn(){ samp('rage', .6, { rate:.85 }); noise(1, { vol:.6, freq:400 }); tone(110, 1, { type:'sawtooth', vol:.25, slide:40 }); tone(55, 1.2, { type:'square', vol:.12 }); },
    steal(){ if (samp('steal', .55)) return; tone(900, .45, { type:'sawtooth', vol:.14, slide:250 }); },
    refund(){ if (samp('refund', .55)) return; arp([523, 659, 784, 1046], .06, { type:'triangle', vol:.16 }); },
    puff(){ if (samp('puff', .4, { vary:.15 })) return; noise(.12, { type:'bandpass', freq:1200, vol:.12 }); },
    darkBurst(){ if (samp('dark', .85, { rate:.8 })){ tone(60, .5, { type:'sawtooth', vol:.1, slide:30 }); return; } noise(.7, { vol:.5, freq:250 }); tone(60, .6, { type:'sawtooth', vol:.18, slide:30 }); },
    secret(){ samp('secret', .6, { rate:.7 }); arp([196, 233, 277, 330, 415, 494, 587], .07, { type:'sawtooth', vol:.1, dur:.3 }); },
    bossHit(){ if (!ac) return; const n = ac.currentTime; if (n - lastHit < .07) return; lastHit = n; if (samp(['bhit1','bhit2'], .18, { vary:.25 })) return; tone(1300 + Math.random()*300, .035, { vol:.05 }); },
    shoot(){ tone(1900, .025, { vol:.012 }); },
    bossDie(){ samp('bdie', .8, { rate:.7 }); noise(1.2, { vol:.6, freq:500 }); arp([523, 659, 784, 1046, 1318, 1568], .08, { type:'triangle', vol:.18, dur:.25 }); },
    level(){ if (samp('level', .6)) return; arp([440, 554, 659, 880], .09, { type:'square', vol:.08, dur:.2 }); },
    over(){ if (samp('over', .6)) return; arp([440, 370, 311, 220], .2, { type:'sawtooth', vol:.12, dur:.35 }); },
  };
})();

/* ---------- leaderboard + challenges (Supabase) ---------- */
const SB_URL = 'https://neciihvhzlxqijgfddmw.supabase.co', SB_KEY = 'sb_publishable_JLUNUppVVhSm5wglgE7QdA_klJ6Jdgt';
async function rpc(fn, body){
  const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method:'POST', headers:{ apikey:SB_KEY, 'Content-Type':'application/json' }, body:JSON.stringify(body || {}) });
  const txt = await r.text();
  if (!r.ok) throw new Error(txt.slice(0, 300));
  return txt ? JSON.parse(txt) : null;
}
function playerId(){
  let id = store.get('auraPlayer', null);
  if (!id){
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random()*16|0).toString(16));
    store.set('auraPlayer', id);
  }
  return id;
}
const UID = playerId();
/* ---------- accounts: username + password, session token in localStorage ---------- */
const AUTH_ERR = [
  [/bad username/, 'الاسم لازم يكون من 3 لـ16 حرف: عربي أو إنجليزي أو أرقام أو _ (بدون مسافات)'],
  [/bad password/, 'كلمة السر لازم تكون 6 أحرف أو أكثر'],
  [/username taken/, 'هالاسم مأخوذ، جرّب غيره'],
  [/too many signups/, 'عملت حسابات كثير من هالجهاز. استنى ساعة وجرّب'],
  [/wrong login/, 'الاسم أو كلمة السر غلط'],
  [/locked/, 'محاولات غلط كثير. استنى ربع ساعة وجرّب كمان مرة'],
  [/wrong recovery/, 'كود الاسترجاع غلط'],
];
const authMsg = e => (AUTH_ERR.find(([re]) => re.test(e && e.message || '')) || [0, 'في مشكلة بالنت. جرّب كمان مرة'])[1];
const Acct = {
  token: store.get('auraToken', null), user: store.get('auraUser', null),
  coins: 0, eq: {}, dailyReady: false, streak: 0, weeklyDone: false,
  get signedIn(){ return !!(this.token && this.user); },
  set(token, user){ this.token = token || null; this.user = token ? user : null; store.set('auraToken', this.token); store.set('auraUser', this.user); if (!token){ this.coins = 0; this.eq = {}; this.dailyReady = false; } renderAcct(); },
  setCoins(n){ if (n != null){ this.coins = n; renderAcct(); } },
  /* last week's top 10 get coins; checked once per page load */
  async weekly(){
    if (this.weeklyDone || !this.signedIn) return; this.weeklyDone = true;
    try { const w = await rpc('claim_weekly', { p_token:this.token }); if (w && w.reward > 0){ this.setCoins(w.coins); note('مبروك! طلعت #' + w.rank + ' الأسبوع الماضي: +' + w.reward + ' عملة'); } } catch(e){}
  },
  /* who am I + achievements. First run after this update: import the achievements this device earned before accounts existed. */
  async sync(){
    try {
      if (!store.get('auraAchImported', false)){
        const ids = Object.keys(Ach.d.got).filter(id => ACH.some(a => a.id === id));
        if (ids.length) await rpc('import_legacy_achievements', { p_player:UID, p_achs:ids });
        store.set('auraAchImported', true);
      }
      const m = await rpc('me', { p_token:this.token, p_player:UID });
      if (this.token && !m.signed_in) this.set(null);
      else if (m.signed_in && m.username !== this.user) this.set(this.token, m.username);
      if (m.signed_in){ this.eq = m.equipped || {}; this.dailyReady = !!m.daily_ready; this.streak = m.streak || 0; this.setCoins(m.coins || 0); this.weekly(); }
      Ach.setServer(m.achievements);
    } catch(e){}
  },
  async after(r){ this.set(r.token, r.username); await this.sync(); Board.refresh(); },
  async signup(u, p){ const r = await rpc('signup', { p_username:u, p_password:p, p_player:UID }); await this.after(r); return r.recovery; },
  async login(u, p){ await this.after(await rpc('login', { p_username:u, p_password:p, p_player:UID })); },
  async reset(u, code, p){ const r = await rpc('reset_password', { p_username:u, p_recovery:code, p_new:p }); await this.after(r); return r.recovery; },
  async logout(){ const t = this.token; this.set(null); try { await rpc('logout', { p_token:t }); } catch(e){} await this.sync(); Board.refresh(); }
};
const Board = {
  rows:[], shared:false, me:null, uid:UID,
  local(){ return store.get('auraBoard', []); },
  async refresh(){
    try {
      const rows = await rpc('get_leaderboard_v4', { p_limit:100, p_player:this.uid, p_period:'all', p_token:Acct.token });
      this.rows = (rows || []).map(r => ({ nick:String(r.nick || '').slice(0,16), score:Math.max(0, +r.score || 0), level:+r.level || 1, isMe:!!r.is_me, title:String(r.title || '').slice(0,24), verified:!!r.verified, fx:r.name_fx || '' }));
      this.me = await rpc('get_my_rank_v3', { p_player:this.uid, p_period:'all', p_token:Acct.token });
      this.shared = true;
    } catch(e){ this.shared = false; }
    renderBoards();
  },
  init(){ this.refresh(); setInterval(() => { if (!S || !S.run) this.refresh(); }, 30000); },
  async submit(entry){
    const loc = this.local(); loc.push(entry); loc.sort((a,b) => b.score - a.score); store.set('auraBoard', loc.slice(0,5));
    try {
      const r = await rpc('submit_score_v3', { p_player:this.uid, p_token:Acct.token, p_nick:entry.nick, p_score:entry.score, p_level:entry.level, p_bosses:entry.bosses,
        p_duration:entry.duration, p_character:entry.character, p_title:entry.title || null, p_achs:entry.claims || [], p_near:entry.near || 0 });
      if (r && r.achievements) Ach.setServer(r.achievements);
      if (r && r.coins != null) Acct.setCoins(r.coins);
      await this.refresh();
      return { status: r && r.new_best ? 'ok' : 'notbest', rank: r && r.rank, fresh: (r && r.new_achievements) || [],
        earned: r ? (r.coins_run || 0) + (r.coins_ach || 0) : 0, capHit: !!(r && r.daily_cap_hit) };
    } catch(e){
      return { status: /plausible|too fast|bad /.test(e.message) ? 'rejected' : /too many/.test(e.message) ? 'slow' : 'local', fresh:[] };
    }
  }
};
const Challenge = {
  target:null,
  async load(){
    let code = null;
    try { code = new URLSearchParams(location.search).get('c'); } catch(e){}
    if (!code || !/^[a-z0-9]{6,12}$/.test(code)) return;
    try {
      const d = await rpc('get_challenge', { p_code:code });
      if (!d || !d.score) return;
      this.target = { nick:String(d.nick || 'لاعب مجهول').slice(0,16), score:Math.max(0, +d.score || 0), level:+d.level || 1 };
      const box = $('challengeBox');
      box.textContent = this.target.nick + ' تحدّاك! جاب ' + this.target.score.toLocaleString('en-US') + ' هالة ووصل المرحلة ' + this.target.level + '. قدّك؟';
      box.hidden = false;
    } catch(e){}
  },
  async link(){
    try { const code = await rpc('create_challenge', { p_player:Board.uid }); if (code) return location.origin + '/?c=' + code; } catch(e){}
    return location.origin + '/';
  }
};
function renderBoards(){
  [['boardStart',10],['boardOver',10],['boardFull',100]].forEach(([id, max]) => {
    const el = $(id); el.textContent = '';
    const h = document.createElement('h3');
    const useShared = Board.shared;
    h.textContent = useShared ? (max === 100 ? 'أفضل 100 على العرش' : 'عرش الـAURA') : 'أعلى نتايجك (بدون نت)';
    el.appendChild(h);
    const rows = useShared ? Board.rows : Board.local();
    if (!rows.length){
      const p = document.createElement('div'); p.className = 'empty';
      p.textContent = useShared ? 'العرش فاضي. كون أول ملك.' : 'لسا ما لعبت. يلا!';
      el.appendChild(p); return;
    }
    const ol = document.createElement('ol');
    rows.slice(0, useShared ? max : 5).forEach((r, i) => {
      const li = document.createElement('li'); if (useShared && r.isMe) li.className = 'me';
      const nick = r.verified ? r.nick : String(r.nick || '').replace(/[✓✔☑✅]/g, '');   // only real accounts get the badge
      const cells = [['p', i === 0 ? '♛' : String(i+1)], ['n', ''], ['lv', 'م' + r.level], ['s', String(r.score)]];
      cells.forEach(([c, t]) => { const s = document.createElement('span'); s.className = c; s.textContent = t; li.appendChild(s); });
      const n = li.children[1], nm = document.createElement('span'); nm.textContent = nick || 'لاعب مجهول';
      if (useShared && r.verified){ const v = document.createElement('b'); v.className = 'vf'; v.textContent = '✓'; v.title = 'حساب مسجّل'; n.appendChild(v); if (r.fx) nm.className = AuraCos.nameClass(r.fx); }
      n.appendChild(nm); if (r.title) n.appendChild(document.createTextNode(' «' + r.title + '»'));
      ol.appendChild(li);
    });
    el.appendChild(ol);
    if (useShared && Board.me && Board.me.rank > Math.min(max, rows.length)){ const p = document.createElement('div'); p.className = 'empty'; p.textContent = 'ترتيبك: #' + Board.me.rank + ' · أفضل نتيجة ' + Board.me.best; el.appendChild(p); }
  });
}
renderBoards(); Challenge.load();
Acct.sync().then(() => Board.init());
function renderChars(){
  const el = $('chars'); el.textContent = '';
  Object.entries(CHARS).forEach(([id, c]) => {
    const b = document.createElement('button'); b.className = 'char'; b.type = 'button'; b.textContent = c.name; b.setAttribute('aria-pressed', String(id === charId));
    b.addEventListener('click', () => { charId = id; store.set('auraChar', id); renderChars(); });
    el.appendChild(b);
  });
  $('charDesc').textContent = CHARS[charId].desc;
}
function renderTitles(){
  const sel = $('titleSel'), cur = store.get('auraTitle', ''); sel.textContent = '';
  const o0 = document.createElement('option'); o0.value = ''; o0.textContent = 'بدون لقب'; sel.appendChild(o0);
  Ach.titles().forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; if (t === cur) o.selected = true; sel.appendChild(o); });
  const list = $('achList'); list.textContent = '';
  ACH.forEach(a => { const li = document.createElement('li'); if (Ach.has(a.id)) li.className = 'got';
    const b = document.createElement('b'); b.textContent = a.name; const i = document.createElement('i'); i.textContent = Ach.has(a.id) ? 'لقب: ' + a.title : 'مقفول';
    const sp = document.createElement('span'); sp.textContent = a.desc; li.append(b, i, sp); list.appendChild(li); });
}
renderChars(); renderTitles();
$('titleSel').addEventListener('change', e => store.set('auraTitle', e.target.value));
$('achBtn').addEventListener('click', () => { renderTitles(); $('startScreen').hidden = true; $('achScreen').hidden = false; $('achBack').focus(); });
$('achBack').addEventListener('click', () => { $('achScreen').hidden = true; $('startScreen').hidden = false; });

/* ---------- account screen: login / signup / forgot password / recovery code / signed-in ---------- */
const A = { scr:$('acctScreen'), tabs:$('acctTabs'), form:$('acctForm'), user:$('aUser'), pass:$('aPass'), passLbl:$('aPassLbl'), rec:$('aRec'), recRow:$('aRecRow'),
  hint:$('aHint'), err:$('aErr'), submit:$('aSubmit'), forgot:$('aForgot'), recov:$('aRecov'), code:$('aCode'), me:$('aMe'), back:$('acctBack') };
const ACCT_UI = {
  login:  { title:'دخول', btn:'ادخل', pass:'كلمة السر', hint:'' },
  signup: { title:'حساب جديد', btn:'سجّل', pass:'كلمة السر', hint:'الاسم من 3 لـ16 حرف (عربي أو إنجليزي أو أرقام أو _). كلمة السر 6 أحرف أو أكثر. ما بدنا إيميل.' },
  reset:  { title:'نسيت كلمة السر', btn:'غيّر كلمة السر', pass:'كلمة السر الجديدة', hint:'اكتب اسمك وكود الاسترجاع اللي حفظته لما سجّلت، وكلمة سر جديدة.' },
};
let acctMode = 'login', acctFrom = null;
function acctShow(mode){
  acctMode = mode;
  const ui = ACCT_UI[mode];
  $('acctTitle').textContent = ui ? ui.title : mode === 'recov' ? 'احفظ هالكود' : 'حسابك';
  A.tabs.hidden = !(mode === 'login' || mode === 'signup');
  A.tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  A.form.hidden = !ui; A.forgot.hidden = mode !== 'login'; A.recov.hidden = mode !== 'recov'; A.me.hidden = mode !== 'me';
  A.back.hidden = mode === 'recov';
  if (ui){
    A.recRow.hidden = mode !== 'reset';
    A.pass.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    A.passLbl.textContent = ui.pass; A.hint.textContent = ui.hint; A.err.textContent = '';
    A.submit.textContent = ui.btn; A.submit.disabled = false;
  }
  if (mode === 'me'){ $('aMeName').textContent = Acct.user; $('aProfile').href = '/profile?u=' + encodeURIComponent(Acct.user); }
}
function openAcct(){
  acctFrom = [...document.querySelectorAll('#stage .overlay')].find(o => !o.hidden && o !== A.scr) || $('startScreen');
  acctFrom.hidden = true; A.scr.hidden = false; A.scr.scrollTop = 0;
  acctShow(Acct.signedIn ? 'me' : 'login');
  if (!Acct.signedIn && !Input.isTouchUI()) A.user.focus(); else A.back.focus();
}
function closeAcct(){ A.scr.hidden = true; A.pass.value = ''; A.rec.value = ''; (acctFrom || $('startScreen')).hidden = false; }
A.tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) acctShow(b.dataset.mode); });
A.forgot.addEventListener('click', () => acctShow('reset'));
A.back.addEventListener('click', () => acctMode === 'reset' ? acctShow('login') : closeAcct());
A.form.addEventListener('submit', async e => {
  e.preventDefault();
  if (A.submit.disabled) return;
  const mode = acctMode, u = A.user.value.trim(), p = A.pass.value, code = A.rec.value.trim();
  if (!u || !p || (mode === 'reset' && !code)){ A.err.textContent = mode === 'reset' ? 'عبّي الاسم والكود وكلمة السر الجديدة' : 'اكتب الاسم وكلمة السر'; return; }
  A.err.textContent = ''; A.submit.disabled = true; A.submit.textContent = 'لحظة...';
  try {
    if (mode === 'login'){ await Acct.login(u, p); closeAcct(); return; }
    const rc = mode === 'signup' ? await Acct.signup(u, p) : await Acct.reset(u, code, p);
    A.pass.value = ''; A.rec.value = '';
    $('aRecLead').textContent = mode === 'signup' ? 'أهلاً ' + Acct.user + '! هاد كود الاسترجاع تبعك:' : 'تغيّرت كلمة السر. هاد كود الاسترجاع الجديد تبعك (القديم ما عاد يشتغل):';
    A.code.textContent = rc; acctShow('recov'); $('aCopy').focus();
  } catch(err){ A.err.textContent = authMsg(err); A.submit.disabled = false; A.submit.textContent = ACCT_UI[mode].btn; }
});
$('aCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(A.code.textContent); $('aCopy').textContent = 'انتسخ ✓'; }
  catch(e){ const r = document.createRange(); r.selectNodeContents(A.code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
});
$('aSaved').addEventListener('click', () => { A.code.textContent = ''; $('aCopy').textContent = 'انسخ الكود'; closeAcct(); });
$('aLogout').addEventListener('click', async () => { $('aLogout').disabled = true; await Acct.logout(); $('aLogout').disabled = false; closeAcct(); });
$('acctBtn').addEventListener('click', openAcct);
$('saveBtn').addEventListener('click', openAcct);
function renderAcct(){
  const on = Acct.signedIn;
  $('nickRow').hidden = on; $('whoRow').hidden = !on; if (on) $('whoName').textContent = Acct.user;
  $('acctBtn').textContent = on ? 'حسابي' : 'سجّل حساب / ادخل';
  $('saveBtn').hidden = on; $('saveHint').hidden = on;
  const c = Acct.coins.toLocaleString('en-US');
  $('coinsTop').textContent = c; $('coinsTop').parentElement.hidden = !on; $('shopCoins').textContent = c;
  $('dailyBtn').hidden = !(on && Acct.dailyReady);
}
renderAcct();
/* one-line message on the start screen (rewards etc.) */
function note(txt){ const n = $('rewardNote'); n.textContent = txt; n.hidden = !txt; }

/* ---------- daily reward ---------- */
$('dailyBtn').addEventListener('click', async () => {
  const b = $('dailyBtn'); b.disabled = true;
  try {
    const r = await rpc('claim_daily', { p_token:Acct.token });
    Acct.dailyReady = false; if (r){ Acct.streak = r.streak || Acct.streak; Acct.setCoins(r.coins); }
    if (r && r.claimed) note('+' + r.reward + ' عملة' + (r.streak > 1 ? ' · صارلك ' + r.streak + ' أيام ورا بعض 🔥' : '') + '. ارجع بكرا عشان تزيد!');
    renderAcct(); Sound.refund();
  } catch(e){ note(authMsg(e)); }
  b.disabled = false;
});

/* ---------- shop ---------- */
const Shop = { items:[], tab:'wear', from:null, anim:null, frames:[] };
const SHOP_ERR = { 'not enough coins':'ما معك عملات كفاية. العب أكثر وارجع!', 'already owned':'هاد عندك أصلاً', 'not for sale':'هاد حصري، ما بنباع', 'not signed in':'لازم تدخل على حسابك', 'not owned':'لازم تشتريه أول' };
const shopErr = e => { const m = String(e && e.message || ''); const k = Object.keys(SHOP_ERR).find(k => m.includes(k)); return k ? SHOP_ERR[k] : 'في مشكلة بالنت. جرّب كمان مرة'; };
function stopShopAnim(){ if (Shop.anim) cancelAnimationFrame(Shop.anim); Shop.anim = null; Shop.frames = []; }
async function openShop(){
  Shop.from = [...document.querySelectorAll('#stage .overlay')].find(o => !o.hidden && o.id !== 'shopScreen') || $('startScreen');
  Shop.from.hidden = true; $('shopScreen').hidden = false; $('shopScreen').scrollTop = 0;
  $('shopNote').textContent = Acct.signedIn ? 'كل الأغراض شكل بس: ما بتغيّر اللعب ولا النقاط.' : 'سجّل حساب عشان تجمع عملات من اللعب وتشتري.';
  $('shopLogin').hidden = Acct.signedIn;
  $('shopGrid').textContent = ''; $('shopGrid').append(Object.assign(document.createElement('p'), { className:'empty', textContent:'عم نحمّل المتجر...' }));
  renderShopTabs();
  try { const d = await rpc('get_shop', { p_token:Acct.token }); Shop.items = (d && d.items) || []; if (d && d.coins != null) Acct.setCoins(d.coins); }
  catch(e){ $('shopGrid').textContent = ''; $('shopGrid').append(Object.assign(document.createElement('p'), { className:'empty', textContent:'ما قدرنا نفتح المتجر. جرّب كمان شوي.' })); return; }
  renderShop();
  $('shopBack').focus({ preventScroll:true });
}
function closeShop(){ stopShopAnim(); $('shopScreen').hidden = true; (Shop.from || $('startScreen')).hidden = false; }
function renderShopTabs(){
  const el = $('shopTabs'); el.textContent = '';
  AuraCos.TABS.forEach(tb => { const b = document.createElement('button'); b.type = 'button'; b.textContent = tb.name; b.setAttribute('aria-pressed', String(tb.id === Shop.tab));
    b.addEventListener('click', () => { Shop.tab = tb.id; renderShopTabs(); renderShop(); }); el.appendChild(b); });
}
function renderShop(){
  stopShopAnim();
  const grid = $('shopGrid'); grid.textContent = '';
  const slots = AuraCos.TABS.find(tb => tb.id === Shop.tab).slots;
  Shop.items.filter(it => slots.includes(it.slot)).forEach(it => {
    const card = document.createElement('div'); card.className = 'item r-' + it.rarity + (it.equipped ? ' on' : '');
    let pv;
    if (it.slot === 'name'){ pv = document.createElement('div'); pv.className = 'pv pv-name'; const s = document.createElement('span'); s.className = AuraCos.nameClass(it.id); s.textContent = Acct.user || 'اسمك'; pv.appendChild(s); }
    else if (it.slot === 'frame' || it.slot === 'banner'){ pv = document.createElement('div'); pv.className = 'pv pv-sw ' + (it.slot === 'frame' ? 'pv-frame fr-' : 'bn-') + it.id.replace(/^(fr|bn)_/, ''); }
    else { pv = document.createElement('canvas'); pv.className = 'pv'; }
    const nm = document.createElement('b'); nm.className = 'iname'; nm.textContent = it.name;
    const rar = document.createElement('span'); rar.className = 'rar'; rar.textContent = AuraCos.RARITY[it.rarity].name + ' · ' + AuraCos.SLOTS[it.slot];
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ibtn';
    if (it.owned){ btn.textContent = it.equipped ? 'اشلحه' : 'البسه'; btn.classList.add(it.equipped ? 'off' : 'wear'); btn.addEventListener('click', () => equip(it, btn)); }
    else if (it.price == null){ const a = ACH.find(x => x.id === it.unlock_ach); btn.textContent = 'حصري: ' + (a ? a.name : 'إنجاز'); btn.disabled = true; btn.classList.add('locked'); }
    else { btn.innerHTML = ''; btn.append(Object.assign(document.createElement('i'), { className:'coin' }), document.createTextNode(' ' + it.price.toLocaleString('en-US'))); btn.classList.add('price');
      if (Acct.signedIn && Acct.coins < it.price) btn.classList.add('poor');
      btn.addEventListener('click', () => buy(it, btn)); }
    card.append(pv, nm, rar, btn); grid.appendChild(card);
    if (pv.tagName === 'CANVAS') Shop.frames.push(AuraCos.preview(pv, it));
  });
  if (Shop.frames.length){
    let lastT = 0;
    const tick = now => { const t = now/1000, dt = Math.min(.05, lastT ? t - lastT : .016); lastT = t; Shop.frames.forEach(f => f(t, dt)); Shop.anim = requestAnimationFrame(tick); };
    Shop.anim = requestAnimationFrame(tick);
  }
}
async function buy(it, btn){
  if (!Acct.signedIn){ closeShop(); openAcct(); return; }
  if (!btn.classList.contains('confirm')){   // two taps to buy: no accidental purchases
    btn.classList.add('confirm'); btn.textContent = 'أكيد؟ اكبس كمان مرة';
    setTimeout(() => { if (btn.isConnected && btn.classList.contains('confirm')) renderShop(); }, 3000);
    return;
  }
  btn.disabled = true; btn.textContent = 'لحظة...';
  try { const r = await rpc('buy_item', { p_token:Acct.token, p_item:it.id }); it.owned = true; Acct.setCoins(r.coins); Sound.refund();
    $('shopNote').textContent = 'صار عندك «' + it.name + '»! اكبس «البسه» عشان يطلع عليك.'; }
  catch(e){ $('shopNote').textContent = shopErr(e); Sound.deny(); }
  renderShop();
}
async function equip(it, btn){
  btn.disabled = true;
  try {
    Acct.eq = await rpc('equip_item', { p_token:Acct.token, p_slot:it.slot, p_item:it.equipped ? null : it.id }) || {};
    Shop.items.forEach(x => { x.equipped = Acct.eq[x.slot] === x.id; });
    $('shopNote').textContent = it.equipped ? 'لبست «' + it.name + '»' : 'شلحت «' + it.name + '»';
    Board.refresh();
  } catch(e){ $('shopNote').textContent = shopErr(e); }
  renderShop();
}
$('shopBtn').addEventListener('click', openShop);
$('shopBack').addEventListener('click', closeShop);
$('shopLogin').addEventListener('click', () => { closeShop(); openAcct(); });

/* ---------- canvas setup ---------- */
let W = 0, H = 0;
const P = { x:0, y:0, r:18, tx:0, kv:0, px:0, dx:0, touch:false };
/* input detection: capabilities, not user-agent. 'touch' class = touch UI (pause button, big FLEX) */
const Input = {
  coarse: matchMedia('(pointer: coarse)'),
  touchCapable: (navigator.maxTouchPoints || 0) > 0,
  last: null, dragId: null, dragOffset: 0,
  isTouchUI(){ return this.last ? this.last === 'touch' : (this.coarse.matches || (this.touchCapable && !matchMedia('(any-pointer: fine)').matches)); },
  apply(){ document.documentElement.classList.toggle('touch', this.isTouchUI()); },
  use(kind){ if (this.last !== kind){ this.last = kind; this.apply(); } }
};
Input.apply();
if (Input.coarse.addEventListener) Input.coarse.addEventListener('change', () => Input.apply());
/* adaptive quality: if frames are slow for ~4s, drop canvas glow + halve particles. Gameplay is untouched. */
const Perf = { low:false, acc:0, n:0, slow:0,
  sample(dt){ if (this.low || !S || !S.run || S.paused) return; this.acc += dt; this.n++;
    if (this.acc >= 2){ const avg = this.acc / this.n; this.slow = avg > .024 ? this.slow + 1 : 0; this.acc = 0; this.n = 0; if (this.slow >= 2) this.enableLow(); } },
  enableLow(){ this.low = true; ctx.shadowBlur = 0; try { Object.defineProperty(ctx, 'shadowBlur', { configurable:true, get(){ return 0; }, set(){} }); } catch(e){} }
};
let S = null, stars = [], keys = {}, last = 0;
const Cos = AuraCos.sys();   // shop trail + FLEX effect particles (visual only)
function resize(){
  const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
  if (!r.width || !r.height) return;
  const oldW = W, oldH = H;
  W = r.width; H = r.height; cv.width = Math.round(W*d); cv.height = Math.round(H*d); ctx.setTransform(d,0,0,d,0,0);
  if (S && oldW && oldH && (oldW !== W || oldH !== H)){
    const sx = W/oldW, sy = H/oldH, sc = o => { o.x *= sx; o.y *= sy; };
    P.x *= sx; P.tx *= sx; P.px = P.x;
    S.items.forEach(sc); S.bullets.forEach(sc); S.bolts.forEach(sc); S.parts.forEach(sc); S.texts.forEach(sc);
    if (S.boss){ sc(S.boss); S.boss.r = Math.max(34, Math.min(50, W*.11)); if (S.boss.clones) S.boss.clones.forEach(sc); }
    if (S.beam) S.beam.x *= sx;
    if (Input.isTouchUI() && S.run && !S.paused && (oldW > oldH) !== (W > H)) setPause(true);   // orientation flip
  }
  P.y = H - 56; if (!P.x){ P.x = P.tx = P.px = W/2; }
  P.x = clamp(P.x, P.r, W - P.r);
  if (S && S.boss) S.boss.ty = Math.min(120, H*.2);
  if (!stars.length) for (let i = 0; i < 80; i++) stars.push({ x:Math.random(), y:Math.random(), z:.3 + Math.random()*.9 });
}
new ResizeObserver(resize).observe(stage); resize();
if (document.fonts && document.fonts.load) document.fonts.load('30px Lalezar');
$('nick').value = store.get('auraNick', '');

/* ---------- game state ---------- */
function newState(){
  return { run:true, paused:false, aura:0, ego:0, lives:3, maxLives:5, li:0, cfg:levelCfg(0), phase:'level', pt:0, t:0, speed:200,
    spawn:.5, items:[], bullets:[], bolts:[], parts:[], texts:[], rings:[], beam:null, boss:null, fireT:0,
    combo:0, comboT:0, bestCombo:0, bosses:0, shake:0, inv:0, flash:0, banner:null, slowmo:0,
    nearCD:0, nearMisses:0, heartT:0, lastHit:null, lastBoomT:-99, egoWarn:false, egoTickT:0,
    phil:null, corruptT:0, eclipseT:0, intro:null, forceHeart:false,
    char:charId, title:(t => Ach.titles().includes(t) ? t : '')(store.get('auraTitle', '')), shield:0, magnetT:0, freezeT:0, puCD:8, toast:null, banT:0,
    hitThisBoss:false, blackoutCD:20, beams:[], secret:null, claims:new Set(), toasted:new Set() };
}
const mult = () => S.ego >= 67 ? 3 : S.ego >= 34 ? 2 : 1;

function start(){
  Sound.init();
  const nick = $('nick').value.trim().slice(0,16); store.set('auraNick', nick);
  S = newState(); P.x = P.tx = P.px = W/2; P.kv = 0; Cos.parts = []; Cos.bolts = [];
  if (S.char === 'menace') S.lives = 2;
  ['startScreen','overScreen','pauseScreen','achScreen','boardScreen','acctScreen','shopScreen'].forEach(id => $(id).hidden = true);
  stopShopAnim();
  renderLives(); banner('المرحلة 1', S.cfg.name); Sound.setMode('level', 0); Sound.level(); Sound.startMusic();
  stage.focus && stage.focus();
}
function setPause(p){
  if (!S || !S.run) return;
  S.paused = p; $('pauseScreen').hidden = !p;
  if (p) Sound.stopMusic(); else { Sound.init(); Sound.startMusic(); last = 0; }
}
function deathMessage(){
  if (S.t - S.lastBoomT < 5) return 'الإيجو أكبر من الإنجاز.';
  if (S.lastHit === 'bullet' && S.boss) return S.boss.def.death;
  if (S.lastHit === 'storm') return 'عاصفة الكرنج بلعتك.';
  if (S.lastHit === 'L') return S.cfg.num === 1 && S.aura < 300 ? 'الكرنج كان أقوى منك... من أول مرحلة.' : 'الكرنج كان أقوى منك.';
  return 'خلصت الهالة يا أسطورة.';
}
let lastRun = null;
async function gameOver(){
  S.run = false; Sound.stopMusic(); Sound.over();
  const a = Math.floor(S.aura);
  const ranks = [[500,'NPC'],[2000,'عادي بس محترم'],[5000,'سيغما'],[10000,'بطل القصة'],[20000,'سيد الهالة'],[Infinity,'ملك الـAURA']];
  $('rank').textContent = ranks.find(r => a < r[0])[1];
  $('deathMsg').textContent = deathMessage();
  $('finalScore').textContent = a; $('finalLvl').textContent = S.cfg.num; $('finalBoss').textContent = S.bosses; $('finalCombo').textContent = S.bestCombo;
  const ch = $('challengeResult');
  if (Challenge.target){
    const diff = a - Challenge.target.score;
    ch.textContent = diff > 0 ? 'غلبت ' + Challenge.target.nick + ' بفرق ' + diff.toLocaleString('en-US') + ' هالة!' : 'ناقصك ' + (1 - diff).toLocaleString('en-US') + ' هالة عشان تغلب ' + Challenge.target.nick + '.';
    ch.hidden = false;
  } else ch.hidden = true;
  $('overScreen').hidden = false; $('againBtn').focus();
  const nick = Acct.signedIn ? Acct.user : ($('nick').value.trim().slice(0,16) || 'لاعب مجهول');
  lastRun = { score:a, rank:null };
  $('status').textContent = 'عم نرفع نتيجتك...';
  const res = await Board.submit({ nick, score:a, level:S.cfg.num, bosses:S.bosses, duration:Math.max(3, Math.round(S.t)), character:S.char, title:S.title,
    claims:[...S.claims], near:S.nearMisses });
  lastRun.rank = res.rank || null;
  const fresh = ACH.filter(x => res.fresh.includes(x.id)).map(x => '«' + x.title + '»');
  $('status').textContent = (res.status === 'ok' ? 'رقم جديد! ترتيبك على العرش #' + res.rank
    : res.status === 'notbest' ? 'رقمك القديم أعلى' + (res.rank ? '. ترتيبك #' + res.rank : '')
    : res.status === 'rejected' ? 'النتيجة ما عدّت فحص الغش'
    : res.status === 'slow' ? 'استنى شوي بين كل لعبة والثانية'
    : 'ما في اتصال، انحفظت نتيجتك على جهازك')
    + (fresh.length ? ' · لقب جديد: ' + fresh.join('، ') : '')
    + (res.earned > 0 ? ' · +' + res.earned + ' عملة' : res.capHit ? ' · خلصت عملات الجولات لليوم' : '');
}
function renderLives(){
  livesEl.textContent = '';
  for (let i = 0; i < Math.max(3, S.lives); i++){ const el = document.createElement('i'); if (i >= S.lives) el.className = 'off'; livesEl.appendChild(el); }
}
function banner(title, sub, color, dur){ S.banner = { title, sub, color: color || C.gold, t:0, dur: dur || 2.4 }; }
function burst(x,y,color,n,sp){ if (Perf.low) n = Math.ceil(n*.5); for (let i = 0; i < n; i++){ const a = Math.random()*Math.PI*2, v = (.3 + Math.random())*sp;
  S.parts.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:.5 + Math.random()*.4, max:.9, color, s:2 + Math.random()*3 }); }
  const cap = Perf.low ? 300 : 600; if (S.parts.length > cap) S.parts.splice(0, S.parts.length - cap); }
function say(x,y,txt,color,size=26){ S.texts.push({ x, y, txt, color, size, life:1 }); }

/* ---------- FLEX: normal / super (80+) / perfect (95+) ---------- */
function flexTier(e){ return e >= 95 ? 'perfect' : e >= 80 ? 'super' : 'normal'; }
function flex(){
  if (!S || !S.run || S.paused || S.intro) return;
  if (S.banT > 0){ say(P.x, P.y-50, 'انعملك شادو بان!', '#3dff9a', 22); Sound.deny(); return; }
  if (S.ego < 25){ say(P.x, P.y-50, 'إيجو مش كافي', C.cringe, 20); Sound.deny(); return; }
  const m = mult(), tier = flexTier(S.ego);
  let gain = Math.round(S.ego * 3 * m * (tier === 'normal' ? 1 : 1.25) * (isChar('sigma') ? 1.1 : 1));
  if (tier === 'perfect'){ gain += Math.min(S.combo, 50) * 15 * m; S.combo += 5; S.comboT = 2.2; S.bestCombo = Math.max(S.bestCombo, S.combo); S.slowmo = .45; Ach.unlock('sigma'); }
  S.aura += gain;
  S.items = S.items.filter(it => { if (it.type === 'L'){ burst(it.x,it.y,C.cringe,12,240); return false; } return true; });
  S.bullets.forEach(b => burst(b.x,b.y,C.cringe,3,120)); S.bullets = [];
  const b = S.boss;
  if (b && b.clones){ b.clones.forEach(c => burst(c.x, c.y, b.color, 14, 200)); b.clones = []; }
  if (b && b.minions){ b.minions.forEach(mn => burst(mn.x, mn.y, '#9aa4ff', 12, 200)); b.minions = []; }
  S.rings.push({ x:P.x, y:P.y, r:10, life:1, color: tier === 'perfect' ? C.gold : C.cyan });
  if (!reduce) AuraCos.flex(Cos, Acct.eq.flex, P.x, P.y, W, H, Perf.low);   // cosmetic FLEX effect from the shop
  burst(P.x,P.y, tier === 'perfect' ? C.gold : C.cyan, tier === 'normal' ? 40 : 70, tier === 'normal' ? 420 : 560);
  const label = tier === 'perfect' ? 'PERFECT FLEX! +' : tier === 'super' ? 'SUPER FLEX +' : 'FLEX +';
  say(P.x, P.y-60, label + gain, tier === 'perfect' ? C.gold : C.cyan, tier === 'normal' ? 34 : 38);
  if (b && b.y > 0 && S.phase === 'boss'){
    const dmg = Math.round(S.ego * .45 * m * (tier === 'normal' ? 1 : tier === 'super' ? 1.5 : 2) * charDmg());
    damageBoss(dmg, true);
    S.beam = { x:P.x, life:.45, w: tier === 'normal' ? 60 : tier === 'super' ? 110 : 170, color: tier === 'perfect' ? '255,230,150' : '220,250,255' };
    say(b.x, b.y + b.r + 22, '-' + dmg, tier === 'perfect' ? C.gold : C.cyan, 30);
  }
  S.ego = 0; S.egoWarn = false; S.shake = tier === 'normal' ? .25 : .45;
  tier === 'perfect' ? Sound.perfectFlex() : tier === 'super' ? Sound.superFlex() : Sound.flex();
}

/* ---------- spawning ---------- */
function spawnItem(bossPhase){
  const roll = Math.random();
  const canHeart = S.lives < S.maxLives, heartP = canHeart ? (S.lives === 1 ? .06 : .025) : 0;
  let type;
  if (canHeart && (S.forceHeart || (S.lives < 3 && S.heartT > 35))){ type = 'heart'; S.forceHeart = false; }
  else if (bossPhase) type = roll < .3 ? 'crown' : roll < .3 + heartP ? 'heart' : 'shard';
  else {
    const lChance = Math.min(.48, .28 + S.cfg.idx*.03 + S.cfg.loop*.04 + S.pt*.003);
    type = roll < heartP ? 'heart' : roll < .15 ? 'crown' : roll < .15 + lChance ? 'L' : 'shard';
  }
  if (type === 'shard' && S.puCD <= 0 && !S.items.some(it => it.type === 'pu') && Math.random() < .06){
    const st = S.cfg.idx + S.cfg.loop*5, pool = ['shield','shield','magnet','magnet'];
    if (st >= 1) pool.push('freeze','freeze'); if (st >= 2) pool.push('mythic');
    S.puCD = 14; S.items.push({ type:'pu', kind:pool[Math.floor(Math.random()*pool.length)], r:15, x:20 + Math.random()*(W - 40), y:-30, vy:S.speed*.6, rot:0, vx:0 }); return;
  }
  if (type === 'heart') S.heartT = 0;
  const r = type === 'L' ? 17 : type === 'crown' ? 15 : type === 'heart' ? 13 : 12;
  const sideways = type === 'L' && (S.cfg.idx >= 2 || S.pt > 18);
  S.items.push({ type, r, x:r + Math.random()*(W - 2*r), y:-30, vy:S.speed*(.8 + Math.random()*.5)*(bossPhase ? .7 : 1), rot:Math.random()*6,
                 vx: sideways ? (Math.random() - .5)*110 : 0, dark: type === 'crown' && S.corruptT > 0, home: type === 'L' && ascOf(S.cfg) >= 1 });
}
function spawnBoss(){
  const c = S.cfg, sec = rollSecret(c), b = sec || c.boss, asc = ascOf(c);
  const hp = sec ? Math.round(sec.hp * (1 + c.loop*.7)) : c.bossHp;
  const pats = b.pats.slice(); if (asc >= 1 && !pats.includes('ring')) pats.push('ring');
  S.secret = sec ? sec.key : null; S.hitThisBoss = false;
  S.boss = { idx: sec ? sec.idx : c.idx, def:b, name: sec ? sec.name : c.bossName, secret:!!sec, minions:null, homeN:0, homeT:0,
    borrow: asc >= 2 && !sec ? LEVELS[(c.idx + 2) % 5].boss.ability : null, abToggle:false,
    x:W/2, y:-140, ty:Math.min(120, H*.2), r:Math.max(34, Math.min(sec ? 56 : 50, W*(sec ? .13 : .11))), hp, max:hp,
    vx:(80 + c.idx*18 + c.loop*20)*(Math.random() < .5 ? -1 : 1), pat:0, patT:0, fireT:1.2, ang:0, hitF:0, color:b.color,
    pats, crown:!!b.crown, t:0, rage:false, abT:4, ab:null, clones:null, steal:null, storm:null, charge:0, eclipseNext:false };
}
function bullet(x,y,ang,spd,extra){ const sp = spd * (S.boss && S.boss.rage ? 1.15 : 1) * (1 + .1*clamp(ascOf(S.cfg) - 1, 0, 2)); S.bullets.push(Object.assign({ x, y, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp, r:8 }, extra || {})); }
function bossFire(b){
  const lv = S.cfg.idx + S.cfg.loop*2, pat = b.pats[b.pat], ox = b.x, oy = b.y + b.r*.6;
  if (pat === 'aim'){
    const a = Math.atan2(P.y - oy, P.x - ox), sp = 260 + lv*22;
    bullet(ox, oy, a, sp); if (lv >= 1){ bullet(ox, oy, a - .22, sp); bullet(ox, oy, a + .22, sp); }
    b.fireT = Math.max(.42, .8 - lv*.06);
  } else if (pat === 'fan'){
    const n = 5 + Math.min(lv, 6), spread = 1.5;
    for (let i = 0; i < n; i++) bullet(ox, oy, Math.PI/2 - spread/2 + spread*i/(n-1), 200 + lv*15);
    b.fireT = Math.max(.75, 1.3 - lv*.08);
  } else if (pat === 'spiral'){
    b.ang += .45; bullet(ox, oy, b.ang, 180 + lv*12); bullet(ox, oy, b.ang + Math.PI, 180 + lv*12);
    b.fireT = Math.max(.05, .09 - lv*.006);
  } else if (pat === 'wall'){
    const n = 10, gap = Math.floor(Math.random()*(n - 2)), sp = 230 + lv*15;
    for (let i = 0; i < n; i++){ if (i === gap || i === gap + 1) continue; S.bullets.push({ x:(i + .5)*W/n, y:-10, vx:0, vy:sp, r:8 }); }
    b.fireT = 1.05;
  } else if (pat === 'feed'){
    if (b.feedGap === undefined) b.feedGap = 3;
    b.feedGap = clamp(b.feedGap + (Math.random() < .5 ? -1 : 1), 0, 6);
    const n = 8; for (let i = 0; i < n; i++){ if (i === b.feedGap || i === b.feedGap + 1) continue; S.bullets.push({ x:(i + .5)*W/n, y:-10, vx:0, vy:250 + lv*8, r:7, col:'#3dff9a' }); }
    b.fireT = .6;
  } else if (pat === 'ring'){
    const n = 18, a0 = Math.atan2(P.y - oy, P.x - ox);
    for (let i = 2; i < n - 1; i++) bullet(ox, oy, a0 + i*Math.PI*2/n, 190);
    b.fireT = 1.4;
  } else if (pat === 'freeze'){
    const n = 14;
    for (let i = 0; i < n; i++) bullet(ox, oy, i*Math.PI*2/n + b.ang, 240, { freeze:true, ft:0 });
    b.ang += .2; b.fireT = 1.6;
  } else {
    S.bullets.push({ x:16 + Math.random()*(W - 32), y:-10, vx:0, vy:240 + lv*20 + Math.random()*60, r:8 });
    b.fireT = Math.max(.1, .2 - lv*.015);
  }
}
function damageBoss(d, fromFlex){
  const b = S.boss; if (!b || S.phase !== 'boss') return;
  b.hp -= d; b.hitF = fromFlex ? .2 : .06;
  if (b.steal){ b.steal.dealt += d; if (b.steal.dealt >= b.steal.need) refundSteal(true); }
}

/* ---------- boss abilities ---------- */
const ABILITY_TEXT = {
  clones: 'NPC Mode! مين فيهم الأصلي؟',
  steal: 'أبو التريند بدو يسرق هالتك!',
  think: 'خليني أفكّر...',
  storm: 'عاصفة كرنج جاية!',
  corrupt: 'الإيجو الأسود بيفسد التيجان!',
  eclipse: 'كسوف الإيجو!',
  swarm: 'مزرعة البوتات بتنشر حساباتها!',
  shadowban: 'Shadowban! الـFLEX مقفول',
  mirror: 'الأورا الأصلية بتعمل FLEX عليك!',
};
function startAbility(b){
  let kind = b.def.ability;
  if (b.borrow){ b.abToggle = !b.abToggle; if (!b.abToggle) kind = b.borrow; }
  if (kind === 'corrupt' && b.rage){ kind = b.eclipseNext ? 'eclipse' : 'corrupt'; b.eclipseNext = !b.eclipseNext; }
  const tele = { clones:.8, steal:1.1, think:1, storm:1.1, corrupt:1.3, eclipse:.9, swarm:.9, shadowban:1, mirror:1.1 }[kind];
  b.ab = { kind, stage:'tele', t:tele };
  if (kind === 'storm'){
    if (b.rage){ b.ab.zone = { mode:'corr', c0:clamp(P.x / W, .2, .8), gap:.3 }; }
    else { const left = P.x < W/2; b.ab.zone = { mode:'side', x0: left ? 0 : .55, x1: left ? .45 : 1 }; }
  }
  say(W/2, H*.32, ABILITY_TEXT[kind], kind === 'think' ? '#9fe8ff' : kind === 'corrupt' || kind === 'eclipse' ? C.dark : kind === 'mirror' ? C.gold : b.color, 26);
  Sound.tele();
}
function activateAbility(b){
  const ab = b.ab; ab.stage = 'active';
  if (ab.kind === 'clones'){
    const n = b.rage ? 5 : 3; b.clones = [];
    for (let i = 0; i < n; i++) b.clones.push({ x:clamp((i + .5) * W / n + (Math.random() - .5)*40, b.r, W - b.r), y:b.y + 10 + Math.random()*50, life:2.2, fired:false, ph:Math.random()*6 });
    Sound.puff();
  } else if (ab.kind === 'steal'){
    const amount = Math.min(Math.floor(S.aura), Math.max(30, Math.floor(S.aura * (b.rage ? .25 : .15))));
    if (amount <= 0){ say(P.x, P.y - 60, 'ما عندك هالة تنسرق!', '#ff9f43', 22); return; }
    S.aura -= amount;
    b.steal = { amount, t: b.rage ? 4 : 5, max: b.rage ? 4 : 5, need: Math.ceil(b.max * .08), dealt:0 };
    say(P.x, P.y - 60, 'انسرق ' + amount + '! اضربه بسرعة', '#ff9f43', 24);
    for (let i = 0; i < 18; i++){ const t = i/18; S.parts.push({ x:P.x + (b.x - P.x)*t, y:P.y + (b.y - P.y)*t, vx:0, vy:-20, life:.6, max:.6, color:C.gold, s:4 }); }
    Sound.steal();
  } else if (ab.kind === 'think'){
    S.phil = { t:0, stage:'slow' };
  } else if (ab.kind === 'storm'){
    b.storm = { t:3, age:0, spawn:0, phase:Math.asin(clamp((ab.zone.c0 || .5) - .5, -.32, .32) / .32) };
  } else if (ab.kind === 'corrupt'){
    S.corruptT = 5; S.items.forEach(it => { if (it.type === 'crown') it.dark = true; });
  } else if (ab.kind === 'eclipse'){
    S.eclipseT = 4.5;
  } else if (ab.kind === 'swarm'){
    const n = b.rage ? 6 : 4; b.minions = [];
    for (let i = 0; i < n; i++) b.minions.push({ x:(i + .5)*W/n, y:b.y + 70 + (i % 2)*40, hp:5 + S.cfg.loop*3, vx:(Math.random() < .5 ? -1 : 1)*(60 + Math.random()*40), fireT:.8 + Math.random()*1.2, life:12 });
    Sound.puff();
  } else if (ab.kind === 'shadowban'){
    S.banT = b.rage ? 5 : 4; b.homeN = b.rage ? 6 : 4; b.homeT = 0;
  } else if (ab.kind === 'mirror'){
    S.beams.push({ x:P.x, w:56, warn:.5, live:.45 });
    if (b.rage) S.beams.push({ x:clamp(P.x + (Math.random() < .5 ? -1 : 1)*110, 30, W - 30), w:56, warn:.8, live:.45 });
  }
}
function abilityDone(b){
  const ab = b.ab; if (!ab) return true;
  if (ab.kind === 'clones') return !b.clones || !b.clones.length;
  if (ab.kind === 'steal') return !b.steal;
  if (ab.kind === 'think') return !S.phil;
  if (ab.kind === 'storm') return !b.storm;
  if (ab.kind === 'corrupt') return S.corruptT <= 0;
  if (ab.kind === 'eclipse') return S.eclipseT <= 0;
  if (ab.kind === 'swarm') return !b.minions || !b.minions.length;
  if (ab.kind === 'shadowban') return S.banT <= 0 && !b.homeN;
  if (ab.kind === 'mirror') return !S.beams.length;
  return true;
}
function refundSteal(won){
  const b = S.boss; if (!b || !b.steal) return;
  const st = b.steal; b.steal = null;
  if (won){ const back = Math.round(st.amount * 1.1); S.aura += back; say(P.x, P.y - 70, 'رجّعت هالتك! +' + back, C.gold, 28); Sound.refund(); burst(b.x, b.y - b.r - 20, C.gold, 30, 300); }
  else { say(P.x, P.y - 70, 'انسرقت هالتك! -' + st.amount, C.cringe, 26); Sound.deny(); }
}
function enterRage(b){
  b.rage = true; b.abT = 2.2; b.vx *= 1.4; b.patT = 0; b.fireT = 1;
  const rp = b.def.ragePat; if (rp && !b.pats.includes(rp)) b.pats.push(rp);
  S.bullets.forEach(x => burst(x.x, x.y, C.rage, 2, 100)); S.bullets = [];
  S.rings.push({ x:b.x, y:b.y, r:b.r, life:1, color:C.rage });
  S.slowmo = .6; S.shake = .9;
  banner('غضب!', b.def.rageTaunt, C.rage, 2.6);
  Sound.rageOn(); Sound.setMode('rage', S.li);
}
function bossDefeated(){
  const b = S.boss, bonus = 400*S.cfg.num + (b.def.bonus || 0);
  if (b.steal) refundSteal(true);
  S.aura += bonus; S.bosses++;
  if (S.lives < S.maxLives){ S.lives++; renderLives(); }
  S.heartT = 0;
  for (let i = 0; i < 5; i++) burst(b.x + (Math.random()-.5)*b.r, b.y + (Math.random()-.5)*b.r, i % 2 ? b.color : C.gold, 40, 520);
  S.rings.push({ x:b.x, y:b.y, r:20, life:1 });
  S.bullets = []; S.boss = null; S.phase = 'clear'; S.pt = 0; S.shake = .7; S.slowmo = .8;
  S.phil = null; S.corruptT = 0; S.eclipseT = 0; S.banT = 0; S.beams = []; S.items.forEach(it => it.dark = false);
  banner('هزمت ' + b.name + '!', '+' + bonus + ' هالة', b.secret ? C.gold : C.cyan);
  if (!S.hitThisBoss) Ach.unlock('untouch'); if (S.bosses >= 5) Ach.unlock('slayer');
  if (b.secret) Ach.unlock('hunter'); if (b.idx === 7) Ach.unlock('legend');
  Sound.bossDie(); Sound.setMode('level', S.li);
}

function hit(cause){
  if (S.inv > 0) return;
  if (S.shield > 0){ S.shield = 0; S.inv = .8; burst(P.x, P.y, '#7fe3ff', 30, 320); say(P.x, P.y-50, 'الدرع حماك!', '#7fe3ff', 24); Sound.refund(); return; }
  S.lastHit = cause; S.hitThisBoss = true;
  S.lives--; S.aura = Math.max(0, S.aura - 40); S.inv = isChar('ghost') ? 2.2 : 1.3; S.shake = .4; S.flash = .3; S.combo = 0;
  burst(P.x, P.y, C.cringe, 24, 300); say(P.x, P.y-50, 'كرنج! -40', C.cringe, 28); renderLives(); Sound.hit();
  if (S.lives <= 0) gameOver();
}
function checkNear(o, rr, dt){
  const dx = o.x - P.x, dy = o.y - P.y, d = Math.sqrt(dx*dx + dy*dy) - rr - P.r;
  if (o.minD === undefined || d < o.minD) o.minD = d;
  if (!o.nm && o.prevD !== undefined && d > o.prevD && o.minD < 16 && o.minD > 0){
    o.nm = true;
    if (S.nearCD <= 0 && S.inv <= 0){
      const bonus = 15 * mult(); S.aura += bonus; S.nearMisses++; S.nearCD = .2; Ach.near();
      say(P.x + (dx > 0 ? -30 : 30), P.y - 34, 'قريبة! +' + bonus, '#c9f6ff', 18); Sound.near();
    }
  }
  o.prevD = d;
}

/* ---------- update ---------- */
function update(rawDt){
  const sp0 = S && S.run && !S.paused ? S.speed : 140;
  stars.forEach(s => { s.y += sp0*rawDt*s.z/H*.9; if (s.y > 1){ s.y = 0; s.x = Math.random(); } });
  if (!S) return;
  if (!S.run || S.paused){ if (!S.paused) tickFx(rawDt); return; }

  let dt = rawDt;
  if (S.slowmo > 0){ S.slowmo -= rawDt; dt = rawDt * .35; }
  S.t += rawDt; S.pt += dt; S.heartT += dt;
  const c = S.cfg;
  if (S.phase === 'level') S.speed = Math.min(720, c.speed + S.pt*4);

  // world factor (Overthinking)
  let wf = 1;
  if (S.phil){
    S.phil.t += dt;
    if (S.phil.stage === 'slow'){ wf = .3; if (S.phil.t > 2.6){ S.phil.stage = 'snap'; S.phil.t = 0; say(W/2, H*.35, 'خلص... قررت!', '#9fe8ff', 28); Sound.tele(); } }
    else { wf = 1.4; if (S.phil.t > 1.1) S.phil = null; }
  }
  if (S.freezeT > 0) wf = 0;

  // player
  P.px = P.x;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), maxV = (950 + S.speed*.5) * (isChar('ghost') ? .85 : 1);
  P.kv += (dir*maxV - P.kv) * Math.min(1, dt*(dir ? 22 : 30));
  if (dir || Math.abs(P.kv) > 5){ P.x += P.kv*dt; P.x = clamp(P.x, P.r, W - P.r); P.tx = P.x; }
  else { P.tx = clamp(P.tx, P.r, W - P.r); P.x += (P.tx - P.x) * Math.min(1, dt*(P.touch ? 26 : 16)*(isChar('ghost') ? .85 : 1)); }
  P.dx = P.x - P.px;
  if (!reduce){ AuraCos.trail(Cos, Acct.eq.trail, P.x, P.y, P.r, dt, P.dx, S.speed, Perf.low); AuraCos.step(Cos, dt); }   // cosmetic only

  // phases
  if (S.phase === 'level'){
    S.spawn -= dt;
    if (S.spawn <= 0){ spawnItem(false); S.spawn = Math.max(.18, .58 - c.idx*.04 - S.pt*.006) * (.7 + Math.random()*.6); }
    S.aura += dt * 3 * mult();
    if (ascOf(c) >= 3){ S.blackoutCD -= dt; if (S.blackoutCD <= 0){ S.eclipseT = 3; S.blackoutCD = 18; say(W/2, H*.3, 'انقطعت الكهربا!', C.dark, 26); } }
    if (S.pt >= c.dur){ S.phase = 'intro'; S.pt = 0; S.intro = { t:0 }; S.banner = null; spawnBoss(); Sound.intro(); if (S.boss.secret) Sound.secret(); Sound.setMode('intro', S.li); }
  } else if (S.phase === 'intro'){
    S.intro.t += dt;
    if (S.intro.t > 2.3 && S.boss) S.boss.y += (S.boss.ty - S.boss.y) * Math.min(1, dt*5);
    if (S.intro.t >= 3.4){ S.phase = 'boss'; S.pt = 0; S.intro = null; Sound.setMode('boss', S.li); }
  } else if (S.phase === 'boss') updateBoss(dt, wf);
  else if (S.phase === 'clear'){
    if (S.pt >= 2.6){
      S.li++; S.cfg = levelCfg(S.li); S.phase = 'level'; S.pt = 0; S.speed = S.cfg.speed;
      if (S.cfg.loop && S.cfg.idx === 0){ const A = ASCENSION[ascOf(S.cfg)]; banner(A.name, A.desc, C.rage, 3.6); Ach.unlock('ascend'); }
      else banner('المرحلة ' + S.cfg.num, S.cfg.name + (S.cfg.loop ? ' · ' + ASCENSION[ascOf(S.cfg)].name : '')); Sound.level();
    }
  }
  if (!S.run) return;

  S.ego = Math.max(0, S.ego - 2.5*dt);
  S.inv = Math.max(0, S.inv - dt); S.flash = Math.max(0, S.flash - dt); S.nearCD = Math.max(0, S.nearCD - dt);
  if (S.corruptT > 0){ S.corruptT -= dt; if (S.corruptT <= 0) S.items.forEach(it => it.dark = false); }
  if (S.eclipseT > 0) S.eclipseT -= dt;
  if (S.combo){ S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  S.puCD -= dt; if (S.shield > 0) S.shield -= dt; if (S.magnetT > 0) S.magnetT -= dt; if (S.freezeT > 0) S.freezeT -= rawDt; if (S.banT > 0) S.banT -= dt;
  if (S.aura >= 100) Ach.unlock('first'); if (S.aura >= 20000) Ach.unlock('king');

  // ego danger zone
  if (S.ego >= 90){
    if (!S.egoWarn){ S.egoWarn = true; say(P.x, P.y - 70, 'خطر! FLEX هلأ أو بينفجر', C.rage, 22); }
    S.egoTickT -= rawDt; if (S.egoTickT <= 0){ Sound.egoTick(S.ego); S.egoTickT = .22 - (S.ego - 90)*.012; }
  } else S.egoWarn = false;

  for (const it of S.items){
    it.y += it.vy*dt*wf; it.x += it.vx*dt*wf; it.rot += dt*3;
    if (it.type === 'shard' && (S.magnetT > 0 || (isChar('magnet') && Math.abs(it.x - P.x) < 130 && P.y - it.y < 220))){ it.x += (P.x - it.x)*Math.min(1, dt*(S.magnetT > 0 ? 9 : 4)); if (S.magnetT > 0) it.y += (P.y - it.y)*Math.min(1, dt*5); }
    if (it.home) it.x += clamp(P.x - it.x, -60, 60) * .6 * dt * wf;
    if (it.x < it.r || it.x > W - it.r) it.vx *= -1;
    const dx = it.x - P.x, dy = it.y - P.y;
    if (!it.dead && dx*dx + dy*dy < (it.r + P.r)*(it.r + P.r)){
      if (it.type === 'shard'){
        S.combo++; S.comboT = 2.2; S.bestCombo = Math.max(S.bestCombo, S.combo);
        const g = Math.round((10 + Math.floor(Math.min(S.combo, 100)/5)*5) * mult() * (isChar('magnet') ? .85 : 1)); S.aura += g; if (S.combo >= 50) Ach.unlock('combo50');
        burst(it.x,it.y,C.gold,10,180); say(it.x,it.y-20,'+'+g,C.gold,22); Sound.pickup(S.combo); it.dead = true;
      } else if (it.type === 'crown'){
        it.dead = true;
        if (it.dark && S.boss){
          S.boss.charge += 30; burst(it.x,it.y,C.dark,14,200); say(it.x,it.y-20,'+شحنة للزعيم',C.dark,22); Sound.darkCrown();
          if (S.boss.charge >= 100) darkBurst(S.boss);
        } else { S.ego += isChar('gambler') ? 30 : 22; burst(it.x,it.y,C.cyan,12,200); say(it.x,it.y-20,'+EGO',C.cyan,22); Sound.crown(); }
      }
      else if (it.type === 'pu'){ it.dead = true; pickPU(it); }
      else if (it.type === 'heart'){ if (S.lives < S.maxLives){ S.lives++; renderLives(); } burst(it.x,it.y,C.pink,14,200); say(it.x,it.y-20,'+قلب',C.pink,22); Sound.heart(); it.dead = true; }
      else { it.dead = true; burst(it.x,it.y,C.cringe,12,200); hit(it.storm ? 'storm' : 'L'); if (!S.run) return; }
    } else if (it.type === 'L' && !it.dead) checkNear(it, it.r, dt);
  }
  S.items = S.items.filter(it => !it.dead && it.y < H + 40);

  for (const b of S.bullets){
    if (b.homeT > 0 && wf > 0){ b.homeT -= dt; const sp = Math.hypot(b.vx, b.vy), cur = Math.atan2(b.vy, b.vx); let d = Math.atan2(P.y - b.y, P.x - b.x) - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = cur + clamp(d, -1.6*dt, 1.6*dt); b.vx = Math.cos(na)*sp; b.vy = Math.sin(na)*sp; }
    if (b.freeze){
      b.ft += dt;
      if (b.ft < .45){ b.x += b.vx*dt*wf; b.y += b.vy*dt*wf; }
      else if (b.ft < 1.05){ /* hanging */ }
      else if (!b.aimed){ const a = Math.atan2(P.y - b.y, P.x - b.x); b.vx = Math.cos(a)*310; b.vy = Math.sin(a)*310; b.aimed = true; }
      else { b.x += b.vx*dt*wf; b.y += b.vy*dt*wf; }
    } else { b.x += b.vx*dt*wf; b.y += b.vy*dt*wf; }
    const dx = b.x - P.x, dy = b.y - P.y;
    if (!b.dead && dx*dx + dy*dy < (b.r + P.r - 4)*(b.r + P.r - 4)){ b.dead = true; hit('bullet'); if (!S.run) return; }
    else if (!b.dead) checkNear(b, b.r - 4, dt);
  }
  S.bullets = S.bullets.filter(b => !b.dead && b.y < H + 20 && b.y > -60 && b.x > -20 && b.x < W + 20);
  if (S.bullets.length > 400) S.bullets.splice(0, S.bullets.length - 400);

  for (const bm of S.beams){
    if (bm.warn > 0) bm.warn -= dt;
    else { bm.live -= dt; if (!bm.hit && Math.abs(P.x - bm.x) < bm.w/2 + P.r*.4){ bm.hit = true; hit('bullet'); if (!S.run) return; } }
  }
  S.beams = S.beams.filter(bm => bm.warn > 0 || bm.live > 0);
  for (const bo of S.bolts){
    bo.y += bo.vy*dt;
    const b = S.boss;
    if (b && !bo.dead){
      if (b.minions) for (const mn of b.minions){ if (!mn.dead && Math.abs(bo.x - mn.x) < 16 && Math.abs(bo.y - mn.y) < 16){ bo.dead = true; mn.hp -= mult()*charDmg(); burst(bo.x, bo.y, '#9aa4ff', 3, 90); if (mn.hp <= 0){ mn.dead = true; burst(mn.x, mn.y, '#9aa4ff', 16, 220); Sound.puff(); } break; } }
      if (!bo.dead && b.clones) for (const cl of b.clones){ const dx = bo.x - cl.x, dy = bo.y - cl.y; if (dx*dx + dy*dy < (b.r*.8)*(b.r*.8)){ bo.dead = true; burst(bo.x, bo.y, b.color, 3, 90); break; } }
      if (!bo.dead){ const dx = bo.x - b.x, dy = bo.y - b.y;
        if (dx*dx + dy*dy < b.r*b.r){ bo.dead = true; if (b.minions && b.minions.length){ burst(bo.x, bo.y, '#9aa4ff', 2, 80); } else { damageBoss(mult()*charDmg(), false); Sound.bossHit(); burst(bo.x, bo.y, C.gold, 3, 120); } } }
    }
  }
  S.bolts = S.bolts.filter(bo => !bo.dead && bo.y > -20);

  if (S.ego >= 100){
    const lost = Math.floor(S.aura*(isChar('gambler') ? .4 : .25)); S.aura -= lost; S.ego = 0; S.shake = .55; S.lastBoomT = S.t; S.egoWarn = false;
    burst(P.x,P.y,C.cringe,50,460); say(W/2,H*.45,'الإيجو انفجر! -'+lost,C.cringe,32); Sound.egoBoom();
  }
  tickFx(dt);
}
function darkBurst(b){
  b.charge = 0;
  for (let i = 0; i < 28; i++) bullet(b.x, b.y, i*Math.PI*2/28, 210);
  const a = Math.atan2(P.y - b.y, P.x - b.x); for (let i = -2; i <= 2; i++) bullet(b.x, b.y, a + i*.12, 300);
  S.rings.push({ x:b.x, y:b.y, r:b.r, life:1, color:C.dark }); S.shake = .5;
  say(b.x, b.y + b.r + 30, 'انفجار الإيجو الأسود!', C.dark, 26); Sound.darkBurst();
}
function updateBoss(dt, wf){
  const b = S.boss, lv = S.cfg.idx + S.cfg.loop*2;
  b.t += dt; b.y += (b.ty - b.y)*Math.min(1, dt*2); b.x += b.vx*dt;
  if (b.x < b.r){ b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r){ b.x = W - b.r; b.vx = -Math.abs(b.vx); }
  b.hitF = Math.max(0, b.hitF - dt);
  if (!b.rage && b.hp <= b.max*(ascOf(S.cfg) >= 1 ? .5 : .3) && b.hp > 0) enterRage(b);
  if (b.rage && Math.random() < .5) S.parts.push({ x:b.x + (Math.random()-.5)*b.r*1.6, y:b.y + (Math.random()-.3)*b.r, vx:(Math.random()-.5)*30, vy:-60 - Math.random()*60, life:.5, max:.5, color: Math.random() < .5 ? C.rage : '#ff9a3d', s:3 + Math.random()*3 });
  if (b.idx === 4 && Math.random() < .3) S.parts.push({ x:b.x + (Math.random()-.5)*b.r*2, y:b.y + b.r*.6, vx:(Math.random()-.5)*20, vy:-30, life:.8, max:.8, color:'#2a1840', s:6 + Math.random()*6 });

  // abilities
  if (!b.ab){ b.abT -= dt; if (b.abT <= 0 && b.y > b.ty - 20) startAbility(b); }
  else if (b.ab.stage === 'tele'){ b.ab.t -= dt; if (b.ab.t <= 0) activateAbility(b); }
  else if (abilityDone(b)){ b.ab = null; b.abT = (b.rage ? 4.5 : 6.5) * (ascOf(S.cfg) >= 1 ? .75 : 1); }

  // clones
  if (b.clones){
    for (const cl of b.clones){
      cl.x = clamp(cl.x + P.dx, b.r*.8, W - b.r*.8); cl.life -= dt; cl.ph += dt*4;
      if (!cl.fired && cl.life < 1.2){
        cl.fired = true; const a = Math.atan2(P.y - cl.y, P.x - cl.x);
        bullet(cl.x, cl.y, a, 250 + lv*15); if (b.rage){ bullet(cl.x, cl.y, a - .25, 250); bullet(cl.x, cl.y, a + .25, 250); }
      }
      if (cl.life <= 0){ burst(cl.x, cl.y, b.color, 10, 150); }
    }
    b.clones = b.clones.filter(cl => cl.life > 0);
  }
  // bot minions (secret boss): they shoot, and shield the boss while alive
  if (b.minions){
    for (const mn of b.minions){
      mn.x += mn.vx*dt*wf; if (mn.x < 16 || mn.x > W - 16) mn.vx *= -1; mn.life -= dt; mn.fireT -= dt*wf;
      if (mn.fireT <= 0){ bullet(mn.x, mn.y, Math.atan2(P.y - mn.y, P.x - mn.x), 230, { col:'#9aa4ff', r:6 }); mn.fireT = b.rage ? 1.1 : 1.6; }
      if (mn.life <= 0 && !mn.dead){ mn.dead = true; burst(mn.x, mn.y, '#9aa4ff', 10, 150); }
    }
    b.minions = b.minions.filter(mn => !mn.dead);
  }
  // shadowban homing shots
  if (b.homeN > 0 && wf > 0){ b.homeT -= dt; if (b.homeT <= 0){ b.homeN--; b.homeT = .55; bullet(b.x, b.y + b.r*.5, Math.atan2(P.y - b.y, P.x - b.x), 170, { homeT:2.6, col:'#3dff9a' }); } }
  // the original aura mirrors your position
  if (b.idx === 7 && b.y > b.ty - 20){ b.x += ((W - P.x) - b.x)*Math.min(1, dt*2.2); }
  // steal timer
  if (b.steal){ b.steal.t -= dt; if (b.steal.t <= 0) refundSteal(false); }
  // storm spawning
  if (b.storm){
    const st = b.storm, z = b.ab && b.ab.zone; st.t -= dt; st.age += dt; st.spawn -= dt;
    if (z && st.spawn <= 0){
      let x;
      if (z.mode === 'side') x = (z.x0 + Math.random()*(z.x1 - z.x0)) * W;
      else {
        const gc = clamp(.5 + .32*Math.sin(st.age*1.3 + st.phase), z.gap/2 + .05, 1 - z.gap/2 - .05);
        const left = Math.random() < .5, a0 = left ? 0 : gc + z.gap/2, a1 = left ? gc - z.gap/2 : 1;
        x = (a0 + Math.random()*(a1 - a0)) * W; z.gc = gc;
      }
      S.items.push({ type:'L', r:15, x:clamp(x, 15, W - 15), y:-20, vy:330 + lv*15, vx:0, rot:Math.random()*6, storm:true });
      st.spawn = z.mode === 'side' ? .07 : .05;
    }
    if (st.t <= 0) b.storm = null;
  }

  // base attack pattern (paused while clones/storm run and during telegraphs)
  const paused = S.freezeT > 0 || (b.ab && (b.ab.stage === 'tele' || b.ab.kind === 'clones' || b.ab.kind === 'storm' || b.ab.kind === 'swarm'));
  if (b.y > b.ty - 20 && !paused){
    if (S.phil && S.phil.stage === 'slow'){
      b.fireT -= dt; if (b.fireT <= 0){ b.ang += .35; for (let k = 0; k < 3; k++) bullet(b.x, b.y, b.ang + k*Math.PI*2/3, 200); b.fireT = .07; }
    } else {
      b.patT += dt; if (b.patT > 3.8){ b.pat = (b.pat + 1) % b.pats.length; b.patT = 0; b.fireT = .6; }
      b.fireT -= dt * (b.rage ? 1.25 : 1); if (b.fireT <= 0) bossFire(b);
    }
  }
  if (b.y > b.ty - 20){
    S.fireT -= dt;
    if (S.fireT <= 0){ S.bolts.push({ x:P.x, y:P.y - P.r, vy:-780 }); S.fireT = .15; Sound.shoot(); }
  }
  S.spawn -= dt; if (S.spawn <= 0){ spawnItem(true); S.spawn = .8 + Math.random()*.5; }
  if (S.corruptT > 0){ b.crownT = (b.crownT || 0) - dt; if (b.crownT <= 0){ const r = 15; S.items.push({ type:'crown', r, x:r + Math.random()*(W - 2*r), y:-30, vy:S.speed*.75, rot:0, vx:0, dark:true }); b.crownT = .45; } }
  if (b.hp <= 0) bossDefeated();
}
function tickFx(dt){
  S.shake = Math.max(0, S.shake - dt);
  S.parts.forEach(p => { p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= .94; p.vy *= .94; p.life -= dt; });
  S.parts = S.parts.filter(p => p.life > 0);
  S.texts.forEach(t => { t.y -= 50*dt; t.life -= dt*1.1; }); S.texts = S.texts.filter(t => t.life > 0);
  S.rings.forEach(r => { r.r += 900*dt; r.life -= dt*1.6; }); S.rings = S.rings.filter(r => r.life > 0);
  if (S.beam){ S.beam.life -= dt; if (S.beam.life <= 0) S.beam = null; }
  if (S.banner){ S.banner.t += dt; if (S.banner.t > S.banner.dur) S.banner = null; }
  if (S.toast){ S.toast.t += dt; if (S.toast.t > 3.4) S.toast = null; }
}

/* ---------- draw ---------- */
function draw(now){
  const cfg = S ? S.cfg : levelCfg(0), t = now/1000;
  ctx.save();
  ctx.fillStyle = cfg.bg; ctx.fillRect(0,0,W,H);
  const egoT = S ? S.ego/100 : 0, gl = cfg.glow;
  const g = ctx.createRadialGradient(W/2,H,0,W/2,H,H*1.1);
  g.addColorStop(0, `rgba(${gl},${.16 + egoT*.14})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  const rage = S && S.boss && S.boss.rage;
  if (S && (S.phase === 'boss' || S.phase === 'intro')){
    const pulse = rage ? .22 + .12*Math.sin(t*8) : .1 + .08*Math.sin(t*3);
    const v = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75);
    v.addColorStop(0,'rgba(255,40,80,0)'); v.addColorStop(1,`rgba(255,${rage ? 20 : 40},${rage ? 30 : 80},${pulse})`);
    ctx.fillStyle = v; ctx.fillRect(0,0,W,H);
  }
  if (S && S.phil){ ctx.fillStyle = S.phil.stage === 'slow' ? 'rgba(80,170,255,.12)' : 'rgba(160,240,255,.06)'; ctx.fillRect(0,0,W,H); }
  if (S && S.corruptT > 0){ ctx.fillStyle = `rgba(60,10,90,${.12 + .05*Math.sin(t*6)})`; ctx.fillRect(0,0,W,H); }
  if (S && S.ego >= 90 && S.run){ const v = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.7);
    v.addColorStop(0,'rgba(255,0,0,0)'); v.addColorStop(1,`rgba(255,30,60,${.12 + .1*Math.sin(t*14)})`); ctx.fillStyle = v; ctx.fillRect(0,0,W,H); }

  if (S && S.shake > 0 && !reduce){ const m = S.shake*14; ctx.translate((Math.random()-.5)*m, (Math.random()-.5)*m); }

  const sp = S && S.run && !S.paused ? S.speed : 140;
  ctx.lineCap = 'round';
  stars.forEach(s => { const len = 4 + sp*.05*s.z; ctx.strokeStyle = rage ? `rgba(255,90,90,${.1 + .28*s.z})` : `rgba(${gl},${.1 + .28*s.z})`; ctx.lineWidth = s.z*1.6;
    ctx.beginPath(); ctx.moveTo(s.x*W, s.y*H); ctx.lineTo(s.x*W, s.y*H - len); ctx.stroke(); });

  if (S){
    if (S.boss){ drawAbilityFx(S.boss, t); drawBoss(S.boss, t); }
    S.items.forEach(drawItem);
    ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 10;
    S.bolts.forEach(bo => { ctx.fillRect(bo.x - 2, bo.y - 9, 4, 14); });
    drawBullets(1);
    S.beams.forEach(bm => {
      if (bm.warn > 0){ ctx.fillStyle = `rgba(255,216,107,${.12 + .22*Math.abs(Math.sin(t*20))})`; ctx.fillRect(bm.x - bm.w/2, 0, bm.w, H); }
      else { const g2 = ctx.createLinearGradient(bm.x - bm.w/2, 0, bm.x + bm.w/2, 0); g2.addColorStop(0,'rgba(255,216,107,0)'); g2.addColorStop(.5,'rgba(255,250,220,.95)'); g2.addColorStop(1,'rgba(255,216,107,0)'); ctx.fillStyle = g2; ctx.fillRect(bm.x - bm.w/2, 0, bm.w, H); }
    });
    if (S.beam){ const a = S.beam.life/.45, w = S.beam.w; const bg = ctx.createLinearGradient(S.beam.x - w/2, 0, S.beam.x + w/2, 0);
      bg.addColorStop(0,'rgba(110,231,255,0)'); bg.addColorStop(.5,`rgba(${S.beam.color},${a})`); bg.addColorStop(1,'rgba(110,231,255,0)');
      ctx.fillStyle = bg; ctx.fillRect(S.beam.x - w/2, 0, w, P.y); }
    S.rings.forEach(r => { ctx.strokeStyle = r.color || C.cyan; ctx.globalAlpha = Math.max(0, r.life); ctx.lineWidth = 6*r.life; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,7); ctx.stroke(); });
    ctx.globalAlpha = 1;
    S.parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life/p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.s/2, p.y - p.s/2, p.s, p.s); });
    ctx.globalAlpha = 1;
  }
  if (S) AuraCos.draw(ctx, Cos, t);
  drawPlayer(t);
  if (S && S.eclipseT > 0){
    const k = Math.min(1, S.eclipseT*2, (4.5 - S.eclipseT)*3);
    const eg = ctx.createRadialGradient(P.x, P.y, 50, P.x, P.y, 190);
    eg.addColorStop(0, 'rgba(4,2,10,0)'); eg.addColorStop(1, `rgba(4,2,10,${.94*k})`);
    ctx.fillStyle = eg; ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.globalAlpha = .35*k; drawBullets(0); ctx.globalAlpha = 1;
    if (S.boss){ ctx.fillStyle = S.boss.rage ? C.rage : C.cyan; [-1,1].forEach(s => { ctx.beginPath(); ctx.ellipse(S.boss.x + s*S.boss.r*.36, S.boss.y - S.boss.r*.08, S.boss.r*.14, S.boss.r*.05, 0, 0, 7); ctx.fill(); }); }
  }
  if (S){
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    S.texts.forEach(tx => { ctx.globalAlpha = Math.max(0, tx.life); ctx.font = `${tx.size}px Lalezar, Tajawal, sans-serif`;
      ctx.fillStyle = tx.color; ctx.shadowColor = tx.color; ctx.shadowBlur = 14; ctx.fillText(tx.txt, clamp(tx.x, 110, W - 110), tx.y); });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    drawActive();
    if (S.combo >= 3){
      ctx.textAlign = 'left'; ctx.font = `${20 + Math.min(S.combo, 30)*.4}px Lalezar, sans-serif`;
      ctx.fillStyle = C.gold; ctx.globalAlpha = Math.min(1, S.comboT); ctx.fillText('COMBO x' + S.combo, 14, H - 22); ctx.globalAlpha = 1;
    }
    if (S.boss && S.phase === 'boss') drawBossBar(S.boss);
    if (S.intro) drawIntro(S.intro, t);
    if (S.banner) drawBanner(S.banner);
    if (S.toast) drawToast(S.toast);
    if (S.flash > 0){ ctx.fillStyle = `rgba(255,79,123,${S.flash*.6})`; ctx.fillRect(-20,-20,W+40,H+40); }
  }
  ctx.restore();
}
function drawBullets(glow){
  ctx.shadowColor = C.cringe; ctx.shadowBlur = glow ? 12 : 0;
  S.bullets.forEach(b => {
    const frozen = b.freeze && b.ft >= .45 && !b.aimed;
    ctx.fillStyle = frozen ? '#9fe8ff' : (b.col || C.cringe); ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill();
    ctx.fillStyle = frozen ? '#ffffff' : '#ffd0dc'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*.45,0,7); ctx.fill();
  });
  ctx.shadowBlur = 0;
}
function drawIntro(it, t){
  const b = S.boss.def, k = Math.min(1, it.t*3, (3.4 - it.t)*3);
  ctx.save(); ctx.globalAlpha = Math.max(0, k);
  ctx.fillStyle = 'rgba(5,3,12,.78)'; ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y0 = H*.38, slide = Math.max(0, 1 - it.t*2.5)*60;
  ctx.font = `700 ${Math.min(16, W*.04)}px Tajawal, sans-serif`; ctx.fillStyle = S.boss.secret ? (Math.floor(it.t*10) % 2 ? C.gold : '#ffffff') : C.rage; ctx.fillText(S.boss.secret ? '!!! زعيم سري !!!' : 'زعيم المرحلة ' + S.cfg.num, W/2, y0 - 62);
  ctx.font = `${Math.min(64, W*.13)}px Lalezar, sans-serif`; ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 30;
  ctx.fillText(S.boss.name, W/2 + slide, y0);
  ctx.shadowBlur = 0;
  ctx.font = `${Math.min(20, W*.05)}px Lalezar, sans-serif`; ctx.fillStyle = C.text; ctx.fillText('القدرة: ' + b.abilityName, W/2, y0 + 46);
  if (it.t > .7){ ctx.globalAlpha = Math.max(0, k) * Math.min(1, (it.t - .7)*3);
    ctx.font = `700 ${Math.min(19, W*.047)}px Tajawal, sans-serif`; ctx.fillStyle = '#ffe9b0'; ctx.fillText(b.taunt, W/2, y0 + 84); }
  ctx.restore();
}
function drawBanner(b){
  const k = b.t < .3 ? b.t/.3 : b.t > b.dur - .4 ? (b.dur - b.t)/.4 : 1;
  ctx.save(); ctx.globalAlpha = Math.max(0, k); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(17,10,34,.55)'; ctx.fillRect(0, H*.36 - 50, W, 110);
  const sz = Math.min(54, W*.11);
  ctx.font = `${sz}px Lalezar, sans-serif`; ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 24;
  ctx.fillText(b.title, W/2, H*.36 - 6 + (1-k)*14);
  ctx.shadowBlur = 0; ctx.font = `700 ${Math.min(22, W*.05)}px Tajawal, sans-serif`; ctx.fillStyle = C.text;
  ctx.fillText(b.sub, W/2, H*.36 + 36);
  ctx.restore();
}
function drawBossBar(b){
  const w = Math.min(W - 32, 420), x = (W - w)/2, y = 14;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '18px Lalezar, sans-serif'; ctx.fillStyle = b.rage ? C.rage : b.color; ctx.fillText(b.name + (b.rage ? ' · غضبان' : ''), W/2, y);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y + 24, w, 8);
  ctx.fillStyle = b.rage ? C.rage : b.color; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.fillRect(x, y + 24, w*Math.max(0, b.hp/b.max), 8);
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + w*.3 - 1, y + 22, 2, 12);
  if (b.charge > 0){ ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(x, y + 36, w, 5); ctx.fillStyle = C.dark; ctx.fillRect(x, y + 36, w*Math.min(1, b.charge/100), 5); }
  ctx.restore();
}
function drawAbilityFx(b, t){
  const ab = b.ab;
  if (b.minions){
    b.minions.forEach(mn => { ctx.save(); ctx.translate(mn.x, mn.y); ctx.fillStyle = '#2b2f55'; ctx.strokeStyle = '#9aa4ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-11, -9, 22, 18, 4) : ctx.rect(-11, -9, 22, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.cringe; ctx.fillRect(-6, -3, 4, 4); ctx.fillRect(2, -3, 4, 4); ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -15); ctx.stroke(); ctx.restore(); });
    if (b.minions.length){ ctx.save(); ctx.strokeStyle = 'rgba(154,164,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t*40; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 14, 0, 7); ctx.stroke(); ctx.restore(); }
  }
  if (ab && ab.kind === 'mirror' && ab.stage === 'tele'){ ctx.save(); ctx.strokeStyle = `rgba(255,216,107,${.35 + .3*Math.sin(t*16)})`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(P.x, b.y); ctx.lineTo(P.x, H); ctx.stroke(); ctx.restore(); }
  if (ab && ab.kind === 'storm'){
    const z = ab.zone, flash = ab.stage === 'tele' ? .25 + .25*Math.abs(Math.sin(t*14)) : .1;
    ctx.save(); ctx.fillStyle = `rgba(255,79,123,${flash})`;
    if (z.mode === 'side') ctx.fillRect(z.x0*W, 0, (z.x1 - z.x0)*W, H);
    else { const gc = z.gc || z.c0; ctx.fillRect(0, 0, (gc - z.gap/2)*W, H); ctx.fillRect((gc + z.gap/2)*W, 0, W, H); }
    if (ab.stage === 'tele'){ ctx.fillStyle = C.cringe; ctx.font = '40px Lalezar, sans-serif'; ctx.textAlign = 'center';
      if (z.mode === 'side') ctx.fillText('!', (z.x0 + z.x1)/2*W, H*.55); else { ctx.fillText('!', (z.c0 - z.gap/2)/2*W, H*.55); ctx.fillText('!', (1 + z.c0 + z.gap/2)/2*W, H*.55); } }
    ctx.restore();
  }
  if (ab && ab.kind === 'steal' && ab.stage === 'tele'){
    ctx.save(); ctx.strokeStyle = `rgba(255,201,77,${.4 + .4*Math.sin(t*16)})`; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -t*60; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(P.x, P.y); ctx.stroke(); ctx.restore();
  }
  if (b.clones) b.clones.forEach(cl => { ctx.save(); ctx.globalAlpha = .5 + .2*Math.sin(cl.ph); drawBossBody({ ...b, x:cl.x, y:cl.y, r:b.r*.8, hitF:0, clone:true }, t); ctx.restore(); });
}
function drawBoss(b, t){
  if (b.ab && b.ab.kind === 'clones' && b.ab.stage === 'tele' && Math.floor(t*14) % 2) return;
  drawBossBody(b, t);
  if (b.steal){
    const st = b.steal, cy = b.y - b.r*1.55;
    ctx.save(); ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; const cw = b.r*.45;
    ctx.beginPath(); ctx.moveTo(b.x - cw, cy + cw*.5); ctx.lineTo(b.x - cw, cy - cw*.3); ctx.lineTo(b.x - cw*.5, cy + cw*.05); ctx.lineTo(b.x, cy - cw*.6); ctx.lineTo(b.x + cw*.5, cy + cw*.05); ctx.lineTo(b.x + cw, cy - cw*.3); ctx.lineTo(b.x + cw, cy + cw*.5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, cy, cw*1.5, -Math.PI/2, -Math.PI/2 + Math.PI*2*(st.t/st.max)); ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = '15px Lalezar, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(st.amount, b.x, cy - cw*1.9);
    ctx.restore();
  }
  if (b.ab && b.ab.kind === 'think'){
    ctx.save(); ctx.fillStyle = '#9fe8ff';
    for (let i = 0; i < 3; i++){ const a = t*2 + i*2.1; ctx.globalAlpha = .5 + .5*Math.sin(t*6 + i); ctx.beginPath(); ctx.arc(b.x + Math.cos(a)*b.r*.5 + b.r*.6, b.y - b.r*1.2 - i*10, 4 + i*2, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}
function face(b, t, o){
  const r = b.r, ang = Math.atan2(P.y - b.y, P.x - b.x), red = b.rage;
  [-1, 1].forEach(s => {
    const ex = s*r*.36, ey = -r*.08;
    if (o.dots){ ctx.fillStyle = red ? C.rage : '#1a1030'; ctx.beginPath(); ctx.arc(ex, ey, r*.07, 0, 7); ctx.fill(); return; }
    if (o.slits){ ctx.fillStyle = red ? C.rage : C.cyan; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(ex, ey, r*.15, r*.05, s*.25, 0, 7); ctx.fill(); ctx.shadowBlur = 0; return; }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, r*.17, r*.13, 0, 0, 7); ctx.fill();
    ctx.fillStyle = red ? C.rage : '#110a22'; ctx.beginPath(); ctx.arc(ex + Math.cos(ang)*r*.06, ey + Math.sin(ang)*r*.05, r*.075, 0, 7); ctx.fill();
    if (!o.noBrow){ ctx.strokeStyle = '#110a22'; ctx.lineWidth = r*.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - s*r*.2, ey - r*(red ? .3 : .26)); ctx.lineTo(ex + s*r*.14, ey - r*(red ? .12 : .15)); ctx.stroke(); }
  });
}
function crownShape(cx, cy, cw, h){
  ctx.beginPath(); ctx.moveTo(cx - cw, cy); ctx.lineTo(cx - cw, cy - h*.75); ctx.lineTo(cx - cw*.5, cy - h*.3); ctx.lineTo(cx, cy - h); ctx.lineTo(cx + cw*.5, cy - h*.3); ctx.lineTo(cx + cw, cy - h*.75); ctx.lineTo(cx + cw, cy); ctx.closePath(); ctx.fill();
}
function drawBossBody(b, t){
  ctx.save(); const bob = b.idx === 0 ? Math.sin(t*2.2)*4 : 0; ctx.translate(b.x, b.y + bob);
  const r = b.r, idx = b.idx, col = b.color;
  // outer ring: spikes / hashtags / dots
  if (idx === 1){
    ctx.fillStyle = col; ctx.font = `${r*.42}px Lalezar, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++){ const a = t*(b.ab && b.ab.stage === 'tele' ? 6 : 1.4) + i*Math.PI/3; ctx.fillText('#', Math.cos(a)*r*1.35, Math.sin(a)*r*1.35); }
  } else if (idx === 2){
    ctx.fillStyle = col; for (let i = 0; i < 14; i++){ const a = t*.6 + i*Math.PI/7; ctx.globalAlpha = .55; ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.3, Math.sin(a)*r*1.3, 3, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (idx !== 0 && idx !== 5 && idx !== 7){
    ctx.fillStyle = idx === 4 ? '#0d0a1a' : col; ctx.strokeStyle = idx === 4 ? C.cyan : 'transparent'; ctx.lineWidth = 1.5; ctx.globalAlpha = .8;
    for (let i = 0; i < 12; i++){ const a = t*1.2*(b.rage ? 2 : 1) + i*Math.PI/6;
      ctx.beginPath(); ctx.moveTo(Math.cos(a - .12)*r*.95, Math.sin(a - .12)*r*.95); ctx.lineTo(Math.cos(a)*r*1.38, Math.sin(a)*r*1.38); ctx.lineTo(Math.cos(a + .12)*r*.95, Math.sin(a + .12)*r*.95); ctx.fill(); if (idx === 4) ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // body
  const base = idx === 4 ? '#140c26' : idx === 5 ? '#0b2416' : idx === 6 ? '#3a3f6e' : col;
  const g = ctx.createRadialGradient(-r*.3, -r*.3, r*.1, 0, 0, r);
  g.addColorStop(0, b.hitF > 0 ? '#ffffff' : (b.rage && idx !== 4 ? '#ff8a8a' : base)); g.addColorStop(1, idx === 4 ? '#05030c' : '#1a0f2e');
  ctx.shadowColor = b.rage ? C.rage : col; ctx.shadowBlur = b.clone ? 10 : 30; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  if (idx === 4 || idx === 5){ ctx.strokeStyle = b.rage ? C.rage : (idx === 5 ? '#3dff9a' : C.cyan); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
  // per-boss features
  ctx.strokeStyle = '#110a22'; ctx.lineCap = 'round'; ctx.lineWidth = r*.07;
  if (idx === 0){
    face(b, t, { dots:true }); ctx.beginPath(); ctx.moveTo(-r*.22, r*.32); ctx.lineTo(r*.22, r*.32); ctx.stroke();
    if (!b.clone){ ctx.fillStyle = b.rage ? C.rage : '#e8e0ff'; ctx.font = `${r*.7}px Lalezar, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.rage ? '!' : '؟', 0, -r*1.45); }
  } else if (idx === 1){
    ctx.fillStyle = '#2a1404'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r*.62, -r*.24, r*1.24, r*.3, 6) : ctx.rect(-r*.62, -r*.24, r*1.24, r*.3); ctx.fill();
    ctx.fillStyle = b.rage ? C.rage : '#ffd27a'; ctx.fillRect(-r*.5, -r*.2, r*.12, r*.05); ctx.fillRect(r*.12, -r*.2, r*.12, r*.05);
    ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = r*.06; ctx.beginPath(); ctx.moveTo(-r*.2, -r*.48); ctx.lineTo(r*.15, -r*.7); ctx.moveTo(r*.15, -r*.7); ctx.lineTo(r*.02, -r*.7); ctx.moveTo(r*.15, -r*.7); ctx.lineTo(r*.12, -r*.57); ctx.stroke();
    ctx.strokeStyle = '#110a22'; ctx.lineWidth = r*.07; ctx.beginPath(); ctx.arc(r*.08, r*.28, r*.24, .2, Math.PI*.75); ctx.stroke();
  } else if (idx === 2){
    face(b, t, { noBrow:true });
    ctx.strokeStyle = '#0b2a18'; ctx.lineWidth = r*.06; [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(s*r*.36, -r*.08, r*.22, 0, 7); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-r*.14, -r*.1); ctx.lineTo(r*.14, -r*.1); ctx.stroke();
    ctx.fillStyle = '#2c6b46'; ctx.beginPath(); ctx.moveTo(-r*.35, r*.35); ctx.lineTo(r*.35, r*.35); ctx.lineTo(0, r*.95); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#110a22'; ctx.lineWidth = r*.06; ctx.beginPath(); ctx.moveTo(-r*.15, r*.3); ctx.lineTo(r*.15, r*.3); ctx.stroke();
  } else if (idx === 3){
    face(b, t, {});
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r*.42, r*.22, r*.84, r*.3, 8) : ctx.rect(-r*.42, r*.22, r*.84, r*.3); ctx.fill();
    ctx.strokeStyle = '#aa3355'; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++){ ctx.beginPath(); ctx.moveTo(i*r*.15, r*.22); ctx.lineTo(i*r*.15, r*.52); ctx.stroke(); }
    ctx.fillStyle = '#8fd9ff'; ctx.beginPath(); ctx.moveTo(r*.75, -r*.4); ctx.quadraticCurveTo(r*.9, -r*.15, r*.75, -r*.05); ctx.quadraticCurveTo(r*.6, -r*.15, r*.75, -r*.4); ctx.fill();
    ctx.fillStyle = C.gold; ctx.font = `${r*.55}px Lalezar, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [-1, 0, 1].forEach(i => ctx.fillText('L', i*r*.38, -r*1.2 - (i === 0 ? r*.15 : 0)));
  } else if (idx === 4){
    face(b, t, { slits:true });
    ctx.strokeStyle = b.rage ? C.rage : C.cyan; ctx.lineWidth = r*.05; ctx.beginPath(); ctx.arc(0, r*.45, r*.22, Math.PI*1.15, Math.PI*1.85); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; crownShape(0, -r*1.0, r*.7, r*.55); ctx.shadowBlur = 0;
  } else if (idx === 5){
    const a = Math.atan2(P.y - b.y, P.x - b.x);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, 0, r*.52, r*.32, 0, 0, 7); ctx.fill();
    ctx.fillStyle = b.rage ? C.rage : '#3dff9a'; ctx.beginPath(); ctx.arc(Math.cos(a)*r*.18, Math.sin(a)*r*.1, r*.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#05140b'; ctx.beginPath(); ctx.arc(Math.cos(a)*r*.18, Math.sin(a)*r*.1, r*.09, 0, 7); ctx.fill();
    ctx.fillStyle = '#3dff9a'; ctx.font = `${r*.32}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = .75;
    for (let i = 0; i < 10; i++){ const aa = t*1.1 + i*Math.PI/5; ctx.fillText(i % 2 ? '1' : '0', Math.cos(aa)*r*1.35, Math.sin(aa)*r*1.35); }
    ctx.globalAlpha = 1;
  } else if (idx === 6){
    ctx.fillStyle = '#2b2f55'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r*.62, -r*.45, r*1.24, r*.9, 10) : ctx.rect(-r*.62, -r*.45, r*1.24, r*.9); ctx.fill();
    ctx.fillStyle = b.rage ? C.rage : '#9aa4ff'; ctx.fillRect(-r*.4, -r*.2, r*.22, r*.16); ctx.fillRect(r*.18, -r*.2, r*.22, r*.16);
    ctx.strokeStyle = '#9aa4ff'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++){ ctx.beginPath(); ctx.moveTo(i*r*.12, r*.12); ctx.lineTo(i*r*.12, r*.3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r*1.3); ctx.stroke(); ctx.fillStyle = C.cringe; ctx.beginPath(); ctx.arc(0, -r*1.35, 4, 0, 7); ctx.fill();
  } else if (idx === 7){
    ctx.strokeStyle = b.rage ? C.rage : '#ffd86b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r*1.25, t*3, t*3 + Math.PI*1.3); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r*1.25, t*3 + Math.PI, t*3 + Math.PI*1.6); ctx.stroke();
    ctx.fillStyle = '#1a1206'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r*.75, -r*.3, r*1.5, r*.38, 8) : ctx.rect(-r*.75, -r*.3, r*1.5, r*.38); ctx.fill();
    ctx.fillStyle = b.rage ? C.rage : '#ffd86b'; ctx.fillRect(-r*.6, -r*.24, r*.18, r*.06);
    ctx.fillStyle = C.gold; ctx.shadowColor = C.gold; ctx.shadowBlur = 16; crownShape(0, -r*1.05, r*.55, r*.45); ctx.shadowBlur = 0;
  }
  ctx.restore();
}
function drawPU(it){
  const k = it.kind, r = 15, t = performance.now()/1000;
  const col = k === 'shield' ? '#7fe3ff' : k === 'magnet' ? '#be96ff' : k === 'freeze' ? '#bff4ff' : `hsl(${Math.round(t*200) % 360},100%,70%)`;
  ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.fillStyle = 'rgba(17,10,34,.85)';
  ctx.beginPath(); for (let i = 0; i < 6; i++){ const a = i*Math.PI/3 + t; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 2.2;
  if (k === 'shield'){ ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(7, -5); ctx.lineTo(6, 3); ctx.lineTo(0, 8); ctx.lineTo(-6, 3); ctx.lineTo(-7, -5); ctx.closePath(); ctx.fill(); }
  else if (k === 'magnet'){ ctx.beginPath(); ctx.arc(0, -1, 6, Math.PI, 0); ctx.lineTo(6, 6); ctx.moveTo(-6, -1); ctx.lineTo(-6, 6); ctx.stroke(); }
  else if (k === 'freeze'){ for (let i = 0; i < 3; i++){ const a = i*Math.PI/3; ctx.beginPath(); ctx.moveTo(Math.cos(a)*8, Math.sin(a)*8); ctx.lineTo(-Math.cos(a)*8, -Math.sin(a)*8); ctx.stroke(); } }
  else { ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); }
}
function pickPU(it){
  const k = it.kind; let label = { shield:'درع! بيصد ضربة وحدة', magnet:'مغناطيس!', freeze:'تجميد الوقت!' }[k];
  if (k === 'shield') S.shield = 8; else if (k === 'magnet') S.magnetT = 6; else if (k === 'freeze') S.freezeT = 2;
  else { const g = 100 * mult(); S.aura += g; label = 'ألماسة أسطورية! +' + g; }
  burst(it.x, it.y, k === 'mythic' ? C.gold : '#7fe3ff', 24, 260); say(it.x, it.y - 24, label, k === 'mythic' ? C.gold : '#bff4ff', 22); Sound.refund();
}
function drawActive(){
  const list = [];
  if (S.shield > 0) list.push(['درع', S.shield, '#7fe3ff']); if (S.magnetT > 0) list.push(['مغناطيس', S.magnetT, '#be96ff']);
  if (S.freezeT > 0) list.push(['تجميد', S.freezeT, '#bff4ff']); if (S.banT > 0) list.push(['شادو بان', S.banT, '#3dff9a']);
  if (!list.length) return;
  ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '700 14px Tajawal, sans-serif';
  list.forEach((x, i) => { ctx.fillStyle = x[2]; ctx.fillText(x[0] + ' ' + x[1].toFixed(1), W - 12, H - 20 - i*18); });
  ctx.restore();
}
function drawToast(o){
  const k = Math.min(1, o.t*4, (3.4 - o.t)*3);
  ctx.save(); ctx.globalAlpha = Math.max(0, k); ctx.font = '800 14px Tajawal, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = Math.min(W - 20, ctx.measureText(o.txt).width + 28);
  ctx.fillStyle = 'rgba(255,201,77,.96)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W/2 - w/2, 56, w, 30, 10) : ctx.rect(W/2 - w/2, 56, w, 30); ctx.fill();
  ctx.fillStyle = C.ink; ctx.fillText(o.txt, W/2, 71, w - 16); ctx.restore();
}
function drawItem(it){
  ctx.save(); ctx.translate(it.x, it.y);
  if (it.type === 'shard'){
    ctx.rotate(it.rot); ctx.shadowColor = C.gold; ctx.shadowBlur = 18; ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.moveTo(0,-it.r); ctx.lineTo(it.r*.7,0); ctx.lineTo(0,it.r); ctx.lineTo(-it.r*.7,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(0,-it.r*.6); ctx.lineTo(it.r*.25,0); ctx.lineTo(0,it.r*.1); ctx.closePath(); ctx.fill();
  } else if (it.type === 'crown'){
    ctx.rotate(Math.sin(it.rot)*.25); const r = it.r;
    if (it.dark){
      const g = ctx.createRadialGradient(0, 0, r*.3, 0, 0, r*2); g.addColorStop(0, 'rgba(120,40,200,.55)'); g.addColorStop(1, 'rgba(20,5,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r*2, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a0f2e'; ctx.strokeStyle = C.dark; ctx.lineWidth = 2; ctx.shadowColor = C.dark; ctx.shadowBlur = 14;
    } else { ctx.shadowColor = C.cyan; ctx.shadowBlur = 18; ctx.fillStyle = C.cyan; }
    ctx.beginPath(); ctx.moveTo(-r,r*.6); ctx.lineTo(-r,-r*.4); ctx.lineTo(-r*.5,r*.05); ctx.lineTo(0,-r*.8); ctx.lineTo(r*.5,r*.05); ctx.lineTo(r,-r*.4); ctx.lineTo(r,r*.6); ctx.closePath(); ctx.fill();
    if (it.dark) ctx.stroke();
  } else if (it.type === 'pu'){
    drawPU(it);
  } else if (it.type === 'heart'){
    const r = it.r * (1 + Math.sin(it.rot*2)*.08); ctx.shadowColor = C.pink; ctx.shadowBlur = 18; ctx.fillStyle = C.pink;
    ctx.beginPath(); ctx.moveTo(0, r*.9); ctx.bezierCurveTo(-r*1.4, -r*.1, -r*.6, -r*1.2, 0, -r*.4); ctx.bezierCurveTo(r*.6, -r*1.2, r*1.4, -r*.1, 0, r*.9); ctx.fill();
  } else {
    ctx.rotate(Math.sin(it.rot*1.5)*.2); ctx.shadowColor = C.cringe; ctx.shadowBlur = 16; ctx.fillStyle = C.cringe; const r = it.r;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r,-r,2*r,2*r,7) : ctx.rect(-r,-r,2*r,2*r); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = C.ink; ctx.font = `${r*1.6}px Lalezar, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('L', 0, r*.12);
  }
  ctx.restore();
}
function drawPlayer(t){
  const ego = S ? S.ego : 30;
  if (S && S.inv > 0 && Math.floor(S.inv*12) % 2) return;
  const ch = S ? S.char : charId; ctx.save(); if (ch === 'ghost') ctx.globalAlpha = .72;
  const danger = S && ego >= 90 && S.run;
  const jx = danger && !reduce ? (Math.random() - .5)*(ego - 88)*.8 : 0, jy = danger && !reduce ? (Math.random() - .5)*(ego - 88)*.5 : 0;
  const px = P.x + jx, py = P.y + jy;
  const pulse = 1 + Math.sin(t*(danger ? 18 : 6))*.06*(1 + ego/50);
  const ar = (P.r + 18 + ego*.55) * pulse;
  const col = danger ? [255, 60 + Math.round(40*Math.sin(t*20)), 70] : ego >= 80 ? [255,220,120] : ego >= 67 ? [255,201,77] : ego >= 34 ? [110,231,255] : [190,170,255];
  const g = ctx.createRadialGradient(px,py,P.r*.6,px,py,ar);
  g.addColorStop(0, `rgba(${col},.55)`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px,py,ar,0,7); ctx.fill();
  ctx.strokeStyle = `rgba(${col},.8)`; ctx.lineWidth = 2;
  const rr = P.r + 8 + ego*.15, sp = danger ? 9 : 3;
  ctx.beginPath(); ctx.arc(px,py,rr, t*sp, t*sp + Math.PI*1.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(px,py,rr, t*sp + Math.PI, t*sp + Math.PI*1.6); ctx.stroke();
  const eq = Acct.eq;
  AuraCos.wearBack(ctx, px, py, P.r, eq, t, S ? P.dx : 0);
  ctx.fillStyle = C.text; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(px,py,P.r,0,7); ctx.fill(); ctx.shadowBlur = 0;
  if (eq.head){ /* a hat from the shop replaces the character's head piece */ }
  else if (ch === 'menace'){ ctx.fillStyle = '#ff5a5a'; [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(px + s*P.r*.7, py - P.r*.6); ctx.lineTo(px + s*P.r*.35, py - P.r*1.4); ctx.lineTo(px + s*P.r*.12, py - P.r*.8); ctx.fill(); }); }
  else if (ch === 'magnet'){ ctx.strokeStyle = '#be96ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py - P.r*.95, P.r*.42, Math.PI, 0); ctx.stroke(); }
  else if (ch === 'gambler'){ ctx.fillStyle = C.gold; ctx.fillRect(px - P.r*.5, py - P.r*1.3, P.r, P.r*.4); ctx.fillRect(px - P.r*.85, py - P.r*.95, P.r*1.7, P.r*.13); }
  ctx.fillStyle = C.ink; const w = P.r*1.5;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - w/2, py - P.r*.35, w, P.r*.45, 4) : ctx.rect(px - w/2, py - P.r*.35, w, P.r*.45); ctx.fill();
  ctx.fillStyle = `rgba(${col},.9)`; ctx.fillRect(px - w/2 + 3, py - P.r*.3, 4, 2);
  AuraCos.wearFront(ctx, px, py, P.r, eq, t);
  if (S && S.shield > 0){ ctx.globalAlpha = 1; ctx.strokeStyle = `rgba(127,227,255,${S.shield < 2 ? .4 + .4*Math.sin(t*20) : .85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, P.r + 12, 0, 7); ctx.stroke(); }
  ctx.restore();
}

/* ---------- HUD ---------- */
let lastHud = '';
const flexLabel = $('flexLabel'), flexCharge = $('flexCharge'), pauseBtn = $('pauseBtn');
const lvlRow = $('lvlRow'), lvlNum = $('lvlNum'), lvlName = $('lvlName'), lvlFill = $('lvlFill');
function hud(){
  if (!S) return;
  const a = Math.floor(S.aura), m = mult(), e = Math.round(S.ego), tier = S.ego >= 25 ? flexTier(S.ego) : 'none';
  let prog, name, boss = false;
  if (S.phase === 'level'){ prog = S.pt / S.cfg.dur; name = S.cfg.name; }
  else if (S.phase === 'boss' && S.boss){ prog = Math.max(0, S.boss.hp / S.boss.max); name = 'زعيم: ' + S.boss.name + (S.boss.rage ? ' (غضبان)' : ''); boss = true; }
  else if (S.phase === 'intro'){ prog = 1; name = 'زعيم قادم!'; boss = true; }
  else { prog = 1; name = S.cfg.name + ' ✓'; }
  const key = [a, m, e, S.cfg.num, name, Math.round(prog*200), S.run, tier, S.banT > 0].join('|');
  if (key === lastHud) return; lastHud = key;
  scEl.textContent = a; multEl.textContent = 'x' + m;
  egoFill.style.width = Math.min(100, S.ego) + '%'; egoFill.style.backgroundPosition = (-S.ego*2) + 'px 0';
  egoFill.classList.toggle('danger', S.ego >= 90);
  flexBtn.classList.toggle('ready', S.run && S.ego >= 25);
  flexBtn.classList.toggle('super', S.run && tier === 'super');
  flexBtn.classList.toggle('perfect', S.run && tier === 'perfect');
  flexLabel.textContent = !S.run || tier === 'none' || tier === 'normal' ? 'FLEX' : tier === 'super' ? 'SUPER FLEX' : 'PERFECT FLEX';
  flexBtn.classList.toggle('low', S.run && S.ego < 25);
  flexCharge.style.width = S.run && S.ego < 25 ? (S.ego/25*100).toFixed(1) + '%' : '0';
  pauseBtn.disabled = !S.run;
  flexBtn.classList.toggle('banned', S.run && S.banT > 0);
  lvlNum.textContent = 'المرحلة ' + S.cfg.num + (S.cfg.loop ? ' · ت' + ascOf(S.cfg) : ''); lvlName.textContent = name;
  lvlFill.style.width = Math.min(100, prog*100) + '%'; lvlRow.classList.toggle('boss', boss);
}

function loop(now){
  const dt = Math.min(.033, (now - (last || now))/1000); last = now;
  update(dt); draw(now); hud(); Perf.sample(dt); Ach.tick(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- input ---------- */
/* Mouse: player tracks the cursor (unchanged desktop behaviour).
   Touch/pen: drag anywhere on the play field; the player keeps its offset from the finger, so it never jumps under the thumb.
   Only the canvas starts gameplay input, so HUD, FLEX, pause and menu buttons never move the player. */
const stageX = e => e.clientX - cv.getBoundingClientRect().left;
cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse'){ Input.use('mouse'); P.tx = stageX(e); return; }
  Input.use('touch'); e.preventDefault();
  if (Input.dragId !== null) return;            // ignore a second finger
  Input.dragId = e.pointerId; Input.dragOffset = P.x - stageX(e); P.touch = true; P.kv = 0;
  try { cv.setPointerCapture(e.pointerId); } catch(_){}
});
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse'){ if (Input.dragId === null){ P.tx = stageX(e); if (Input.last !== 'mouse') Input.use('mouse'); } return; }
  if (e.pointerId !== Input.dragId) return;
  e.preventDefault(); P.tx = stageX(e) + Input.dragOffset;
});
function endDrag(e){
  if (e.pointerId !== Input.dragId) return;
  Input.dragId = null; P.touch = false; P.tx = P.x;
  try { cv.releasePointerCapture(e.pointerId); } catch(_){}
}
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('lostpointercapture', endDrag);
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('touchmove', e => e.preventDefault(), { passive:false });   // older iOS: no page scroll while dragging
document.addEventListener('gesturestart', e => { if (S && S.run) e.preventDefault(); });
addEventListener('keydown', e => {
  if (!$('acctScreen').hidden || !$('shopScreen').hidden) return;   // account forms / shop handle their own keys
  if (e.target && e.target.tagName === 'INPUT'){ if (e.key === 'Enter'){ e.preventDefault(); start(); } return; }
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
  if (e.code === 'Space'){ e.preventDefault(); if (S && S.run){ if (S.paused) setPause(false); else flex(); } else if ($('pauseScreen').hidden && $('boardScreen').hidden) start(); }
  if ((k === 'p' || k === 'P' || k === 'Escape') && S && S.run) setPause(!S.paused);
  if (k === 'Enter' && !(S && S.run)){ e.preventDefault(); start(); }
});
addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
});
document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.run && !S.paused) setPause(true); });
addEventListener('blur', () => { keys = {}; if (S && S.run && !S.paused) setPause(true); });
let boardFrom = null;
document.querySelectorAll('[data-board]').forEach(b => b.addEventListener('click', () => { boardFrom = b.closest('.overlay'); boardFrom.hidden = true; $('boardScreen').hidden = false; $('boardBack').focus(); }));
$('boardBack').addEventListener('click', () => { $('boardScreen').hidden = true; if (boardFrom) boardFrom.hidden = false; });
$('shareBtn').addEventListener('click', async () => {
  const url = await Challenge.link();
  const text = 'جبت ' + (lastRun ? lastRun.score : 0) + ' هالة بـ Aura Rush' + (lastRun && lastRun.rank ? ' وترتيبي #' + lastRun.rank : '') + '. قدّك تغلبني؟';
  try { if (navigator.share){ await navigator.share({ title:'Aura Rush', text, url }); return; } } catch(e){ return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); $('status').textContent = 'انسخ رابط التحدي. ابعته لصحابك'; }
  catch(e){ $('status').textContent = url; }
});
/* FLEX button: fires on press (no click delay on phones), same flex() as Space. Keyboard Enter/Space on the focused button = click with detail 0. */
function pressFlex(){
  const ok = S && S.run && !S.paused && !S.intro && S.ego >= 25;
  flex();
  flexBtn.classList.add('pressed'); setTimeout(() => flexBtn.classList.remove('pressed'), 120);
  if (Input.isTouchUI() && navigator.vibrate){ try { navigator.vibrate(ok ? 35 : [10, 40, 10]); } catch(_){} }
}
flexBtn.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); if (e.pointerType !== 'mouse') Input.use('touch'); pressFlex(); });
flexBtn.addEventListener('click', e => { if (e.detail === 0) pressFlex(); });
pauseBtn.addEventListener('click', () => { if (S && S.run) setPause(!S.paused); });
$('startBtn').addEventListener('click', start);
$('againBtn').addEventListener('click', start);
$('resumeBtn').addEventListener('click', () => setPause(false));
$('quitBtn').addEventListener('click', () => { if (S){ S.run = false; S.paused = false; } Sound.stopMusic(); $('pauseScreen').hidden = true; $('startScreen').hidden = false; });
const muteBtn = $('muteBtn');
muteBtn.classList.toggle('muted', Sound.muted);
muteBtn.addEventListener('click', () => { Sound.init(); muteBtn.classList.toggle('muted', Sound.toggle()); });
/* menu clicks: soft UI sound on any button inside a menu screen */
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('.overlay button, .overlay select'); if (b){ Sound.init(); Sound.click(); } }, true);
})();
