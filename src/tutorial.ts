// Tutorial de la primera partida: 5 pasos con carteles del banner existente. Los ganchos de main.ts avisan eventos con `tut(ev)`.
import { banner } from "./ui";
import { btnName, ctl, isTouch, KEYS, pb } from "./input";
import { keyName } from "./menu";

export type TutEv = "move" | "pickup" | "level" | "ability";
const ORDER: TutEv[] = ["move", "pickup", "level", "ability"];
let step = -1, btn: HTMLButtonElement | null = null, done: () => void = () => {};

const dev = <T>(kbd: T, pad: T, touch: T) => (isTouch ? touch : ctl === "pad" ? pad : kbd);
const TXT: Record<TutEv, () => string> = {
  move: () => dev(`TUTORIAL 1/4 · MUEVE EL AUTO CON ${[KEYS.up, KEYS.left, KEYS.down, KEYS.right].map((k) => keyName(k[0])).join(" ")}`, "TUTORIAL 1/4 · MUEVE EL AUTO CON EL JOYSTICK", "TUTORIAL 1/4 · MUEVE EL AUTO CON EL JOYSTICK DE LA PANTALLA"),
  pickup: () => "TUTORIAL 2/4 · ACERCA EL AUTO A TORNILLOS Y GEMAS PARA JUNTARLOS",
  level: () => "TUTORIAL 3/4 · JUNTAR XP SUBE DE NIVEL: ELIGE UNA CARTA",
  ability: () => dev(`TUTORIAL 4/4 · USA LA HABILIDAD CON ${keyName(KEYS.ability[0])}`, `TUTORIAL 4/4 · USA LA HABILIDAD CON ${btnName(pb("ability"))}`, "TUTORIAL 4/4 · TOCA EL BOTÓN DE HABILIDAD"),
};

/** Arranca el tutorial; `onDone` marca el guardado (también al saltarlo). */
export function tutStart(onDone: () => void) {
  done = onDone; step = 0; banner(TXT.move(), 5);
  btn ??= Object.assign(document.createElement("button"), { textContent: "SALTAR TUTORIAL", className: "tut-skip", onclick: () => tutEnd() });
  btn.style.cssText = "position:absolute;top:64px;pointer-events:auto;right:12px;z-index:30;font:600 13px Rajdhani,sans-serif;padding:6px 10px;background:#1a1a1a;color:#ff8a1f;border:1px solid #ff8a1f;cursor:pointer";
  (document.getElementById("hud") ?? document.body).appendChild(btn);
}
export function tutEnd() { if (step < 0) return; step = -1; btn?.remove(); done(); }
/** Menú de cartas abierto en el paso 3: el banner explica cómo elegir. */
export function tutOffers() {
  if (ORDER[step] === "level") banner(dev("TUTORIAL 3/4 · ELIGE UNA CARTA: TECLAS 1 2 3 O CLIC (ENTER CONFIRMA)", `TUTORIAL 3/4 · ELIGE UNA CARTA: D-PAD Y ${btnName(pb("ok"))}`, "TUTORIAL 3/4 · TOCA UNA CARTA PARA ELEGIRLA"), 5);
}
export const tutOn = () => step >= 0;
/** Evento del juego: solo cuenta si es el del paso actual. */
export function tut(ev: TutEv) {
  if (step < 0 || ORDER[step] !== ev) return;
  if (++step >= ORDER.length) { banner("¡LISTO, SOBREVIVÍ!", 3); tutEnd(); } else banner(TXT[ORDER[step]](), 5);
}
