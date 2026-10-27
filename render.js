/* ===== الرسم والواجهة داخل القتال ===== */
const cv = document.getElementById('c');
const g = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

function floatText(x, y, txt, col) { floats.push({ x, y, txt: String(txt), col, t: 0.9 }); }

function updateFloats(dt) {
  for (const f of floats) { f.t -= dt; f.y -= 25 * dt; }
  floats = floats.filter(f => f.t > 0);
}

/* أرضية كل منطقة بنمط مختلف */
function drawZoneBase(z) {
  g.fillStyle = z.bg; g.fillRect(0, 0, W, H);
  g.fillStyle = z.tile;
  for (let y = 0; y < H; y += 48) for (let x = (y / 48) % 2 ? 24 : 0; x < W; x += 48) g.fillRect(x + 2, y + 2, 44, 44);
  g.strokeStyle = z.accent; g.globalAlpha = 0.25; g.lineWidth = 2;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.globalAlpha = 1;
  const decor = { forest: '#2e6b3a', crypt: '#4b4656', castle: '#3a2f63', ice: '#5aa6d6', volcano: '#7a2a14' }[z.id];
  g.fillStyle = decor;
  for (let i = 0; i < 14; i++) {
    const x = (i * 97) % W, y = (i * 53) % H;
    g.beginPath(); g.arc(x, y, 6 + (i % 4) * 3, 0, Math.PI * 2); g.fill();
  }
}

function drawPillars() {
  for (const q of run.pillars) {
    if (q.kind === 'grave') {
      g.fillStyle = '#56505f'; g.fillRect(q.x, q.y, q.w, q.h);
      g.fillStyle = '#2a2631'; g.fillRect(q.x + q.w / 2 - 2, q.y + 4, 4, q.h - 8);
    } else {
      g.fillStyle = '#2a2440'; g.fillRect(q.x, q.y, q.w, q.h);
      g.strokeStyle = run.zone.accent; g.lineWidth = 2; g.strokeRect(q.x, q.y, q.w, q.h);
    }
  }
}

function drawAreas() {
  for (const a of run.areas) {
    if (a.kind === 'thorn') {
      g.fillStyle = 'rgba(70,160,70,0.35)';
      g.beginPath(); g.arc(a.x, a.y, a.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#6fbf5a'; g.lineWidth = 2; g.stroke();
    } else if (a.kind === 'lava') {
      const warn = a.t < a.warn;
      g.fillStyle = warn ? 'rgba(255,120,40,0.18)' : 'rgba(255,90,20,0.6)';
      g.beginPath(); g.arc(a.x, a.y, a.r, 0, Math.PI * 2); g.fill();
    }
  }
}

function drawFx() {
  for (const f of run.fx) {
    if (f.kind === 'arc') {
      const k = f.t / 0.25;
      g.strokeStyle = f.col; g.lineWidth = 4; g.globalAlpha = 1 - k;
      g.beginPath(); g.arc(f.x, f.y, f.r * (0.6 + k * 0.4), f.ang - f.arc / 2, f.ang + f.arc / 2); g.stroke();
    } else if (f.kind === 'ring') {
      const k = f.t / 0.3;
      g.strokeStyle = f.col; g.lineWidth = 3; g.globalAlpha = 1 - k;
      g.beginPath(); g.arc(f.x, f.y, f.r * k, 0, Math.PI * 2); g.stroke();
    } else if (f.kind === 'zone') {
      g.fillStyle = f.col; g.globalAlpha = 0.18 + 0.1 * Math.sin(f.t * 10);
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.fill();
    }
  }
  g.globalAlpha = 1;
}

function drawProjs(list, friendly) {
  for (const pr of list) {
    g.fillStyle = pr.col;
    g.beginPath(); g.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); g.fill();
    if (friendly) {
      g.strokeStyle = pr.col; g.globalAlpha = 0.4; g.lineWidth = pr.r;
      g.beginPath(); g.moveTo(pr.x, pr.y); g.lineTo(pr.x - pr.vx * 0.05, pr.y - pr.vy * 0.05); g.stroke();
      g.globalAlpha = 1;
    }
  }
}

