// Teclado + gamepad + táctil unificados en un solo estado.
// move: dirección deseada en pantalla (táctil/stick). Si está activa, el auto gira solo hacia ahí.
export const input = { throttle: 0, steer: 0, boost: false, drift: false, ability: false, jump: false, moveX: 0, moveY: 0, move: false };

// Teclado: dos teclas por acción [principal, alternativa] ("" = vacía). Todo reasignable en Configuración → Controles (menu.ts).
// Los menús siguen con flechas, Enter y Esc fijos.
export const KEYS0 = {
  up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  boost: ["Space", ""], drift: ["ShiftLeft", "ShiftRight"], jump: ["KeyF", ""], ability: ["KeyE", ""], cam: ["KeyC", ""], reroll: ["KeyR", ""],
  pause: ["Escape", "KeyP"], mute: ["KeyM", ""], zoomIn: ["Equal", "NumpadAdd"], zoomOut: ["Minus", "NumpadSubtract"],
} satisfies Record<string, [string, string]>;
export type Action = keyof typeof KEYS0;
export type Binds<T> = Record<string, T[]>;
export const KEYS: Record<Action, string[]> = structuredClone(KEYS0);
export const keyHit = (a: Action, code: string) => KEYS[a].includes(code);

// Joystick (mapeo estándar del navegador: 0 abajo, 1 derecha, 2 izquierda, 3 arriba, 4/5 hombros, 6/7 gatillos, 8 select/view, 9 start/menu,
// 10/11 sticks presionados, 12-15 cruceta, 16 guía). Un botón por acción; -1 = sin asignar.
// Cambiar cámara va en View/Select (8): en el juego estaba libre.
export const PADB0 = { accel: [7], brake: [6], boost: [0], drift: [1], ability: [2], jump: [4], reroll: [3], cam: [8], pause: [9], ok: [0], back: [1] };
export type PadAct = keyof typeof PADB0;
// mode: "trig" = gatillos aceleran/frenan y el stick gira; "stick" = el stick apunta hacia dónde ir
export const PAD0 = { dead: 0.15, sens: 1, invX: false, invY: false, stick: "left" as "left" | "right", mode: "trig" as "trig" | "stick", btn: PADB0 as Record<PadAct, number[]> };
export const PAD: typeof PAD0 = structuredClone(PAD0);
export const pb = (a: PadAct) => PAD.btn[a][0];

// Carrera y batalla (kart.ts): controles propios. Teclado 1 = J1, Teclado 2 = J2 (con un solo jugador en teclado manejan los dos); joystick: dos botones por acción.
export const RACE0 = {
  kb1: { up: ["KeyW", ""], down: ["KeyS", ""], left: ["KeyA", ""], right: ["KeyD", ""], drift: ["Space", "ShiftLeft"], item: ["KeyE", "KeyQ"] },
  kb2: { up: ["ArrowUp", ""], down: ["ArrowDown", ""], left: ["ArrowLeft", ""], right: ["ArrowRight", ""], drift: ["ShiftRight", "Period"], item: ["Enter", "Comma"] },
  pad: { accel: [7, 0], brake: [6, 1], drift: [5, 2], item: [3, 4] },
};
export const RACE: { kb1: Binds<string>; kb2: Binds<string>; pad: Binds<number> } = structuredClone(RACE0);

/** Cambiar cámara: solo el evento ("camcycle" en window); quien maneje las cámaras lo escucha. */
export const camCycle = () => dispatchEvent(new Event("camcycle"));

// Íconos del joystick según la familia detectada por el id que da el navegador (vendor 054c Sony, 057e Nintendo, 045e Microsoft)
export type Fam = "xbox" | "ps" | "switch" | "gen";
export const famOf = (id = activePad()?.id ?? ""): Fam => /045e|xbox|xinput/i.test(id) ? "xbox" : /054c|playstation|dualshock|dualsense|wireless controller/i.test(id) ? "ps" : /057e|nintendo|switch|joy-con|pro controller/i.test(id) ? "switch" : "gen"; // Xbox primero: su id también dice "Wireless Controller"
const DPAD = ["Arriba", "Abajo", "Izq.", "Der."];
const BTN: Record<Fam, string[]> = {
  xbox: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "View", "Menu", "LS", "RS", ...DPAD, "Xbox"],
  ps: ["\u2715", "\u25CB", "\u25A1", "\u25B3", "L1", "R1", "L2", "R2", "Create", "Options", "L3", "R3", ...DPAD, "PS"],
  switch: ["B", "A", "Y", "X", "L", "R", "ZL", "ZR", "\u2212", "+", "LS", "RS", ...DPAD, "Home"],
  gen: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "Select", "Start", "LS", "RS", ...DPAD, "Guía"],
};
export const FAM_NAME: Record<Fam, string> = { xbox: "Xbox", ps: "PlayStation", switch: "Switch", gen: "Genérico" };
export const btnName = (i: number, f = famOf()) => (i < 0 ? "—" : BTN[f][i] ?? `B${i}`);
/** Botón como chip (HTML) con el color de su familia. */
export const btnChip = (i: number, f = famOf()) => `<kbd class="pb ${f}">${btnName(i, f)}</kbd>`;

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
let jumpPulse = false;
addEventListener("keydown", (e) => { keys.add(e.code); if (keyHit("jump", e.code)) jumpPulse = true; });
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
  document.getElementById("tJump")!.addEventListener("pointerdown", (e) => { e.preventDefault(); jumpPulse = true; });
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

