import "@fontsource/vt323/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/silkscreen/400.css";
import "@fontsource/silkscreen/700.css";
import "./style.css";
import "./hud.css";
import { beastIcon, icon, PERK_ICON, uiIconUrl } from "./icons";
import { isTouch, KEYS } from "./input";

const WSHOP_KEYS = ["hp", "dmg", "spd", "mag", "xp", "arm", "reg", "tur", "ram", "cdr"] as const;
import { LIVE, WEAPONS, type Offer, type WeaponId } from "./weapons";
import { HALF } from "./world";
import { SFX } from "./sfx";
import type { PactView } from "./encore";
import { BEAST_PORTRAITS, type Kind } from "./enemies";

const $ = (id: string) => (document.getElementById(id) ?? (id === "jump" ? document.getElementById("jumpRow") : null))!;
const el = <T extends HTMLElement = HTMLElement>(id: string) => $(id) as T;

// ---------- Estáticos ----------
export function initHud() {
  $("sigIco").innerHTML = icon("senal", 16);
  for (const k of ["vida", "energia", "habilidades", "nivel", "bajas"]) document.documentElement.style.setProperty("--ico-" + k, uiIconUrl(k)); // íconos de las barras (kit.css)
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
const memo: Record<string, string | number | boolean> = {};
const ch = (k: string, v: string | number | boolean) => memo[k] !== (memo[k] = v);
const txt = (id: string, v: string) => { if (ch(id, v)) $(id).textContent = v; };
const bar = (id: string, pct: number) => { const k = Math.round(Math.max(0, Math.min(100, pct)) * 10) / 1000; if (ch(id, k)) el(id).style.transform = `scaleX(${k})`; };

export function hudWorkshop(perm: Partial<Record<(typeof WSHOP_KEYS)[number], number>>) {
  const items = WSHOP_KEYS.filter((k) => (perm[k] ?? 0) > 0);
  const box = $("wshop");
  if (!items.length) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const key = items.map((k) => `${k}:${perm[k]}`).join(",");
  if (!ch("wshop", key)) return;
  box.innerHTML = `<span class="h-tape">TALLER</span><div class="ws">${items.map((k) => `<span class="ws-i">${icon(PERK_ICON[k], 16)}<b>${perm[k]}</b></span>`).join("")}</div>`;
}

let boostHold = 0;
let currentSag = 0;
let lastSagTime = 0;
let lastRfChirp = 0;
let lastLipoWarn = 0;
export function hudUpdate(d: { hp: number; maxHp: number; boost: number; xp: number; need: number; level: number; pending?: number; time: number; kills: number; kmh: number; maxKmh: number; shield?: boolean; boostActive?: boolean; distCenter?: number; heat?: number }) {
  const now = performance.now();
  const p = Math.max(0, d.hp / d.maxHp);
  // 3 celdas LiPo: se vacían de derecha a izquierda
  Array.from($("lipo").children).forEach((c, i) => {
    const f = Math.round(B01(p * 3 - i) * 20) / 20;
    if (ch(`cel${i}`, f)) (c as HTMLElement).style.setProperty("--p", `${f * 100}%`);
  });
  const low = p < 0.25;
  if (ch("low", +low)) { $("txl").classList.toggle("low", low); $("hud").classList.toggle("low", low); }
  const panic = p < 0.15;
  if (ch("panic", +panic)) {
    $("hud").classList.toggle("panic", panic);
    $("lipo").classList.toggle("panic", panic);
    $("lipo").querySelector("i:first-child")?.classList.toggle("unbalanced", panic);
  }
  if (panic && now - lastLipoWarn > 2500) {
    lastLipoWarn = now;
    SFX.lipoLowWarn();
  }
  const isShield = !!d.shield;
  if (ch("shielded", +isShield)) $("lipo").classList.toggle("shielded", isShield);
  const isFull = p >= 0.999;
  if (ch("fullLipo", +isFull) && isFull) {
    const lipoEl = $("lipo");
    if (lipoEl) {
      lipoEl.classList.remove("full-flash");
      void lipoEl.offsetWidth;
      lipoEl.classList.add("full-flash");
    }
  }
  const prevHp = memo.prevHp as number | undefined;
  if (prevHp !== undefined && d.hp > prevHp + 1) {
    const lip = $("lipo");
    lip.classList.remove("healing"); void lip.offsetWidth; lip.classList.add("healing");
  }
  memo.prevHp = d.hp;
  const displayV = 9 + 3.6 * p;
  const targetSag = d.boostActive ? 0.32 : 0;
  const dtSag = lastSagTime > 0 ? Math.min(0.1, (now - lastSagTime) / 1000) : 0.05;
  lastSagTime = now;
  // Relajación gradual (~250ms) con amortiguación elástica post-sag (targetSag -> currentSag)
  const sagK = d.boostActive ? 0.35 : 1 - Math.exp(-dtSag / 0.18);
  currentSag += (targetSag - currentSag) * sagK;
  if (!d.boostActive && currentSag < 0.005) currentSag = 0;
  const finalV = Math.max(0, displayV - currentSag);
  const isSag = currentSag > 0.03;
  if (ch("sag", +isSag)) $("volt").classList.toggle("sag", isSag);
  if (ch("voltSag", +Boolean(isSag || d.boostActive))) $("lipo")?.classList.toggle("sag", Boolean(isSag || d.boostActive));
  boostHold = d.boostActive ? Math.min(120, boostHold + 1) : 0;
  const isThermal = boostHold >= 30 || Boolean(d.heat && d.heat > 0.8);
  if (ch("thermalStress", +isThermal)) $("volt").classList.toggle("thermal-stress", isThermal);
  let escEl = document.getElementById("escTemp");
  if (!escEl) {
    escEl = document.createElement("span");
    escEl.id = "escTemp";
    escEl.className = "esc-temp";
    escEl.textContent = "ESC: 85°C";
    $("volt").insertAdjacentElement("afterend", escEl);
  }
  if (ch("escThermal", +isThermal)) escEl.style.display = isThermal ? "" : "none";
  const thermalJitter = isThermal ? (Math.sin(performance.now() * 0.01) * 0.04) : 0;
  const finalVWithJitter = Math.max(0, finalV + thermalJitter);
  const isTelemGlitch = (d.distCenter ?? 0) > 80 && Math.random() < 0.25;
  $("volt")?.classList.toggle("telemetry-glitch", isTelemGlitch);
  txt("volt", `${finalVWithJitter.toFixed(1)}V${low ? " · BAJA" : ""}`);
  txt("hpTxt", `${Math.ceil(Math.max(0, d.hp))} / ${d.maxHp}`);
  const isLoss = (d.distCenter ?? 0) > 85;
  if (ch("radarJammed", +isLoss)) $("radar")?.classList.toggle("rf-jammed", isLoss);
  const isRfReturn = d.distCenter !== undefined && d.distCenter >= 75;
  if (ch("radarReturn", +isRfReturn)) $("radar")?.classList.toggle("rf-return", isRfReturn);
  if (d.distCenter !== undefined) {
    const isFringe = d.distCenter > 75;
    if (ch("sigFringe", +isFringe)) $("signal").classList.toggle("fringe", isFringe);
    if (ch("rfLoss", +isLoss)) $("signal").classList.toggle("rf-loss", isLoss);
    if ((isLoss || isFringe) && now - lastRfChirp > 1200) {
      lastRfChirp = now;
      SFX.blip();
    }
    const isFringing = d.distCenter >= 60 && d.distCenter < 75;
    const isCritical = d.distCenter >= 75;
    if (ch("sigFringing", +isFringing)) $("signal")?.classList.toggle("sig-fringing", isFringing);
    if (ch("sigCritical", +isCritical)) $("signal")?.classList.toggle("sig-critical", isCritical);
  } else {
    if (ch("sigFringing", 0)) $("signal")?.classList.toggle("sig-fringing", false);
    if (ch("sigCritical", 0)) $("signal")?.classList.toggle("sig-critical", false);
  }
  let failsafeEl = document.getElementById("rfFailsafe");
  if (isLoss) {
    if (!failsafeEl) {
      failsafeEl = document.createElement("div");
      failsafeEl.id = "rfFailsafe";
      failsafeEl.className = "rf-failsafe";
      failsafeEl.textContent = "FAILSAFE RX: SEÑAL LÍMITE";
      $("hud")?.appendChild(failsafeEl);
    }
    failsafeEl.style.display = "";
    SFX.rfFailsafeAlarm();
  } else if (failsafeEl) {
    failsafeEl.style.display = "none";
  }
  const dbm = Math.round(-42 - Math.min(52, ((d.distCenter ?? 0) / 90) * 52));
  let sigDbm = document.getElementById("sigDbm");
  if (!sigDbm) {
    sigDbm = document.createElement("span");
    sigDbm.id = "sigDbm";
    sigDbm.className = "sig-dbm";
    const anchor = document.getElementById("sigBars") ?? document.getElementById("sigIco");
    if (anchor?.parentNode) anchor.parentNode.insertBefore(sigDbm, anchor.nextSibling);
    else $("signal")?.appendChild(sigDbm);
  }
  const rfJitter = isLoss ? (Math.random() < 0.4 ? (Math.random() > 0.5 ? 2 : -2) : 0) : 0;
  const displayDbm = dbm + rfJitter;
  if (ch("sigDbm", displayDbm)) sigDbm.textContent = `${displayDbm} dBm`;
  if (ch("sigWarn", +isLoss)) sigDbm.classList.toggle("sig-warn", isLoss);
  let sigPkt = document.getElementById("sigPkt");
  if (d.distCenter !== undefined && d.distCenter > 75) {
    const pktLoss = Math.min(68, Math.round(Math.max(0, (d.distCenter - 75) / 15 * 68)));
    if (!sigPkt) {
      sigPkt = document.createElement("span");
      sigPkt.id = "sigPkt";
      sigPkt.className = "sig-pkt";
      const anchor = document.getElementById("sigDbm") ?? document.getElementById("sigBars") ?? document.getElementById("sigIco");
      if (anchor?.parentNode) anchor.parentNode.insertBefore(sigPkt, anchor.nextSibling);
      else $("signal")?.appendChild(sigPkt);
    }
    sigPkt.style.display = "";
    const isCrcErr = pktLoss > 40;
    const pktTxt = isCrcErr ? `CRC ERR ${pktLoss}%` : `PL:${pktLoss}%`;
    if (ch("sigPkt", pktTxt)) sigPkt.textContent = pktTxt;
    if (ch("sigCrc", +isCrcErr)) sigPkt.classList.toggle("crc-err", isCrcErr);
    if (ch("pktLoss", +(pktLoss > 20))) $("signal")?.classList.toggle("pkt-loss", pktLoss > 20);
  } else {
    if (sigPkt) {
      sigPkt.style.display = "none";
      if (ch("sigCrc", 0)) sigPkt.classList.toggle("crc-err", false);
    }
    if (ch("pktLoss", 0)) $("signal")?.classList.toggle("pkt-loss", false);
  }
  const snr = Math.max(4, Math.round(36 - ((d.distCenter ?? 0) / 90) * 32));
  let sigSnr = document.getElementById("sigSnr");
  if (!sigSnr) {
    sigSnr = document.createElement("span");
    sigSnr.id = "sigSnr";
    sigSnr.className = "sig-snr";
    const anchor = document.getElementById("sigPkt") ?? document.getElementById("sigDbm") ?? document.getElementById("sigBars") ?? document.getElementById("sigIco");
    if (anchor?.parentNode) anchor.parentNode.insertBefore(sigSnr, anchor.nextSibling);
    else $("signal")?.appendChild(sigSnr);
  }
  const snrTxt = `SNR:${snr}dB`;
  if (ch("sigSnr", snrTxt)) sigSnr.textContent = snrTxt;
  const isSnrLow = snr < 12;
  if (ch("snrLow", +isSnrLow)) sigSnr.classList.toggle("snr-low", isSnrLow);
  if (ch("snrCrit", +(snr < 8))) sigSnr?.classList.toggle("snr-critical", snr < 8);

  let rxDiv = document.getElementById("rxDiv");
  if (!rxDiv) {
    rxDiv = document.createElement("span");
    rxDiv.id = "rxDiv";
    rxDiv.className = "rx-div";
    const anchor = document.getElementById("sigSnr") ?? document.getElementById("sigPkt") ?? document.getElementById("sigDbm") ?? document.getElementById("sigIco");
    if (anchor?.parentNode) anchor.parentNode.insertBefore(rxDiv, anchor.nextSibling);
    else $("signal")?.appendChild(rxDiv);
  }
  // Alterna antena receptora activa estocásticamente ante variaciones de señal
  if (ch("rxDivSwitch", Math.floor((d.time || 0) * 0.8) % 2)) {
    const ant = (Math.floor((d.time || 0) * 0.8) % 2 === 0) ? "RX:A" : "RX:B";
    rxDiv.textContent = ant;
  }

  const rssiBars = dbm > -60 ? 4 : dbm > -75 ? 3 : dbm > -88 ? 2 : 1;
  let sigRssi = document.getElementById("sigRssi");
  if (!sigRssi) {
    sigRssi = document.createElement("span");
    sigRssi.id = "sigRssi";
    sigRssi.className = "sig-rssi";
    const anchor = document.getElementById("rxDiv") ?? document.getElementById("sigSnr") ?? document.getElementById("sigPkt");
    if (anchor?.parentNode) anchor.parentNode.insertBefore(sigRssi, anchor.nextSibling);
    else $("signal")?.appendChild(sigRssi);
  }
  if (ch("rssiBars", rssiBars)) {
    sigRssi.className = `sig-rssi bars-${rssiBars}`;
    sigRssi.textContent = rssiBars === 4 ? "▌▌▌▌" : rssiBars === 3 ? "▌▌▌" : rssiBars === 2 ? "▌▌" : "▌";
  }

  const wasFringe = Boolean(memo.wasFringe);
  const nowNominal = d.distCenter !== undefined && d.distCenter < 60;
  if (wasFringe && nowNominal) {
    const rd = document.getElementById("rxDiv");
    if (rd) {
      rd.classList.remove("fhss-locked");
      void rd.offsetWidth;
      rd.classList.add("fhss-locked");
    }
  }
  memo.wasFringe = Boolean(d.distCenter !== undefined && d.distCenter >= 60);

  bar("boost", d.boost);
  if (ch("boostFull", +(d.boost >= 100))) $("boost").classList.toggle("full", d.boost >= 100);
  hudTurbo(d.boost / 100);
  bar("xp", Math.min(1, d.xp / d.need) * 100);
  const prevLv = memo.lvN as number | undefined;
  const lvTxt = `NV ${pad(d.level, 2)}${d.pending ? ` +${d.pending}` : ""}`;
  if (ch("lvlTxt", lvTxt)) $("lvl").textContent = lvTxt;
  const isMile = d.level % 10 === 0 && d.level > 0;
  if (ch("lvMile", +isMile)) $("lvl").classList.toggle("milestone", isMile);
  if (ch("lvN", d.level) && prevLv !== undefined && d.level > prevLv) {
    const s = $("signal"); s.classList.remove("up"); void s.offsetWidth; s.classList.add("up");
    const xpEl = $("xp"); xpEl.classList.remove("surge"); void xpEl.offsetWidth; xpEl.classList.add("surge");
  }
  txt("timer", `${pad(d.time / 60, 2)}:${pad(d.time % 60, 2)}`);
  const clockEl = document.getElementById("clock") ?? $("lcd");
  if (ch("endless", +(d.time >= 600))) clockEl.classList.toggle("endless", d.time >= 600);
  clockEl?.classList.toggle("rf-interference", snr < 8 && Math.random() < 0.25);
  txt("kills", d.kills > 9999 ? d.kills.toLocaleString("es-ES") : pad(d.kills, 4));
  const s = Math.min(1, Math.abs(d.kmh) / d.maxKmh);
  if (ch("spd", Math.round(s * 120))) { // media unidad de aguja por paso
    $("needle").style.transform = `rotate(${-120 + s * 240}deg)`;
    $("spdArc").style.strokeDasharray = `${s * ARC} 400`;
  }
  if (ch("spdTop", +(s >= 0.9))) (document.getElementById("spd") ?? $("txr")).classList.toggle("top", s >= 0.9);
  if (ch("blaze", +(s >= 0.95))) $("txr").classList.toggle("blazing", s >= 0.95);
  txt("kmh", String(Math.round(Math.abs(d.kmh))));
}

let glitchTimer = 0;
export function hudImpactGlitch() {
  const hudEl = $("hud");
  if (!hudEl) return;
  hudEl.classList.add("glitch");
  clearTimeout(glitchTimer);
  glitchTimer = window.setTimeout(() => hudEl.classList.remove("glitch"), 160);
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
      `<div class="row">${weapons.map((w) => {
        const evoP = WEAPONS[w.id as WeaponId]?.evo;
        const hasPair = !w.evolved && !!evoP && passives.some((p) => p.id === evoP);
        const evoReady = hasPair && w.lv >= 5;
        const isEvoMax = w.evolved && w.lv >= 5;
        const cls = w.evolved ? (isEvoMax ? "evo evo-max" : "evo") : evoReady ? "evo-ready" : hasPair ? "syn-on" : "";
        return `<div class="slot ${cls} ${!w.evolved && w.lv >= 5 ? "max" : ""}">${icon(w.id, 26)}<div class="cd"></div>${evoReady ? `<b class="evo-tag">EVO</b>` : ""}${w.evolved ? "" : pips(w.lv)}</div>`;
      }).join("")}</div>` +
      `<div class="row">${passives.map((p) => {
        const pairsW = weapons.some((w) => !w.evolved && WEAPONS[w.id as WeaponId]?.evo === p.id);
        return `<div class="slot small ${pairsW ? "syn-on" : ""} ${p.lv >= 5 ? "max" : ""}">${icon(p.id, 18)}${pips(p.lv)}</div>`;
      }).join("")}</div>`;
    cds = Array.from($("slots").querySelectorAll<HTMLElement>(".row:first-child .cd"));
  }
  cds.forEach((c, i) => { const v = (weapons[i]?.cd ?? 0).toFixed(2); if (ch(`cd${i}`, v)) c.style.setProperty("--cd", v); });
}

