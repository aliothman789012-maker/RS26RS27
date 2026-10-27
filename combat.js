/* ===== القتال والمهارات والذكاء الاصطناعي ===== */

function gainXp(x) {
  S.p.xp += x;
  let up = false;
  while (S.p.xp >= xpNeed(S.p.level)) {
    S.p.xp -= xpNeed(S.p.level);
    S.p.level++; S.p.sp++; up = true;
  }
  if (up) {
    toast('ارتفع المستوى إلى ' + S.p.level + ' — الرتبة ' + rankOf(S.p.level));
    if (run) { S.p.hp = Math.min(maxHp(), S.p.hp + maxHp() * 0.2); }
    renderSkills();
  }
}

function checkQuests() {
  let got = false;
  for (const q of QUESTS) {
    if (!S.quests[q.id] && q.need(S)) {
      S.quests[q.id] = true;
      if (q.rw.gold) S.p.gold += q.rw.gold;
      if (q.rw.xp) gainXp(q.rw.xp);
      if (q.rw.mat) S.mats[MATERIALS[0]] = (S.mats[MATERIALS[0]] || 0) + q.rw.mat;
      toast('مهمة مكتملة: ' + q.t);
      got = true;
    }
  }
  if (got) saveGame();
}

/* ---------- الضرر ---------- */
function hitEnemy(e, dmg, opts) {
  if (e.dead) return;
  opts = opts || {};
  let d = dmg * (0.9 + Math.random() * 0.2);
  const crit = !opts.noCrit && Math.random() < critChance();
  if (crit) d *= 2;
  d = Math.max(1, Math.round(d));
  e.hp -= d; e.flash = 0.12;
  floatText(e.x, e.y - e.r - 6, (crit ? '★' : '') + d, crit ? '#ffb84a' : (opts.col || '#fff'));
  if (opts.slow) { e.slowT = opts.slow.t; e.slowF = opts.slow.f; }
  if (opts.poison) e.poisonT = opts.poison;
  if (opts.bleed) e.bleedT = opts.bleed;
  if (opts.burn) e.burnT = 2;
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; e.dying = 0.001;
  if (e.boss) {
    bossDefeated(e);
    return;
  }
  S.p.gold += e.gold;
  S.kills++;
  S.zk[run.zone.id] = (S.zk[run.zone.id] || 0) + 1;
  gainXp(e.xp);
  floatText(e.x, e.y - e.r - 20, '+' + e.xp + ' XP', '#e6c35a');
  const ext = KINDS[e.kind] && KINDS[e.kind].ext;
  if (ext && Math.random() < 0.12 + baseStat('int') * 0.01) {
    const sh = addShadow(e.kind, Math.random() < 0.15 ? 'rare' : 'common');
    if (sh) toast('استخرجت ' + SHADOW_KINDS[e.kind].name);
  }
  if (Math.random() < 0.25) {
    const m = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
    S.mats[m] = (S.mats[m] || 0) + 1;
  }
  if (Math.random() < 0.1) {
    const r = Math.random() < 0.2 ? 'rare' : 'common';
    const slot = Object.keys(GEAR)[Math.floor(Math.random() * 3)];
    S.inv.push(makeItem(slot, r, S.p.level, run.zi, false));
    toast('غنيمة: ' + itemLabel(S.inv[S.inv.length - 1]));
  }
  checkQuests();
}

function bossDefeated(e) {
  const b = BOSSES[run.zone.boss];
  S.p.gold += e.gold;
  S.kills++;
  gainXp(e.xp);
  toast('هُزم ' + b.name + '!');
  const first = !S.bossKilled[run.zone.id];
  const rar = first ? 'legendary' : (Math.random() < 0.5 ? 'epic' : 'rare');
  const legend = first;
  const it = makeItem(b.drop, rar, S.p.level + 2, run.zi, legend);
  S.inv.push(it);
  toast('غنيمة الزعيم: ' + itemLabel(it));
  const mat = b.mat;
  S.mats[mat] = (S.mats[mat] || 0) + 2;
  if (Math.random() < 0.7) addShadow('boss', 'epic');
  run.bossDone = true;
  setTimeout(() => { if (run && run.bossDone) gateCleared(); }, 900);
}