// ---------- Disposición táctil (Configuración → Editar controles táctiles) ----------
// Cada control guardado = centro en fracción de la pantalla (x, y) y escala propia (s, se multiplica por el tamaño general).
// Una disposición por orientación: v = vertical, h = apaisado (TLays); se aplica la de la orientación actual.
export type TCtl = "stick" | "boost" | "drift" | "jump" | "abil" | "pause" | "cam";
export type TLay = Partial<Record<TCtl, { x: number; y: number; s: number }>>;
export const TCTLS: Record<TCtl, string> = { stick: "stickBase", boost: "tBoost", drift: "tDrift", jump: "tJump", abil: "tAbil", pause: "tPause", cam: "tCam" };
export type TLays = { v: TLay; h: TLay };
const portrait = matchMedia("(orientation: portrait)");
export const orient = () => (portrait.matches ? "v" : "h");
let lastLays: TLays = { v: {}, h: {} }, lastScale = 1;
portrait.addEventListener("change", () => { if (!editing) applyTouchLayouts(lastLays, lastScale); });
export function applyTouchLayouts(lays: TLays, scale: number) { lastLays = lays; lastScale = scale; applyTouchLayout(lays[orient()], scale); }
function applyTouchLayout(lay: TLay, scale: number) {
  for (const [k, id] of Object.entries(TCTLS) as [TCtl, string][]) {
    const el = document.getElementById(id), l = lay[k];
    if (!el) continue;
    const st = el.style, zone = k === "stick" ? document.getElementById("stickZone")!.style : null;
    if (!l) { st.cssText = ""; if (zone) zone.cssText = ""; continue; } // sin guardar: la del CSS
    if (zone) { // el stick arrastra su zona de toque: un cuadro alrededor de la base
      const w = 300 * l.s * scale;
      Object.assign(zone, { left: `calc(${l.x * 100}% - ${w / 2}px)`, top: `calc(${l.y * 100}% - ${w / 2}px)`, right: "auto", bottom: "auto", width: `${w}px`, height: `${w}px` });
      Object.assign(st, { left: "50%", top: "50%", right: "auto", bottom: "auto", translate: "-50% -50%", scale: String(l.s * scale), transformOrigin: "center" });
    } else Object.assign(st, { position: "fixed", left: `${l.x * 100}%`, top: `${l.y * 100}%`, right: "auto", bottom: "auto", translate: "-50% -50%", scale: String(l.s * scale), transformOrigin: "center" });
  }
}
/** Modo edición: arrastrar mueve; arrastrar desde la esquina de abajo a la derecha agranda. onChange recibe la disposición nueva al soltar. */
let editing: { lay: TLay; scale: number; onChange: (l: TLay) => void } | null = null;
export function editTouch(on: boolean, lay: TLay = {}, scale = 1, onChange: (l: TLay) => void = () => {}) {
  editing = on ? { lay: structuredClone(lay), scale, onChange } : null;
  document.body.classList.toggle("tedit", on);
}
let drag: { k: TCtl; size: boolean; x0: number; y0: number; l0: { x: number; y: number; s: number }; w: number } | null = null;
addEventListener("pointerdown", (e) => {
  if (!editing) return;
  const hit = (Object.entries(TCTLS) as [TCtl, string][]).find(([, id]) => document.getElementById(id)?.contains(e.target as Node));
  if (!hit) return;
  e.stopPropagation(); e.preventDefault();
  const r = document.getElementById(hit[1])!.getBoundingClientRect();
  const l0 = editing.lay[hit[0]] ?? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, s: 1 };
  drag = { k: hit[0], size: e.clientX > r.right - r.width * 0.3 && e.clientY > r.bottom - r.height * 0.3, x0: e.clientX, y0: e.clientY, l0, w: r.width };
}, true);
addEventListener("pointermove", (e) => {
  if (!editing || !drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0, c = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v)), l = drag.l0;
  editing.lay[drag.k] = drag.size ? { ...l, s: c(l.s * (1 + (dx + dy) / drag.w), 0.6, 2) } : { ...l, x: c(l.x + dx / innerWidth, 0.04, 0.96), y: c(l.y + dy / innerHeight, 0.04, 0.96) };
  applyTouchLayout(editing.lay, editing.scale);
}, true);
addEventListener("pointerup", () => { if (editing && drag) { drag = null; editing.onChange(structuredClone(editing.lay)); } }, true);
addEventListener("click", (e) => { if (editing && (e.target as HTMLElement).closest?.("#touch")) { e.stopPropagation(); e.preventDefault(); } }, true); // la pausa no se dispara al moverla

