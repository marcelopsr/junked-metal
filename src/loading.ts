import { isTouch } from "./input";

// Pantalla de carga (#load en index.html) y precarga en segundo plano.
// - Arranque: el HTML ya la trae visible; main.ts la avanza con boot() y la cierra con bootEnd() al dibujar la portada.
// - Cada trabajo pesado del juego es una Task con su peso (w) y un `done()`. Se hacen solos, uno por vez y en huecos libres (idle), mientras
//   el jugador está en los menús (preload). Al empezar partida o carrera, launch() completa lo que falte (la barra arranca ya avanzada).
// - Solo se muestra si hay algo pendiente o si la carga pasa de DELAY ms; una vez visible queda HOLD ms para no parpadear.
export type Task = { id: string; label: string; w: number; done: () => boolean; run: () => void | Promise<void>; prog?: () => number };

const DELAY = 150, HOLD = 320, FADE = 200;
export const times: Record<string, number> = {}; // ms de cada tarea (dev: __loadTimes)

const TIPS = [
  "Las armas disparan solas. Al auto le toca esquivar, rodear y juntar tuercas, o sea, el trabajo de verdad.",
  "Cada tuerca suelta experiencia. Juntarlas rápido sube de nivel y ofrece cartas nuevas: la única promoción que existe en este patio.",
  "Derrapar, saltar y hacer trucos suben el multiplicador de experiencia hasta x2. Un golpe lo reinicia, como un lunes.",
  "Un arma en su nivel máximo evoluciona al abrir un cofre, siempre que se tenga la pasiva que la acompaña. Requisitos del puesto, como siempre.",
  "Dos armas en su nivel máximo pueden fusionarse en una nueva, igual que las empresas. Si hay una fusión disponible, es la primera carta.",
  "Los minijefes llegan a los 3:20 y a los 6:40 y sueltan cofres. El jefe final aparece a los 10:00, puntual, a diferencia de todo lo demás.",
  "Las flechas del borde de la pantalla señalan jefes y cofres que quedaron fuera de vista. Mirar para otro lado no los hace desaparecer.",
  "Las macetas se rompen con la embestida o con las armas: sueltan tuercas y, a veces, una pila que repara el auto. Nadie las va a extrañar.",
  "El turbo gasta energía mientras se usa y se recarga solo al soltarlo. Como las vacaciones.",
  "En el Taller se compran mejoras permanentes con tornillos. Cada partida suma según el tiempo sobrevivido y las bajas. Es lo más parecido a un sueldo.",
  "La Chatarroteca anota con qué armas se hace más daño a cada bicho. Alguien tenía que llevar el expediente.",
  "Bajo la mesa del patio y dentro del garaje la cámara se acerca para no perder de vista al auto. Hasta ella se preocupa.",
  "El Desafío diario usa la misma semilla durante todo el día: todos sufren el mismo patio.",
  "El Garaje y el Jardín son zonas nuevas que se desbloquean en el Taller. Más metros cuadrados, mismos problemas.",
  "Esc pausa la partida y M apaga el sonido. Ninguna de las dos resuelve los problemas de fondo.",
  "En Carrera, derrapar en las curvas carga un mini-turbo. Perder el control con propósito: un clásico.",
  "En la Batalla de globos cada corredor tiene tres globos: gana el último en pie. Como en la vida, pero con globos.",
  "Al terminar una partida, la pantalla de resultados permite guardar una foto del último momento. Sirve como prueba ante el seguro.",
  "La pintura, las llantas y los calcos del auto se cambian en el Garaje. No arregla nada, pero se ve mejor.",
];

