/* ===== البيانات الثابتة ===== */
const CLASSES = {
  warrior: { name: 'مقاتل', col: '#e0523a', str: 4, agi: 1, def: 3, int: 0, spec: ['guard', 'duelist'] },
  ranger:  { name: 'رامٍ', col: '#5ec96b', str: 1, agi: 4, def: 1, int: 2, spec: ['sniper', 'trapper'] },
  mage:    { name: 'ساحر ظلال', col: '#4a8cff', str: 0, agi: 1, def: 1, int: 5, spec: ['blood', 'frost'] }
};
const SPECS = {
  guard:   { name: 'الحارس', cls: 'warrior', lvl: 10 },
  duelist: { name: 'المبارز', cls: 'warrior', lvl: 10 },
  sniper:  { name: 'القناص', cls: 'ranger', lvl: 10 },
  trapper: { name: 'صائد السم', cls: 'ranger', lvl: 10 },
  blood:   { name: 'ساحر الدم', cls: 'mage', lvl: 10 },
  frost:   { name: 'ساحر الصقيع', cls: 'mage', lvl: 10 }
};

/* kind: cone | circle | proj | multi | zone | buff | heal | drain | dash
   dm/dr: مضاعف الضرر الأساسي وزيادته لكل رتبة */
const SKILLS = {
  w_strike: { name: 'ضربة قوية', cls: 'warrior', kind: 'cone', dm: 2.0, dr: 0.3, mp: 8, cd: 3, range: 120, arc: 1.2, maxRank: 5, lvl: 1, glyph: '⚔', col: '#ffd27a' },
  w_whirl:  { name: 'دوامة', cls: 'warrior', kind: 'circle', dm: 1.4, dr: 0.2, mp: 15, cd: 6, range: 110, maxRank: 5, lvl: 3, pre: 'w_strike', glyph: '✹', col: '#ffb84a' },
  w_roar:   { name: 'هتاف الحرب', cls: 'warrior', kind: 'buff', dur: 8, dmul: 0.2, mp: 12, cd: 14, maxRank: 3, lvl: 5, glyph: '♛', col: '#ff8a6a' },
  w_heal:   { name: 'ترميم', cls: 'warrior', kind: 'heal', amt: 0.3, ar: 0.05, mp: 20, cd: 12, maxRank: 5, lvl: 5, glyph: '✚', col: '#7dffb0' },
  w_iron:   { name: 'جلد الحديد', cls: 'warrior', kind: 'passive', stat: 'def', per: 2, maxRank: 5, lvl: 2, glyph: '◈', col: '#aab' },
  w_fury:   { name: 'غضب', cls: 'warrior', kind: 'passive', stat: 'dmgPct', per: 0.04, maxRank: 5, lvl: 4, glyph: '✦', col: '#ff6a6a' },
  w_shield: { name: 'درع الظل', cls: 'warrior', kind: 'buff', spec: 'guard', shield: 40, dur: 6, mp: 18, cd: 20, maxRank: 3, lvl: 10, glyph: '⛨', col: '#9ad' },
  w_flurry: { name: 'وابل الضربات', cls: 'warrior', kind: 'cone', spec: 'duelist', dm: 0.8, dr: 0.1, hits: 5, mp: 22, cd: 10, range: 130, arc: 1.6, maxRank: 3, lvl: 10, glyph: '≋', col: '#ffe08a' },
  r_arrow:  { name: 'سهم', cls: 'ranger', kind: 'proj', dm: 1.6, dr: 0.25, speed: 520, mp: 6, cd: 0.8, maxRank: 5, lvl: 1, glyph: '➳', col: '#bfe' },
  r_double: { name: 'سهم مزدوج', cls: 'ranger', kind: 'multi', n: 3, spread: 0.22, dm: 1.0, dr: 0.15, speed: 500, mp: 12, cd: 4, maxRank: 5, lvl: 3, pre: 'r_arrow', glyph: '⋙', col: '#9fe8a8' },
  r_swift:  { name: 'خطوة الريح', cls: 'ranger', kind: 'dash', dist: 150, mp: 10, cd: 7, maxRank: 3, lvl: 5, glyph: '↯', col: '#dfffe0' },
  r_rain:   { name: 'مطر السهام', cls: 'ranger', kind: 'zone', dm: 0.7, dr: 0.1, radius: 170, dur: 3, mp: 25, cd: 15, maxRank: 3, lvl: 7, glyph: '⁂', col: '#8fd' },
  r_focus:  { name: 'تركيز', cls: 'ranger', kind: 'passive', stat: 'crit', per: 0.03, maxRank: 5, lvl: 2, glyph: '◎', col: '#cfc' },
  r_pierce: { name: 'سهم خارق', cls: 'ranger', kind: 'proj', spec: 'sniper', dm: 2.4, dr: 0.3, speed: 700, pierce: 3, mp: 14, cd: 5, maxRank: 3, lvl: 10, glyph: '⤳', col: '#fff' },
  r_poison: { name: 'سهم سام', cls: 'ranger', kind: 'proj', spec: 'trapper', dm: 1.0, dr: 0.1, speed: 480, poison: 4, mp: 12, cd: 4, maxRank: 3, lvl: 10, glyph: '☣', col: '#7f7' },
  m_orb:    { name: 'كرة الظل', cls: 'mage', kind: 'proj', dm: 1.8, dr: 0.25, speed: 380, mp: 8, cd: 1, maxRank: 5, lvl: 1, glyph: '●', col: '#8ab4ff' },
  m_nova:   { name: 'نبضة', cls: 'mage', kind: 'circle', dm: 1.5, dr: 0.2, mp: 16, cd: 6, range: 150, maxRank: 5, lvl: 3, pre: 'm_orb', glyph: '✺', col: '#9ac' },
  m_drain:  { name: 'امتصاص', cls: 'mage', kind: 'drain', dm: 1.6, dr: 0.2, heal: 0.3, range: 220, mp: 14, cd: 5, maxRank: 5, lvl: 5, glyph: '⟁', col: '#c7a' },
  m_mind:   { name: 'عقل الظل', cls: 'mage', kind: 'passive', stat: 'int', per: 2, maxRank: 5, lvl: 2, glyph: '✧', col: '#aef' },
  m_frost:  { name: 'صقيع', cls: 'mage', kind: 'proj', spec: 'frost', dm: 1.2, dr: 0.15, speed: 360, slow: 0.5, slowT: 3, mp: 14, cd: 5, maxRank: 3, lvl: 10, glyph: '❄', col: '#bfeaff' },
  m_blood:  { name: 'لعنة الدم', cls: 'mage', kind: 'proj', spec: 'blood', dm: 0.6, dr: 0.1, speed: 420, bleed: 5, mp: 12, cd: 4, maxRank: 3, lvl: 10, glyph: '✖', col: '#f66' }
};

