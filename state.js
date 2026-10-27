/* ===== الحالة والحفظ والإحصائيات ===== */
const SAVE_KEY = 'sayyad_v2';
const OLD_KEY = 'sayyad_v1';
let S = null;

function newId() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function rnd(a, b) { return a + Math.random() * (b - a); }

function defaultState(cls) {
  const c = CLASSES[cls];
  return {
    v: 2, cls, spec: null,
    p: { level: 1, xp: 0, gold: 0, sp: 0, stats: { str: 5 + c.str, agi: 5 + c.agi, def: 5 + c.def, int: 5 + c.int },
         hp: 0, mp: 0, awk: false, equip: { weapon: null, armor: null, accessory: null } },
    inv: [], mats: {}, shadows: [], army: [], skills: {},
    zk: {}, bossKilled: {}, secrets: {}, quests: {}, unlocked: [0], gatesDone: {},
    kills: 0, clears: 0
  };
}

function saveGame() {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }
  catch (e) { if (typeof toast === 'function') toast('تعذر حفظ التقدم في هذا المتصفح'); }
}

/* يقرأ v2، وإن لم يوجد يرحّل v1 دون حذفه */
function loadGame() {
  try {
    const r2 = localStorage.getItem(SAVE_KEY);
    if (r2) return normalize(JSON.parse(r2));
    const r1 = localStorage.getItem(OLD_KEY);
    if (r1) return migrateV1(JSON.parse(r1));
  } catch (e) { /* ملف تالف: نبدأ من جديد دون حذف المفاتيح */ }
  return null;
}

/* ملء الحقول الناقصة حتى لا تنهار اللعبة مع حفظ قديم */
function normalize(s) {
  const d = defaultState(s.cls && CLASSES[s.cls] ? s.cls : 'warrior');
  const out = Object.assign(d, s);
  out.p = Object.assign(d.p, s.p || {});
  out.p.stats = Object.assign(d.p.stats, (s.p && s.p.stats) || {});
  out.p.equip = Object.assign(d.p.equip, (s.p && s.p.equip) || {});
  ['inv', 'shadows', 'army', 'unlocked'].forEach(k => { if (!Array.isArray(out[k])) out[k] = d[k]; });
  ['mats', 'skills', 'zk', 'bossKilled', 'secrets', 'quests', 'gatesDone'].forEach(k => {
    if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  });
  if (!out.unlocked.length) out.unlocked = [0];
  return out;
}

function migrateV1(o) {
  const map = { warrior: 'warrior', hunter: 'ranger', mage: 'mage' };
  const cls = map[o.cls] || 'warrior';
  const s = defaultState(cls);
  const p = o.p || {};
  s.p.level = p.level || 1; s.p.xp = p.xp || 0; s.p.gold = p.gold || 0; s.p.sp = (p.level || 1) - 1;
  s.p.awk = !!p.awk;
  s.p.stats = { str: p.str || s.p.stats.str, agi: p.agi || s.p.stats.agi, def: p.def || s.p.stats.def, int: p.int || s.p.stats.int };
  s.kills = o.kills || 0; s.clears = o.clears || 0;
  s.zk = {}; s.quests = o.quests || {};
  s.shadows = (o.shadows || []).map(x => ({ id: x.id, kind: x.kind in SHADOW_KINDS ? x.kind : 'wolf', rank: 'E', lvl: 1, xp: 0, rarity: x.rarity || 'common' }));
  s.army = (o.active || []).filter(id => s.shadows.some(x => x.id === id));
  s.inv = (o.inv || []).map(x => ({ id: x.id, slot: x.slot, name: x.name, rarity: x.rarity || 'common', ench: 0, lvl: 1, legend: false, stats: slotStat(x.slot, x.v || 4) }));
  if (p.weapon) s.p.equip.weapon = { id: p.weapon.id, slot: 'weapon', name: p.weapon.name, rarity: p.weapon.rarity || 'common', ench: 0, lvl: 1, legend: false, stats: slotStat('weapon', p.weapon.v || 4) };
  if (p.armor) s.p.equip.armor = { id: p.armor.id, slot: 'armor', name: p.armor.name, rarity: p.armor.rarity || 'common', ench: 0, lvl: 1, legend: false, stats: slotStat('armor', p.armor.v || 4) };
  s.unlocked = [0];
  return s;
}

function slotStat(slot, v) {
  if (slot === 'weapon') return { atk: v, crit: 0 };
  if (slot === 'armor') return { def: v, hp: v * 4 };
  return { mp: v * 3, crit: 0.01 };
}