function drawEnemy(e) {
  const t = performance.now() / 1000;
  const sizeBase = e.boss ? 1.5 : 2.4;
  const k = e.dying > 0 ? Math.min(1, e.dying / 0.4) : 0;
  let tint = e.tint;
  if (e.state === 'tele') tint = '#ffffff';
  drawSprite(g, e.sheet, tint, e.x, e.y, {
    t: t + e.x * 0.01, moving: false, size: sizeBase, flash: e.flash,
    alpha: 1 - k, dying: k, flip: e.x > run.p.x
  });
  if (!e.dead) {
    const w = e.r * 2.4 + 6;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(e.x - w / 2, e.y - e.r - 14, w, 4);
    g.fillStyle = e.boss ? '#ffb84a' : '#e0523a';
    g.fillRect(e.x - w / 2, e.y - e.r - 14, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
}

function drawAlly(a) {
  const t = performance.now() / 1000;
  drawSprite(g, 'slime', '#8f7cff', a.x, a.y, {
    t: t + a.x * 0.01, moving: false, size: 1.4, flash: a.flash, alpha: 0.85, flip: a.x > run.p.x
  });
  const w = a.r * 2 + 6;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(a.x - w / 2, a.y - a.r - 8, w, 3);
  g.fillStyle = '#8f7cff'; g.fillRect(a.x - w / 2, a.y - a.r - 8, w * clamp(a.hp / a.maxHp, 0, 1), 3);
}

function drawPlayer() {
  const p = run.p;
  const t = performance.now() / 1000;
  const col = CLASSES[S.cls].col;
  drawSprite(g, 'hero', col, p.x, p.y, {
    t, moving: p.moving, size: 3, flash: p.flash, flip: Math.cos(p.face) < 0
  });
  // سلاح الفئة
  g.save();
  g.translate(p.x, p.y);
  const sw = p.swing > 0 ? (0.15 - p.swing) / 0.15 : 0;
  g.rotate(p.face + (sw ? -0.9 + sw * 1.8 : 0));
  g.strokeStyle = S.cls === 'mage' ? '#8ab4ff' : S.cls === 'ranger' ? '#bfe' : '#dfe6ff';
  g.lineWidth = 3;
  if (S.cls === 'warrior') { g.beginPath(); g.moveTo(8, 0); g.lineTo(30, 0); g.stroke(); }
  else if (S.cls === 'ranger') { g.beginPath(); g.arc(12, 0, 14, -0.9, 0.9); g.stroke(); }
  else { g.fillStyle = '#8ab4ff'; g.beginPath(); g.arc(22, 0, 5, 0, Math.PI * 2); g.fill(); }
  g.restore();
  if (p.shield > 0) {
    g.strokeStyle = 'rgba(150,200,255,0.8)'; g.lineWidth = 3;
    g.beginPath(); g.arc(p.x, p.y, 26, 0, Math.PI * 2); g.stroke();
  }
}

function drawFloats() {
  g.textAlign = 'center';
  g.font = 'bold 16px Tahoma, Arial, sans-serif';
  for (const f of floats) {
    g.globalAlpha = clamp(f.t, 0, 1);
    g.fillStyle = f.col;
    g.fillText(f.txt, f.x, f.y);
  }
  g.globalAlpha = 1;
  g.textAlign = 'start';
}

function draw() {
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.fillStyle = '#0b0d14'; g.fillRect(0, 0, W, H);
  if (!run) return;
  drawZoneBase(run.zone);
  drawAreas();
  drawPillars();
  drawFx();
  for (const e of run.enemies) drawEnemy(e);
  for (const a of run.allies) drawAlly(a);
  drawProjs(run.eprojs, false);
  drawProjs(run.projs, true);
  drawPlayer();
  drawFloats();
}