// ---------- Jefe ----------
export function hudBoss(name: string | null, pct = 1, kind?: string, enraged = false) {
  if (ch("boss", name ?? "")) $("bossbar").classList.toggle("hidden", !name);
  if (name) {
    const pInt = Math.max(0, Math.ceil(pct * 100));
    const hdKey = `${name}:${kind ?? ""}:${+enraged}:${pInt}`;
    if (ch("bossHd", hdKey)) {
      const portrait = kind ? (BEAST_PORTRAITS[kind as Kind] ?? "") : "";
      const portraitHtml = portrait
        ? `<div class="boss-banner-thumb"><img src="${portrait}" alt="" draggable="false"/></div>`
        : "";
      $("bossName").innerHTML = `${portraitHtml}${kind ? beastIcon(kind, 20) : ""}<span>${name}</span>${enraged ? `<b class="b-rage">FASE 2</b>` : ""}<small class="b-pct">${pInt}%</small>`;
    }
    bar("bossHp", pct * 100);
    if (ch("crit", +(pct < 0.25))) $("bossbar").classList.toggle("crit", pct < 0.25);
    if (ch("rage", +enraged)) $("bossbar").classList.toggle("rage", enraged);
  }
}

// ---------- ENCORE: contador de escenario y ventana de decisión (encore.ts) ----------
/** null = Supervivencia: todo oculto. tag = [prefijo, texto, numerado]; ask = ventana abierta con sus dos botones (null = sin botón) y lo que queda. */
type EncAsk = { title: string; opts: [string | null, string | null]; left: number; frac: number; pacts?: [PactView, PactView]; reject?: string };
const pactHtml = (p: PactView) => `<b>${p.name}</b><small>VENTAJA</small>${p.gain.map((t) => `<span class="pg">${t}</span>`).join("")}<small>COSTO</small>${p.cost.map((t) => `<span class="pc">${t}</span>`).join("")}<em>${p.dur}</em>`;
/** ENCORE para 2 (R7a): vida del otro jugador; down = fuera hasta el próximo escenario. */
export function hudMate(d: { n: string; hp: number; max: number; down: boolean } | null) {
  if (ch("mateOn", !!d)) $("mateHp").classList.toggle("hidden", !d);
  if (!d) return;
  if (ch("mateDown", d.down)) $("mateHp").classList.toggle("down", d.down);
  txt("mateN", d.n); txt("mateTxt", d.down ? "FUERA" : `${Math.ceil(d.hp)}/${d.max}`);
  ($("mateBar") as HTMLElement).style.transform = `scaleX(${d.down ? 0 : Math.max(0, d.hp / d.max)})`;
}
/** R7c: 3-4 jugadores en 2x2, una vida compacta por cuadro (J1 arriba izq., J2 arriba der., J3 abajo izq., J4 abajo der.); con 3 el cuarto queda negro. */
export function hudQuad(d: { hp: number; max: number; down: boolean }[] | null) {
  if (ch("quadN", d?.length ?? 0)) {
    $("quadHp").classList.toggle("hidden", !d); $("quadVoid").classList.toggle("hidden", d?.length !== 3);
    $("quadHp").innerHTML = (d ?? []).map((_, i) => `<div class="q${i + 1}"><b>J${i + 1}</b><i><u></u></i><span></span></div>`).join("");
    for (let i = 0; i < 4; i++) ch(`quad${i}`, ""); // chips nuevos: que se escriban aunque el valor no cambió
  }
  if (!d) return;
  d.forEach((p, i) => {
    if (!ch(`quad${i}`, `${Math.ceil(p.hp)}/${p.max}/${p.down}`)) return;
    const el = $("quadHp").children[i] as HTMLElement;
    el.classList.toggle("down", p.down);
    el.querySelector("span")!.textContent = p.down ? "FUERA" : `${Math.ceil(Math.max(0, p.hp))}/${p.max}`;
    el.querySelector("u")!.style.transform = `scaleX(${p.down ? 0 : Math.max(0, p.hp / p.max)})`;
  });
}
export function hudEnc(d: { tag: [string, string, boolean]; pacts: { tag: string; left: string; terms: string }[]; ask: EncAsk | null } | null) {
  if (ch("encOn", !!d)) $("encTag").classList.toggle("hidden", !d);
  if (ch("encPk", d ? d.pacts.map((p) => p.tag + p.left).join("|") : "")) $("encPacts").innerHTML = d ? d.pacts.map((p) => `<i title="${p.terms}"><b>${p.tag}</b> ${p.left}</i>`).join("") : ""; // pactos activos, compactos bajo el reloj
  if (!d) { if (ch("encAskOn", false)) $("encAsk").classList.add("hidden"); return; }
  txt("encW", d.tag[0]); txt("encN", d.tag[1]);
  if (ch("encSt", d.tag[2])) $("encTag").classList.toggle("st", d.tag[2]);
  const a = d.ask;
  if (ch("encAskOn", !!a)) $("encAsk").classList.toggle("hidden", !a);
  if (!a) return;
  if (ch("encPact", !!a.pacts)) $("encAsk").classList.toggle("pact", !!a.pacts);
  txt("encTitle", a.title); txt("encS", `${Math.ceil(a.left)} S`);
  bar("encBar", a.frac * 100);
  const kb = (k: string) => (isTouch ? "" : ` <kbd>${k}</kbd>`);
  a.opts.forEach((o, i) => {
    const b = $(i ? "encB" : "encA");
    if (ch("encO" + i, o ?? "")) { b.classList.toggle("hidden", !o); b.innerHTML = o ? `${a.pacts ? pactHtml(a.pacts[i]) : o}${kb(i ? "X" : "Z")}` : ""; }
  });
  if (ch("encRj", a.reject ?? "")) { const c = $("encC"); c.classList.toggle("hidden", !a.reject); c.innerHTML = a.reject ? `${a.reject}${kb("V")}` : ""; }
}

