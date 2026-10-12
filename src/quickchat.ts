// Chat rápido online: 6 frases fijas, mensaje {t:"q", i, who}. El anfitrión valida y limita (1 cada 2 s por jugador) y reenvía por "r".
import type { Net, Msg } from "./net";
import "./quickchat.css";

export const PHRASES = ["¡Acá!", "¡Ayuda!", "¡Vamos!", "¡Cuidado, jefe!", "¡Gracias!", "¡Bien ahí!"] as const;
const GAP = 2000, SHOW = 3000;

/** Anfitrión: devuelve el mensaje a reenviar (con `who` puesto por él, no por el cliente) o null si es inválido o va muy seguido. */
export function vetQuick(m: Msg, who: string, last: Map<string, number>, now: number): Msg | null {
  const i = m.i;
  if (!Number.isInteger(i) || (i as number) < 0 || (i as number) > 5) return null;
  if (now - (last.get(who) ?? -Infinity) < GAP) return null;
  last.set(who, now);
  return { t: "q", i, who };
}

let net: Net | null = null, me = "", canSend = false, el: HTMLElement | null = null, menu: HTMLElement | null = null, hide = 0;
const last = new Map<string, number>();

function show(m: Msg) {
  const i = m.i as number;
  if (!el || !PHRASES[i]) return;
  el.textContent = `${String(m.who ?? "").slice(0, 16)}: ${PHRASES[i]}`;
  el.classList.add("on");
  clearTimeout(hide); hide = window.setTimeout(() => el!.classList.remove("on"), SHOW);
}

/** Recibe un t:"q". Anfitrión: valida/limita, muestra y reenvía; el invitado y el espectador solo muestran lo que reenvía el anfitrión. `from` = quién lo mandó (solo anfitrión; "guest"). */
export function onQuickMsg(m: Msg, from = "guest") {
  if (!net) return;
  if (!net.host) return show(m);
  const ok = vetQuick(m, from, last, Date.now());
  if (ok) { ok.who = from === "guest" ? String(m.who ?? "Jugador").slice(0, 16) : me; show(ok); net.send(ok, true); }
}

/** Manda una frase propia (no hace nada si es espectador). */
export function sendQuick(i: number) {
  if (!net || !canSend) return;
  if (net.host) return onQuickMsg({ t: "q", i }, "host"); // pasa por el mismo filtro
  net.send({ t: "q", i, who: me }, true);
}

const toggle = (on?: boolean) => menu?.classList.toggle("on", on);

/** Llamar al empezar una partida online. `spectator` = solo recibe. `name` = nombre que se muestra. Devuelve la función de limpieza. */
export function initQuickChat(n: Net, name: string, spectator = false) {
  net = n; me = name; canSend = !spectator; last.clear();
  el = document.getElementById("quickchat-bubble");
  menu = document.getElementById("quickchat-menu");
  if (menu && !menu.firstChild) {
    PHRASES.forEach((p, i) => { const b = document.createElement("button"); b.textContent = `${i + 1}  ${p}`; b.onclick = () => { sendQuick(i); toggle(false); }; menu!.append(b); });
    document.getElementById("quickchat-btn")?.addEventListener("click", () => toggle());
  }
  document.getElementById("quickchat-btn")?.toggleAttribute("hidden", spectator);
  const key = (e: KeyboardEvent) => {
    if (!canSend || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === "KeyT") toggle();
    else if (menu?.classList.contains("on") && /^[1-6]$/.test(e.key)) { e.stopImmediatePropagation(); sendQuick(+e.key - 1); toggle(false); }
  };
  addEventListener("keydown", key, true); // captura: con la lista abierta los números no llegan a las cartas
  return () => { removeEventListener("keydown", key, true); toggle(false); el?.classList.remove("on"); net = null; };
}