function hurtPlayer(raw) {
  if (!run) return;
  const p = run.p;
  let d = raw * (1 - Math.min(0.6, totalDef() * 0.02));
  if (p.shield > 0) {
    const used = Math.min(p.shield, d);
    p.shield -= used; d -= used;
  }
  d = Math.max(0, Math.round(d));
  if (d > 0) {
    S.p.hp -= d;
    p.flash = 0.15;
    floatText(p.x, p.y - 26, '-' + d, '#ff7a6a');
  }
  if (S.p.hp <= 0) playerDied();
}

function playerDied() {
  S.p.gold = Math.floor(S.p.gold * 0.9);
  endRun('سقطت في ' + run.zone.name + ' — خسرت 10% من الذهب');
}

/* ---------- الهجوم الأساسي (مخروط أمام اللاعب) ---------- */
/* مضاعف الضرر من تأثيرات مؤقتة مثل هتاف الحرب */
function buffMul() {
  let m = 1;
  for (const k in run.p.buffs) m += run.p.buffs[k].dmul || 0;
  return m;
}

function playerAttack() {
  if (!run || run.p.atkT > 0) return;
  const p = run.p;
  p.atkT = atkCooldown();
  p.swing = 0.15;
  const cls = S.cls;
  const atk = atkPower() * buffMul();
  if (cls === 'ranger') {
    run.projs.push(makeProj(p.x, p.y, p.face, 480, atk * 0.7, { friendly: true, r: 5, col: '#bfe' }));
  } else if (cls === 'mage') {
    run.projs.push(makeProj(p.x, p.y, p.face, 380, atk * 0.6, { friendly: true, r: 6, col: '#8ab4ff' }));
  } else {
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (inCone(e.x, e.y, e.r, p.x, p.y, p.face, 1.5, 80)) hitEnemy(e, atk);
    }
  }
}

function inCone(ex, ey, er, px, py, face, arc, range) {
  const d = dist(ex, ey, px, py);
  if (d > range + er) return false;
  let a = Math.atan2(ey - py, ex - px) - face;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return Math.abs(a) <= arc / 2 || d < er + 12;
}

function makeProj(x, y, ang, speed, dmg, o) {
  return Object.assign({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, life: 1.2, hits: 0, pierce: 1, r: 5, col: '#fff', hitSet: [] }, o || {});
}

