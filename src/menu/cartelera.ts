// Cartelera de ENCORE: afiches de escenarios, pactos, secretos e interrupciones del Director. Lo no visto queda en silueta «???».
// Completar un grupo otorga un logro con una pintura (cosmética, sin poder) vía LOCKED_PAINTS (garage_paint.ts).
import type { AchId } from "../achievements";
import { PACTS, SECRETS, VARIANTS } from "../encore";
import { INT_IDS, INT_TXT } from "../encore_events";
import type { Save } from "../menu";

type Card = { name: string; sub: string; seen: boolean; hint: string };
const GROUPS = (e: Save["encore"]): { title: string; ach: AchId; prize: string; cards: Card[] }[] => [
  { title: "ESCENARIOS", ach: "cartel_escenarios", prize: "Violeta telón", cards: VARIANTS.map((v) => ({ name: v.name, sub: v.line, seen: e.seenVariants.includes(v.name), hint: "Sin jugar" })) },
  { title: "PACTOS", ach: "cartel_pactos", prize: "Coral taquilla", cards: PACTS.map((p) => ({ name: p.name, sub: p.tag, seen: e.seenPacts.includes(p.id), hint: "Sin ofrecer" })) },
  { title: "BAMBALINAS", ach: "cartel_funcion", prize: "Menta camerino",
    cards: [...SECRETS.map((x) => ({ name: x.name, sub: x.lore, seen: e.secrets.includes(x.id), hint: x.how })), ...INT_IDS.map((i) => ({ name: INT_TXT[i].name, sub: INT_TXT[i].line, seen: e.seenInts.includes(i), hint: "Sin presenciar" }))] },
];

/** Dibuja la pantalla; devuelve true si completó un grupo nuevo (el llamador guarda). */
export function renderCartelera(save: Save): boolean {
  const gs = GROUPS(save.encore), root = document.getElementById("cartGrupos")!;
  let nuevo = false, vistos = 0, total = 0;
  root.replaceChildren(...gs.map((g) => {
    const n = g.cards.filter((c) => c.seen).length, done = n === g.cards.length;
    vistos += n; total += g.cards.length;
    if (done && !save.ach.includes(g.ach)) { save.ach.push(g.ach); nuevo = true; }
    const box = document.createElement("section"), h = document.createElement("div"), grid = document.createElement("div");
    box.className = "cartGrupo jm-panel"; h.className = "cartH"; grid.className = "cartGrid";
    const t = document.createElement("b"), p = document.createElement("span");
    t.textContent = `${g.title} ${n}/${g.cards.length}`; p.textContent = done ? `Premio: pintura ${g.prize}` : `Al completar: pintura ${g.prize}`; p.className = done ? "ok" : "";
    h.append(t, p);
    grid.replaceChildren(...g.cards.map((c) => {
      const a = document.createElement("div"), b = document.createElement("b"), s = document.createElement("small");
      a.className = "afiche" + (c.seen ? "" : " off"); b.textContent = c.seen ? c.name : "???"; s.textContent = c.seen ? c.sub : c.hint;
      if (!c.seen) a.setAttribute("aria-label", `Sin descubrir. ${c.hint}`);
      a.append(b, s); return a;
    }));
    box.append(h, grid); return box;
  }));
  document.getElementById("cartCount")!.textContent = `Función completa: ${vistos}/${total} afiches`;
  return nuevo;
}
