/* ===== الإدخال: عصا اللمس، زر الهجوم، لوحة المفاتيح ===== */
const input = { x: 0, y: 0 };
const keys = {};
let attackHeld = false;
let jId = null;

const joy = document.getElementById('joy');
const knob = document.getElementById('knob');

function moveJoy(e) {
  const r = joy.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy;
  const max = r.width / 2 - 28;
  const d = Math.hypot(dx, dy);
  const k = d > max ? max / d : 1;
  dx *= k; dy *= k;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  input.x = dx / max; input.y = dy / max;
}
joy.addEventListener('pointerdown', e => { jId = e.pointerId; joy.setPointerCapture(e.pointerId); moveJoy(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === jId) moveJoy(e); });
function endJoy(e) {
  if (e.pointerId !== jId) return;
  jId = null; input.x = 0; input.y = 0;
  knob.style.transform = 'translate(0,0)';
}
joy.addEventListener('pointerup', endJoy);
joy.addEventListener('pointercancel', endJoy);

const atkBtn = document.getElementById('atk');
atkBtn.addEventListener('pointerdown', e => { e.preventDefault(); attackHeld = true; playerAttack(); });
const releaseAtk = () => { attackHeld = false; };
atkBtn.addEventListener('pointerup', releaseAtk);
atkBtn.addEventListener('pointercancel', releaseAtk);
atkBtn.addEventListener('pointerleave', releaseAtk);

function readKeys() {
  if (jId !== null) return;
  let x = 0, y = 0;
  if (keys.arrowleft || keys.a) x--;
  if (keys.arrowright || keys.d) x++;
  if (keys.arrowup || keys.w) y--;
  if (keys.arrowdown || keys.s) y++;
  input.x = x; input.y = y;
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (!run) return;
  if (e.key === ' ') { e.preventDefault(); playerAttack(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 6) {
    const list = ownedActives().slice(0, 6);
    if (list[n - 1]) useSkill(list[n - 1]);
  }
});
window.addEventListener('keyup', e => { delete keys[e.key.toLowerCase()]; });
window.addEventListener('blur', () => { for (const k in keys) delete keys[k]; input.x = 0; input.y = 0; });