/* ---------- المهارات ---------- */
function useSkill(id) {
  if (!run || !id) return;
  const sk = SKILLS[id];
  const rank = skillRank(id);
  if (!sk || rank < 1 || !skillAvailable(id)) return;
  if ((run.cd[id] || 0) > 0) return;
  if (S.p.mp < sk.mp) { toast('المانا غير كافية'); return; }
  const p = run.p;
  const atk = atkPower() * buffMul();
  const mul = skillMul(sk, rank);
  S.p.mp -= sk.mp;
  run.cd[id] = sk.cd;

  switch (sk.kind) {
    case 'cone': {
      const hits = sk.hits || 1;
      run.fx.push({ kind: 'arc', x: p.x, y: p.y, ang: p.face, arc: sk.arc, r: sk.range, t: 0.25, col: sk.col });
      for (const e of run.enemies) {
        if (!e.dead && inCone(e.x, e.y, e.r, p.x, p.y, p.face, sk.arc, sk.range)) {
          for (let i = 0; i < hits; i++) hitEnemy(e, atk * mul / hits * (hits > 1 ? 2 : 1), { col: sk.col });
        }
      }
      break;
    }
    case 'circle': {
      run.fx.push({ kind: 'ring', x: p.x, y: p.y, r: sk.range, t: 0.3, col: sk.col });
      for (const e of run.enemies) {
        if (!e.dead && dist(e.x, e.y, p.x, p.y) < sk.range + e.r) hitEnemy(e, atk * mul, { col: sk.col });
      }
      break;
    }
    case 'proj': {
      const o = { friendly: true, r: 6, col: sk.col, pierce: sk.pierce || 1 };
      if (sk.slow) o.slow = { t: sk.slowT, f: sk.slow };
      if (sk.poison) o.poison = sk.poison;
      if (sk.bleed) o.bleed = sk.bleed;
      run.projs.push(makeProj(p.x, p.y, p.face, sk.speed, atk * mul, o));
      break;
    }
    case 'multi': {
      for (let i = 0; i < sk.n; i++) {
        const off = (i - (sk.n - 1) / 2) * sk.spread;
        run.projs.push(makeProj(p.x, p.y, p.face + off, sk.speed, atk * mul, { friendly: true, r: 5, col: sk.col }));
      }
      break;
    }
    case 'zone': {
      run.fx.push({ kind: 'zone', x: p.x, y: p.y, r: sk.radius, dur: sk.dur, t: 0, col: sk.col, dmg: atk * mul * 0.5 });
      break;
    }
    case 'buff': {
      p.buffs[id] = { t: sk.dur || 0, dmul: (sk.dmul || 0) + (rank - 1) * 0.05 };
      if (sk.shield) p.shield = sk.shield * rank;
      floatText(p.x, p.y - 26, sk.name, sk.col);
      break;
    }
    case 'heal': {
      const amt = maxHp() * (sk.amt + (sk.ar || 0) * (rank - 1));
      S.p.hp = Math.min(maxHp(), S.p.hp + amt);
      floatText(p.x, p.y - 26, '+' + Math.round(amt), '#7dffb0');
      break;
    }
    case 'drain': {
      let best = null, bd = 1e9;
      for (const e of run.enemies) {
        if (e.dead) continue;
        const d = dist(e.x, e.y, p.x, p.y);
        if (d < sk.range && d < bd) { bd = d; best = e; }
      }
      if (best) {
        const before = best.hp;
        hitEnemy(best, atk * mul, { col: sk.col });
        const dealt = Math.max(0, before - Math.max(0, best.hp));
        S.p.hp = Math.min(maxHp(), S.p.hp + dealt * sk.heal);
      }
      break;
    }
    case 'dash': {
      const d = sk.dist + rank * 10;
      p.x += Math.cos(p.face) * d;
      p.y += Math.sin(p.face) * d;
      resolve(p, 14);
      break;
    }
  }
}

/* ---------- المقذوفات ---------- */
function updateProjectiles(dt) {
  for (const pr of run.projs) {
    pr.life -= dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.life <= 0 || blockedAt(pr.x, pr.y, pr.r, false)) { pr.dead = true; continue; }
    if (pr.friendly) {
      for (const e of run.enemies) {
        if (e.dead || pr.hitSet.includes(e)) continue;
        if (dist(e.x, e.y, pr.x, pr.y) < e.r + pr.r) {
          pr.hitSet.push(e);
          hitEnemy(e, pr.dmg, { col: pr.col, slow: pr.slow, poison: pr.poison, bleed: pr.bleed });
          pr.hits++;
          if (pr.hits >= pr.pierce) { pr.dead = true; break; }
        }
      }
    }
  }
  run.projs = run.projs.filter(p => !p.dead);
}

/* ---------- الظلال المستدعاة ---------- */
function updateAllies(dt) {
  const p = run.p;
  for (const a of run.allies) {
    if (a.dead) continue;
    a.cd -= dt; a.flash = Math.max(0, a.flash - dt);
    let t = null, bd = 1e9;
    for (const e of run.enemies) {
      if (e.dead) continue;
      const d = dist(a.x, a.y, e.x, e.y);
      if (d < bd) { bd = d; t = e; }
    }
    const ab = SHADOW_KINDS[a.kind] ? SHADOW_KINDS[a.kind].ab : 'hp';
    if (t && bd < 280) {
      const an = Math.atan2(t.y - a.y, t.x - a.x);
      if (ab === 'ranged' && bd > 120) {
        if (a.cd <= 0) { a.cd = 1.6; run.projs.push(makeProj(a.x, a.y, an, 420, a.dmg * 0.8, { friendly: true, r: 5, col: '#c9b8ff' })); }
      } else if (bd > a.r + t.r + 6) {
        a.x += Math.cos(an) * a.spd * dt; a.y += Math.sin(an) * a.spd * dt;
      } else if (a.cd <= 0) {
        a.cd = 1;
        const extra = {};
        if (ab === 'poison') extra.poison = 3;
        if (ab === 'burn') extra.burn = true;
        hitEnemy(t, a.dmg, Object.assign({ col: '#b9a8ff' }, extra));
        if (t.dead && a.sh) shadowXp(a.sh, 1);
      }
    } else {
      const d = dist(a.x, a.y, p.x, p.y);
      if (d > 50) {
        const an = Math.atan2(p.y - a.y, p.x - a.x);
        a.x += Math.cos(an) * a.spd * dt; a.y += Math.sin(an) * a.spd * dt;
      }
    }
    resolve(a, a.r, ab === 'phase');
  }
  run.allies = run.allies.filter(a => !a.dead);
}

