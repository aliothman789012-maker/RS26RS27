/* ===== المناطق والبوابات والموجات والعوائق ===== */
let run = null;
let floats = [];

function zoneIndexOf(id) { return ZONES.findIndex(z => z.id === id); }
function gateLocked(zi, gi) {
  const z = ZONES[zi];
  if (!S.unlocked.includes(zi)) return 'مغلقة — أكمل منطقة ' + (zi > 0 ? ZONES[zi - 1].name : '');
  const need = z.mins + gi;
  if (S.p.level < need) return 'يتطلب مستوى ' + need;
  if (gi > 0 && !S.gatesDone[z.id + (gi - 1)]) return 'أكمل البوابة السابقة';
  return null;
}

function buildPillars(zone, W, H) {
  const list = [];
  const n = zone.hazard === 'pillars' ? 6 : zone.hazard === 'graves' ? 9 : 3;
  for (let i = 0; i < n; i++) {
    const w = rnd(40, 70), h = rnd(40, 70);
    list.push({ x: rnd(W * 0.12, W * 0.88 - w), y: rnd(H * 0.22, H * 0.6 - h), w, h, kind: zone.hazard === 'graves' ? 'grave' : 'pillar' });
  }
  return list;
}

function enterGate(zi, gi) {
  if (run || !S) return;
  const why = gateLocked(zi, gi);
  if (why) { toast(why); return; }
  const z = ZONES[zi];
  const W = window.innerWidth, H = window.innerHeight;
  run = {
    zi, gi, zone: z, tier: zi * 4 + gi + 1,
    wave: 0, waves: 2 + gi, enemies: [], allies: [], projs: [], eprojs: [], areas: [],
    pillars: buildPillars(z, W, H), boss: null, bossPhase: 1, bossPat: 0, bossT: 0,
    timer: 1.2, cd: {}, fx: [], spawnT: 0, grave: 0,
    W, H,
    p: { x: W / 2, y: H * 0.72, vx: 0, vy: 0, face: 0, atkT: 0, swing: 0, flash: 0, lunge: 0,
         buffs: {}, slow: 0, burn: 0, poison: 0, shield: 0, moving: false }
  };
  S.p.hp = maxHp(); S.p.mp = maxMp();
  S.army = S.army.filter(id => S.shadows.some(s => s.id === id)).slice(0, armyLimit());
  for (const id of S.army) {
    const sh = S.shadows.find(s => s.id === id);
    if (sh) run.allies.push(makeAlly(sh));
  }
  floats = [];
  closePanel();
  setPlaying(true);
  renderSkills();
  toast('دخلت ' + z.name + ' — البوابة ' + (gi + 1));
}

function makeAlly(sh) {
  const pw = shadowPower(sh);
  const sp = SHADOW_KINDS[sh.kind] ? sh.kind : 'wolf';
  const hp = Math.round(pw.hp);
  return {
    sh, kind: sp, x: run.p.x + rnd(-20, 20), y: run.p.y + 30, hp, maxHp: hp, dmg: pw.dmg,
    spd: 150 + (sh.kind === 'wolf' ? 40 : 0), r: 11, cd: 0, flash: 0, dead: false, dying: 0,
    fade: 0, rankVal: SHADOW_RANKS.indexOf(sh.rank)
  };
}

/* عوائق المنطقة: هل النقطة داخل جدار؟ */
function blockedAt(x, y, r, ghost) {
  if (ghost) return false;
  for (const q of run.pillars) {
    if (x + r > q.x && x - r < q.x + q.w && y + r > q.y && y - r < q.y + q.h) return true;
  }
  return false;
}
function resolve(o, r, ghost) {
  o.x = clamp(o.x, 16 + r, run.W - 16 - r);
  o.y = clamp(o.y, 16 + r, run.H - 16 - r);
  if (ghost) return;
  for (const q of run.pillars) {
    const cx = clamp(o.x, q.x, q.x + q.w), cy = clamp(o.y, q.y, q.y + q.h);
    const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
    if (d < r && d > 0) { const k = (r - d) / d; o.x += dx * k; o.y += dy * k; }
    else if (d === 0) o.y = q.y - r;
  }
}

