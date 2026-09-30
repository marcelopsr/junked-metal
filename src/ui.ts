import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/bungee/400.css";
import "./style.css";
import { icon } from "./icons";
import type { Offer } from "./weapons";

const $ = (id: string) => document.getElementById(id)!;
const el = <T extends HTMLElement = HTMLElement>(id: string) => $(id) as T;

// ---------- Estáticos ----------
export function initHud() {
  $("sigIco").innerHTML = icon("senal", 16);
  // Marcas del velocímetro sobre el arco de 240°
  $("ticks").innerHTML = Array.from({ length: 9 }, (_, i) => {
    const a = (-120 + i * 30) * (Math.PI / 180);
    const x1 = 60 + Math.sin(a) * 42, y1 = 62 - Math.cos(a) * 42, x2 = 60 + Math.sin(a) * 36, y2 = 62 - Math.cos(a) * 36;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join("");
}

// ---------- Lecturas ----------
const ARC = 262; // largo aproximado del arco del velocímetro
const pad = (n: number, w: number) => String(Math.max(0, Math.floor(n))).padStart(w, "0");

export function hudUpdate(d: { hp: number; maxHp: number; boost: number; xp: number; need: number; level: number; time: number; kills: number; kmh: number; maxKmh: number }) {
  const p = Math.max(0, d.hp / d.maxHp);
  // 3 celdas LiPo: se vacían de derecha a izquierda
  $("lipo").querySelectorAll("i").forEach((c, i) => {
    const f = B01(p * 3 - i);
    c.className = f >= 1 ? "" : f <= 0 ? "off" : "half";
    (c as HTMLElement).style.setProperty("--p", `${f * 100}%`);
  });
  $("txl").classList.toggle("low", p < 0.25);
  $("volt").textContent = `${(9 + 3.6 * p).toFixed(1)}V`;
  $("hpTxt").textContent = `${Math.ceil(Math.max(0, d.hp))} / ${d.maxHp}`;
  el("boost").style.width = `${d.boost}%`;
  el("xp").style.width = `${Math.min(1, d.xp / d.need) * 100}%`;
  $("lvl").textContent = `NV ${pad(d.level, 2)}`;
  $("timer").textContent = `${pad(d.time / 60, 2)}:${pad(d.time % 60, 2)}`;
  $("kills").textContent = pad(d.kills, 4);
  const s = Math.min(1, Math.abs(d.kmh) / d.maxKmh);
  $("needle").style.transform = `rotate(${-120 + s * 240}deg)`;
  $("spdArc").style.strokeDasharray = `${s * ARC} 400`;
  $("kmh").textContent = String(Math.round(Math.abs(d.kmh)));
}
const B01 = (x: number) => Math.max(0, Math.min(1, x));

// ---------- Slots de armas / pasivas ----------
export type SlotInfo = { id: string; lv: number; evolved?: boolean; cd?: number };
let slotKey = "";
export function hudSlots(weapons: SlotInfo[], passives: SlotInfo[]) {
  const key = JSON.stringify([weapons.map((w) => [w.id, w.lv, w.evolved]), passives.map((p) => [p.id, p.lv])]);
  if (key !== slotKey) {
    slotKey = key;
    const pips = (lv: number) => `<span class="pips">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lv ? "on" : ""}"></i>`).join("")}</span>`;
    $("slots").innerHTML =
      `<div class="row">${weapons.map((w) => `<div class="slot ${w.evolved ? "evo" : ""}">${icon(w.id, 26)}<div class="cd"></div>${w.evolved ? "" : pips(w.lv)}</div>`).join("")}</div>` +
      `<div class="row">${passives.map((p) => `<div class="slot small">${icon(p.id, 18)}${pips(p.lv)}</div>`).join("")}</div>`;
  }
  $("slots").querySelectorAll(".row:first-child .cd").forEach((c, i) => (c as HTMLElement).style.setProperty("--cd", String(weapons[i]?.cd ?? 0)));
}

// ---------- Jefe / banner ----------
export function hudBoss(name: string | null, pct = 1) {
  $("bossbar").classList.toggle("hidden", !name);
  if (name) { $("bossName").textContent = name; el("bossHp").style.width = `${pct * 100}%`; }
}

let bannerT = 0;
export function banner(txt: string, secs = 2) {
  const b = $("banner");
  b.textContent = txt;
  b.classList.remove("hidden");
  b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; // reinicia el "sello"
  bannerT = secs;
}
export function uiTick(dt: number) {
  if (bannerT > 0 && (bannerT -= dt) <= 0) $("banner").classList.add("hidden");
  tickNumbers(dt);
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

// ---------- Flechas de borde hacia objetivos fuera de cámara ----------
const CHEV = `<svg class="chev" viewBox="0 0 34 34"><path d="M9 6 26 17 9 28 13 17Z" fill="currentColor" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
export function hudArrows(list: { x: number; y: number; kind: "jefe" | "cofre" }[]) {
  const box = $("arrows");
  while (box.children.length < list.length) box.insertAdjacentHTML("beforeend", `<div class="arw">${CHEV}<span class="glyph"></span></div>`);
  const w = innerWidth, h = innerHeight, m = 36;
  Array.from(box.children).forEach((c, i) => {
    const a = list[i], e = c as HTMLElement;
    if (!a) { e.style.display = "none"; return; }
    const cx = w / 2, cy = h / 2, dx = a.x - cx, dy = a.y - cy;
    const t = Math.min((cx - m) / Math.abs(dx || 1e-3), (cy - m) / Math.abs(dy || 1e-3));
    e.style.display = "";
    e.className = `arw ${a.kind}`;
    e.style.left = `${cx + dx * t}px`;
    e.style.top = `${cy + dy * t}px`;
    (e.firstElementChild as HTMLElement).style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}

// ---------- Cartas de mejora ----------
const rarity = (o: Offer) => (o.kind === "evo" ? "evo" : o.lv === 5 ? "epica" : o.kind === "weapon" && o.lv === 1 ? "rara" : "comun");
const kindLabel = (o: Offer) => (o.kind === "evo" ? "Evolución" : o.kind === "heal" ? "Reparación" : o.lv === 1 ? (o.kind === "weapon" ? "Arma nueva" : "Pieza nueva") : `${o.kind === "weapon" ? "Arma" : "Pieza"} · nivel ${o.lv}`);

let pickCb: ((i: number) => void) | null = null;
let hoverCb: ((i: number) => void) | null = null;
let busy = false;
export function showOffers(title: string, offers: Offer[], sel: number, onPick: (i: number) => void, onHover?: (i: number) => void) {
  pickCb = onPick;
  hoverCb = onHover ?? null;
  busy = false;
  bannerT = 0;
  $("banner").classList.add("hidden");
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
