// T59 modo foto: desde la pausa (tecla F o botón "Foto") oculta HUD/menú y orbita la cámara al auto; C captura PNG; Esc vuelve a la pausa.
// main.ts solo llama photoApply(cam, p) cada cuadro tras posicionar la cámara; al salir la cámara normal retoma sola.
import * as B from "./bjs";
import { sharePng } from "./share";

let on = false, az = 0, el = 0.5, rad = 15, canvas: HTMLCanvasElement, ui: HTMLElement;
const css = document.createElement("style");
css.textContent = "body.photo #hud,body.photo #touch,body.photo .scr{display:none!important}#photoUi{position:fixed;left:0;right:0;bottom:16px;display:none;justify-content:center;gap:10px;z-index:99}body.photo #photoUi{display:flex}#photoUi button{padding:10px 16px}";
document.head.append(css);

export const photoOn = () => on;
export function photoApply(cam: B.FreeCamera, p: B.Vector3) {
  cam.position.set(p.x + rad * Math.cos(el) * Math.sin(az), p.y + 1 + rad * Math.sin(el), p.z + rad * Math.cos(el) * Math.cos(az));
  cam.setTarget(new B.Vector3(p.x, p.y + 0.8, p.z));
}
let onShot: (() => void) | undefined;
function shoot(share = false) {
  onShot?.(); // canvas.toBlob: sin preserveDrawingBuffer hay que pedirlo justo tras render, por eso se espera al próximo cuadro
  const sc = (window as unknown as { __scene?: B.Scene }).__scene;
  const go = () => canvas.toBlob((b) => { if (!b) return; if (share) { void sharePng(b, `rc_fight_${Date.now()}.png`); return; } const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `rc_fight_${Date.now()}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/png");
  if (sc) sc.onAfterRenderObservable.addOnce(go); else go();
}
export function initPhoto(o: { scene: B.Scene; canvas: HTMLCanvasElement; inPause(): boolean; onShot?(): void }) {
  canvas = o.canvas; onShot = o.onShot; (window as unknown as { __scene?: B.Scene }).__scene = o.scene;
  ui = document.createElement("div"); ui.id = "photoUi";
  ui.innerHTML = '<button id="photoShot">Capturar (C)</button><button id="photoShare">Compartir</button><button id="photoBack">Salir (Esc)</button>';
  document.body.append(ui);
  const exit = () => { on = false; document.body.classList.remove("photo"); };
  const enter = () => { if (o.inPause()) { on = true; document.body.classList.add("photo"); } };
  document.getElementById("photoBtn")?.addEventListener("click", enter);
  document.getElementById("photoShot")!.onclick = () => shoot();
  document.getElementById("photoShare")!.onclick = () => shoot(true);
  document.getElementById("photoBack")!.onclick = exit;
  addEventListener("keydown", (e) => {
    if (!on) { if (e.code === "KeyF" && !e.repeat) enter(); return; }
    e.stopImmediatePropagation(); e.preventDefault(); // en modo foto el menú no ve ninguna tecla
    if (e.code === "Escape") exit(); else if (e.code === "KeyC") shoot();
  }, true);
  let drag: { x: number; y: number } | null = null, pinch = 0;
  const pts = new Map<number, { x: number; y: number }>();
  canvas.addEventListener("pointerdown", (e) => { if (on) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener("pointerup", (e) => { pts.delete(e.pointerId); pinch = 0; drag = null; });
  canvas.addEventListener("pointermove", (e) => {
    if (!on || !pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) rad = Math.min(60, Math.max(4, rad * pinch / d)); pinch = d; return; }
    if (drag) { az -= (e.clientX - drag.x) * 0.008; el = Math.min(1.5, Math.max(0.02, el + (e.clientY - drag.y) * 0.008)); drag = { x: e.clientX, y: e.clientY }; }
  });
  canvas.addEventListener("wheel", (e) => { if (on) rad = Math.min(60, Math.max(4, rad * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: true });
}
