// Teclado + gamepad + táctil unificados en un solo estado.
// move: dirección deseada en pantalla (táctil/stick). Si está activa, el auto gira solo hacia ahí.
export const input = { throttle: 0, steer: 0, boost: false, drift: false, ability: false, moveX: 0, moveY: 0, move: false };

// Teclas por acción: la primera es reasignable (Configuración → Controles), las flechas quedan siempre
export const KEYS = { up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], boost: ["Space"], drift: ["ShiftLeft", "ShiftRight"], ability: ["KeyE"] };
export type Action = keyof typeof KEYS;
// Gamepad: zona muerta y sensibilidad del stick
export const PAD = { dead: 0.15, sens: 1 };

// Joysticks: cualquier ranura (Bluetooth o USB pueden caer en la 1, 2 o 3; el navegador deja huecos al desconectar).
// El que se usó último manda en la partida y en los menús; la carrera asigna uno por jugador (pollPlayer).
export const pads = () => [...(navigator.getGamepads?.() ?? [])].filter((g): g is Gamepad => !!g && g.connected);
export const activePad = (): Gamepad | undefined => pads().reduce<Gamepad | undefined>((a, g) => (!a || g.timestamp > a.timestamp ? g : a), undefined);
// Aviso al conectar o desconectar (el navegador recién lo expone al apretar un botón del control)
let toastT = 0;
function padToast(txt: string) {
  let el = document.getElementById("padToast");
  if (!el) { el = document.createElement("div"); el.id = "padToast"; document.body.appendChild(el); }
  el.textContent = txt; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el!.classList.remove("on"), 2600) as unknown as number;
}
addEventListener("gamepadconnected", (e) => padToast(`CONTROL ${pads().length} CONECTADO · ${(e as GamepadEvent).gamepad.id.replace(/\(.*\)/, "").trim().slice(0, 32) || "joystick"}`));
addEventListener("gamepaddisconnected", () => padToast(`CONTROL DESCONECTADO · ${pads().length} conectado${pads().length === 1 ? "" : "s"}`));

const keys = new Set<string>();
addEventListener("keydown", (e) => keys.add(e.code));
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

const touch = { x: 0, y: 0, boost: false, drift: false, ability: false };
export const isTouch = matchMedia("(pointer: coarse)").matches;

// Último control usado: los textos de ayuda se adaptan (menu.ts escucha el evento "ctl" en window)
export type Ctl = "keys" | "pad" | "touch";
export let ctl: Ctl = isTouch ? "touch" : "keys";
const setCtl = (c: Ctl) => { if (c !== ctl) { ctl = c; dispatchEvent(new Event("ctl")); } };
addEventListener("keydown", () => setCtl("keys"));
addEventListener("pointerdown", (e) => setCtl(e.pointerType === "mouse" ? "keys" : "touch"));

// onPinch(k): k > 1 = abrir los dedos (acercar). Solo cuenta dedos apoyados sobre el canvas, así el stick y los botones no interfieren.
export function setupTouch(onPinch?: (k: number) => void) {
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
  const hold = (elId: string, k: "boost" | "drift" | "ability") => {
    const el = document.getElementById(elId)!;
    el.addEventListener("pointerdown", () => (touch[k] = true));
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(ev, () => (touch[k] = false));
  };
  hold("tBoost", "boost");
  hold("tDrift", "drift");
  hold("tAbil", "ability");
  // Pellizco de dos dedos sobre el juego = zoom
  const cv = document.getElementById("c")!, pts = new Map<number, [number, number]>();
  let pd = 0;
  const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  cv.addEventListener("pointerdown", (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) pd = gap(); });
  cv.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size !== 2) return;
    const d = gap();
    if (pd > 20 && d > 20 && Math.abs(d / pd - 1) > 0.02) { onPinch?.(d / pd); pd = d; }
  });
  for (const ev of ["pointerup", "pointercancel"]) cv.addEventListener(ev, (e) => { pts.delete((e as PointerEvent).pointerId); pd = 0; });
}

const dz = (v: number) => (Math.abs(v) < PAD.dead ? 0 : Math.max(-1, Math.min(1, v * PAD.sens)));

