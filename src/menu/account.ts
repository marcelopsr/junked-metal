// Pantallas online/cuenta: Mi cuenta, estadísticas, ranking, perfil público, desafío diario y semanal (extraído de menu.ts).
// Sin import de "../menu" (evita el ciclo): menu.ts pasa lo que hace falta por initAccount(ctx).
import { DEF } from "../enemies";
import { beastIcon } from "../icons";
import { previewProfile } from "../run";
import { PACTS } from "../encore";
import { REGLA_NM } from "../weekly";
import { daily, weekly, weeklyRanking, me, miHistorial, misLogros, perfil, myStats, rankingSemanal, endlessRanking, setAlias } from "../net";

export type AccountCtx = {
  $: (id: string) => HTMLElement;
  fmt: (s: number) => string;
  today: () => string;
  dailySeed: () => number;
  go: (s: "cuenta") => void;
  current: () => string | null;
  back: () => void;
  kitStripHtml: () => string;
  daily: () => { day: string; best: number };
};
let c!: AccountCtx;
const $ = (id: string) => c.$(id), fmt = (s: number) => c.fmt(s);
/** Tus estadísticas del servidor (Codex): sin sesión o sin respuesta, el bloque queda oculto. */
const MODE_NM: Record<string, string> = { survivor: "Supervivencia", encore: "ENCORE", race: "Carrera", duel: "Demolición", match3: "Junket Crush", daily: "Desafío diario" };
export function renderMyStats() {
  const box = $("cdxMe"), ul = $("cdxMeList"), li = (a: string, b: string) => { const x = document.createElement("li"), t = document.createElement("b"); t.textContent = a; x.append(t, ` · ${b}`); return x; };
  box.classList.add("hidden");
  void myStats().then((s) => {
    if (!s) return;
    const rows = s.modes.map((m) => li(MODE_NM[m.mode] ?? m.mode, `${m.played} ${m.played === 1 ? "jugada" : "jugadas"}, ${m.won} ${m.won === 1 ? "ganada" : "ganadas"}`));
    if (s.encore) rows.push(li("Mejor ENCORE", `vuelta ${s.encore.loop + 1}, escenario ${s.encore.stage + 1}`));
    if (s.pacts.top.length) rows.push(li("Pactos favoritos", s.pacts.top.map((p) => PACTS.find((x) => x.id === p.id)?.name ?? p.id).join(", ")));
    if (s.stages.stay + s.stages.advance) rows.push(li("Quedarse", `${Math.round(s.stages.stayPct)} %`));
    ul.replaceChildren(...rows); box.classList.toggle("hidden", !rows.length);
  });
}
/** Perfil público: el nombre del ranking abre el panel de Mi cuenta (sin alias el nombre es "abc…": no hay perfil). */
function rankLi(name: string, txt: string) {
  const li = document.createElement("li"), b = document.createElement("button");
  b.textContent = name; b.className = "linkBtn"; b.onclick = () => void openPerfil(name);
  li.append(b, ` · ${txt}`); return li;
}
async function openPerfil(name: string) {
  if (c.current() !== "cuenta") c.go("cuenta");
  const box = $("perfilBox"), ul = $("perfilList"); box.classList.remove("hidden"); $("perfilName").textContent = name; ul.textContent = "Cargando…";
  const p = await perfil(name); if (!p) { ul.textContent = "Sin perfil"; return; }
  const li = (t: string) => { const x = document.createElement("li"); x.textContent = t; return x; };
  ul.replaceChildren(...p.records.modes.map((m) => li(`${MODE_NM[m.mode] ?? m.mode}: ${m.played} jugadas, ${m.won} ganadas${m.bestTime != null ? `, mejor ${fmt(m.bestTime)}` : ""}`)), ...(p.records.encore ? [li(`Mejor ENCORE: vuelta ${p.records.encore.loop + 1}, escenario ${p.records.encore.stage + 1}`)] : []), ...p.logros.map((l) => li(`${l.done ? "✔" : "·"} ${l.name} · ${l.progress}/${l.goal}`)));
}
/** Mi cuenta: correo, licencia y apodo desde /api/me; todo con textContent. */
export function renderAcct() {
  const ul = $("acctList"), al = $("acctAlias") as HTMLInputElement, msg = $("acctMsg");
  ul.replaceChildren(); msg.textContent = ""; al.value = "";
  void me().then((m) => {
    if (!m) { msg.textContent = "No se pudo cargar la cuenta."; return; }
    const p = m.plan, end = p?.currentPeriodEnd ? new Date(p.currentPeriodEnd) : null;
    const lic = !p ? "sin licencia" : p.active ? `${p.name}${end ? `, vence el ${String(end.getDate()).padStart(2, "0")}/${String(end.getMonth() + 1).padStart(2, "0")}/${end.getFullYear()}` : ""}` : `${p.name}, vencida`;
    ul.replaceChildren(...([["Correo", m.email], ["Licencia", lic]] as const).map(([a, b]) => { const x = document.createElement("li"), t = document.createElement("b"); t.textContent = a; x.append(t, ` · ${b}`); return x; }));
    al.value = m.alias ?? "";
  });
  const lg = $("acctLogros"); lg.textContent = "Cargando…";
  void misLogros().then((rows) => { if (!rows) { lg.textContent = "Sin conexión"; return; } lg.replaceChildren(...rows.map((r) => { const li = document.createElement("li"); li.textContent = `${r.done ? "✔" : "·"} ${r.name} · ${r.progress}/${r.goal}`; return li; })); });
  const hi = $("acctHist"); hi.textContent = "Cargando…"; $("perfilBox").classList.add("hidden");
  void miHistorial().then((rows) => { if (!rows) { hi.textContent = "Sin conexión"; return; } if (!rows.length) { hi.textContent = "Sin partidas todavía"; return; } hi.replaceChildren(...rows.map((r) => { const li = document.createElement("li"), d = new Date(r.at); li.textContent = `${d.getDate()}/${d.getMonth() + 1} · ${MODE_NM[r.modo ?? ""] ?? r.modo ?? "?"} · ${r.victoria ? "victoria" : "derrota"}${r.kills != null ? ` · ${r.kills} bajas` : ""}${r.tiempo != null ? ` · ${fmt(r.tiempo)}` : ""}${r.auto ? " · auto" : ""}`; return li; })); });
  const er = $("acctEndless"), em = $("acctEndlessMine"); er.textContent = "Cargando…";
  void endlessRanking().then((r) => { if (!r) { er.textContent = "Sin conexión"; em.textContent = ""; return; } em.textContent = r.mine ? `Tu mejor marca: ${fmt(r.mine.score)} (puesto ${r.mine.rank})` : "Sin marca todavía"; er.replaceChildren(...r.board.map((x) => rankLi(x.name, fmt(x.score)))); if (!r.board.length) er.textContent = "Sin datos todavía"; });
  const rk = $("acctRank"); rk.textContent = "Cargando…";
  void rankingSemanal().then((rows) => { rk.replaceChildren(...(rows ?? []).slice(0, 20).map((r) => rankLi(r.name, `${r.score} bajas`))); if (!rows) rk.textContent = "Sin conexión"; else if (!rows.length) rk.textContent = "Sin datos esta semana"; });
}
export function renderWeekly() {
  const rk = $("weeklyRank");
  void weekly().then((w) => { $("weeklyInfo").textContent = w ? `Semana ${w.week} · ${REGLA_NM[w.regla]?.nombre ?? w.regla}: ${REGLA_NM[w.regla]?.txt ?? ""}` : "Sin conexión"; });
  void weeklyRanking().then((r) => { rk.replaceChildren(...(r?.board ?? []).map((x) => { return rankLi(x.name, `${x.score} bajas`); })); if (r && !r.board.length) rk.textContent = "Sin datos esta semana"; });
}
export function renderDaily() {
  const b = c.daily().day === c.today() ? c.daily().best : 0, forced = Number(new URLSearchParams(location.search).get("seed"));
  const draw = (seed: number, date: string) => {
    const p = previewProfile(seed);
    $("dailyBrief").innerHTML = `<div class="briefRec">DESAFÍO DIARIO · ${date} · SEMILLA #${seed}</div><div class="briefGrid">`
      + `<div><span>Escenario</span><b>Patio · ${p.climate.name}${Number.isFinite(p.rainAt) ? " (Lluvia)" : ""}</b></div>`
      + `<div><span>Plaga dominante</span><b>${p.plague.name}</b></div>`
      + `<div><span>Minijefes</span><b class="briefMinis"><span class="wi">${beastIcon(p.minis[0], 16)}${DEF[p.minis[0]].name}</span><span class="wi">${beastIcon(p.minis[1], 16)}${DEF[p.minis[1]].name}</span></b></div>`
      + `<div><span>Jefe final (10:00)</span><b class="wi">${beastIcon(p.final, 18)}${DEF[p.final].name}</b></div>`
      + `</div>` + c.kitStripHtml();
    $("dailyInfo").textContent = `Semilla #${seed} · ${b ? `Récord de hoy: ${fmt(b)}` : "Todavía sin intentos hoy. El mejor tiempo del día queda como récord."}`;
  };
  const seed = forced || c.dailySeed();
  draw(seed, c.today());
  if (!forced) void daily().then((d) => {
    if (!d || !$("dailyBrief").isConnected) return;
    if (d.seed !== seed) draw(d.seed, d.date); // semilla oficial: el resumen sale de ella, no de la local
    const m = d.mine; // marca del servidor: solo cuenta el primer intento del día
    $("dailyInfo").textContent += m ? ` · Tu marca oficial: #${m.rank} (${m.win ? "victoria " : ""}${fmt(m.t)})` : " · Sin marca oficial hoy: el primer intento del día puntúa.";
  });
}
export function initAccount(ctx: AccountCtx) {
  c = ctx;
  $("perfilX").onclick = () => $("perfilBox").classList.add("hidden");
  $("acctSave").onclick = async () => { const a = ($("acctAlias") as HTMLInputElement).value.trim(), e = await setAlias(a); $("acctMsg").textContent = e ?? "Apodo guardado."; };
  $("acctOut").onclick = () => { $("netLogout").click(); c.back(); }; // el cierre real vive en main.ts (sess())
}
