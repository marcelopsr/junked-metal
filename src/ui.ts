import "@fontsource/vt323/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "./style.css";
import "./hud.css";
import { icon } from "./icons";
import type { Offer } from "./weapons";
import { HALF } from "./world";

const $ = (id: string) => document.getElementById(id)!;
const el = <T extends HTMLElement = HTMLElement>(id: string) => $(id) as T;

// ---------- Estáticos ----------
export function initHud() {
  $("sigIco").innerHTML = icon("senal", 16);
  // Marcas del velocímetro sobre el arco de 240° (centro 60,56)
  $("ticks").innerHTML = Array.from({ length: 9 }, (_, i) => {
    const a = (-120 + i * 30) * (Math.PI / 180), sn = Math.sin(a), cs = Math.cos(a);
    return `<line x1="${60 + sn * 40}" y1="${56 - cs * 40}" x2="${60 + sn * 34}" y2="${56 - cs * 34}"/>`;
  }).join("");
  initRadar();
}

// ---------- Lecturas ----------
const ARC = 193; // largo del arco del velocímetro (240° de radio 46)
const pad = (n: number, w: number) => String(Math.max(0, Math.floor(n))).padStart(w, "0");
const B01 = (x: number) => Math.max(0, Math.min(1, x));
// El DOM se toca solo cuando el valor cambió: ch() devuelve true si es nuevo
const memo: Record<string, string | number> = {};
const ch = (k: string, v: string | number) => memo[k] !== (memo[k] = v);
const txt = (id: string, v: string) => { if (ch(id, v)) $(id).textContent = v; };
const bar = (id: string, pct: number) => { const w = `${Math.round(pct * 10) / 10}%`; if (ch(id, w)) el(id).style.width = w; };

export function hudUpdate(d: { hp: number; maxHp: number; boost: number; xp: number; need: number; level: number; time: number; kills: number; kmh: number; maxKmh: number }) {
  const p = Math.max(0, d.hp / d.maxHp);
  // 3 celdas LiPo: se vacían de derecha a izquierda
  Array.from($("lipo").children).forEach((c, i) => {
    const f = Math.round(B01(p * 3 - i) * 20) / 20;
    if (ch(`cel${i}`, f)) (c as HTMLElement).style.setProperty("--p", `${f * 100}%`);
  });
  const low = p < 0.25;
  if (ch("low", +low)) { $("txl").classList.toggle("low", low); $("hud").classList.toggle("low", low); }
  txt("volt", `${(9 + 3.6 * p).toFixed(1)}V`);
  txt("hpTxt", `${Math.ceil(Math.max(0, d.hp))} / ${d.maxHp}`);
  bar("boost", d.boost);
  bar("xp", Math.min(1, d.xp / d.need) * 100);
  const lv = memo.lvl as number | undefined;
  if (ch("lvl", d.level)) {
    $("lvl").textContent = `NV ${pad(d.level, 2)}`;
    if (lv && d.level > lv) { const s = $("signal"); s.classList.remove("up"); void s.offsetWidth; s.classList.add("up"); } // destello al subir (evento raro)
  }
  txt("timer", `${pad(d.time / 60, 2)}:${pad(d.time % 60, 2)}`);
  txt("kills", pad(d.kills, 4));
  const s = Math.min(1, Math.abs(d.kmh) / d.maxKmh);
  if (ch("spd", Math.round(s * 120))) { // media unidad de aguja por paso
    $("needle").style.transform = `rotate(${-120 + s * 240}deg)`;
    $("spdArc").style.strokeDasharray = `${s * ARC} 400`;
  }
  txt("kmh", String(Math.round(Math.abs(d.kmh))));
}