// ---------- Aviso de radio: entra con interferencia y el texto se va tecleando ----------
const STATIC = "#%/\\&@0123456789"; // el último carácter tecleado llega como estática
type BannerOpts = { tag?: string; ico?: string; tone?: "warn" | "now" };
type BannerQ = { txt: string; secs: number; opts?: BannerOpts };
let bannerOn = false, bannerTyping = false, bannerHold = 0, bannerMsg = "", bannerN = 0, bannerShown = -1, bannerTone: BannerOpts["tone"];
const bannerQ: BannerQ[] = [];
function applyBannerSkin(b: HTMLElement, opts?: BannerOpts) {
  const ico = el("bannerIco");
  b.classList.remove("evt-warn", "evt-now");
  if (opts?.tone) {
    b.classList.add(opts.tone === "warn" ? "evt-warn" : "evt-now");
    b.querySelector(".rx-tag")!.textContent = opts.tag ?? "RADIO";
    ico.classList.remove("hidden");
    ico.innerHTML = icon(opts.ico ?? "senal", 28);
    bannerTone = opts.tone;
  } else {
    bannerTone = undefined;
    ico.classList.add("hidden");
    ico.innerHTML = "";
  }
  if (opts?.tone === "now" || opts?.tone === "warn") b.classList.add("event-pulse");
  else b.classList.remove("event-pulse");
}
function showBanner(txt: string, secs: number, opts?: BannerOpts) {
  const b = $("banner");
  bannerMsg = txt; bannerN = 0; bannerShown = -1; bannerOn = true; bannerTyping = true; bannerHold = secs;
  applyBannerSkin(b, opts);
  b.querySelector(".gh")!.textContent = txt;
  b.querySelector(".ty")!.textContent = "";
  b.classList.remove("hidden", "out");
  b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
}
export function banner(txt: string, secs = 2, opts?: BannerOpts) {
  const q: BannerQ = { txt, secs, opts };
  if (bannerOn) {
    if (txt !== bannerMsg && !bannerQ.some((x) => x.txt === txt) && bannerQ.length < 3) bannerQ.push(q);
    return;
  }
  showBanner(txt, secs, opts);
}
/** Avisos de patio (enjambre, élite, lluvia, pelota, cofre): copy y duración fijos para lectura en ~6 s de anticipación. */
export type RadioEvent =
  | "lluvia_pre" | "lluvia" | "enjambre_pre" | "enjambre" | "pelota_pre" | "pelota"
  | "ev1_pre" | "ev1" | "ev2_pre" | "ev2" | "ev3_pre" | "ev3" | "elite_rapida_pre" | "elite_blindada_pre" | "elite_rapida" | "elite_blindada" | "cofre";