/* ---------- الأعداء والزعيم ---------- */
/* حركة مع انزلاق على الجدران: إن انسدّ الاتجاه يجرب المحور الحر، ثم يتجاوز العائق جانبيًا */
function enemyMove(e, dx, dy, dt) {
  const slow = e.slowT > 0 ? e.slowF : 1;
  const mx = dx * slow * dt, my = dy * slow * dt;
  if (e.ai === 'floater' || e.ghostT > 0 || !run.pillars.length) { e.x += mx; e.y += my; return; }
  if (!blockedAt(e.x + mx, e.y + my, e.r, false)) { e.x += mx; e.y += my; return; }
  if (!blockedAt(e.x + mx, e.y, e.r, false)) { e.x += mx; return; }
  if (!blockedAt(e.x, e.y + my, e.r, false)) { e.y += my; return; }
  const sp = Math.hypot(mx, my);
  if (!sp) return;
  const side = e.side || (e.side = Math.random() < 0.5 ? 1 : -1);
  const px = -my / sp * sp * side, py = mx / sp * sp * side;
  const sx = e.x + px, sy = e.y + py;
  if (!blockedAt(sx, sy, e.r, false)) { e.x = sx; e.y = sy; }
  else e.side = -side;
}

function updateEnemy(e, dt) {
  const p = run.p;
  e.flash = Math.max(0, e.flash - dt);
  e.cd -= dt;
  e.ghostT = Math.max(0, (e.ghostT || 0) - dt);
  // كاشف التعثّر: إن لم يتحرك العدو لمدة يعبر الجدران لفترة قصيرة
  if (e.lastX !== undefined && dist(e.x, e.y, e.lastX, e.lastY) < 0.5 * dt * 60 * 0.05 && !e.boss && e.state === 'idle') {
    e.stuckT = (e.stuckT || 0) + dt;
    if (e.stuckT > 1.2) { e.ghostT = 1.0; e.stuckT = 0; }
  } else e.stuckT = 0;
  e.lastX = e.x; e.lastY = e.y;
  e.slowT = Math.max(0, (e.slowT || 0) - dt);
  if (e.poisonT > 0) { e.poisonT -= dt; e.hp -= dt * 4; if (e.hp <= 0) return killEnemy(e); }
  if (e.bleedT > 0) { e.bleedT -= dt; e.hp -= dt * 3; if (e.hp <= 0) return killEnemy(e); }
  if (e.burnT > 0) { e.burnT -= dt; e.hp -= dt * 5; if (e.hp <= 0) return killEnemy(e); }

  const d = dist(e.x, e.y, p.x, p.y);
  const ang = Math.atan2(p.y - e.y, p.x - e.x);
  const ghost = e.ai === 'floater';
  const spd = e.spd * (e.ai === 'tank' ? 0.8 : 1);

  if (e.boss) { updateBoss(e, dt, d, ang); }
  else if (e.ai === 'ranged') {
    if (d > 140) enemyMove(e, Math.cos(ang) * spd, Math.sin(ang) * spd, dt);
    else if (d < 90) enemyMove(e, -Math.cos(ang) * spd, -Math.sin(ang) * spd, dt);
    e.t += dt;
    if (e.t > 2.2 && d < 420) {
      e.t = 0;
      run.eprojs.push(makeProj(e.x, e.y, ang, 220, e.dmg * 0.7, { r: 6, col: '#c9b8ff' }));
    }
  } else if (e.ai === 'charger') {
    if (e.state === 'idle' && d < 280 && e.cd <= 0) { e.state = 'wind'; e.stateT = 0.7; }
    if (e.state === 'wind') { e.stateT -= dt; if (e.stateT <= 0) { e.state = 'dash'; e.stateT = 0.5; e.vx = Math.cos(ang) * e.spd * 4; e.vy = Math.sin(ang) * e.spd * 4; } }
    else if (e.state === 'dash') { e.stateT -= dt; enemyMove(e, e.vx, e.vy, dt); if (e.stateT <= 0) { e.state = 'idle'; e.cd = 2; } }
    else enemyMove(e, Math.cos(ang) * spd, Math.sin(ang) * spd, dt);
  } else {
    if (d > e.r + 14) enemyMove(e, Math.cos(ang) * spd, Math.sin(ang) * spd, dt);
  }

  resolve(e, e.r, ghost);

  if (!e.boss && d < e.r + 16 && e.cd <= 0 && (e.ai === 'chase' || e.ai === 'tank' || e.ai === 'floater' || e.ai === 'charger')) {
    e.cd = 1;
    hurtPlayer(e.dmg);
    if (KINDS[e.kind] && KINDS[e.kind].poison) p.poison = 2;
    if (KINDS[e.kind] && KINDS[e.kind].slow) p.slow = 1.2;
  }
}