// ---------- Slots de armas / pasivas ----------
export type SlotInfo = { id: string; lv: number; evolved?: boolean; cd?: number };
let slotKey = "";
let cds: HTMLElement[] = [];
export function hudSlots(weapons: SlotInfo[], passives: SlotInfo[]) {
  const key = JSON.stringify([weapons.map((w) => [w.id, w.lv, w.evolved]), passives.map((p) => [p.id, p.lv])]);
  if (key !== slotKey) {
    slotKey = key;
    const pips = (lv: number) => `<span class="pips">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</span>`;
    $("slots").innerHTML =
      `<div class="row">${weapons.map((w) => `<div class="slot ${w.evolved ? "evo" : ""}">${icon(w.id, 26)}<div class="cd"></div>${w.evolved ? "" : pips(w.lv)}</div>`).join("")}</div>` +
      `<div class="row">${passives.map((p) => `<div class="slot small">${icon(p.id, 18)}${pips(p.lv)}</div>`).join("")}</div>`;
    cds = Array.from($("slots").querySelectorAll<HTMLElement>(".row:first-child .cd"));
  }
  cds.forEach((c, i) => { const v = (weapons[i]?.cd ?? 0).toFixed(2); if (ch(`cd${i}`, v)) c.style.setProperty("--cd", v); });
}

// ---------- Jefe ----------
export function hudBoss(name: string | null, pct = 1) {
  if (ch("boss", name ?? "")) { $("bossbar").classList.toggle("hidden", !name); if (name) $("bossName").textContent = name; }
  if (name) { bar("bossHp", pct * 100); if (ch("crit", +(pct < 0.25))) $("bossbar").classList.toggle("crit", pct < 0.25); }
}

// ---------- Aviso de radio: entra con interferencia y el texto se va tecleando ----------
const STATIC = "#%/\\&@0123456789"; // el último carácter tecleado llega como estática
let bannerT = 0, bannerMsg = "", bannerN = 0, bannerShown = -1;
// Avisos en cola: si hay uno en pantalla, el nuevo espera su turno (máx. 3 en espera; repetidos se ignoran)
const bannerQ: [string, number][] = [];
export function banner(txt: string, secs = 2) {
  if (bannerT > 0) { if (txt !== bannerMsg && !bannerQ.some((q) => q[0] === txt) && bannerQ.length < 3) bannerQ.push([txt, secs]); return; }
  const b = $("banner");
  bannerMsg = txt; bannerN = 0; bannerShown = -1; bannerT = secs;
  b.querySelector(".gh")!.textContent = txt;
  b.querySelector(".ty")!.textContent = "";
  b.classList.remove("hidden", "out");
  b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; // reinicia la entrada
}
function hideBanner() { bannerT = 0; $("banner").classList.add("hidden"); }
function tickBanner(dt: number) {
  if (bannerT <= 0) { if (bannerQ.length && $("levelup").classList.contains("hidden")) banner(...bannerQ.shift()!); return; } // siguiente en cola, no sobre las cartas
  if ((bannerT -= dt) <= 0) return hideBanner();
  if (bannerT < 0.3) $("banner").classList.add("out");
  bannerN += dt * 36;
  const n = Math.min(bannerMsg.length, bannerN | 0), typing = n < bannerMsg.length;
  if (typing || n !== bannerShown) {
    bannerShown = n;
    $("banner").querySelector(".ty")!.textContent = bannerMsg.slice(0, n) + (typing ? STATIC[(Math.random() * STATIC.length) | 0] : "");
  }
}

// ---------- Habilidad activa: nombre, tecla y barra que se llena al enfriarse (frac 1 = lista) ----------
export function hudAbility(name: string, key: string, frac: number, on: boolean) {
  txt("abName", name); txt("abKey", key);
  bar("abil", (on ? 1 : frac) * 100);
  const st = on ? "on" : frac >= 1 ? "ready" : "";
  if (ch("abSt", st)) { $("txl").classList.toggle("ab-on", on); $("txl").classList.toggle("ab-ready", st === "ready"); $("tAbil").classList.toggle("on", on); }
  const cd = (on || frac >= 1 ? 0 : 1 - frac).toFixed(2);
  if (ch("abCd", cd)) $("tAbil").style.setProperty("--cd", cd);
}

// ---------- Combo de manejo: multiplicador de XP; la cinta nombra la última maniobra un momento ----------
let drvT = 0;
export function hudDrive(mul: number, trick?: string) {
  const show = mul > 1.001;
  if (ch("drvOn", +show)) $("drv").classList.toggle("hidden", !show);
  txt("drvN", `x${mul.toFixed(1)}`);
  if (ch("drvMax", +(mul >= 2))) $("drv").classList.toggle("max", mul >= 2);
  if (trick) { drvT = 1.2; $("drvLbl").textContent = trick; const d = $("drv"); d.classList.remove("pop"); void d.offsetWidth; d.classList.add("pop"); }
}
function tickDrive(dt: number) { if (drvT > 0 && (drvT -= dt) <= 0) $("drvLbl").textContent = "MANEJO"; }

