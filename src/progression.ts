import * as B from "@babylonjs/core";
import { run } from "./run_state";
import { BAL, xpNeed } from "./balance";
import { save, keyName } from "./menu";
import { SFX, engineStop } from "./sfx";
import { banner, showOffers } from "./ui";
import { btnName, isTouch, KEYS, pb } from "./input";
import { tut, tutOffers } from "./tutorial";
import { ACH, type AchId } from "./achievements";
import { grant } from "./outro";
import { erun } from "./encore_run";
import { hd } from "./moon";
import { advanceCardBy, getNet } from "./net_client";
import { track } from "./net";
import { evoOffer, fuse, levelOffers, makeWeapon, mountFor, type Offer, type PassiveId, type PStats, type Weapon, type WeaponId, WEAPONS } from "./weapons";
import type { Player } from "./coop";
import type { Enemy } from "./enemies";
import type { Cmd } from "./main";

const R = BAL.ritmo;
const $ = (id: string) => document.getElementById(id)!;

// Progresión: XP, subida de nivel, cartas (ofertas, re-sorteo, elección) y cofres. Estado de partida: `run`; el resto entra por initProgression.
export interface ProgressionContext {
  readonly scene: B.Scene;
  readonly players: Player[];
  readonly lead: Player;
  readonly enemies: Enemy[];
  readonly st: PStats;
  readonly weapons: Weapon[];
  setWeapons: (w: Weapon[]) => void;
  readonly state: string;
  setState: (s: "play" | "level") => void;
  readonly offers: Offer[];
  setOffers: (o: Offer[]) => void;
  setOfferSel: (s: number) => void;
  readonly preview: B.Mesh | null;
  setPreview: (m: B.Mesh | null) => void;
  readonly offerFilter: ((id: string) => boolean) | null;
  readonly evoNotified: Set<string>;
  readonly simulating: boolean;
  readonly daily: boolean;
  readonly lab: { on: boolean };
  liveM: () => Player[];
  recompute: () => void;
  applyCommand: (id: number, cmd: Cmd) => void;
}
let c!: ProgressionContext;
export function initProgression(x: ProgressionContext) { c = x; }

export function previewOffer(i: number) {
  c.preview?.dispose();
  c.setPreview(null);
  const o = c.offers[i];
  if (!c.lead.car || !o || (o.kind !== "weapon" && o.kind !== "evo")) return;
  const owned = c.weapons.find((w) => w.id === o.id);
  if (!owned) c.setPreview(mountFor(o.id as WeaponId, c.lead.car));
  else if (owned.mount) owned.mount.scaling.setAll(1.25 + (o.kind === "evo" ? 0.2 : 0));
}

export function gainXp(n: number) {
  const early = run.time < R.xp_temprana_s ? R.xp_temprana_mult : 1;
  run.xp += n * c.st.xp * run.driveMul * early;
  while (run.xp >= xpNeed(run.level)) { run.xp -= xpNeed(run.level); run.level++; run.pendingLevels++; }
}