function startBossPattern(e, name) {
  const dx = run.p.x - e.x, dy = run.p.y - e.y;
  const ang = Math.atan2(dy, dx);
  if (name === 'charge') { e.state = 'tele'; e.stateT = 1; e.dashAng = ang; }
  else if (name === 'summon') {
    for (let i = 0; i < 2; i++) spawnEnemy(run.zone.kinds[i % run.zone.kinds.length], run.tier, { x: e.x + rnd(-40, 40), y: e.y + rnd(-40, 40) });
    e.state = 'idle'; e.bossT = 2.2;
  } else if (name === 'volley') {
    for (let i = -2; i <= 2; i++) run.eprojs.push(makeProj(e.x, e.y, ang + i * 0.22, 240, e.dmg * 0.6, { r: 7, col: '#ff9a6a' }));
    e.state = 'idle'; e.bossT = 2;
  } else if (name === 'nova') {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      run.eprojs.push(makeProj(e.x, e.y, a, 200, e.dmg * 0.5, { r: 7, col: '#ffd27a' }));
    }
    e.state = 'idle'; e.bossT = 2.4;
  }
}

function updateBoss(e, dt, d, ang) {
  const b = BOSSES[run.zone.boss];
  if (!e.p2 && e.hp <= e.maxHp * 0.5) { e.p2 = true; e.pats = b.p2; toast(b.name + ' يدخل المرحلة الثانية!'); }
  const pats = e.pats || b.patterns;
  if (e.state === 'tele') {
    e.stateT -= dt;
    e.x += Math.sin(performance.now() / 40) * 0.6;
    if (e.stateT <= 0) { e.state = 'dash'; e.stateT = 0.6; e.vx = Math.cos(e.dashAng) * e.spd * 4.5; e.vy = Math.sin(e.dashAng) * e.spd * 4.5; }
  } else if (e.state === 'dash') {
    e.stateT -= dt;
    enemyMove(e, e.vx, e.vy, dt);
    if (e.stateT <= 0) { e.state = 'idle'; e.bossT = e.p2 ? 1.6 : 2.2; }
  } else {
    e.bossT -= dt;
    if (e.bossT <= 0) {
      const idx = (e.pattern || 0) % pats.length;
      const name = pats[idx];
      e.pattern = idx + 1;
      startBossPattern(e, name);
    } else if (d > e.r + 60) {
      enemyMove(e, Math.cos(ang) * e.spd * 0.6, Math.sin(ang) * e.spd * 0.6, dt);
    }
  }
}

