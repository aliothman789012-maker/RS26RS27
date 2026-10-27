/* ===== رسم الشخصيات والوحوش بالبكسل (أصول أصلية مرسومة برمجيًا) =====
   الحروف: o = حدّ، b = لون الصبغة، d = ظل، l = ضوء، e = عين، . = شفاف */
const SHEET_GRIDS = {
  hero: [
    '....oooo....', '...obbbbo...', '...obeebo...', '...obbbbo...', '....obbo....',
    '..oobbbboo..', '.obbbbbbbbo.', '.obbbbbbbbo.', '..obbbbbbo..', '...oddddo...',
    '...oo..oo...', '...oo..oo...'
  ],
  slime: [
    '............', '....oooo....', '...obbbbo...', '..obllbbbo..', '..obbbbbbo..',
    '.obbeebbbbo.', '.obbbbbbbbo.', '.obbbbbbbbo.', '.odddddddo..', '..oooooooo..'
  ],
  beast: [
    '..o......o..', '.obo....obo.', '.obbbbbbbbo.', 'obbebbbbebbo', 'obbbbbbbbbbo',
    '.obbbbbbbbo.', '..obbbbbbo..', '..obbbbbbo..', '.obo....obo.', '.ooo....ooo'
  ],
  spider: [
    'o....oo....o', '.o..obbo..o.', '..obbbbbbo..', '.obebbbbebo.', 'oobbbbbbbboo',
    '.obbbbbbbbo.', 'o.obbbbbbo.o', '.o.oddddo.o.', 'o...oo...oo.', '............'
  ],
  skeleton: [
    '...oooooo...', '..obllllbo..', '..oeoobeo...', '..obbbbbbo..', '...obbbbo...',
    '..obbbbbbo..', '.obbdddddbo.', '..obb..bbo..', '..odd..ddo..', '..oo....oo..'
  ],
  wraith: [
    '....oooo....', '...obbbbo...', '...obeebo...', '..obbbbbbo..', '.obbbbbbbbo.',
    '.obbbbbbbbo.', '.obbbbbbbbo.', 'obbbbbbbbbbo', 'ob.bbbbbb.bo', '..o.o..o.o..'
  ],
  golem: [
    '.oooooooooo.', 'obllbbbbbbbo', 'obbebbbbebbo', 'obbbbbbbbbbo', 'obbbbbbbbbbo',
    'obbbbbbbbbbo', '.oooooooooo.', '..obbbbbbo..', '..obbbbbbo..', '..oo....oo..'
  ],
  archer: [
    '....oooo....', '...obbbbo...', '...obeebo...', '..oobbbboo..', '.obbbbbbbbo.',
    'ob.bbbbbbb.o', 'ob..bbbb..bo', '...obbbbo...', '...od..do...', '...oo..oo...'
  ],
  knight: [
    '...oooooo...', '..obbbbbbo..', '..obeebbo...', '.oobbbbbboo.', '.obbbbbbbbo.',
    'obbbbbbbbbbo', '.obbbbbbbbo.', '..obbbbbbo..', '..obbdbbbo..', '..oo....oo..'
  ]
};

const _spriteCache = {};
const _whiteCache = {};

function _mix(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = k < 0 ? 0 : 255, f = Math.abs(k);
  r = Math.round(r + (t - r) * f); g = Math.round(g + (t - g) * f); b = Math.round(b + (t - b) * f);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* يرسم القالب إلى canvas صغير مرة واحدة (مخزّن مؤقتًا) */
function _buildSheet(sheet, tint, white) {
  const rows = (SHEET_GRIDS[sheet] || SHEET_GRIDS.slime);
  const w = Math.max(...rows.map(r => r.length));
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const pal = {
    o: '#07060c', b: tint || '#888', d: _mix(tint || '#888', -0.45),
    l: _mix(tint || '#888', 0.4), e: '#fff'
  };
  if (white) { pal.b = pal.d = pal.l = '#fff'; pal.e = '#ff9'; }
  rows.forEach((row, yy) => {
    for (let xx = 0; xx < w; xx++) {
      const ch = row[xx];
      if (!ch || ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(xx, yy, 1, 1);
    }
  });
  return c;
}

function spriteFor(sheet, tint, white) {
  const key = sheet + '|' + tint + (white ? '|w' : '');
  const cache = white ? _whiteCache : _spriteCache;
  if (!cache[key]) cache[key] = _buildSheet(sheet, tint, white);
  return cache[key];
}

/* drawSprite: موقع مركزي، مع حركة تنفس/مشي، وهجوم، ووميض عند الإصابة، وتلاشي عند الموت
   o: { t, moving, lunge, face, flash, alpha, size, flip } */
function drawSprite(ctx, sheet, tint, x, y, o) {
  o = o || {};
  const base = spriteFor(sheet, tint, false);
  const img = (o.flash > 0) ? spriteFor(sheet, tint, true) : base;
  const size = o.size || 3;
  const w = base.width * size, h = base.height * size;
  const t = o.t || 0;
  const bob = o.moving ? Math.abs(Math.sin(t * 14)) * -2 * size * 0.3 : Math.sin(t * 3) * size * 0.25;
  const shrink = o.dying ? Math.max(0.1, 1 - o.dying) : 1;
  const lx = (o.lunge || 0) * Math.cos(o.face || 0);
  const ly = (o.lunge || 0) * Math.sin(o.face || 0);
  const dx = x - (w * shrink) / 2 + lx;
  const dy = y - (h * shrink) / 2 + bob + ly;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.flip) {
    ctx.translate(dx + w * shrink, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w * shrink, h * shrink);
  } else {
    ctx.drawImage(img, dx, dy, w * shrink, h * shrink);
  }
  ctx.restore();
}
