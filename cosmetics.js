/* Aura Rush cosmetics: drawing for shop items (outfits, trails, FLEX effects) + avatar previews.
   Purely visual: nothing here reads or changes gameplay state. Shared by game.js, the shop and profile.html. */
window.AuraCos = (() => {
  const RARITY = {
    common:    { name:'عادي',   color:'#a99ecb' },
    rare:      { name:'نادر',   color:'#6ee7ff' },
    legendary: { name:'أسطوري', color:'#ffc94d' },
    mythic:    { name:'خرافي',  color:'#ff5fd2' },
  };
  const SLOTS = { head:'راس', face:'وجه', neck:'رقبة', body:'لبس', trail:'أثر', name:'الاسم', flex:'FLEX', frame:'إطار', banner:'غلاف' };
  const TABS = [
    { id:'wear',    name:'لبس',      slots:['head','face','neck','body'] },
    { id:'trail',   name:'أثر',      slots:['trail'] },
    { id:'flex',    name:'FLEX',     slots:['flex'] },
    { id:'name',    name:'الاسم',    slots:['name'] },
    { id:'profile', name:'البروفايل', slots:['frame','banner'] },
  ];
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

  /* ---------- outfits: back layer (behind the ball) ---------- */
  function wearBack(ctx, x, y, r, eq, t, sway){
    if (!eq) return;
    sway = sway || 0;
    if (eq.body === 'cape'){
      const s = Math.sin(t*4)*r*.12 - sway*.6;
      const g = ctx.createLinearGradient(x, y, x, y + r*1.9);
      g.addColorStop(0, '#b0123f'); g.addColorStop(1, '#5a0a3a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - r*.8, y + r*.1);
      ctx.quadraticCurveTo(x - r*1.35 + s, y + r*1.1, x - r*1.2 + s, y + r*1.85);
      ctx.quadraticCurveTo(x - r*.4 + s, y + r*1.6, x + s*.5, y + r*1.95);
      ctx.quadraticCurveTo(x + r*.4 + s, y + r*1.6, x + r*1.2 + s, y + r*1.85);
      ctx.quadraticCurveTo(x + r*1.35 + s, y + r*1.1, x + r*.8, y + r*.1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffc94d'; ctx.lineWidth = Math.max(1.5, r*.09); ctx.stroke();
    }
    if (eq.body === 'hoodie'){
      ctx.fillStyle = '#5b4bd6';
      ctx.beginPath(); ctx.arc(x, y - r*.06, r*1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#4636b8';
      ctx.beginPath(); ctx.arc(x, y - r*.06, r*1.2, Math.PI*.15, Math.PI*.85); ctx.lineTo(x, y + r*.4); ctx.closePath(); ctx.fill();
    }
  }

  /* ---------- outfits: front layer (over the ball and its visor) ---------- */
  function wearFront(ctx, x, y, r, eq, t){
    if (!eq) return;
    if (eq.body === 'hoodie'){
      ctx.strokeStyle = '#e8e4ff'; ctx.lineWidth = Math.max(1, r*.07); ctx.lineCap = 'round';
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(x + sd*r*.28, y + r*.45); ctx.lineTo(x + sd*r*.32, y + r*.95); ctx.stroke(); });
    }
    if (eq.neck === 'chain'){
      ctx.strokeStyle = '#ffc94d'; ctx.lineWidth = Math.max(1.5, r*.11); ctx.lineCap = 'round';
      ctx.shadowColor = '#ffc94d'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x, y + r*.05, r*.78, Math.PI*.18, Math.PI*.82); ctx.stroke();
      ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.arc(x, y + r*.88, r*.17, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (eq.face === 'shades' || eq.face === 'shades_neon'){
      const neon = eq.face === 'shades_neon', w = r*.66, h = r*.42, yy = y - r*.38;
      if (neon){
        const g = ctx.createLinearGradient(x - r, yy, x + r, yy);
        g.addColorStop(0, '#6ee7ff'); g.addColorStop(1, '#ff5fd2');
        ctx.fillStyle = g; ctx.shadowColor = '#ff5fd2'; ctx.shadowBlur = 10;
      } else ctx.fillStyle = '#0b0614';
      rr(ctx, x - w - r*.06, yy, w, h, r*.12); ctx.fill();
      rr(ctx, x + r*.06, yy, w, h, r*.12); ctx.fill();
      ctx.fillRect(x - r*.1, yy + h*.25, r*.2, Math.max(1, r*.08));
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(x - w + r*.05, yy + h*.2, w*.28, Math.max(1, h*.16));
      ctx.fillRect(x + r*.17, yy + h*.2, w*.28, Math.max(1, h*.16));
    }
    if (eq.head === 'cap'){
      ctx.fillStyle = '#ff4f7b';
      ctx.beginPath(); ctx.arc(x, y - r*.3, r*.98, Math.PI*1.03, Math.PI*1.97); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d63a63';
      ctx.beginPath(); ctx.ellipse(x - r*.85, y - r*.36, r*.62, r*.15, -.08, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - r*1.26, r*.1, 0, 7); ctx.fill();
    }
    if (eq.head === 'season_crown'){
      /* season champion: violet-silver crown inside a laurel wreath, with a pulsing star */
      const base = y - r*.8, top = base - r*.75, w = r*1.3;
      ctx.strokeStyle = '#3ddc84'; ctx.lineWidth = Math.max(1.5, r*.1); ctx.lineCap = 'round';
      [-1, 1].forEach(sd => {
        ctx.beginPath(); ctx.arc(x, y - r*.2, r*1.12, sd < 0 ? Math.PI*1.05 : Math.PI*1.95, sd < 0 ? Math.PI*1.4 : Math.PI*1.6, sd > 0); ctx.stroke();
        for (let i = 0; i < 3; i++){ const a = sd < 0 ? Math.PI*(1.1 + i*.1) : Math.PI*(1.9 - i*.1);
          ctx.fillStyle = '#3ddc84'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a)*r*1.12, y - r*.2 + Math.sin(a)*r*1.12, r*.16, r*.07, a + Math.PI/2, 0, 7); ctx.fill(); }
      });
      const g = ctx.createLinearGradient(x, top, x, base);
      g.addColorStop(0, '#f2e9ff'); g.addColorStop(1, '#9d6bff');
      ctx.fillStyle = g; ctx.shadowColor = '#b06cff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(x - w/2, base); ctx.lineTo(x - w/2, top + r*.25); ctx.lineTo(x - w/4, base - r*.3); ctx.lineTo(x, top);
      ctx.lineTo(x + w/4, base - r*.3); ctx.lineTo(x + w/2, top + r*.25); ctx.lineTo(x + w/2, base); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      const sr = r*(.16 + .04*Math.sin(t*5));
      ctx.fillStyle = '#ffe28a'; ctx.beginPath();
      for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rad = i % 2 ? sr*.45 : sr; ctx.lineTo(x + Math.cos(a)*rad, top - r*.12 + Math.sin(a)*rad); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6ee7ff'; ctx.beginPath(); ctx.arc(x, base - r*.14, r*.1, 0, 7); ctx.fill();
    }
    if (eq.head === 'crown' || eq.head === 'og_crown'){
      const og = eq.head === 'og_crown', w = r*(og ? 1.5 : 1.25), base = y - r*.82, top = base - r*(og ? .85 : .65);
      if (og){
        ctx.save(); ctx.globalAlpha = .35 + .2*Math.sin(t*3); ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = Math.max(1, r*.06);
        for (let i = 0; i < 7; i++){ const a = -Math.PI/2 + (i - 3)*.32 + Math.sin(t*2)*.04;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a)*r*.9, base - r*.2 + Math.sin(a)*r*.5); ctx.lineTo(x + Math.cos(a)*r*2.1, base - r*.2 + Math.sin(a)*r*1.6); ctx.stroke(); }
        ctx.restore();
      }
      const g = ctx.createLinearGradient(x, top, x, base);
      g.addColorStop(0, og ? '#ffffff' : '#ffe28a'); g.addColorStop(1, og ? '#ffd86b' : '#e0a21f');
      ctx.fillStyle = g; ctx.shadowColor = '#ffc94d'; ctx.shadowBlur = og ? 16 : 8;
      ctx.beginPath(); ctx.moveTo(x - w/2, base);
      const n = og ? 5 : 3;
      for (let i = 0; i <= n; i++){ const px = x - w/2 + w*i/n; ctx.lineTo(px, i % 2 === 0 || n === 3 ? top : top + r*.3); if (i < n) ctx.lineTo(px + w/(2*n), base - r*.25); }
      ctx.lineTo(x + w/2, base); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = og ? '#b06cff' : '#ff4f7b';
      ctx.beginPath(); ctx.arc(x, base - r*.14, r*.11, 0, 7); ctx.fill();
      if (og){ ctx.fillStyle = '#6ee7ff'; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(x + sd*w*.3, base - r*.12, r*.08, 0, 7); ctx.fill(); }); }
    }
  }

  /* ---------- particle systems (trails + FLEX effects) ---------- */
  const sys = () => ({ parts:[], bolts:[], acc:0 });

  function trail(S, kind, x, y, r, dt, dx, fall, low){
    if (!kind) return;
    const rate = (kind === 'tr_neon' ? 70 : 34) * (low ? .5 : 1) * (Math.abs(dx) > .5 ? 1.6 : 1);
    S.acc += dt*rate;
    while (S.acc >= 1){ S.acc -= 1;
      const p = { x: x + (Math.random() - .5)*r*1.2, y: y + r*.6 + Math.random()*r*.4, vx:(Math.random() - .5)*30 - dx*4, vy: fall*.55 + Math.random()*40, life:0, max:.55 + Math.random()*.35, kind, s: r*(.25 + Math.random()*.3), rot:Math.random()*6 };
      if (kind === 'tr_fire'){ p.vy = fall*.45 + 30; p.c = Math.random() < .5 ? '#ffb02e' : '#ff5a2e'; }
      if (kind === 'tr_neon'){ p.x = x + (Math.random() - .5)*r*.5; p.vx = 0; p.vy = fall*.7; p.c = Math.random() < .5 ? '#6ee7ff' : '#ff5fd2'; p.max = .4; p.s = r*.22; }
      if (kind === 'tr_glitch'){ p.c = ['#ff2e63','#2effe6','#ffffff'][Math.floor(Math.random()*3)]; p.w = r*(.4 + Math.random()*1.1); p.h = r*(.12 + Math.random()*.2); p.max = .35; }
      if (kind === 'tr_money'){ p.c = Math.random() < .7 ? '#3ddc84' : '#ffc94d'; p.coin = p.c === '#ffc94d'; p.vr = (Math.random() - .5)*6; p.max = .9; }
      S.parts.push(p);
    }
    if (S.parts.length > (low ? 120 : 260)) S.parts.splice(0, S.parts.length - (low ? 120 : 260));
  }

  function flex(S, kind, x, y, W, H, low){
    if (!kind) return;
    const k = low ? .5 : 1;
    if (kind === 'fx_gold'){
      for (let i = 0; i < 46*k; i++) S.parts.push({ kind:'coin', x:Math.random()*W, y:-20 - Math.random()*H*.5, vx:(Math.random() - .5)*40, vy:260 + Math.random()*260, life:0, max:1.6, s:5 + Math.random()*5, rot:Math.random()*6, vr:(Math.random() - .5)*10, c:'#ffc94d', g:500 });
    }
    if (kind === 'fx_bolt'){
      for (let i = 0; i < 4; i++){ const tx = x + (Math.random() - .5)*W*.7, pts = [[x, y]], n = 9;
        for (let j = 1; j <= n; j++) pts.push([x + (tx - x)*j/n + (Math.random() - .5)*40, y - (y + 10)*j/n]);
        S.bolts.push({ pts, life:0, max:.45 + i*.05 }); }
    }
    if (kind === 'fx_galaxy'){
      for (let i = 0; i < 90*k; i++){ const a = Math.random()*Math.PI*2, d = 10 + Math.random()*30;
        S.parts.push({ kind:'star', cx:x, cy:y, a, d, va:2.5 + Math.random()*2, vd:160 + Math.random()*220, life:0, max:1.2 + Math.random()*.4, s:1.5 + Math.random()*2.5,
          c:['#b06cff','#6ee7ff','#ffffff','#ff5fd2'][Math.floor(Math.random()*4)] }); }
    }
  }

  function step(S, dt){
    S.parts.forEach(p => {
      p.life += dt;
      if (p.kind === 'star'){ p.a += p.va*dt; p.d += p.vd*dt; p.vd *= .97; p.x = p.cx + Math.cos(p.a)*p.d; p.y = p.cy + Math.sin(p.a)*p.d*.6; return; }
      if (p.g) p.vy += p.g*dt*.2;
      p.x += p.vx*dt; p.y += p.vy*dt; if (p.vr) p.rot += p.vr*dt;
    });
    S.parts = S.parts.filter(p => p.life < p.max);
    S.bolts.forEach(b => b.life += dt); S.bolts = S.bolts.filter(b => b.life < b.max);
  }

  function draw(ctx, S, t){
    ctx.save();
    S.parts.forEach(p => {
      const k = 1 - p.life/p.max; ctx.globalAlpha = Math.max(0, Math.min(1, k*1.3));
      if (p.kind === 'tr_fire'){ ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s*(.4 + k*.8), 0, 7); ctx.fill(); }
      else if (p.kind === 'tr_neon' || p.kind === 'star'){ ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
      else if (p.kind === 'tr_glitch'){ if (Math.random() < .8){ ctx.fillStyle = p.c; ctx.fillRect(p.x - p.w/2 + (Math.random() - .5)*6, p.y, p.w, p.h); } }
      else if (p.kind === 'tr_money' || p.kind === 'coin'){
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.coin || p.kind === 'coin'){ ctx.fillStyle = '#ffc94d'; ctx.scale(Math.abs(Math.cos(p.rot*1.7)) + .2, 1); ctx.beginPath(); ctx.arc(0, 0, p.s*.7, 0, 7); ctx.fill(); ctx.fillStyle = '#e0a21f'; ctx.beginPath(); ctx.arc(0, 0, p.s*.4, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = p.c; ctx.fillRect(-p.s, -p.s*.55, p.s*2, p.s*1.1); ctx.fillStyle = '#1f8a4c'; ctx.fillRect(-p.s*.25, -p.s*.3, p.s*.5, p.s*.6); }
        ctx.restore();
      }
    });
    S.bolts.forEach(b => {
      const k = 1 - b.life/b.max; if (Math.random() < .25) return;
      ctx.globalAlpha = k; ctx.strokeStyle = '#e8fbff'; ctx.shadowColor = '#6ee7ff'; ctx.shadowBlur = 18; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); b.pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.restore();
  }

  /* ---------- avatar (ball + visor + outfit), used for shop previews and the profile ---------- */
  function ball(ctx, x, y, r, col){
    const g = ctx.createRadialGradient(x, y, r*.6, x, y, r*2.1);
    g.addColorStop(0, `rgba(${col},.5)`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r*2.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4effe'; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = r; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#110a22'; const w = r*1.5; rr(ctx, x - w/2, y - r*.35, w, r*.45, r*.2); ctx.fill();
    ctx.fillStyle = `rgba(${col},.9)`; ctx.fillRect(x - w/2 + r*.16, y - r*.3, r*.2, Math.max(1, r*.1));
  }
  function avatar(ctx, x, y, r, eq, t){
    wearBack(ctx, x, y, r, eq, t, 0); ball(ctx, x, y, r, '110,231,255'); wearFront(ctx, x, y, r, eq, t);
  }

  /* animated preview canvas for one item: avatar wearing it; trails stream down, FLEX effects replay */
  function preview(canvas, item){
    const d = Math.min(2, devicePixelRatio || 1), cw = canvas.clientWidth || 96, ch = canvas.clientHeight || 96;
    canvas.width = cw*d; canvas.height = ch*d;
    const ctx = canvas.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    const eq = item ? { [item.slot]: item.id } : {}, S = sys(), r = Math.min(cw, ch)*.17;
    const x = cw/2, y = ch*(item && (item.slot === 'trail' || item.slot === 'flex') ? .42 : item && item.slot === 'body' ? .4 : .55);
    let fxT = .3;
    return function frame(t, dt){
      ctx.clearRect(0, 0, cw, ch);
      if (item && item.slot === 'trail') trail(S, item.id, x + Math.sin(t*2)*r*.8, y, r, dt, Math.cos(t*2)*2, 90, true);
      if (item && item.slot === 'flex'){ fxT -= dt; if (fxT <= 0){ fxT = 2.2; flex(S, item.id, x, y, cw, ch, true); } }
      step(S, dt); draw(ctx, S, t);
      const px = item && item.slot === 'trail' ? x + Math.sin(t*2)*r*.8 : x;
      wearBack(ctx, px, y, r, eq, t, item && item.slot === 'trail' ? Math.cos(t*2)*2 : 0);
      ball(ctx, px, y, r, '110,231,255'); wearFront(ctx, px, y, r, eq, t);
    };
  }

  return { RARITY, SLOTS, TABS, wearBack, wearFront, sys, trail, flex, step, draw, avatar, preview,
    nameClass: id => id ? 'nm-' + id.replace(/^nm_/, '') : '' };
})();
