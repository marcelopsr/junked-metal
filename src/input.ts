// Teclado + gamepad + táctil unificados en un solo estado.
// move: dirección deseada en pantalla (táctil/stick). Si está activa, el auto gira solo hacia ahí.
export const input = { throttle: 0, steer: 0, boost: false, drift: false, moveX: 0, moveY: 0, move: false };

// Teclas por acción: la primera es reasignable (Configuración → Controles), las flechas quedan siempre
export const KEYS = { up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], boost: ["Space"], drift: ["ShiftLeft", "ShiftRight"] };
export type Action = keyof typeof KEYS;
// Gamepad: zona muerta y sensibilidad del stick
export const PAD = { dead: 0.15, sens: 1 };

const keys = new Set<string>();
addEventListener("keydown", (e) => keys.add(e.code));
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

const touch = { x: 0, y: 0, boost: false, drift: false };
export const isTouch = matchMedia("(pointer: coarse)").matches;

export function setupTouch() {
  document.getElementById("touch")!.classList.remove("hidden");
  const zone = document.getElementById("stickZone")!;
  const base = document.getElementById("stickBase")!;
  const knob = document.getElementById("stickKnob")!;
  let id = -1;
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    const r = base.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    touch.x = dx; touch.y = dy;
    knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  };
  zone.addEventListener("pointerdown", (e) => { id = e.pointerId; move(e); });
  zone.addEventListener("pointermove", move);
  const end = (e: PointerEvent) => { if (e.pointerId !== id) return; id = -1; touch.x = touch.y = 0; knob.style.transform = ""; };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
  const hold = (elId: string, k: "boost" | "drift") => {
    const el = document.getElementById(elId)!;
    el.addEventListener("pointerdown", () => (touch[k] = true));
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(ev, () => (touch[k] = false));
  };
  hold("tBoost", "boost");
  hold("tDrift", "drift");
}

const dz = (v: number) => (Math.abs(v) < PAD.dead ? 0 : Math.max(-1, Math.min(1, v * PAD.sens)));

export function pollInput() {
  const k = (...c: string[]) => c.some((x) => keys.has(x));
  let throttle = (k(...KEYS.up) ? 1 : 0) - (k(...KEYS.down) ? 1 : 0);
  let steer = (k(...KEYS.right) ? 1 : 0) - (k(...KEYS.left) ? 1 : 0);
  let boost = k(...KEYS.boost);
  let drift = k(...KEYS.drift);

  let moveX = 0, moveY = 0;
  const gp = navigator.getGamepads?.()[0];
  if (gp) {
    const trig = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
    if (trig) { throttle = trig; if (dz(gp.axes[0])) steer = dz(gp.axes[0]); }
    else { moveX = dz(gp.axes[0]); moveY = -dz(gp.axes[1]); }
    boost ||= !!gp.buttons[0]?.pressed;
    drift ||= !!(gp.buttons[1]?.pressed || gp.buttons[2]?.pressed);
  }

  if (touch.x || touch.y) { moveX = touch.x; moveY = -touch.y; }
  boost ||= touch.boost;
  drift ||= touch.drift;

  Object.assign(input, { throttle, steer, boost, drift, moveX, moveY, move: !!(moveX || moveY) });
}

// Botones de menú del gamepad (para elegir cartas sin mouse)
let prevPad: boolean[] = [];
export function padPressed(i: number) {
  const gp = navigator.getGamepads?.()[0];
  const now = !!gp?.buttons[i]?.pressed;
  const was = prevPad[i];
  prevPad[i] = now;
  return now && !was;
}