/* مناطق: كل منطقة لها خريطة وعوائق وخطر مختلف */
const ZONES = [
  { id: 'forest', name: 'الغابة الملعونة', bg: '#0f1f14', tile: '#14291b', accent: '#3f8f4f', hazard: 'thorn', mins: 1,
    kinds: ['wolf', 'spider', 'sprite'], boss: 'treeking', mat: 'حطب ملعون', ring: 'الغابة' },
  { id: 'crypt', name: 'سراديب الموتى', bg: '#17151c', tile: '#1f1c26', accent: '#8a8497', hazard: 'graves', mins: 5,
    kinds: ['skeleton', 'zombie', 'wraith'], boss: 'priest', mat: 'عظم قديم', ring: 'السراديب' },
  { id: 'castle', name: 'قلعة الظلال', bg: '#14121c', tile: '#1c1828', accent: '#6a4fb0', hazard: 'pillars', mins: 9,
    kinds: ['guardian', 'archer', 'knight'], boss: 'captain', mat: 'شظية درع', ring: 'القلعة' },
  { id: 'ice', name: 'كهف الجليد', bg: '#0c1822', tile: '#122636', accent: '#7fd0ff', hazard: 'ice', mins: 13,
    kinds: ['frostwolf', 'imp', 'golem'], boss: 'queen', mat: 'بلورة جليد', ring: 'الجليد' },
  { id: 'volcano', name: 'بركان الوحوش', bg: '#1f0f0b', tile: '#2a1510', accent: '#ff7a3a', hazard: 'lava', mins: 17,
    kinds: ['fireling', 'rockback', 'golem'], boss: 'titan', mat: 'حجر بركاني', ring: 'البركان' }
];

/* kind: ai = chase | ranged | charger | summoner | floater | tank
   sheet: اسم قالب الرسم، tint: لون الصبغة */