const $ = (id: string) => document.getElementById(id)!;
const frame = () => new Promise<void>((r) => { requestAnimationFrame(() => r()); setTimeout(r, 120); }); // sin rAF (pestaña oculta) no se cuelga
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------- Pantalla ----------
let shown = true, shownAt = 0, hideT = 0; // el HTML la trae visible
// ponytail: el auto de la carga es un SVG de perfil genérico con la pintura y las llantas elegidas (no cambia de modelo por auto); uno 3D pediría otra escena y canvas
function paint() { // el auto lleva la pintura y las llantas elegidas (localStorage, igual que menu.ts; sin guardado queda el rojo de fábrica)
  try {
    const s = JSON.parse(localStorage.getItem("rcfight2") ?? "{}"), car = document.querySelector<HTMLElement>("#load .ld-car")!;
    if (/^#[0-9a-f]{6}$/i.test(s.paint)) car.style.setProperty("--paint", s.paint);
    if (/^#[0-9a-f]{6}$/i.test(s.rim)) car.style.setProperty("--rim", s.rim);
  } catch { /* sin guardado */ }
}
let lastTip = -1;
function show() {
  if (shown) return;
  shown = true; shownAt = performance.now();
  clearTimeout(hideT);
  const el = $("load"), tip = (lastTip + 1 + Math.floor(Math.random() * (TIPS.length - 1))) % TIPS.length; // al azar, sin repetir el anterior
  lastTip = tip;
  $("ldTip").textContent = TIPS[tip];
  paint();
  const bar = $("ldBar"); bar.style.transition = "none"; set("Preparando", 0); void bar.offsetWidth; bar.style.transition = ""; // la barra no retrocede a la vista
  el.classList.remove("hidden", "out");
  el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
}
async function hide() {
  if (!shown) return;
  const el = $("load");
  el.classList.add("out"); // deja usar la UI debajo mientras termina el HOLD / fade
  await sleep(Math.max(0, shownAt + HOLD - performance.now()));
  hideT = window.setTimeout(() => { el.classList.add("hidden"); el.classList.remove("in"); shown = false; }, FADE);
}
function set(label: string, f: number) {
  $("ldStep").textContent = label;
  const p = Math.max(0, Math.min(1, f));
  $("ldBar").style.transform = `scaleX(${p})`;
  $("ldPct").textContent = `${Math.round(p * 100)}%`;
}

/** Arranque: avanza la pantalla que ya trae el HTML. */
export function boot(label: string, f: number) { set(label, f); }
export function bootEnd() { shownAt = 0; paint(); return hide(); }
paint(); $("ldTip").textContent = TIPS[(lastTip = Math.floor(Math.random() * TIPS.length))];

// ---------- Tareas ----------
const running = new Map<Task, Promise<void>>(), bad = new Set<Task>(); // bad: fallaron; la precarga no insiste (launch sí reintenta)
let rushed = false; // true mientras launch() espera: las tareas dejan de esperar huecos libres
/** Un hueco libre del navegador (o el siguiente turno si hay prisa). Las tareas largas lo usan entre tandas chicas. */
export const idle = () => rushed ? sleep(0) : new Promise<void>((r) => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 600 }) : setTimeout(r, 40)));

function exec(t: Task) {
  if (t.done()) return Promise.resolve();
  let p = running.get(t);
  if (!p) {
    const t0 = performance.now();
    p = Promise.resolve(t.run()).catch((e) => { bad.add(t); console.error(`Carga "${t.id}":`, e); }).then(() => { times[t.id] = (times[t.id] ?? 0) + performance.now() - t0; }).finally(() => running.delete(t));
    running.set(t, p);
  }
  return p;
}

let queue: Task[] = [], canRun = () => true, pumping = false;
/** Registra la cola de precarga: en orden, una tarea por hueco libre y solo mientras canRun() (los menús). startPreload la echa a andar. */
export function preload(tasks: Task[], ok: () => boolean) { queue = tasks; canRun = ok; }
export const startPreload = (delay: number) => { setTimeout(() => void pump(), delay); };
/** Una tarea ya, sin esperar huecos libres de las demás (lo que una pantalla necesita ahora). */
export const ensure = (t: Task) => exec(t);
async function pump() {
  if (pumping) return;
  pumping = true;
  for (;;) { // sigue vigilando: si cambia la zona elegida, la tarea del mundo vuelve a quedar pendiente y se rehace en segundo plano
    for (const t of queue) {
      if (t.done() || bad.has(t)) continue;
      while (!canRun()) await sleep(400);
      await idle();
      if (!t.done()) await exec(t);
    }
    await sleep(1500);
  }
}
/** Todo lo de la cola, ya. */
export async function ensureAll() { rushed = true; try { for (const t of queue) await exec(t); } finally { rushed = false; } }

let busy = false;
/** Completa lo que falte de `need`, corre `go` (arma la partida o la carrera) y espera su primer cuadro dibujado.
 *  `go` es síncrono y pesado: la pantalla se pinta antes. force: mostrarla siempre (entre carreras de una copa). Devuelve false si ya había una carga en curso. */
export async function launch(need: Task[], goLabel: string, go: () => void, frames: () => Promise<void>, force = false) {
  if (busy) return false;
  busy = true; rushed = true;
  const t0 = performance.now(), GO = 2, total = need.reduce((a, t) => a + t.w, GO);
  let acc = need.reduce((a, t) => a + (t.done() ? t.w : 0), 0); // lo ya hecho en segundo plano
  try {
    if (force || need.some((t) => !t.done()) || isTouch) show(); // hay trabajo real (o el celular: un solo cuadro pesado ya se nota)
    for (const t of need) {
      if (t.done()) continue;
      if (performance.now() - t0 > DELAY) show();
      set(t.label, acc / total);
      if (shown) await frame();
      const poll = setInterval(() => set(t.label, (acc + t.w * (t.prog?.() ?? 0)) / total), 100);
      await exec(t);
      clearInterval(poll);
      acc += t.w;
      set(t.label, acc / total);
    }
    if (performance.now() - t0 > DELAY) show();
    set(goLabel, acc / total);
    if (shown) await frame();
    go();
    await frames();
    set(goLabel, 1);
    $("load").classList.add("out");
  } finally {
    rushed = false; busy = false;
    void hide();
  }
  return true;
}