/** Minijefe / jefe final: el nombre coincide con la barra superior (hudBoss). */
export function radioBoss(phase: "pre" | "now", name: string, final = false) {
  const line = phase === "pre"
    ? (final ? `JEFE FINAL · ${name} · ENTRADA ~30 S` : `MINIJEFE · ${name} · ENTRADA ~30 S`)
    : `${name} · EN CAMPO`;
  banner(line, phase === "pre" ? 3.6 : 2.8, { tag: "SEÑAL", ico: "jefe", tone: phase === "pre" ? "warn" : "now" });
}
const RADIO: Record<RadioEvent, { line: string; secs: number; tag: string; ico: string; tone: "warn" | "now" }> = {
  lluvia_pre: { tag: "METEO", line: "HUMEDAD AL SUBIR · AVISO ~6 S", secs: 3.4, ico: "agua", tone: "warn" },
  lluvia: { tag: "METEO", line: "LLUVIA · PATIO RESBALADIZO", secs: 2.4, ico: "agua", tone: "now" },
  enjambre_pre: { tag: "RADAR", line: "ENJAMBRE · CIERRE EN ~6 S", secs: 3.4, ico: "gomitas", tone: "warn" },
  enjambre: { tag: "RADAR", line: "ENJAMBRE · OLEADA CERRADA", secs: 2.2, ico: "gomitas", tone: "now" },
  pelota_pre: { tag: "RADAR", line: "OBJETO PESADO · TRAYECTORIA FIJADA", secs: 3.2, ico: "globos", tone: "warn" },
  pelota: { tag: "ALERTA", line: "PELOTA · CRUCE DEL PATIO", secs: 2.2, ico: "globos", tone: "now" },
  elite_rapida_pre: { tag: "SEÑAL", line: "ÉLITE VELOZ · ENTRADA ~6 S", secs: 3.2, ico: "jefe", tone: "warn" },
  elite_blindada_pre: { tag: "SEÑAL", line: "ÉLITE BLINDADA · ENTRADA ~6 S", secs: 3.2, ico: "jefe", tone: "warn" },
  elite_rapida: { tag: "SEÑAL", line: "ÉLITE ACTIVA · VELOZ", secs: 2.2, ico: "jefe", tone: "now" },
  elite_blindada: { tag: "SEÑAL", line: "ÉLITE ACTIVA · BLINDADA", secs: 2.2, ico: "jefe", tone: "now" },
  ev1_pre: { tag: "METEO", line: "LLUVIA DE TORNILLOS · EN 3 S", secs: 3, ico: "tuercas", tone: "warn" },
  ev1: { tag: "METEO", line: "LLUVIA DE TORNILLOS · A RECOGER", secs: 2.2, ico: "tuercas", tone: "now" },
  ev2_pre: { tag: "RADAR", line: "INVASIÓN REPENTINA · EN 3 S", secs: 3, ico: "gomitas", tone: "warn" },
  ev2: { tag: "RADAR", line: "INVASIÓN REPENTINA · AGUANTAR", secs: 2.2, ico: "gomitas", tone: "now" },
  ev3_pre: { tag: "RED", line: "APAGÓN · EN 3 S", secs: 3, ico: "jefe", tone: "warn" },
  ev3: { tag: "RED", line: "APAGÓN · SOLO QUEDA EL FARO", secs: 2.2, ico: "jefe", tone: "now" },
  cofre: { tag: "RADAR", line: "COFRE · SIN CUSTODIA", secs: 2.6, ico: "cofre", tone: "now" },
};
export function radioEvent(id: RadioEvent) {
  const e = RADIO[id];
  banner(e.line, e.secs, { tag: e.tag, ico: e.ico, tone: e.tone });
}
// ---------- Subtítulo del Director (ENCORE): la cola vive en encore.ts (dirTick); acá solo se muestra ----------
let dirLeft = 0;
export function dirSub(txt: string | null, secs = 3.6) {
  const b = $("dirSub");
  dirLeft = txt ? secs : 0;
  b.classList.toggle("hidden", !txt);
  if (txt) b.querySelector(".dtxt")!.textContent = txt;
}
/** Fin de partida: se va el aviso en pantalla y los que esperaban (QA final: el aviso encolado salía sobre los resultados). */
export function bannerClear() { bannerQ.length = 0; hideBanner(); }
function hideBanner() {
  bannerOn = false; bannerTyping = false; bannerHold = 0;
  const b = $("banner");
  b.classList.add("hidden");
  b.classList.remove("out", "evt-warn", "evt-now", "event-pulse");
  el("bannerIco").classList.add("hidden");
}
function tickBanner(dt: number) {
  if (!bannerOn) {
    if (bannerQ.length && $("levelup").classList.contains("hidden")) {
      const n = bannerQ.shift()!;
      showBanner(n.txt, n.secs, n.opts);
    }
    return;
  }
  const ty = $("banner").querySelector(".ty")!;
  const cps = bannerTone ? 26 : 36;
  if (bannerTyping) {
    bannerN += dt * cps;
    const n = Math.min(bannerMsg.length, bannerN | 0), typing = n < bannerMsg.length;
    if (typing || n !== bannerShown) {
      bannerShown = n;
      ty.textContent = bannerMsg.slice(0, n) + (typing ? STATIC[(Math.random() * STATIC.length) | 0] : "");
    }
    if (!typing) { bannerTyping = false; ty.textContent = bannerMsg; }
    return;
  }
  if ((bannerHold -= dt) <= 0) return hideBanner();
  if (bannerHold < 0.35) $("banner").classList.add("out");
}