const dz = (v: number) => (Math.abs(v) < PAD.dead ? 0 : Math.max(-1, Math.min(1, v * PAD.sens)));
/** Stick elegido para manejar, con zona muerta, sensibilidad e inversión. */
export const stickXY = (gp: Gamepad) => { const i = PAD.stick === "right" ? 2 : 0; return [dz(gp.axes[i] ?? 0) * (PAD.invX ? -1 : 1), dz(gp.axes[i + 1] ?? 0) * (PAD.invY ? -1 : 1)]; };
const bv = (gp: Gamepad, i: number) => (i < 0 ? 0 : gp.buttons[i]?.value || +!!gp.buttons[i]?.pressed);

export function pollInput() {
  const k = (a: Action) => KEYS[a].some((x) => keys.has(x));
  let throttle = (k("up") ? 1 : 0) - (k("down") ? 1 : 0);
  let steer = (k("right") ? 1 : 0) - (k("left") ? 1 : 0);
  let boost = k("boost");
  let drift = k("drift");
  let ability = k("ability");
  let jump = jumpPulse;

  let moveX = 0, moveY = 0;
  const gp = activePad();
  if (gp) {
    const b = (i: number) => +!!gp.buttons[i]?.pressed, on = (a: PadAct) => bv(gp, pb(a)) > 0.5;
    const [sx, sy] = stickXY(gp), cx = b(15) - b(14), cy = b(12) - b(13); // stick o cruceta
    const trig = PAD.mode === "stick" ? 0 : bv(gp, pb("accel")) - bv(gp, pb("brake"));
    if (PAD.mode === "trig") { if (trig) throttle = trig; if (sx || cx) steer = sx || cx; }
    else { moveX = sx || cx; moveY = -sy || cy; }
    boost ||= on("boost");
    drift ||= on("drift");
    ability ||= on("ability");
    jump ||= on("jump");
  }

  if (touch.x || touch.y) { moveX = touch.x; moveY = -touch.y; }
  boost ||= touch.boost;
  drift ||= touch.drift;
  ability ||= touch.ability;

  Object.assign(input, { throttle, steer, boost, drift, ability, jump, moveX, moveY, move: !!(moveX || moveY) });
  jumpPulse = false;
}

// Botones de menú del gamepad: una foto por cuadro (padSnap) para que un botón mantenido desde el juego no "aprete" en el menú
let prevPad: boolean[] = [], curPad: boolean[] = [], fam = famOf("");
export function padSnap() {
  prevPad = curPad;
  // Cualquier control conectado navega los menús (se suman los botones de todos)
  curPad = [];
  for (const gp of pads()) {
    gp.buttons.forEach((b, i) => { curPad[i] ||= b.pressed; });
    // El stick también cuenta como cruceta (12-15 = arriba, abajo, izquierda, derecha): así navega las cartas de mejora
    const [x = 0, y = 0] = gp.axes; curPad[12] ||= y < -0.5; curPad[13] ||= y > 0.5; curPad[14] ||= x < -0.5; curPad[15] ||= x > 0.5;
  }
  if (curPad.some(Boolean)) { setCtl("pad"); const f = famOf(); if (f !== fam) { fam = f; dispatchEvent(new Event("ctl")); } } // otra familia de joystick: se rehacen los íconos
}
export const padPressed = (i: number) => i >= 0 && !!curPad[i] && !prevPad[i];
/** Primer botón real recién presionado (captura de Configuración); los ejes del stick no cuentan. */
export const padAny = () => { for (const gp of pads()) for (let i = 0; i < gp.buttons.length; i++) if (gp.buttons[i].pressed && !prevPad[i]) return i; return -1; };

// ---------- Carrera (kart.ts): un control por jugador ----------
// "kbd" = Teclado 1, "kbd2" = Teclado 2, "kbd+2" = los dos juntos (un solo jugador en teclado); { pad: n } = n-ésimo joystick conectado
export type PlayerCtl = "kbd" | "kbd2" | "kbd+2" | { pad: number };
export const padsConnected = () => pads().length;
export function pollPlayer(c: PlayerCtl) {
  if (typeof c === "string") {
    const S = c === "kbd2" ? [RACE.kb2] : c === "kbd" ? [RACE.kb1] : [RACE.kb1, RACE.kb2];
    const k = (a: string) => S.some((t) => t[a].some((x) => keys.has(x)));
    return { throttle: (k("up") ? 1 : 0) - (k("down") ? 1 : 0), steer: (k("right") ? 1 : 0) - (k("left") ? 1 : 0), drift: k("drift"), item: k("item") };
  }
  const gp = pads()[c.pad];
  if (!gp) return { throttle: 0, steer: 0, drift: false, item: false };
  const b = (i: number) => !!gp.buttons[i]?.pressed, v = (a: string) => Math.max(...RACE.pad[a].map((i) => bv(gp, i)));
  const steer = stickXY(gp)[0] || (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
  return { throttle: v("accel") - v("brake"), steer, drift: v("drift") > 0.5, item: v("item") > 0.5 };
}