// Sin reparaciones: fuera las cartas de curación y la Pila de litio (regenera); se pide una de más para no quedar corto
export function offersFor() {
  const n = 3 + save.perm.cards;
  if (c.offerFilter) { const l = levelOffers(c.weapons, run.passives, 40).filter((o) => o.kind === "weapon" ? c.offerFilter!(o.id) : o.kind === "passive").slice(0, n); return run.noRepair ? l.filter((o) => o.id !== "litio") : l; } // solo_gomitas: armas filtradas, pasivas libres (ponytail: pool de 40 ≈ todo el catálogo)
  return run.noRepair ? levelOffers(c.weapons, run.passives, n + 1).filter((o) => o.kind !== "heal" && o.id !== "litio").slice(0, n) : levelOffers(c.weapons, run.passives, n);
}
export function openOffers(list: Offer[], title: string, keep = false) {
  if (!list.length) return; // Sin reparaciones con todo al máximo: no hay nada que ofrecer
  const net = getNet();
  const cardBy = advanceCardBy(keep); // R6c: online se alterna quién elige
  const mine = !net || cardBy === c.players[0].id; // en el anfitrión el jugador local es c.players[0] aunque guíe el J2
  net?.send({ t: "lv", title, o: list, by: cardBy }, true);
  c.setState("level");
  tutOffers();
  c.scene.physicsEnabled = false;
  c.setOffers(list);
  c.setOfferSel(0);
  SFX.levelUp();
  engineStop();
  const car = c.lead.car!;
  let near = 0, bossNear = false;
  for (const e of c.enemies) {
    if (hd(e.pos, car.pos) > 24) continue;
    if (e.def.boss) bossNear = true;
    else near++;
  }
  const threat = bossNear ? "boss" : near ? "near" : "";
  const sub = bossNear ? "Jefe en radio corto" : near ? `${near} contacto${near === 1 ? "" : "s"} en radio` : "";
  const show = () => showOffers(title, list, 0, (i) => (mine ? c.applyCommand(cardBy, { k: "card", i }) : show()), previewOffer, mine ? sub : `Elige J${cardBy}`, mine ? threat : "");
  show();
  run.offerTitle = title;
  const frac = c.lead.hp / c.lead.maxHp;
  $("luHpFill").style.transform = `scaleX(${frac})`;
  $("luHpN").textContent = `${Math.ceil(c.lead.hp)}/${c.lead.maxHp}`;
  $("luHp").classList.toggle("lu-hp--low", frac < 0.35);
  const can = mine && run.rerolls > 0 && list[0]?.kind !== "evo";
  const rr = $("luReroll");
  rr.classList.toggle("hidden", !can);
  if (can) { rr.textContent = `Re-sortear (${run.rerolls})`; rr.onclick = () => c.applyCommand(cardBy, { k: "reroll" }); } else rr.onclick = null;
  $("luHint").textContent = isTouch ? "Toca una carta para elegirla" : `${list.map((_, i) => i + 1).join(" · ")} o clic — Enter confirma${can ? ` · ${keyName(KEYS.reroll[0])} o ${btnName(pb("reroll"))}` : ""}`;
  $("luHint").onclick = null;
}
// Re-sorteo de cartas (Dado cargado): mismas reglas, cartas nuevas. Las evoluciones no se re-sortean.
export function reroll() {
  if (c.state !== "level" || run.rerolls <= 0 || c.offers[0]?.kind === "evo" || document.querySelector("#offers .picked")) return;
  run.rerolls--;
  c.preview?.dispose();
  c.setPreview(null);
  openOffers(offersFor(), run.offerTitle, true);
}

export function choose(i: number, by = c.lead) {
  if (c.state !== "level") return;
  c.preview?.dispose();
  c.setPreview(null);
  const o = c.offers[i];
  tut("level");
  if (o.kind === "weapon") {
    const w = c.weapons.find((x) => x.id === o.id);
    if (w) w.lv++; else c.weapons.push(makeWeapon(o.id as WeaponId));
  } else if (o.kind === "passive") run.passives[o.id as PassiveId] = o.lv!;
  else if (o.kind === "evo") { c.weapons.find((x) => x.id === o.id)!.evolved = true; banner(o.title.toUpperCase()); }
  else if (o.kind === "fusion") { c.setWeapons(fuse(c.weapons, o.id as WeaponId)); banner(o.title.toUpperCase()); if (o.id in ACH) grant(o.id as AchId); }
  else by.hp = Math.min(by.maxHp, by.hp + R.carta_reparacion);
  if (!c.simulating && !c.lab.on) track("upgrade_pick", { id: o.id, lv: o.lv ?? c.weapons.find((x) => x.id === o.id)?.lv ?? 0, mode: erun ? "encore" : c.daily ? "diario" : "supervivencia" });
  c.recompute();
  if (!c.simulating && (o.kind === "weapon" || o.kind === "passive")) {
    for (const w of c.weapons) {
      if (!w.evolved && w.lv >= 5 && run.passives[WEAPONS[w.id].evo] && !c.evoNotified.has(w.id)) {
        c.evoNotified.add(w.id);
        banner(`EVOLUCIÓN LISTA · ${WEAPONS[w.id].evoName.toUpperCase()} (COFRE)`, 2.4);
      }
    }
  }
  c.setState("play");
  c.scene.physicsEnabled = false; // T39: en play el paso es manual
  getNet()?.send({ t: "lvx" }, true); // R6c: el cliente cierra las cartas
}

/** R7b: " · J2" si con 2 jugadores lo activó el otro (who = 1) o el que guía es el J2; vacío con 1 jugador. Las cartas son de los dos y elige cualquiera. */
export const byTag = (who = 0) => (c.players.length > 1 ? ` · J${(who && c.liveM()[who - 1]?.id) || c.lead.id}` : "");
export function openChest(who = 0) {
  const evo = evoOffer(c.weapons, run.passives);
  openOffers(evo ? [evo] : offersFor(), (evo ? (evo.kind === "fusion" ? "Cofre · Fusión" : "Cofre · Evolución") : "Cofre") + byTag(who));
}