// ---------- Turbo del auto: aviso en recarga ----------
export function hudTurbo(ready: number) {
  const warn = ready < 1;
  if (ch("turboWarn", +warn)) {
    const el = $("boost");
    el.classList.toggle("warn", warn);
    el.classList.toggle("charging", warn);
  }
}

// ---------- Salto del auto: CD en botón táctil y mini barra en teclado ----------
export function hudJump(ready: number) {
  if (ready === 0) {
    const voltEl = $("volt");
    voltEl.classList.remove("surge"); void voltEl.offsetWidth; voltEl.classList.add("surge");
  }
  $("jump").classList.toggle("ready", ready === 1);
  $("jump").classList.toggle("warn", ready < 1);
  const cd = ready >= 1 ? 0 : 1 - ready;
  const cdS = cd.toFixed(3);
  if (ch("jmpCd", cdS)) {
    $("tJump").style.setProperty("--cd", cdS);
    $("jumpRow").classList.toggle("hidden", isTouch);
    $("jumpTrack").classList.toggle("hidden", isTouch);
    $("jumpRow").classList.toggle("ready", ready >= 1);
  }
  if (!isTouch) {
    const k = KEYS.jump[0];
    txt("jumpKey", `${ready >= 1 ? "LISTO · " : ""}${k.startsWith("Key") ? k.slice(3) : k}`);
    bar("jumpBar", ready * 100);
  }
}