const KINDS = {
  slime:     { name: 'وحش هلامي', hp: 30, dmg: 6, spd: 60, r: 14, xp: 8, gold: 3, ai: 'chase', sheet: 'slime', tint: '#5ec96b' },
  wolf:      { name: 'ذئب الغابة', hp: 45, dmg: 9, spd: 115, r: 14, xp: 14, gold: 6, ai: 'chase', sheet: 'beast', tint: '#7a8a6a', ext: true },
  spider:    { name: 'عنكبوت سام', hp: 40, dmg: 8, spd: 90, r: 13, xp: 14, gold: 6, ai: 'chase', sheet: 'spider', tint: '#4a3a5a', poison: 3, ext: true },
  sprite:    { name: 'جنية الشوك', hp: 35, dmg: 7, spd: 80, r: 12, xp: 13, gold: 6, ai: 'ranged', sheet: 'wraith', tint: '#8fd07a', ext: true },
  skeleton:  { name: 'هيكل عظمي', hp: 55, dmg: 10, spd: 95, r: 14, xp: 18, gold: 8, ai: 'chase', sheet: 'skeleton', tint: '#e0dccc', ext: true },
  zombie:    { name: 'زومبي', hp: 110, dmg: 12, spd: 45, r: 17, xp: 22, gold: 9, ai: 'tank', sheet: 'skeleton', tint: '#7a9a6a' },
  wraith:    { name: 'روح مقبرة', hp: 50, dmg: 9, spd: 85, r: 13, xp: 20, gold: 9, ai: 'floater', sheet: 'wraith', tint: '#9ab6ff', ext: true },
  guardian:  { name: 'حارس الظل', hp: 90, dmg: 13, spd: 60, r: 17, xp: 26, gold: 11, ai: 'tank', sheet: 'golem', tint: '#6a5a9a', ext: true },
  archer:    { name: 'رامٍ الظل', hp: 60, dmg: 11, spd: 70, r: 14, xp: 24, gold: 11, ai: 'ranged', sheet: 'archer', tint: '#5a4a8a', ext: true },
  knight:    { name: 'فارس معلّق', hp: 85, dmg: 15, spd: 105, r: 15, xp: 30, gold: 13, ai: 'charger', sheet: 'skeleton', tint: '#9a8ac0', ext: true },
  frostwolf: { name: 'ذئب الجليد', hp: 70, dmg: 13, spd: 125, r: 15, xp: 32, gold: 14, ai: 'chase', sheet: 'beast', tint: '#bfeaff', slow: 0.4, ext: true },
  imp:       { name: 'عفريت الصقيع', hp: 60, dmg: 12, spd: 75, r: 13, xp: 30, gold: 14, ai: 'ranged', sheet: 'wraith', tint: '#8ad0ff', ext: true },
  golem:     { name: 'حجري', hp: 150, dmg: 18, spd: 45, r: 20, xp: 40, gold: 18, ai: 'tank', sheet: 'golem', tint: '#9aa3b5', ext: true },
  fireling:  { name: 'مخلوق نار', hp: 80, dmg: 16, spd: 110, r: 14, xp: 40, gold: 18, ai: 'charger', sheet: 'beast', tint: '#ff7a3a', burn: 3, ext: true },
  rockback:  { name: 'صخرة متحركة', hp: 170, dmg: 20, spd: 40, r: 22, xp: 50, gold: 22, ai: 'tank', sheet: 'golem', tint: '#6a4a3a', ext: true }
};

/* الزعماء: patterns تتكرر، وphase2 تُفعّل عند 50% صحة */
const BOSSES = {
  treeking: { name: 'ملك الغابة الملعون', hp: 420, dmg: 20, spd: 70, r: 30, xp: 150, gold: 90, sheet: 'golem', tint: '#3f7f3f',
    patterns: ['charge', 'summon', 'volley'], p2: ['charge', 'volley', 'nova'], mat: 'قلب الغابة', drop: 'weapon' },
  priest:   { name: 'الكاهن المتعفن', hp: 480, dmg: 22, spd: 55, r: 28, xp: 170, gold: 100, sheet: 'skeleton', tint: '#8a7a9a',
    patterns: ['nova', 'summon'], p2: ['nova', 'summon', 'volley'], mat: 'رماد الكاهن', drop: 'armor' },
  captain:  { name: 'قائد القلعة', hp: 560, dmg: 26, spd: 80, r: 30, xp: 200, gold: 120, sheet: 'knight', tint: '#5a3aa0',
    patterns: ['charge', 'volley'], p2: ['charge', 'charge', 'nova'], mat: 'ختم القائد', drop: 'accessory' },
  queen:    { name: 'ملكة الجليد', hp: 640, dmg: 28, spd: 70, r: 30, xp: 240, gold: 150, sheet: 'wraith', tint: '#bfeaff',
    patterns: ['volley', 'nova'], p2: ['volley', 'nova', 'summon'], mat: 'تاج الصقيع', drop: 'weapon' },
  titan:    { name: 'جبار البركان', hp: 760, dmg: 34, spd: 60, r: 34, xp: 320, gold: 200, sheet: 'golem', tint: '#ff5a2a',
    patterns: ['charge', 'nova'], p2: ['charge', 'nova', 'charge'], mat: 'نواة البركان', drop: 'armor' }
};