function updateEnemies(dt) {
  for (const e of run.enemies) {
    if (e.dead) { e.dying += dt; continue; }
    updateEnemy(e, dt);
    if (!run) return;
  }
  run.enemies = run.enemies.filter(e => !e.dead || e.dying < 0.4);
}

function updateEnemyProjs(dt) {
  for (const pr of run.eprojs) {
    pr.life -= dt;
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.life <= 0 || blockedAt(pr.x, pr.y, 6, false)) { pr.dead = true; continue; }
    if (dist(run.p.x, run.p.y, pr.x, pr.y) < 16) { hurtPlayer(pr.dmg); pr.dead = true; }
  }
  run.eprojs = run.eprojs.filter(p => !p.dead);
}

/* مناطق المطر: ضرر دوري داخل الدائرة */
function updateFx(dt) {
  for (const f of run.fx) {
    f.t += dt;
    if (f.kind === 'zone') {
      f.tick = (f.tick || 0) - dt;
      if (f.tick <= 0) {
        f.tick = 0.5;
        for (const e of run.enemies) if (!e.dead && dist(e.x, e.y, f.x, f.y) < f.r + e.r) hitEnemy(e, f.dmg, { col: f.col, noCrit: true });
      }
    }
  }
  run.fx = run.fx.filter(f => f.kind === 'zone' ? f.t < f.dur : f.t < 0.3);
}

/* ---------- الحلقة الرئيسية للمنطق ---------- */
function updateGame(dt) {
  const p = run.p;
  S.p.mp = Math.min(maxMp(), S.p.mp + dt * (2 + baseStat('int') * 0.2));

  // الحركة (منزلقة في الجليد)
  const len = Math.hypot(input.x, input.y);
  const isIce = run.zone.hazard === 'ice';
  let sp = moveSpeed() * (p.slow > 0 ? 0.5 : 1);
  if (p.buffs.w_roar) sp *= 1.05;
  if (isIce) {
    const tx = len > 0.05 ? (input.x / len) * sp * Math.min(1, len) : 0;
    const ty = len > 0.05 ? (input.y / len) * sp * Math.min(1, len) : 0;
    p.vx += (tx - p.vx) * dt * 2; p.vy += (ty - p.vy) * dt * 2;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.moving = Math.hypot(p.vx, p.vy) > 20;
  } else if (len > 0.05) {
    const k = Math.min(1, len);
    p.x += (input.x / len) * sp * k * dt;
    p.y += (input.y / len) * sp * k * dt;
    p.moving = true;
  } else p.moving = false;
  if (len > 0.05) p.face = Math.atan2(input.y, input.x);
  resolve(p, 14, false);

  // المؤقتات
  p.atkT -= dt; p.swing = Math.max(0, p.swing - dt); p.flash = Math.max(0, p.flash - dt);
  p.lunge = Math.max(0, p.lunge - dt * 60);
  for (const k in run.cd) run.cd[k] = Math.max(0, run.cd[k] - dt);
  for (const k in p.buffs) { p.buffs[k].t -= dt; if (p.buffs[k].t <= 0) delete p.buffs[k]; }
  if (p.poison > 0) hurtPlayer(dt * 2);

  // الخطر، والأعداء، والمقذوفات، والظلال
  updateHazards(dt);
  updateEnemies(dt);
  if (!run) return;
  updateAllies(dt);
  updateProjectiles(dt);
  updateEnemyProjs(dt);
  updateFx(dt);
  if (!run) return;

  // موجات البوابة
  if (run.boss) {
    if (run.boss.dead) return;
  } else if (run.enemies.filter(e => !e.dead).length === 0 && run.timer <= 0) {
    if (run.wave >= run.waves) {
      spawnBoss();
      run.timer = 0;
    } else run.timer = 1.8;
  }
  if (!run.boss && run.timer > 0) {
    run.timer -= dt;
    if (run.timer <= 0 && run.wave < run.waves) spawnWave();
  }
  if (!run.boss && run.enemies.length === 0 && run.timer <= 0 && run.wave >= run.waves) {
    // تُعالج أعلاه
  }
}