export function hudAbility(name: string, key: string, frac: number, on: boolean, ico?: string, remS?: number) {
  if (ch("abName", `${ico ?? ""}:${name}`)) $("abName").innerHTML = `${ico ? icon(ico, 13) : ""}${name}`;
  const stTxt = on ? "ACTIVA" : frac >= 1 ? "LISTO" : remS && remS > 0 ? `${Math.ceil(remS)}S` : "";
  txt("abKey", isTouch ? stTxt : stTxt ? `${stTxt} · ${key}` : key);
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
  txt("drvN", `XP ×${mul.toFixed(1)}`);
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
const RS = 64, RH = RS / 2, RR = 50; let RK = (RH - 1) / RR; // lado, centro, alcance en metros, píxeles por metro
type Blip = { x: number; z: number; kind: "enemigo" | "elite" | "jefe" | "cofre" | "gema" | "rec" | "obj" };
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
  const hasCh = blips.some((b) => b.kind === "cofre");
  if (ch("radCh", +hasCh)) (document.getElementById("radar") ?? $("radarC").parentElement)?.classList.toggle("has-chest", hasCh);
}
function drawRadar() {
  RK = (RH - 1) / (RR * LIVE.radar); // Antena de radio: más alcance
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
  // Marcas cardinales (N/E/S/O)
  g.font = "700 6px Rajdhani, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  ([["N", 0, "#ffd24a"], ["E", 1.5708, "#8dff6a"], ["S", 3.1416, "#8dff6a"], ["O", -1.5708, "#8dff6a"]] as const).forEach(([lb, ang, col]) => {
    const a = ang - u, lx = RH + Math.sin(a) * (RH - 5.5), ly = RH - Math.cos(a) * (RH - 5.5);
    g.fillStyle = col; g.globalAlpha = lb === "N" ? 0.9 : 0.55; g.fillText(lb, lx, ly);
  });
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
    if (far && (b.kind === "enemigo" || b.kind === "gema" || b.kind === "rec")) continue;
    const k = far ? (RH - 3) / d : 1; // jefe y cofre fuera de alcance se pegan al borde
    const x = Math.round(RH + rx * RK * k), y = Math.round(RH - ry * RK * k);
    const age = (((rSweep - Math.atan2(rx, ry)) % 6.2832) + 6.2832) % 6.2832 / 6.2832;
    if (b.kind === "jefe") { if (blink) { g.globalAlpha = 1; g.fillStyle = "#ff4a38"; g.fillRect(x - 1, y - 1, 3, 3); } }
    else if (b.kind === "elite") { g.globalAlpha = 1; g.fillStyle = "#e8b0ff"; g.fillRect(x, y, 2, 2); }
    else if (b.kind === "obj") { if (blink) { g.globalAlpha = 1; g.fillStyle = "#ffb347"; g.fillRect(x - 1, y - 1, 3, 3); } else { g.globalAlpha = 0.7; g.fillStyle = "#ffb347"; g.fillRect(x, y, 1, 1); } }
    else if (b.kind === "cofre") { g.globalAlpha = 1; g.fillStyle = "#e0a030"; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    else if (b.kind === "rec") { g.globalAlpha = 1 - age * 0.5; g.fillStyle = "#b9d3a4"; g.fillRect(x, y, 2, 2); }
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
  if (dirLeft > 0 && (dirLeft -= dt) <= 0) $("dirSub").classList.add("hidden");
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
  e.textContent = `${Math.round(v)}${crit ? "!" : ""}`;
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
export function hudArrows(list: { x: number; y: number; kind: "jefe" | "cofre"; dist?: number }[]) {
  const box = $("arrows");
  while (box.children.length < list.length) box.insertAdjacentHTML("beforeend", `<div class="arw">${CHEV}<span class="glyph"></span><small class="adist"></small></div>`);
  const w = innerWidth, h = innerHeight, m = 40;
  Array.from(box.children).forEach((c, i) => {
    const a = list[i], e = c as HTMLElement;
    if (!a) { e.style.display = "none"; return; }
    const cx = w / 2, cy = h / 2, dx = a.x - cx, dy = a.y - cy;
    const t = Math.min((cx - m) / Math.abs(dx || 1e-3), (cy - m) / Math.abs(dy || 1e-3));
    e.style.display = "";
    if (e.dataset.k !== a.kind) { e.dataset.k = a.kind; e.className = `arw ${a.kind}`; e.querySelector(".glyph")!.innerHTML = icon(a.kind, 16); }
    (e.lastElementChild as HTMLElement).textContent = a.dist ? `${a.dist}m` : "";
    e.style.transform = `translate(${cx + dx * t}px, ${cy + dy * t}px)`;
    (e.firstElementChild as HTMLElement).style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  });
}

// ---------- Cartas de mejora ----------
const rarity = (o: Offer) => (o.kind === "evo" ? "evo" : o.kind === "fusion" ? "fusion" : o.lv === 5 ? "epica" : o.kind === "weapon" && o.lv === 1 ? "rara" : "comun");
const kindLabel = (o: Offer) => (
  o.kind === "evo" ? "Evolución" :
  o.kind === "fusion" ? "Fusión" :
  o.kind === "heal" ? "Reparación · +35% vida" :
  o.lv === 1 ? (o.kind === "weapon" ? "Arma · NUEVA" : "Pieza · NUEVA") :
  `${o.kind === "weapon" ? "Arma" : "Pieza"} · NV ${(o.lv ?? 2) - 1} → NV ${o.lv}${o.lv === 5 && o.syn?.ready ? " · ¡EVO LISTA!" : o.lv === 5 ? " · MÁX" : ""}`
);

const EVO_ART: Partial<Record<WeaponId, string>> = {
  gomitas: "./images/evolutions/evo-gomitas.webp",
  clips: "./images/evolutions/evo-clips.webp",
  chispero: "./images/evolutions/evo-chispero.webp",
  petardos: "./images/evolutions/evo-petardos.webp",
  tesla: "./images/evolutions/evo-tesla.webp",
  lanza: "./images/evolutions/evo-lanza.webp",
  agua: "./images/evolutions/evo-agua.webp",
  yoyo: "./images/evolutions/evo-yoyo.webp",
  bengalas: "./images/evolutions/evo-bengalas.webp",
  regla: "./images/evolutions/evo-regla.webp",
  helado: "./images/evolutions/evo-helado.webp",
  bocina: "./images/evolutions/evo-bocina.webp",
  trompo: "./images/evolutions/evo-trompo.webp",
  tuercas: "./images/evolutions/evo-tuercas.webp",
  bobinas: "./images/evolutions/evo-bobinas.webp",
  ventilador: "./images/evolutions/evo-ventilador.webp",
  canicas: "./images/evolutions/evo-canicas.webp",
  burbujas: "./images/evolutions/evo-burbujas.webp",
  matamoscas: "./images/evolutions/evo-matamoscas.webp",
  dardos: "./images/evolutions/evo-dardos.webp",
  chapitas: "./images/evolutions/evo-chapitas.webp",
  paraguas: "./images/evolutions/evo-paraguas.webp",
  cohete: "./images/evolutions/evo-cohete.webp",
  serpentinas: "./images/evolutions/evo-serpentinas.webp",
  tambor: "./images/evolutions/evo-tambor.webp",
  domino: "./images/evolutions/evo-domino.webp",
  avioncito: "./images/evolutions/evo-avioncito.webp",
  pintura: "./images/evolutions/evo-pintura.webp",
  bumeran: "./images/evolutions/evo-bumeran.webp",
  confeti: "./images/evolutions/evo-confeti.webp",
  lupasolar: "./images/evolutions/evo-lupasolar.webp",
  dron: "./images/evolutions/evo-dron.webp",
};

const evoImage = (o: Offer): string | null => {
  if (o.kind !== "evo") return null;
  return EVO_ART[o.id as WeaponId] ?? null;
};

let pickCb: ((i: number) => void) | null = null;
let hoverCb: ((i: number) => void) | null = null;
let busy = false;
export function showOffers(title: string, offers: Offer[], sel: number, onPick: (i: number) => void, onHover?: (i: number) => void, sub = "", threat: "" | "boss" | "near" = "") {
  pickCb = onPick;
  hoverCb = onHover ?? null;
  busy = false;
  hideBanner();
  $("luTitle").textContent = title;
  const subEl = $("luSub");
  subEl.textContent = sub;
  subEl.className = threat ? `lu-sub lu-sub--${threat}` : "lu-sub";
  $("offers").innerHTML = offers.map((o, i) => {
    const evoImgSrc = evoImage(o);
    const artContent = evoImgSrc
      ? `<div class="evo-thumb"><img src="${evoImgSrc}" alt="${o.title}" class="evo-thumb-img" width="76" height="76" loading="lazy" /><div class="evo-thumb-rivets"></div></div>`
      : icon(o.kind === "evo" ? o.id : o.icon, 44);
    return `
    <div class="offer ${rarity(o)} ${o.kind === "heal" ? "heal" : ""} ${o.lv === 5 && o.syn?.ready ? "evo-rdy" : ""} ${evoImgSrc ? "has-evo-art" : ""} ${i === sel ? "sel" : ""}" data-i="${i}" style="--i:${i}">
      <span class="kind">${kindLabel(o)}</span>
      <div class="art ${evoImgSrc ? "art-evo-thumb" : ""}">${artContent}</div>
      <b>${o.title}</b>
      <span>${o.desc}</span>
      ${o.syn ? `<div class="syn ${o.syn.ready ? "on" : ""}">${o.syn.icons.map((k) => icon(k, 14)).join("")}<span>${o.syn.label}</span></div>` : ""}
      ${o.lv ? `<span class="pips">${Array.from({ length: 5 }, (_, k) => `<i class="${k === o.lv! - 1 && o.lv! > 1 ? "on next" : k < o.lv! ? "on" : ""}"></i>`).join("")}</span>` : ""}
    </div>`;
  }).join("");
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