// ---------- Racha de bajas: se corta a los 2 s sin matar; crece y tiembla con la racha ----------
const COMBO = ["RACHA", "BUEN RITMO", "A FONDO", "SOBRECARGA"];
let streak = 0, streakT = 0, pop = 0, cDirty = false, cShown = false, cTier = -1, cShake = 0, sx = 0, sy = 0;
export function hudKill() { streak++; streakT = 2; pop = 1; cDirty = true; return streak; } // suma una baja y devuelve la racha: llamar UNA vez por baja
// live = la partida corre: con cartas, cofre, pausa o menús el reloj de la racha queda congelado
function tickCombo(dt: number, live: boolean) {
  if (live && (streakT -= dt) <= 0) streak = 0;
  const show = streak >= 3;
  if (show !== cShown) { cShown = show; $("combo").classList.toggle("hidden", !show); cTier = -1; }
  if (!show) return;
  const c = $("combo");
  if (cDirty) {
    cDirty = false;
    $("comboN").textContent = `x${streak}`;
    const t = streak >= 40 ? 3 : streak >= 15 ? 2 : streak >= 6 ? 1 : 0;
    if (t !== cTier) { cTier = t; c.className = `t${t}`; $("comboLbl").textContent = COMBO[t]; }
  }
  pop = Math.max(0, pop - dt * 6);
  if ((cShake -= dt) <= 0) { cShake = 0.05; const a = cTier * 1.3; sx = (Math.random() - 0.5) * 2 * a; sy = (Math.random() - 0.5) * 2 * a; }
  c.style.transform = `translate(${sx}px, ${sy}px) scale(${(1 + Math.min(streak, 60) / 100) * (1 + pop * 0.25)})`;
  $("comboBar").style.transform = `scaleX(${B01(streakT / 2)})`;
}

