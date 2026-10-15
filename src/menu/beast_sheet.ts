// Ficha completa de un bicho (Bestiario): estado BV que lee main.ts, render y controles (extraído de menu.ts).
import { BEAST_PORTRAITS, DEF, type Kind } from "../enemies";
import { activePad, btnChip, ctl, padPressed, pb } from "../input";
import { beastIcon } from "../icons";
import { SFX } from "../sfx";
import { WEAPONS, type WeaponId } from "../weapons";
import { ZONES } from "../world";
import { FINALS, type Elite } from "../run";
// Sin import de valores de "../menu" (ciclo): menu.ts los entrega por initBeast(m) al final de su evaluación.
type Menu = Pick<typeof import("../menu"), "$"|"bar"|"focusSel"|"go"|"save">;
let { $, bar, focusSel, go, save } = {} as Menu;
export function initBeast(m: Menu) { ({ $, bar, focusSel, go, save } = m); }
import { BIOMETRICS, HOW, LORE, PHASE2 } from "./beast_data";

// ---------- Ficha completa de un bicho (Bestiario → elegir una ficha) ----------
// La parte 3D la arma main.ts (beastTick) leyendo BV cada cuadro: crea el bicho al abrir y lo libera al cerrar o cambiar.
// anim = animación pedida; seq cambia en cada pedido (repetir el mismo botón la vuelve a correr). touched = último giro a mano (ms).
export type BeastAnim = "" | "walk" | "attack" | "hit" | "die" | "phase";
export const BV = { kind: null as Kind | null, anim: "" as BeastAnim, seq: 0, elite: "" as Elite | "", yaw: 0.6, zoom: 1, touched: 0 };
export const KINDS = Object.keys(DEF) as Kind[];
// Yaw inicial de la ficha por bicho: 3/4 frontal (medido con barridos de yaw: la familia antBody, tarántula y rey miran hacia -0.6 rad, el tanque alien hacia 3).
const YAW0 = 0.2, FICHA_YAW: Partial<Record<Kind, number>> = { hormiga: 5.7, escupidora: 5.7, escarabajo: 5.7, tarantula: 5.7, rey: 5.7, tanque: 3, cortacercos: 1.57 };
export const fichaYaw = (k: Kind) => FICHA_YAW[k] ?? YAW0;
export function rankOf(k: Kind) { return !DEF[k].boss ? "Plaga" : FINALS.includes(k) ? "Jefe final" : "Minijefe"; }
export const zoomBeast = (k: number) => { BV.zoom = Math.min(1.8, Math.max(0.45, BV.zoom * k)); };
export function openBeast(k: Kind) { Object.assign(BV, { kind: k, anim: "", elite: "", yaw: fichaYaw(k), zoom: 1, touched: 0 }); go("beast"); }
export function beastStep(dir: number) {
  if (!BV.kind) return;
  SFX.blip();
  Object.assign(BV, { kind: KINDS[(KINDS.indexOf(BV.kind) + dir + KINDS.length) % KINDS.length], anim: "", elite: "", zoom: 1 });
  BV.yaw = fichaYaw(BV.kind);
  renderBeast();
  $("bmsg").textContent = "";
}
// Gamepad en la ficha: LB / RB cambian de bicho, stick derecho gira, gatillos acercan (RT) y alejan (LT)
export function beastPad(dt: number) {
  if (padPressed(4)) beastStep(-1);
  if (padPressed(5)) beastStep(1);
  const gp = activePad();
  if (!gp) return;
  const rx = gp.axes[2] ?? 0;
  if (Math.abs(rx) > 0.2) { BV.yaw += rx * dt * 3; BV.touched = performance.now(); }
  const z = (gp.buttons[6]?.value ?? 0) - (gp.buttons[7]?.value ?? 0);
  if (Math.abs(z) > 0.05) zoomBeast(1 + z * dt * 1.5);
}
const BHINT = { keys: () => "Arrastrar gira · Rueda acerca · Q y E (o las flechas en el borde) cambian de bicho · Esc vuelve", pad: () => `Stick derecho gira · ${btnChip(6)} y ${btnChip(7)} acercan · ${btnChip(4)} y ${btnChip(5)} cambian de bicho · ${btnChip(pb("back"))} vuelve`, touch: () => "Arrastrar gira · Pellizcar acerca · Deslizar la ficha cambia de bicho" };
export function renderBeast() {
  const k = BV.kind;
  if (!k) return;
  // El foco vuelve al mismo botón después de rearmar el panel
  const was = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("#bpanel [data-bnav], #bpanel [data-banim], #bpanel [data-belite]");
  const wasSel = was && (["bnav", "banim", "belite"] as const).map((a) => (was.dataset[a] !== undefined ? `[data-${a}="${was.dataset[a]}"]` : "")).join("");
  const d = DEF[k], r = save.beast[k], n = save.slain[k] ?? 0, el = BV.elite, met = save.seen.includes(k) || n > 0 || !!r;
  // Las élites cambian vida, velocidad y peso como en makeElite (enemies.ts)
  const hp = d.hp * (el === "rapida" ? 0.6 : el === "blindada" ? 3 : 1), sp = d.speed * (el === "rapida" ? 2 : 1), mass = d.mass * (el === "blindada" ? 5 : 1);
  const num = (v: number) => (v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(".", ",").replace(",0", ""));
  const row = (a: string, v: number, max: number, txt: string) => `<span>${a}</span>${bar(v, max)}<em>${txt}</em>`;
  const kv = (a: string, b: string | number) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`;
  const btn = (attr: string, v: string, label: string, on = false) => `<button class="opt ${on ? "on" : ""}" data-${attr}="${v}">${label}</button>`;
  const weak = Object.entries(r?.by ?? {}).filter(([id]) => id in WEAPONS || id === "embestida").sort((a, b) => b[1] - a[1]).slice(0, 3);
  const wname = (id: string) => (id in WEAPONS ? WEAPONS[id as WeaponId].name : "Embestida");
  const first = r?.first ? r.first.split("-").reverse().join("/") : save.seen.includes(k) ? "Sin fecha (antes del registro)" : "Todavía no";
  const bPortrait = BEAST_PORTRAITS[k];
  $("bpanel").innerHTML = `<div class="bhead"><button class="bnav" data-bnav="-1" aria-label="Bicho anterior">&lt;</button>`
    + `${bPortrait ? `<div class="bhead-portrait"><img src="${bPortrait}" alt="${d.name}" width="48" height="48"></div>` : ""}`
    + `<div class="bname"><small>${rankOf(k)} · ${KINDS.indexOf(k) + 1} / ${KINDS.length} · <em class="b-reg ${met ? "ok" : ""}">${met ? `REGISTRADO (${n} ${n === 1 ? "baja" : "bajas"})` : "SIN REGISTROS"}</em></small><b class="wi">${beastIcon(k, 24)}${d.name}</b></div><button class="bnav" data-bnav="1" aria-label="Bicho siguiente">&gt;</button></div>`
    + `<div class="bctl"><div class="slot"><span>Animación</span>${btn("banim", "walk", "Caminar", BV.anim === "walk")}${btn("banim", "attack", "Atacar")}${btn("banim", "hit", "Recibir golpe")}${btn("banim", "die", "Morir")}${d.boss ? btn("banim", "phase", "Fase 2") : ""}</div>`
    + (d.boss ? "" : `<div class="slot"><span>Variante</span>${btn("belite", "", "Normal", !el)}${btn("belite", "rapida", "Rápida", el === "rapida")}${btn("belite", "blindada", "Blindada", el === "blindada")}</div>`) + `</div>`
    + `<div id="binfo">`
    + `<div class="bblock"><div class="sect">Datos</div><div class="st bst">${row(d.boss ? "Vida" : "Vida inicial", hp, d.boss ? 8000 : 270, num(hp))}${row("Velocidad", sp, 25, num(sp))}${row("Daño", d.dmg, d.boss ? 45 : 12, num(d.dmg))}${row("Peso", mass, d.boss ? 100 : 15, num(mass))}${row("XP", d.xp, d.boss ? 120 : 6, d.xp ? `${d.xp} ${d.xp === 1 ? "tuerca" : "tuercas"}` : "Fin de la partida")}</div>`
    + (el ? `<p class="bnote">${el === "rapida" ? "Élite rápida: doble velocidad y 60% de la vida." : "Élite blindada: triple vida y cinco veces más pesada, casi no se la empuja."} Al caer suelta un cofre.</p>` : d.boss ? "" : `<p class="bnote">La vida de las plagas crece con el tiempo de partida.</p>`) + `</div>`
    + `<div class="bblock"><div class="sect">Cómo ataca</div><p>${HOW[k][0]}</p><div class="sect">Cómo esquivarlo</div><p>${HOW[k][1]}</p>${d.boss ? `<p class="bnote">${d.final ? `Fase 2: al vaciar la primera barra ruge, exige hablar con un superior, llena una segunda y pega más fuerte` : "Fase 2: por debajo de la mitad de vida pierde la paciencia y la compostura"}, va un 20% más rápido${PHASE2[k] ?? ""}.</p>` : ""}</div>`
    + `<div class="bblock"><div class="sect">Biometría y debilidades mecánicas</div>${BIOMETRICS[k] ? kv("Blindaje", BIOMETRICS[k].armor) + kv("Maniobrabilidad", BIOMETRICS[k].agility) + kv("Punto ciego", BIOMETRICS[k].blindSpot) : "<p>Sin datos biométricos.</p>"}</div>`
    + `<div class="bblock"><div class="sect">Trasfondo</div><p class="lore">${LORE[k]}</p></div>`
    + `<div class="bblock"><div class="sect">Registro propio</div>${met ? kv("Bajas", n) + kv("Primera vez", first) + kv("Daño recibido", Math.round(r?.hurt ?? 0)) + kv("Zonas", r?.zones.map((z) => ZONES[z].short).join(", ") || "Sin registros todavía") : `<p>Sin registros todavía.</p>`}</div>`
    + `<div class="bblock"><div class="sect">Debilidades</div>${weak.length ? `<div class="st bst">${weak.map(([id, v]) => row(wname(id), v, weak[0][1], String(Math.round(v)))).join("")}</div><p class="bnote">Daño infligido por arma, según el historial propio.</p>` : `<p>Sin registros todavía.</p>`}</div>`
    + `</div><div class="bfoot"><div class="hint">${BHINT[ctl]()}</div><button data-act="back">Volver</button></div>`;
  if (wasSel) focusSel(wasSel);
}