/* ---------- الإحصائيات المشتقة ---------- */
function passiveLvl(id) { return S.skills[id] || 0; }
function passiveSum(stat) {
  let sum = 0;
  for (const id in S.skills) {
    const sk = SKILLS[id];
    if (sk && sk.kind === 'passive' && sk.stat === stat) sum += sk.per * S.skills[id];
  }
  return sum;
}
function equipSum(key) {
  let sum = 0;
  for (const slot in S.p.equip) {
    const it = S.p.equip[slot];
    if (it && it.stats && it.stats[key]) sum += it.stats[key] * (1 + (it.ench || 0) * 0.08);
  }
  return sum;
}
function baseStat(k) { return S.p.stats[k] + (k === 'def' || k === 'str' || k === 'int' ? passiveSum(k) : 0); }
function totalDef() { return baseStat('def') + equipSum('def'); }
function mult() { return S.p.awk ? 1.25 : 1; }
function maxHp() { return Math.round((60 + totalDef() * 6 + S.p.level * 8 + equipSum('hp')) * mult()); }
function maxMp() { return Math.round((30 + baseStat('int') * 6 + equipSum('mp')) * (S.p.awk ? 1.2 : 1)); }
function atkPower() { return (6 + baseStat('str') * 2 + baseStat('agi') * 0.5 + equipSum('atk')) * mult() * (1 + passiveSum('dmgPct')); }
function critChance() { return clamp(0.05 + passiveSum('crit') + equipSum('crit'), 0, 0.6); }
function moveSpeed() { return 120 + baseStat('agi') * 2; }
function atkCooldown() { return Math.max(0.25, 0.6 - baseStat('agi') * 0.01); }
function xpNeed(l) { return 50 + l * 35; }
function armyLimit() { return 1 + Math.floor(S.p.level / 4); }
function skillRank(id) { return S.skills[id] || 0; }
function rankOf(l) {
  const R = [[1, 'E'], [5, 'D'], [10, 'C'], [15, 'B'], [20, 'A'], [30, 'S']];
  let r = 'E'; for (const [t, n] of R) if (l >= t) r = n; return r;
}
function skillMul(sk, rank) { return (sk.dm || 0) + (sk.dr || 0) * (rank - 1); }
function skillAvailable(id) {
  const sk = SKILLS[id];
  if (!sk) return false;
  if (S.p.level < sk.lvl) return false;
  if (sk.cls !== S.cls) return false;
  if (sk.spec && S.spec !== sk.spec) return false;
  if (sk.pre && skillRank(sk.pre) < 1) return false;
  return true;
}
function ownedActives() {
  return Object.keys(SKILLS).filter(id => skillRank(id) > 0 && SKILLS[id].kind !== 'passive' && skillAvailable(id));
}

/* ---------- المعدات والتطوير والصناعة ---------- */
function makeItem(slot, rarity, lvl, zone, legend) {
  const base = legend ? LEGEND_NAMES[slot] : GEAR[slot][Math.floor(Math.random() * GEAR[slot].length)];
  const m = RARITY[rarity].m;
  const st = {};
  if (slot === 'weapon') { st.atk = Math.round((4 + lvl * 1.6) * m); st.crit = +(0.02 * m).toFixed(3); }
  if (slot === 'armor') { st.def = Math.round((3 + lvl * 0.9) * m); st.hp = Math.round((8 + lvl * 3) * m); }
  if (slot === 'accessory') { st.mp = Math.round((6 + lvl * 2) * m); st.crit = +(0.015 * m).toFixed(3); }
  return { id: newId(), slot, name: base, rarity: legend ? 'legendary' : rarity, ench: 0, lvl, zone, legend: !!legend, stats: st };
}

function itemLabel(it) {
  if (!it) return 'لا شيء';
  return it.name + (it.ench ? ' +' + it.ench : '');
}
function enchantCost(it) { return 60 + (it.ench + 1) * 45 * (it.legend ? 2 : 1); }
function enchantChance(it) { return Math.max(0.25, 0.9 - it.ench * 0.07); }
function enchantItem(it) {
  if (it.ench >= 10) return { ok: false, msg: 'وصل التطوير للحد الأقصى' };
  const cost = enchantCost(it);
  if (S.p.gold < cost) return { ok: false, msg: 'الذهب غير كافٍ (' + cost + ')' };
  S.p.gold -= cost;
  if (Math.random() < enchantChance(it)) { it.ench++; return { ok: true, msg: 'نجح التطوير إلى +' + it.ench }; }
  return { ok: false, msg: 'فشل التطوير، لم يتضرر العنصر' };
}
const CRAFT_COST = 3;
function craftItem(slot) {
  const total = Object.values(S.mats).reduce((a, b) => a + (b > 0 ? b : 0), 0);
  if (total < CRAFT_COST) return { ok: false, msg: 'تحتاج ' + CRAFT_COST + ' مواد من أي نوع' };
  if (S.inv.length >= 24) return { ok: false, msg: 'الحقيبة ممتلئة' };
  let need = CRAFT_COST;
  for (const k in S.mats) {
    while (S.mats[k] > 0 && need > 0) { S.mats[k]--; need--; }
    if (need === 0) break;
  }
  const zone = Math.min(ZONES.length - 1, S.unlocked[S.unlocked.length - 1] || 0);
  const rar = Math.random() < 0.15 ? 'rare' : 'common';
  const it = makeItem(slot, rar, S.p.level, zone, false);
  S.inv.push(it);
  return { ok: true, msg: 'صُنع: ' + it.name };
}

/* ---------- الظلال ---------- */
function shadowPower(sh) {
  const rk = SHADOW_RANKS.indexOf(sh.rank);
  const m = RARITY[sh.rarity].m;
  return { hp: Math.round((40 + rk * 22 + sh.lvl * 8) * m), dmg: (6 + rk * 3 + sh.lvl * 1.2) * m };
}
function addShadow(kind, rarity) {
  if (S.shadows.length >= 60) return false;
  const sh = { id: newId(), kind, rank: 'E', lvl: 1, xp: 0, rarity };
  S.shadows.push(sh);
  return sh;
}
function shadowXp(sh, amt) {
  sh.xp += amt;
  while (sh.xp >= sh.lvl * 5 && sh.lvl < 10) { sh.xp -= sh.lvl * 5; sh.lvl++; }
}
function evolveShadow(sh) {
  const i = SHADOW_RANKS.indexOf(sh.rank);
  if (sh.lvl < 10 || i >= SHADOW_RANKS.length - 1) return { ok: false, msg: 'يحتاج الظل مستوى 10 للتطور' };
  if (S.p.gold < 300) return { ok: false, msg: 'تحتاج 300 ذهب للتطور' };
  S.p.gold -= 300;
  sh.rank = SHADOW_RANKS[i + 1]; sh.lvl = 1; sh.xp = 0;
  return { ok: true, msg: 'تطوّر الظل إلى رتبة ' + sh.rank };
}