// ---------- Radar de la radio: barrido, estela y blips (lienzo de 64 px escalado sin filtrar) ----------
const RS = 64, RH = RS / 2, RR = 50, RK = (RH - 1) / RR; // lado, centro, alcance en metros, píxeles por metro
type Blip = { x: number; z: number; kind: "enemigo" | "jefe" | "cofre" | "gema" };
let rCtx: CanvasRenderingContext2D, rBg: HTMLCanvasElement;
let rCar = { x: 0, z: 0, yaw: 0, up: 0 }, rBlips: Blip[] = [], rAge = 9, rSweep = 0, rAcc = 0;
function initRadar() {
  rCtx = (el<HTMLCanvasElement>("radarC")).getContext("2d")!;
  // Fondo fijo (disco, anillos, mira) una sola vez
  rBg = document.createElement("canvas"); rBg.width = rBg.height = RS;
  const g = rBg.getContext("2d")!;
  g.fillStyle = "#0a1307"; g.fillRect(0, 0, RS, RS);
  g.fillStyle = "#0f1c0b"; g.beginPath(); g.arc(RH, RH, RH - 1, 0, 7); g.fill();
  g.strokeStyle = "#8dff6a"; g.globalAlpha = 0.22;
  for (const r of [RH - 1.5, 21, 10.5]) { g.beginPath(); g.arc(RH, RH, r, 0, 7); g.stroke(); }
  g.fillStyle = "#8dff6a"; g.fillRect(RH, 1, 1, RS - 2); g.fillRect(1, RH, RS - 2, 1);
}
// car.yaw: rumbo del auto (rad, forward = (sin yaw, cos yaw) en x,z). car.up: hacia dónde mira la cámara (por defecto, el rumbo)
export function hudRadar(car: { x: number; z: number; yaw: number; up?: number }, blips: Blip[]) {
  rCar = { x: car.x, z: car.z, yaw: car.yaw, up: car.up ?? car.yaw };
  rBlips = blips; rAge = 0;
}
function drawRadar() {
  const g = rCtx, u = rCar.up, c = Math.cos(u), s = Math.sin(u);
  g.globalAlpha = 1; g.drawImage(rBg, 0, 0);
  g.save(); g.beginPath(); g.arc(RH, RH, RH - 1, 0, 7); g.clip();
  // Borde del patio
  g.strokeStyle = "#e0a030"; g.globalAlpha = 0.5; g.beginPath();
  [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF], [-HALF, -HALF]].forEach(([px, pz], i) => {
    const dx = px - rCar.x, dz = pz - rCar.z, X = RH + (dx * c - dz * s) * RK, Y = RH - (dx * s + dz * c) * RK;
    i ? g.lineTo(X, Y) : g.moveTo(X, Y);
  });
  g.stroke();
  // Barrido: línea y estela a píxeles
  g.fillStyle = "#8dff6a";
  for (let k = 0; k < 7; k++) {
    g.globalAlpha = 0.6 * (1 - k / 7);
    const a = rSweep - k * 0.1, sa = Math.sin(a), ca = Math.cos(a);
    for (let r = 2; r < RH; r++) g.fillRect(Math.round(RH + sa * r), Math.round(RH - ca * r), 1, 1);
  }
  // Blips: se encienden cuando pasa el barrido y se apagan hasta la próxima vuelta
  const blink = (rSweep * 2) % 2 < 1;
  for (const b of rBlips) {
    const rx = (b.x - rCar.x) * c - (b.z - rCar.z) * s, ry = (b.x - rCar.x) * s + (b.z - rCar.z) * c;
    let d = Math.hypot(rx, ry) * RK;
    const far = d > RH - 3;
    if (far && (b.kind === "enemigo" || b.kind === "gema")) continue;
    const k = far ? (RH - 3) / d : 1; // jefe y cofre fuera de alcance se pegan al borde
    const x = Math.round(RH + rx * RK * k), y = Math.round(RH - ry * RK * k);
    const age = (((rSweep - Math.atan2(rx, ry)) % 6.2832) + 6.2832) % 6.2832 / 6.2832;
    if (b.kind === "jefe") { if (blink) { g.globalAlpha = 1; g.fillStyle = "#ff4a38"; g.fillRect(x - 1, y - 1, 3, 3); } }
    else if (b.kind === "cofre") { g.globalAlpha = 1; g.fillStyle = "#e0a030"; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    else { g.globalAlpha = 1 - age * 0.8; g.fillStyle = b.kind === "gema" ? "#6fb3c4" : "#d6e8c8"; g.fillRect(x, y, 1, 1); }
  }
  // El auto: flecha en el centro
  const ar = rCar.yaw - u, sa = Math.sin(ar), ca = Math.cos(ar);
  g.globalAlpha = 1; g.fillStyle = "#8dff6a"; g.beginPath();
  g.moveTo(RH + sa * 4, RH - ca * 4); g.lineTo(RH - ca * 2.5 - sa * 2.5, RH - sa * 2.5 + ca * 2.5); g.lineTo(RH + ca * 2.5 - sa * 2.5, RH + sa * 2.5 + ca * 2.5); g.fill();
  g.restore();
}

export function uiTick(dt: number, live = true) {
  tickBanner(dt);
  tickCombo(dt, live);
  tickDrive(dt);
  tickNumbers(dt);
  if ((rAge += dt) < 1) { rSweep = (rSweep + dt * 2.6) % 6.2832; if ((rAcc += dt) > 1 / 30) { rAcc = 0; drawRadar(); } } // ponytail: solo dibuja mientras main la alimenta
}