export function pollInput() {
  const k = (...c: string[]) => c.some((x) => keys.has(x));
  let throttle = (k(...KEYS.up) ? 1 : 0) - (k(...KEYS.down) ? 1 : 0);
  let steer = (k(...KEYS.right) ? 1 : 0) - (k(...KEYS.left) ? 1 : 0);
  let boost = k(...KEYS.boost);
  let drift = k(...KEYS.drift);
  let ability = k(...KEYS.ability);

  let moveX = 0, moveY = 0;
  const gp = activePad();
  if (gp) {
    const b = (i: number) => +!!gp.buttons[i]?.pressed;
    const trig = (gp.buttons[7]?.value ?? 0) - (gp.buttons[6]?.value ?? 0);
    if (trig) { throttle = trig; if (dz(gp.axes[0])) steer = dz(gp.axes[0]); }
    else { moveX = dz(gp.axes[0]) || b(15) - b(14); moveY = -dz(gp.axes[1]) || b(12) - b(13); } // stick o cruceta
    boost ||= !!gp.buttons[0]?.pressed;
    drift ||= !!gp.buttons[1]?.pressed;
    ability ||= !!gp.buttons[2]?.pressed; // X
  }

  if (touch.x || touch.y) { moveX = touch.x; moveY = -touch.y; }
  boost ||= touch.boost;
  drift ||= touch.drift;
  ability ||= touch.ability;

  Object.assign(input, { throttle, steer, boost, drift, ability, moveX, moveY, move: !!(moveX || moveY) });
}

// Botones de menú del gamepad: una foto por cuadro (padSnap) para que un botón mantenido desde el juego no "aprete" en el menú
let prevPad: boolean[] = [], curPad: boolean[] = [];
export function padSnap() {
  prevPad = curPad;
  // Cualquier control conectado navega los menús (se suman los botones de todos)
  curPad = [];
  for (const gp of pads()) {
    gp.buttons.forEach((b, i) => { curPad[i] ||= b.pressed; });
    // El stick también cuenta como cruceta (12-15 = arriba, abajo, izquierda, derecha): así navega las cartas de mejora
    const [x = 0, y = 0] = gp.axes; curPad[12] ||= y < -0.5; curPad[13] ||= y > 0.5; curPad[14] ||= x < -0.5; curPad[15] ||= x > 0.5;
  }
  if (curPad.some(Boolean)) setCtl("pad");
}
export const padPressed = (i: number) => !!curPad[i] && !prevPad[i];

// ---------- Carrera (kart.ts): un control por jugador ----------
// "kbd1" = WASD (+ flechas si nadie más usa el teclado), "kbd2" = flechas; { pad: n } = n-ésimo joystick conectado
export type PlayerCtl = "kbd1" | "kbd1+arrows" | "kbd2" | { pad: number };
const SCHEMES = {
  kbd1: { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], drift: ["Space", "ShiftLeft"], item: ["KeyE", "KeyQ"] },
  "kbd1+arrows": { up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], drift: ["Space", "ShiftLeft", "ShiftRight"], item: ["KeyE", "KeyQ", "Enter"] },
  kbd2: { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], drift: ["ShiftRight", "Period", "Numpad0"], item: ["Enter", "Comma", "ControlRight"] },
};
export const padsConnected = () => pads().length;
export function pollPlayer(c: PlayerCtl) {
  if (typeof c === "string") {
    const S = SCHEMES[c], k = (...a: string[]) => a.some((x) => keys.has(x));
    return { throttle: (k(...S.up) ? 1 : 0) - (k(...S.down) ? 1 : 0), steer: (k(...S.right) ? 1 : 0) - (k(...S.left) ? 1 : 0), drift: k(...S.drift), item: k(...S.item) };
  }
  const gp = pads()[c.pad];
  if (!gp) return { throttle: 0, steer: 0, drift: false, item: false };
  const b = (i: number) => !!gp.buttons[i]?.pressed;
  const acc = Math.max(gp.buttons[7]?.value ?? 0, b(0) ? 1 : 0), brk = Math.max(gp.buttons[6]?.value ?? 0, b(1) ? 1 : 0);
  const steer = dz(gp.axes[0] ?? 0) || (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
  return { throttle: acc - brk, steer, drift: b(5) || b(2), item: b(3) || b(4) };
}
