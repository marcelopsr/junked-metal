// "Qué hay de nuevo": cartel único al abrir si portada/novedades.json trae entradas más nuevas que save.novedadesVistas.
// No sale en la primera vez absoluta (tutorial pendiente; ahí solo se anota la fecha) ni con ?mute / ?lab (pruebas).
import data from "../portada/novedades.json";
import { introOn } from "./intro";
import { persist, save } from "./menu";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function novedades() {
  if (/[?&](mute|lab)\b/.test(location.search)) return;
  const nuevas = (data as { fecha: string; titulo: string; texto: string }[]).filter((n) => n.fecha > save.novedadesVistas);
  if (!nuevas.length) return;
  const marcar = () => { save.novedadesVistas = nuevas.reduce((m, n) => (n.fecha > m ? n.fecha : m), save.novedadesVistas); persist(); };
  if (!save.tutorialHecho) return marcar();
  const esperar = () => {
    if (introOn()) return void setTimeout(esperar, 500); // ponytail: sondeo; main.ts no avisa el fin de la intro
    const el = document.createElement("div");
    el.id = "novedades"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "novT");
    el.innerHTML = `<div class="nv-box"><h2 id="novT">Qué hay de nuevo</h2><ul>${nuevas.slice(0, 5).map((n) => `<li><small>${esc(n.fecha)}</small> <b>${esc(n.titulo)}</b><p>${esc(n.texto)}</p></li>`).join("")}</ul><button type="button">¡Vamos!</button></div>`;
    const cerrar = () => { removeEventListener("keydown", onKey, true); el.remove(); marcar(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
    addEventListener("keydown", onKey, true);
    const b = el.querySelector("button")!;
    b.onclick = cerrar;
    document.body.append(el);
    b.focus();
  };
  setTimeout(esperar, 800);
}