/* ---------- الموجات والزعيم ---------- */
function spawnEnemy(kind, tier, opts) {
  const k = KINDS[kind] || BOSSES[kind];
  const isBoss = !!BOSSES[kind];
  const sc = 1 + (tier - 1) * 0.12;
  let x, y, tries = 0;
  do {
    x = rnd(40, run.W - 40); y = rnd(60, run.H - 60); tries++;
  } while ((dist(x, y, run.p.x, run.p.y) < 240 || blockedAt(x, y, 20, false)) && tries < 60);
  const hp = Math.round(k.hp * sc);
  const e = {
    kind, boss: isBoss, x, y, hp, maxHp: hp,
    dmg: k.dmg * (1 + (tier - 1) * 0.08), spd: k.spd, r: k.r,
    xp: Math.round(k.xp * sc), gold: Math.round(k.gold * sc),
    tint: k.tint, sheet: k.sheet, ai: k.ai || 'chase',
    cd: rnd(0.2, 1), t: 0, flash: 0, dead: false, dying: 0,
    state: 'idle', stateT: 0, vx: 0, vy: 0, slow: 0, poison: 0, bleed: 0, burnT: 0,
    ...(opts || {})
  };
  run.enemies.push(e);
  return e;
}

function spawnWave() {
  run.wave++;
  const pool = run.zone.kinds;
  const n = 3 + run.gi + run.wave;
  for (let i = 0; i < n; i++) spawnEnemy(pool[Math.floor(Math.random() * pool.length)], run.tier);
  if (run.gi >= 1 && run.wave === run.waves) spawnEnemy(pool[0], run.tier + 1);
}

function spawnBoss() {
  const b = BOSSES[run.zone.boss];
  const e = spawnEnemy(run.zone.boss, run.tier + 2, { boss: true, ai: 'boss', pats: b.patterns, pname: b.name });
  run.boss = e;
  run.bossPat = 0; run.bossT = 1.5;
  toast('ظهر ' + b.name + '!');
}

/* عناصر الخطر الخاصة بكل منطقة */
function updateHazards(dt) {
  const p = run.p, z = run.zone;
  p.slow = Math.max(0, p.slow - dt);
  p.burn = Math.max(0, p.burn - dt);
  p.poison = Math.max(0, p.poison - dt);
  if (z.hazard === 'thorn' && run.areas.length < 4 && Math.random() < dt * 0.4) {
    run.areas.push({ kind: 'thorn', x: rnd(60, run.W - 60), y: rnd(90, run.H - 200), r: 46, t: 0, life: 8 });
  }
  if (z.hazard === 'lava' && run.areas.length < 4 && Math.random() < dt * 0.5) {
    run.areas.push({ kind: 'lava', x: rnd(60, run.W - 60), y: rnd(90, run.H - 200), r: 52, t: 0, warn: 1.5, life: 3.5 });
  }
  if (z.hazard === 'graves') {
    run.grave -= dt;
    if (run.grave <= 0 && !run.boss && run.enemies.length < 6 && (run.graveCount || 0) < 6) {
      run.grave = 7; run.graveCount = (run.graveCount || 0) + 1;
      const g = run.pillars.find(q => q.kind === 'grave');
      if (g) spawnEnemy(z.kinds[0], run.tier, { x: g.x + g.w / 2, y: g.y + g.h + 14 });
    }
  }
  for (const a of run.areas) {
    a.t += dt;
    if (a.kind === 'thorn' && dist(p.x, p.y, a.x, a.y) < a.r) {
      p.slow = 0.3;
      if (Math.random() < dt * 2) hurtPlayer(3);
    }
    if (a.kind === 'lava' && a.t > a.warn && dist(p.x, p.y, a.x, a.y) < a.r) {
      p.burn = 0.2;
      hurtPlayer(9 * dt * 2);
    }
  }
  run.areas = run.areas.filter(a => a.t < (a.life || 99));
}

/* ---------- تدفق البوابة ---------- */
function gateCleared() {
  const zi = run.zi, gi = run.gi, z = run.zone;
  const key = z.id + gi;
  S.gatesDone[key] = true;
  S.clears++;
  S.p.gold += 40 * (run.tier);
  gainXp(40 * run.tier);
  if (Math.random() < 0.3) {
    S.secrets[z.id] = (S.secrets[z.id] || 0) + 1;
    const lore = SECRET_LORE[(zi + gi) % SECRET_LORE.length];
    toast('سرّ: ' + lore);
  }
  if (gi === 3) {
    S.bossKilled[z.id] = true;
    const next = zi + 1;
    if (next < ZONES.length && !S.unlocked.includes(next)) { S.unlocked.push(next); toast('فُتحت منطقة: ' + ZONES[next].name); }
  }
  checkQuests();
  run = null;
  S.p.hp = maxHp(); S.p.mp = maxMp();
  saveGame();
  showMenu(true);
}

function endRun(msgTxt) {
  if (msgTxt) toast(msgTxt);
  run = null;
  S.p.hp = maxHp(); S.p.mp = maxMp();
  saveGame();
  showMenu(true);
}
