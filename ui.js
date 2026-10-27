/* ===== القوائم والواجهة ===== */
let panelKind = null;
const $ = id => document.getElementById(id);
let toastTimer = 0;

function toast(t) {
  const el = $('toast');
  el.textContent = t;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

function setPlaying(on) {
  ['hud', 'joy', 'skills', 'atk'].forEach(id => $(id).classList.toggle('hidden', !on));
}

function showMenu(on) {
  if (on) {
    setPlaying(false);
    $('menu').classList.remove('hidden');
    renderMenu();
  } else {
    $('menu').classList.add('hidden');
  }
}

function openPanel(k) { panelKind = k; $('panel').classList.remove('hidden'); renderPanel(); }
function closePanel() { panelKind = null; $('panel').classList.add('hidden'); }

/* ---------- القائمة الرئيسية ---------- */
function renderMenu() {
  const m = $('menu');
  if (!S) {
    m.innerHTML = `<div class="box"><h1>صيّاد الظلال</h1><p class="small">اختر فئة صيادك لبدء المغامرة</p>` +
      Object.entries(CLASSES).map(([k, c]) =>
        `<button class="btn" data-act="class" data-v="${k}"><b>${c.name}</b><br><span class="small">${classDesc(k)}</span></button>`
      ).join('') + `</div>`;
    return;
  }
  const p = S.p;
  let zones = '';
  ZONES.forEach((z, zi) => {
    const open = S.unlocked.includes(zi);
    zones += `<h3>${z.name}${open ? '' : ' (مغلقة)'}</h3>`;
    if (!open) return;
    for (let gi = 0; gi < 4; gi++) {
      const why = gateLocked(zi, gi);
      const done = S.gatesDone[z.id + gi] ? ' ✓' : '';
      const label = gi === 3 ? 'زعيم ' + BOSSES[z.boss].name : 'بوابة ' + (gi + 1);
      zones += `<button class="btn" ${why ? 'disabled' : ''} data-act="enter" data-z="${zi}" data-g="${gi}">` +
        `${label}${done}${why ? ' — ' + why : ''}</button>`;
    }
  });
  m.innerHTML = `<div class="box">
    <h1>صيّاد الظلال</h1>
    <p class="small">${CLASSES[S.cls].name}${S.spec ? ' — ' + SPECS[S.spec].name : ''} — الرتبة ${rankOf(p.level)} — المستوى ${p.level}${p.awk ? ' — مُستيقظ' : ''}</p>
    <p>الذهب: ${p.gold}</p>
    ${zones}
    <h3>القائمة</h3>
    <button class="btn" data-act="panel" data-v="char">الشخصية والمهارات${p.sp ? ' (' + p.sp + ' نقطة)' : ''}</button>
    <button class="btn" data-act="panel" data-v="inv">المعدات والصناعة</button>
    <button class="btn" data-act="panel" data-v="sh">جيش الظلال (${S.army.length}/${armyLimit()})</button>
    <button class="btn" data-act="panel" data-v="quest">المهام والأسرار</button>
    <button class="btn" data-act="reset">حذف التقدم</button>
  </div>`;
}

function classDesc(k) {
  return { warrior: 'قتال قريب قوي، صحة ودفاع عالٍ', ranger: 'سهام من بعيد وسرعة كبيرة', mage: 'سحر الظل وتحكم بالمانا' }[k];
}

/* ---------- اللوحات ---------- */
function renderPanel() {
  if (!panelKind || !S) return;
  const p = S.p;
  let h = '';
  if (panelKind === 'char') h = charPanel();
  else if (panelKind === 'inv') h = invPanel();
  else if (panelKind === 'sh') h = shadowPanel();
  else if (panelKind === 'quest') h = questPanel();
  h += `<button class="btn" data-act="close">إغلاق</button>`;
  $('panel').innerHTML = `<div class="box">${h}</div>`;
}

function charPanel() {
  const p = S.p;
  let s = `<h2>الشخصية</h2>
    <p>المستوى ${p.level} — الرتبة ${rankOf(p.level)} — الخبرة ${p.xp}/${xpNeed(p.level)}</p>
    <p>نقاط متاحة للتوزيع: ${p.sp}</p>`;
  const stats = [['str', 'القوة'], ['agi', 'السرعة'], ['def', 'الدفاع'], ['int', 'الذكاء']];
  s += stats.map(([k, n]) =>
    `<div class="row"><span>${n}: ${p.stats[k]}</span><button class="mini" data-act="alloc" data-v="${k}" ${p.sp < 1 ? 'disabled' : ''}>+</button></div>`
  ).join('');
  s += `<p class="small">الصحة ${Math.round(p.hp)}/${maxHp()} — المانا ${maxMp()} — الهجوم ${Math.round(atkPower())} — الدفاع ${Math.round(totalDef())} — الحرجة ${Math.round(critChance() * 100)}%</p>`;

  if (p.level >= 10 && !S.spec) {
    s += `<h3>اختر تخصصك</h3>`;
    s += CLASSES[S.cls].spec.map(sp =>
      `<button class="btn" data-act="spec" data-v="${sp}">${SPECS[sp].name}</button>`).join('');
  } else if (S.spec) {
    s += `<p class="small">التخصص: ${SPECS[S.spec].name}</p>`;
  }
  if (p.level >= 15 && !p.awk) s += `<button class="btn" data-act="awaken">الصحوة (+25% لكل شيء)</button>`;

  s += `<h3>المهارات</h3>`;
  for (const id in SKILLS) {
    const sk = SKILLS[id];
    if (sk.cls !== S.cls) continue;
    if (sk.spec && S.spec !== sk.spec) continue;
    const rk = skillRank(id);
    const req = sk.pre ? 'يتطلب ' + SKILLS[sk.pre].name : '';
    const canBuy = p.sp > 0 && rk < sk.maxRank && p.level >= sk.lvl && (!sk.pre || skillRank(sk.pre) >= 1);
    s += `<div class="row"><span>${sk.glyph} ${sk.name} <span class="small">(${rk}/${sk.maxRank})</span>
      <br><span class="small">${sk.kind === 'passive' ? 'سلبية' : 'فعّالة'}${req ? ' — ' + req : ''}${p.level < sk.lvl ? ' — مستوى ' + sk.lvl : ''}</span></span>
      <button class="mini" data-act="learn" data-v="${id}" ${canBuy ? '' : 'disabled'}>+</button></div>`;
  }
  return s;
}

function invPanel() {
  let s = `<h2>المعدات</h2>`;
  s += `<p>السلاح: ${itemLabel(S.p.equip.weapon)}</p><p>الدرع: ${itemLabel(S.p.equip.armor)}</p><p>الملحق: ${itemLabel(S.p.equip.accessory)}</p>`;
  s += `<p class="small">الذهب ${S.p.gold} — الحقيبة ${S.inv.length}/24</p>`;
  s += `<h3>المواد</h3>` + (Object.keys(S.mats).filter(k => S.mats[k] > 0).map(k => `${k}: ${S.mats[k]}`).join(' — ') || '<span class="small">لا توجد مواد</span>');
  s += `<h3>الصناعة (${CRAFT_COST} مواد)</h3>` + ['weapon', 'armor', 'accessory'].map(sl =>
    `<button class="mini" data-act="craft" data-v="${sl}">صنع ${sl === 'weapon' ? 'سلاح' : sl === 'armor' ? 'درع' : 'ملحق'}</button>`).join(' ');
  s += `<h3>الحقيبة</h3>`;
  if (!S.inv.length) s += '<p class="small">الحقيبة فارغة</p>';
  for (const it of S.inv) {
    const cost = enchantCost(it);
    s += `<div class="row"><span class="rar-${it.rarity}">${itemLabel(it)} — ${RARITY[it.rarity].n}<br><span class="small">${statTxt(it.stats)}</span></span>
      <span><button class="mini" data-act="equip" data-v="${it.id}">تجهيز</button>
      <button class="mini" data-act="enchant" data-v="${it.id}" ${it.ench >= 10 ? 'disabled' : ''}>تطوير ${cost}ذ</button>
      <button class="mini" data-act="discard" data-v="${it.id}">إتلاف</button></span></div>`;
  }
  // المعدات المجهزة قابلة للتطوير أيضًا
  for (const sl in S.p.equip) {
    const it = S.p.equip[sl];
    if (!it) continue;
    s += `<div class="row"><span class="rar-${it.rarity}">مجهز: ${itemLabel(it)}</span>
      <button class="mini" data-act="enchant" data-v="${it.id}" ${it.ench >= 10 ? 'disabled' : ''}>تطوير ${enchantCost(it)}ذ</button></div>`;
  }
  return s;
}

function statTxt(st) {
  return Object.keys(st).map(k => ({ atk: 'هجوم', def: 'دفاع', hp: 'صحة', mp: 'مانا', crit: 'حرجة' }[k] + ' +' + (st[k] < 1 ? (st[k] * 100).toFixed(0) + '%' : st[k]))).join(' — ');
}

function shadowPanel() {
  let s = `<h2>جيش الظلال</h2>
    <p>المستدعون: ${S.army.length} / ${armyLimit()} — يزيد الحد مع كل 4 مستويات</p>`;
  if (!S.shadows.length) s += '<p class="small">لم تستخرج أي ظل بعد — اهزم وحوشًا مميزة</p>';
  for (const sh of S.shadows) {
    const kd = SHADOW_KINDS[sh.kind] || SHADOW_KINDS.wolf;
    const on = S.army.includes(sh.id);
    const full = !on && S.army.length >= armyLimit();
    s += `<div class="row"><span class="rar-${sh.rarity}">${kd.name} — ${SHADOW_RANKS.indexOf(sh.rank) >= 0 ? sh.rank : 'E'} — مستوى ${sh.lvl}<br><span class="small">${kd.desc}</span></span>
      <span><button class="mini" data-act="toggleSh" data-v="${sh.id}" ${full ? 'disabled' : ''}>${on ? 'إلغاء' : 'استدعاء'}</button>
      <button class="mini" data-act="evolve" data-v="${sh.id}">تطوير</button>
      <button class="mini" data-act="dismiss" data-v="${sh.id}">تحرير</button></span></div>`;
  }
  s += `<p class="small">التطوير يتطلب مستوى 10 و300 ذهب. التحرير يزيل الظل نهائيًا.</p>`;
  return s;
}

function questPanel() {
  let s = `<h2>المهام والأسرار</h2>`;
  ZONES.forEach((z, zi) => {
    const qs = QUESTS.filter(q => q.zone === zi);
    s += `<h3>${z.name}</h3>`;
    s += qs.map(q => `<div class="row"><span>${q.t}</span><span class="small">${S.quests[q.id] ? 'مكتملة' : 'قيد التقدم'}</span></div>`).join('');
    s += `<p class="small">أسرار مكتشفة: ${S.secrets[z.id] || 0}</p>`;
  });
  return s;
}

/* ---------- شريط المهارات أثناء القتال ---------- */
function renderSkills() {
  const box = $('skills');
  box.innerHTML = '';
  const list = S ? ownedActives().slice(0, 6) : [];
  for (const id of list) {
    const sk = SKILLS[id];
    const b = document.createElement('button');
    b.className = 'sk';
    b.dataset.sk = id;
    b.innerHTML = `${sk.glyph}<br>${sk.name}<div class="cd"></div>`;
    b.addEventListener('pointerdown', e => { e.preventDefault(); useSkill(id); });
    box.appendChild(b);
  }
}

function updateSkillsUI() {
  for (const b of $('skills').children) {
    const cd = run ? (run.cd[b.dataset.sk] || 0) : 0;
    b.classList.toggle('cool', cd > 0);
    b.querySelector('.cd').textContent = Math.ceil(cd);
  }
}

function updateHud() {
  if (!run || !S) return;
  $('lbl').textContent = `مستوى ${S.p.level} | ${rankOf(S.p.level)} | ${CLASSES[S.cls].name}`;
  $('gold').textContent = `ذهب ${S.p.gold} | قتلى ${S.kills}`;
  $('hp').firstElementChild.style.width = clamp(S.p.hp / maxHp() * 100, 0, 100) + '%';
  $('mp').firstElementChild.style.width = clamp(S.p.mp / maxMp() * 100, 0, 100) + '%';
  $('xp').firstElementChild.style.width = clamp(S.p.xp / xpNeed(S.p.level) * 100, 0, 100) + '%';
  $('wave').textContent = run.boss ? run.zone.name + ' — ' + BOSSES[run.zone.boss].name
    : run.zone.name + ' — البوابة ' + (run.gi + 1) + ' — الموجة ' + Math.max(1, run.wave) + '/' + run.waves;
}

/* ---------- أحداث القوائم ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const a = b.dataset.act, v = b.dataset.v;
  if (a === 'class') {
    S = defaultState(v);
    S.p.hp = maxHp(); S.p.mp = maxMp();
    saveGame(); renderMenu();
  } else if (a === 'enter') enterGate(parseInt(b.dataset.z, 10), parseInt(b.dataset.g, 10));
  else if (a === 'panel') openPanel(v);
  else if (a === 'close') closePanel();
  else if (a === 'alloc') { if (S.p.sp > 0) { S.p.sp--; S.p.stats[v]++; saveGame(); renderPanel(); } }
  else if (a === 'spec') { S.spec = v; toast('اخترت تخصص ' + SPECS[v].name); saveGame(); renderPanel(); renderSkills(); }
  else if (a === 'awaken') { if (!S.p.awk) { S.p.awk = true; toast('استيقظت قوتك!'); saveGame(); renderPanel(); } }
  else if (a === 'learn') {
    if (S.p.sp > 0) { S.p.sp--; S.skills[v] = skillRank(v) + 1; saveGame(); renderPanel(); renderSkills(); }
  }
  else if (a === 'equip') equip(v);
  else if (a === 'enchant') {
    const it = findItem(v);
    if (it) { const r = enchantItem(it); toast(r.msg); saveGame(); renderPanel(); }
  }
  else if (a === 'craft') { const r = craftItem(v); toast(r.msg); saveGame(); renderPanel(); }
  else if (a === 'discard') { S.inv = S.inv.filter(x => x.id !== v); saveGame(); renderPanel(); }
  else if (a === 'toggleSh') {
    if (S.army.includes(v)) S.army = S.army.filter(x => x !== v);
    else if (S.army.length < armyLimit()) S.army.push(v);
    saveGame(); renderPanel();
  }
  else if (a === 'evolve') {
    const sh = S.shadows.find(x => x.id === v);
    if (sh) { const r = evolveShadow(sh); toast(r.msg); saveGame(); renderPanel(); }
  }
  else if (a === 'dismiss') {
    S.shadows = S.shadows.filter(x => x.id !== v);
    S.army = S.army.filter(x => x !== v);
    saveGame(); renderPanel();
  }
  else if (a === 'reset') {
    if (confirm('حذف كل التقدم؟ (نسخة v1 لن تُحذف)')) {
      try { localStorage.removeItem(SAVE_KEY); } catch (err) {}
      S = null; closePanel(); renderMenu();
    }
  }
});

function findItem(id) {
  for (const sl in S.p.equip) if (S.p.equip[sl] && S.p.equip[sl].id === id) return S.p.equip[sl];
  return S.inv.find(x => x.id === id) || null;
}

function equip(id) {
  const i = S.inv.findIndex(x => x.id === id);
  if (i < 0) return;
  const it = S.inv[i];
  const cur = S.p.equip[it.slot];
  S.inv.splice(i, 1);
  if (cur) S.inv.push(cur);
  S.p.equip[it.slot] = it;
  S.p.hp = Math.min(S.p.hp, maxHp());
  saveGame(); renderPanel();
}