/* الندرة والمعدات */
const RARITY = {
  common:    { n: 'عادي', m: 1, col: '#ddd' },
  rare:      { n: 'نادر', m: 1.6, col: '#4a8cff' },
  epic:      { n: 'ملحمي', m: 2.4, col: '#b26cff' },
  legendary: { n: 'أسطوري', m: 3.6, col: '#ffb84a' }
};
const GEAR = {
  weapon:    ['سيف', 'فأس', 'خنجر', 'قوس', 'عصا'],
  armor:     ['درع', 'صدرية', 'عباءة', 'خوذة'],
  accessory: ['خاتم', 'قلادة', 'حجر']
};
const LEGEND_NAMES = { weapon: 'سيف الظلال', armor: 'درع الكاهن', accessory: 'عين الصياد' };
const SHADOW_KINDS = {
  wolf:      { name: 'ظل ذئب', ab: 'speed', desc: 'سرعة حركة إضافية' },
  spider:    { name: 'ظل عنكبوت', ab: 'poison', desc: 'يسمم الأعداء عند الضرب' },
  skeleton:  { name: 'ظل هيكل', ab: 'hp', desc: 'صحة إضافية' },
  golem:     { name: 'ظل حجري', ab: 'tank', desc: 'يتحمّل الضرر أكثر' },
  wraith:    { name: 'ظل روح', ab: 'phase', desc: 'يعبر العوائق' },
  archer:    { name: 'ظل رامٍ', ab: 'ranged', desc: 'يطلق سهامًا من بعيد' },
  knight:    { name: 'ظل فارس', ab: 'charge', desc: 'يندفع نحو الأعداء' },
  fireling:  { name: 'ظل نار', ab: 'burn', desc: 'يحرق الأعداء' },
  boss:      { name: 'ظل زعيم', ab: 'hp', desc: 'قوة متوازنة' },
  sprite:    { name: 'ظل جنية', ab: 'poison', desc: 'يسمم الأعداء عند الضرب' },
  guardian:  { name: 'ظل حارس', ab: 'tank', desc: 'درع إضافي وصحة عالية' },
  frostwolf: { name: 'ظل ذئب الجليد', ab: 'speed', desc: 'سرعة حركة إضافية' },
  imp:       { name: 'ظل عفريت', ab: 'ranged', desc: 'يطلق سهامًا من بعيد' },
  rockback:  { name: 'ظل صخري', ab: 'tank', desc: 'يتحمّل الضرر أكثر' }
};
const SHADOW_RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
const MATERIALS = ['شظية', 'جلد', 'بلورة', 'رماد'];

/* مهام لكل منطقة + أسرار */
const QUESTS = ZONES.flatMap((z, i) => [
  { id: z.id + '_k', zone: i, t: 'اقتل 15 وحشًا في ' + z.name, need: S => (S.zk[z.id] || 0) >= 15, rw: { gold: 80 + i * 60, xp: 40 + i * 30 } },
  { id: z.id + '_b', zone: i, t: 'اهزم زعيم ' + z.name, need: S => !!S.bossKilled[z.id], rw: { gold: 200 + i * 120, mat: 3 } },
  { id: z.id + '_s', zone: i, t: 'اعثر على سرّ ' + z.name, need: S => (S.secrets[z.id] || 0) >= 1, rw: { gold: 120, xp: 60 } }
]);
const SECRET_LORE = [
  'رسالة مهترئة تقول إن الجدار الشمالي يخفي باب الظلال.',
  'نقش على حجر يذكر أن الصيّاد الأول حمل قوسًا من نور.',
  'مفكرة تحكي عن جيش من الظلال لم ينتصر أبدًا.',
  'قطعة خريطة تشير إلى كهف يفتح في البركان.'
];