// ---------- Números de daño (pool DOM) ----------
type Num = { e: HTMLSpanElement; x: number; y: number; vy: number; life: number };
const nums: Num[] = [];
const free: HTMLSpanElement[] = [];
export function damageNumber(x: number, y: number, v: number, crit: boolean) {
  if (nums.length > 60) return;
  const e = free.pop() ?? $("dmg").appendChild(document.createElement("span"));
  e.textContent = String(Math.round(v));
  e.className = crit ? "crit" : "";
  e.style.display = "";
  nums.push({ e, x: x + (Math.random() - 0.5) * 20, y, vy: -90 - Math.random() * 40, life: 0.7 });
}
function tickNumbers(dt: number) {
  for (let i = nums.length - 1; i >= 0; i--) {
    const n = nums[i];
    n.life -= dt; n.vy += 220 * dt; n.y += n.vy * dt;
    const pop = n.life > 0.6 ? 1 + (n.life - 0.6) * 5 : 1;
    n.e.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%) scale(${pop})`;
    n.e.style.opacity = String(Math.min(1, n.life * 4));
    if (n.life <= 0) { n.e.style.display = "none"; free.push(n.e); nums.splice(i, 1); }
  }
}

// ---------- Flechas de borde hacia objetivos fuera de cámara: ficha con ícono y una punta que orbita hacia el objetivo ----------
const CHEV = `<svg class="chev" viewBox="0 0 52 52"><path d="M40 18 51 26 40 34 43 26Z" fill="currentColor" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
export function hudArrows(list: { x: number; y: number; kind: "jefe" | "cofre" }[]) {
  const box = $("arrows");
  while (box.children.length < list.length) box.insertAdjacentHTML("beforeend", `<div class="arw">${CHEV}<span class="glyph"></span></div>`);
  const w = innerWidth, h = innerHeight, m = 40;
  Array.from(box.children).forEach((c, i) => {
    const a = list[i], e = c as HTMLElement;
    if (!a) { e.style.display = "none"; return; }
    const cx = w / 2, cy = h / 2, dx = a.x - cx, dy = a.y - cy;
    const t = Math.min((cx - m) / Math.abs(dx || 1e-3), (cy - m) / Math.abs(dy || 1e-3));
    e.style.display = "";
    if (e.dataset.k !== a.kind) { e.dataset.k = a.kind; e.className = `arw ${a.kind}`; e.lastElementChild!.innerHTML = icon(a.kind, 16); }
    e.style.transform = `translate(${cx + dx * t}px, ${cy + dy * t}px)`;
    (e.firstElementChild as HTMLElement).style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}

// ---------- Cartas de mejora ----------
const rarity = (o: Offer) => (o.kind === "evo" ? "evo" : o.kind === "fusion" ? "fusion" : o.lv === 5 ? "epica" : o.kind === "weapon" && o.lv === 1 ? "rara" : "comun");
const kindLabel = (o: Offer) => (o.kind === "evo" ? "Evolución" : o.kind === "fusion" ? "Fusión" : o.kind === "heal" ? "Reparación" : o.lv === 1 ? (o.kind === "weapon" ? "Arma nueva" : "Pieza nueva") : `${o.kind === "weapon" ? "Arma" : "Pieza"} · nivel ${o.lv}`);

let pickCb: ((i: number) => void) | null = null;
let hoverCb: ((i: number) => void) | null = null;
let busy = false;
export function showOffers(title: string, offers: Offer[], sel: number, onPick: (i: number) => void, onHover?: (i: number) => void) {
  pickCb = onPick;
  hoverCb = onHover ?? null;
  busy = false;
  hideBanner();
  $("luTitle").textContent = title;
  $("offers").innerHTML = offers.map((o, i) => `
    <div class="offer ${rarity(o)} ${i === sel ? "sel" : ""}" data-i="${i}" style="--i:${i}">
      <span class="kind">${kindLabel(o)}</span>
      <div class="art">${icon(o.kind === "evo" ? o.id : o.icon, 44)}</div>
      <b>${o.title}</b>
      <span>${o.desc}</span>
      ${o.lv ? `<span class="pips">${Array.from({ length: 5 }, (_, k) => `<i class="${k < o.lv! ? "on" : ""}"></i>`).join("")}</span>` : ""}
    </div>`).join("");
  $("levelup").classList.remove("hidden");
  hoverCb?.(sel);
}

export function selectOffer(sel: number) {
  $("offers").querySelectorAll(".offer").forEach((c, i) => c.classList.toggle("sel", i === sel));
  hoverCb?.(sel);
}
// La elegida "vuela" hacia el auto; el resto se desvanece. Después se aplica.
export function pickOffer(i: number) {
  if (busy || !pickCb) return;
  busy = true;
  $("offers").querySelectorAll(".offer").forEach((c, k) => c.classList.add(k === i ? "picked" : "gone"));
  const cb = pickCb;
  setTimeout(() => { $("levelup").classList.add("hidden"); cb(i); }, 380);
}
$("offers").addEventListener("mouseover", (e) => {
  const c = (e.target as HTMLElement).closest(".offer") as HTMLElement | null;
  if (c && !busy) selectOffer(+c.dataset.i!);
});
$("offers").addEventListener("click", (e) => {
  const c = (e.target as HTMLElement).closest(".offer") as HTMLElement | null;
  if (c) pickOffer(+c.dataset.i!);
});
