/* ===== التشغيل والحلقة الرئيسية ===== */
S = loadGame();
if (S) {
  S.p.hp = Math.min(maxHp(), S.p.hp || maxHp());
  S.p.mp = Math.min(maxMp(), S.p.mp || maxMp());
}
showMenu(true);

let last = performance.now();
let saveTimer = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateFloats(dt);
  if (run && S) {
    readKeys();
    if (attackHeld) playerAttack();
    updateGame(dt);
    if (run) {
      updateHud();
      updateSkillsUI();
      saveTimer += dt;
      if (saveTimer > 15) { saveTimer = 0; saveGame(); }
    }
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
