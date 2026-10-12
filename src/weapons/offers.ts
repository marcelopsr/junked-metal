import { rng } from "../rng";
import { FUSIONS, isFusion, NMAX, WEAPONS, type Weapon, type WeaponId } from "./base";
import { PASSIVES, type PassiveId } from "./passives";

// ---------- Opciones al subir de nivel ----------
export type Offer = {
  kind: "weapon" | "passive" | "evo" | "fusion" | "heal";
  id: string;
  title: string;
  icon: string;
  desc: string;
  lv?: number;
  syn?: { icons: string[]; label: string; ready?: boolean };
};

function weaponSyn(id: WeaponId, ps: Partial<Record<PassiveId, number>>): Offer["syn"] {
  const p = WEAPONS[id].evo, ready = (ps[p] ?? 0) > 0;
  return { icons: [p], label: `${ready ? "Par listo · " : "Evo · "}${PASSIVES[p].name}`, ready };
}

function passiveSyn(id: PassiveId, ws: Weapon[]): Offer["syn"] {
  const all = (Object.keys(WEAPONS) as WeaponId[]).filter((k) => !isFusion(k) && WEAPONS[k].evo === id);
  if (!all.length) return undefined;
  const owned = ws.filter((w) => !w.evolved && WEAPONS[w.id].evo === id).map((w) => w.id);
  const use = owned.length ? owned : all;
  const names = use.slice(0, 2).map((k) => WEAPONS[k].name).join(owned.length ? " · " : " / ");
  return {
    icons: use.slice(0, 2),
    label: `${owned.length ? "Par listo · " : "Evo · "}${names}${use.length > 2 ? ` +${use.length - 2}` : ""}`,
    ready: owned.length > 0,
  };
}

export function levelOffers(ws: Weapon[], ps: Partial<Record<PassiveId, number>>, n = 3): Offer[] {
  const pool: Offer[] = [];
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    if (isFusion(id)) continue;
    const w = ws.find((x) => x.id === id);
    const syn = weaponSyn(id, ps);
    if (!w && ws.length < 6 && !fusedFrom(ws, id)) pool.push({ kind: "weapon", id, title: WEAPONS[id].name, icon: id, desc: WEAPONS[id].desc, lv: 1, syn });
    else if (w && w.lv < NMAX && !w.evolved) pool.push({ kind: "weapon", id, title: WEAPONS[id].name, icon: id, desc: `Nivel ${w.lv + 1}: más daño y alcance, sin aumento de sueldo`, lv: w.lv + 1, syn });
  }
  const owned = Object.keys(ps).length;
  for (const id of Object.keys(PASSIVES) as PassiveId[]) {
    const l = ps[id] ?? 0;
    if ((l || owned < 6) && l < NMAX) pool.push({ kind: "passive", id, title: PASSIVES[id].name, icon: id, desc: PASSIVES[id].desc, lv: l + 1, syn: passiveSyn(id, ws) });
  }
  pool.sort(() => rng() - 0.5);
  const out = pool.slice(0, n);
  const fu = fusionOffer(ws);
  if (fu) out[0] = fu; // si hay fusión disponible, siempre es la primera carta
  while (out.length < n) out.push({ kind: "heal", id: "heal", title: "Reparación", icon: "heal", desc: "Recupera 40 de vida. Cinta aislante y buenos deseos" });
  return out;
}

export function evoOffer(ws: Weapon[], ps: Partial<Record<PassiveId, number>>): Offer | null {
  const w = ws.find((x) => x.lv >= NMAX && !x.evolved && (ps[WEAPONS[x.id].evo] ?? 0) > 0);
  if (!w) return fusionOffer(ws);
  const p = WEAPONS[w.id].evo;
  return {
    kind: "evo",
    id: w.id,
    title: WEAPONS[w.id].evoName,
    icon: "evo",
    desc: WEAPONS[w.id].evoDesc,
    syn: { icons: [w.id, p], label: `${WEAPONS[w.id].name} + ${PASSIVES[p].name}`, ready: true },
  };
}

// Primera fusión cuyas dos armas están a nivel 5 o evolucionadas
function fusionOffer(ws: Weapon[]): Offer | null {
  const ready = (id: WeaponId) => ws.some((w) => w.id === id && (w.lv >= NMAX || w.evolved));
  const f = FUSIONS.find((x) => !ws.some((w) => w.id === x.id) && ready(x.from[0]) && ready(x.from[1])); // cada fusión, una sola vez
  return f
    ? {
        kind: "fusion",
        id: f.id,
        title: WEAPONS[f.id].name,
        icon: f.id,
        desc: `${WEAPONS[f.from[0]].name} + ${WEAPONS[f.from[1]].name}. ${f.desc}`,
        syn: { icons: [...f.from], label: `${WEAPONS[f.from[0]].name} + ${WEAPONS[f.from[1]].name}`, ready: true },
      }
    : null;
}

// Arma que ya se gastó en una fusión que se tiene: no vuelve a ofrecerse (si no, se repetiría la fusión)
const fusedFrom = (ws: Weapon[], id: WeaponId) => FUSIONS.some((f) => f.from.includes(id) && ws.some((w) => w.id === f.id));
