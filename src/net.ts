// R6b (docs/ENCORE/R0/R6_RED.md, opción A): transporte online de 2 jugadores con WebRTC DataChannel y PeerJS Cloud.
// Sala = peer id del anfitrión ("jm-" + código de 6). El cliente abre dos canales: "u" no fiable y desordenado (inputs y snapshots) y "r" fiable (comandos y eventos).
// peerjs se importa dinámico (chunk aparte): no pesa en la carga inicial.
// R6c: servidor propio opcional de build (VITE_NET_HOST, p. ej. junkedmetal.duckdns.org; ver R6_RED.md §8): PeerServer en https://<host>/peer y
// credenciales TURN temporales de coturn en GET https://<host>/api/turn con el token del login (localStorage jm_net_token). Sin host: PeerJS Cloud como R6b.
import type { DataConnection, Peer } from "peerjs";

export type Msg = { t: string; [k: string]: unknown };
export type Net = {
  host: boolean;
  code: string;
  /** rel = canal fiable; si no, el no fiable (se descarta si todavía no abrió). */
  send(msg: Msg, rel?: boolean): void;
  onMsg: (m: Msg) => void;
  onClose: (why: string) => void;
  close(): void;
};

const PFX = "jm-", VPFX = "jmv-";
export const NET_HOST = String(import.meta.env.VITE_NET_HOST ?? "").trim();
const TOKEN = "jm_net_token", STUN = [{ urls: "stun:stun.l.google.com:19302" }]; // el STUN que PeerJS usa por defecto
export const getToken = () => { try { return localStorage.getItem(TOKEN) ?? ""; } catch { return ""; } };
/** Al volver del login el servidor deja `#token=...`: se guarda y se limpia el hash. Devuelve si había token. */
export function takeToken() {
  const t = new URLSearchParams(location.hash.slice(1)).get("token");
  if (!t) return false;
  try { localStorage.setItem(TOKEN, t); } catch { /* sin almacenamiento: vale solo esta carga */ }
  history.replaceState(null, "", location.pathname + location.search);
  try { localStorage.removeItem(INVITE); } catch { /* sin almacenamiento */ }
  return true;
}
/** Telemetría mínima a la VPS (POST /api/telemetry): solo con servidor propio y sesión; nunca bloquea ni falla en voz alta. */
export function track(type: string, data: Record<string, unknown> = {}) {
  const token = getToken();
  if (!NET_HOST || !token) return;
  try { void fetch(`https://${NET_HOST}/api/telemetry`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, type, data }) }).catch(() => {}); } catch { /* sin red */ }
}
export type LbRow = { name: string; loop: number; stage: number; t: number; win: boolean };
/** Récords ENCORE online (GET /api/leaderboard): null sin servidor, sin sesión o con error. */
export async function leaderboard(): Promise<LbRow[] | null> {
  const token = getToken();
  if (!NET_HOST || !token) return null;
  try { const r = await fetch(`https://${NET_HOST}/api/leaderboard`, { headers: { Authorization: `Bearer ${token}` } }); return r.ok ? await r.json() : null; } catch { return null; }
}
export type Me = { email: string; alias: string | null; status: string; plan: { name: string; currentPeriodEnd: number | string | null; active: boolean } | null };
export type MyStats = { modes: { mode: string; played: number; won: number; bestTime: number | null }[]; encore: { loop: number; stage: number; t: number; win: boolean } | null; pacts: { top: { id: string; accepted: number }[]; accepted: number; rejected: number; rejectedPct: number }; stages: { stay: number; advance: number; stayPct: number; advancePct: number } };
const authGet = async <T>(path: string): Promise<T | null> => {
  const token = getToken();
  if (!NET_HOST || !token) return null;
  try { const r = await fetch(`https://${NET_HOST}${path}`, { headers: { Authorization: `Bearer ${token}` } }); return r.ok ? await r.json() : null; } catch { return null; }
};
/** GET /api/me y /api/me/stats: null sin servidor, sin sesión o con error. */
export const me = () => authGet<Me>("/api/me");
/** GET /api/daily: fecha y semilla oficiales del desafío (null sin servidor/sesión/red; el cliente cae a su semilla local). */
export const daily = () => authGet<{ date: string; seed: number; board?: { name: string; win: boolean; t: number }[]; mine?: { win: boolean; t: number; rank: number } | null }>("/api/daily");
/** GET /api/ranking/semanal: top 20 desde el lunes 00:00 UTC (null sin servidor/sesión/red). */
/** GET /api/weekly: semana (lunes UTC), semilla y regla del desafío semanal. */
export const weekly = () => authGet<{ week: string; seed: number; regla: string }>("/api/weekly");
export const weeklyRanking = () => authGet<{ week: string; regla: string; board: { name: string; score: number }[] }>("/api/weekly/ranking");
export const rankingSemanal = () => authGet<{ name: string; score: number }[]>("/api/ranking/semanal");
export const endlessRanking = () => authGet<{ board: { name: string; score: number }[]; mine: { name: string; score: number; rank: number } | null }>("/api/endless/ranking");
export type Logro = { id: string; name: string; done: boolean; progress: number; goal: number };
/** GET /api/me/logros: logros online del usuario (null sin servidor/sesión/red). */
export const misLogros = () => authGet<Logro[]>("/api/me/logros");
export type Partida = { at: number; modo?: string; kills?: number; tiempo?: number; auto?: boolean; victoria: boolean };
export const miHistorial = () => authGet<Partida[]>("/api/me/historial");
export type Perfil = { alias: string; records: { modes: { mode: string; played: number; won: number; bestTime: number | null }[]; encore: { loop: number; stage: number; t: number; win: boolean } | null }; logros: Logro[] };
export const perfil = (alias: string) => authGet<Perfil>("/api/perfil/" + encodeURIComponent(alias));
export const myStats = () => authGet<MyStats>("/api/me/stats");
/** POST /api/alias: devuelve null si se guardó, o el motivo del servidor. */
export async function setAlias(alias: string): Promise<string | null> {
  const token = getToken();
  if (!NET_HOST || !token) return "Sin sesión.";
  try {
    const r = await fetch(`https://${NET_HOST}/api/alias`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ alias }) });
    if (r.ok) return null;
    const j = await r.json().catch(() => null);
    return j?.error ?? j?.message ?? `El servidor respondió ${r.status}.`;
  } catch { return "No se pudo contactar al servidor."; }
}
export const setToken = (t: string) => { try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch { /* sin almacenamiento */ } };
/** Login con la clave de grupo: POST /api/login y guarda el token. Lanza con un mensaje legible si falla. */
export async function loginKey(clave: string) {
  let r: Response;
  try { r = await fetch(`https://${NET_HOST}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave }) }); }
  catch { throw new Error("No se pudo contactar al servidor."); }
  if (r.status === 401 || r.status === 403) throw new Error("Clave incorrecta.");
  const j = r.ok ? await r.json().catch(() => null) : null;
  if (!j?.token) throw new Error(`El servidor respondió ${r.status}.`);
  setToken(j.token);
}
/** Login Cloudflare (Worker jm-login con Access One-time PIN, R6_RED.md § Login Cloudflare); vacío = sin ese botón. */
export const LOGIN_URL = String(import.meta.env.VITE_LOGIN_URL ?? "").trim();
// Invitación del portal admin: `?invite=CODE` se guarda, se quita de la URL y viaja al login de Cloudflare para que /api/cf-exchange la canjee.
const INVITE = "jm_invite";
let directInvite = ""; // sin VITE_LOGIN_URL el código se canjea directo contra el servidor (no se guarda: es de un solo uso)
try {
  const u = new URL(location.href), inv = u.searchParams.get("invite");
  if (inv) { if (LOGIN_URL || !NET_HOST) localStorage.setItem(INVITE, inv.slice(0, 64)); else directInvite = inv.slice(0, 64); u.searchParams.delete("invite"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
} catch { /* sin almacenamiento: la invitación se pierde y el administrador puede validar a mano */ }
const invite = () => { try { return localStorage.getItem(INVITE) ?? ""; } catch { return ""; } };
/** Canje directo de `?invite=CODE` (POST /api/invite-redeem). null = no había código; si no, el mensaje para la UI. */
export async function redeemInvite(): Promise<string | null> {
  const code = directInvite; if (!code) return null;
  directInvite = "";
  try {
    const r = await fetch(`https://${NET_HOST}/api/invite-redeem`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.token) { setToken(j.token); return "Invitación aceptada"; }
    return j?.error ? `Invitación rechazada: ${j.error}.` : `La invitación falló (${r.status}).`;
  } catch { return "No se pudo contactar al servidor para canjear la invitación."; }
}
export const cfLoginUrl = () => `${LOGIN_URL}${LOGIN_URL.includes("?") ? "&" : "?"}return=${encodeURIComponent(location.href)}${invite() ? `&invite=${encodeURIComponent(invite())}` : ""}`;
export const loginUrl = () => `https://${NET_HOST}/auth/login?return=${encodeURIComponent(location.href)}`;
/** Opciones de Peer. Con host propio: su PeerServer y los iceServers temporales de /api/turn (si falla o no hay token, solo STUN). Sin host: PeerJS Cloud y su config por defecto. */
async function opts() {
  if (!NET_HOST) return { debug: 0 };
  let iceServers: RTCIceServer[] = STUN;
  try {
    const r = await fetch(`https://${NET_HOST}/api/turn`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const j = r.ok ? await r.json() : null;
    if (Array.isArray(j?.iceServers) && j.iceServers.length) iceServers = j.iceServers;
  } catch { /* red o CORS: sigue con STUN */ }
  return { debug: 0, host: NET_HOST, port: 443, secure: true, path: "/peer", token: getToken(), config: { iceServers } };
}
const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I
export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ABC[b % ABC.length]).join("");
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

function wrap(peer: Peer, host: boolean, code: string): Net & { attach(c: DataConnection): void; ready: Promise<void> } {
  let r: DataConnection | null = null, u: DataConnection | null = null, closed = false, ok!: () => void;
  const net = {
    host, code,
    ready: new Promise<void>((res) => (ok = res)),
    onMsg: (_m: Msg) => {}, onClose: (_w: string) => {},
    send(msg: Msg, rel = false) { const c = rel ? r : u; if (c?.open) void c.send(msg); },
    close() { if (closed) return; closed = true; peer.destroy(); },
    attach(c: DataConnection) {
      if (c.label === "r") r = c; else u = c;
      c.on("data", (d) => net.onMsg(d as Msg));
      c.on("open", () => { if (r?.open && u?.open) ok(); });
      c.on("close", () => end("Se cortó la conexión con el otro jugador."));
      c.on("error", () => end("Error en la conexión con el otro jugador."));
      // Una pestaña que se cierra de golpe no cierra el canal: ICE pasa a "disconnected" y recién a "failed" tras ~30 s. 3 s seguidos sin ICE = corte.
      let t = 0; const pc = c.peerConnection;
      pc?.addEventListener("iceconnectionstatechange", () => {
        clearTimeout(t);
        if (pc.iceConnectionState === "disconnected") t = window.setTimeout(() => end("Se cortó la conexión con el otro jugador."), 3000);
      });
    },
  };
  addEventListener("pagehide", () => net.close()); // al cerrar o recargar la pestaña el otro se entera ya (peer.destroy cierra los canales)
  const end = (why: string) => { if (closed) return; net.close(); net.onClose(why); };
  peer.on("disconnected", () => { if (!r?.open) end("Se perdió el servidor de salas."); }); // ya conectados, la señalización no hace falta
  peer.on("error", (e) => end(e.type === "peer-unavailable" ? "No existe una sala con ese código." : `Error de red (${e.type}).`));
  return net;
}

/** Anfitrión: abre la sala y resuelve cuando el cliente tiene los dos canales abiertos. Acepta un solo cliente (2 jugadores). */
export async function hostRoom(onCode: (code: string) => void) {
  const { Peer } = await import("peerjs");
  const code = newCode(), peer = new Peer(PFX + code, await opts());
  const net = wrap(peer, true, code);
  peer.on("open", () => onCode(code));
  let guest = "", go: Msg | null = null;
  const specs = new Set<DataConnection>(); // espectadores (peer "jmv-..."): reciben snapshots "u" y eventos "r"; sus mensajes se descartan; sin slot ni resultados
  const send = net.send;
  net.send = (msg, rel = false) => { if (msg.t === "go") go = msg; send(msg, rel); for (const c of specs) if (c.open && c.label === (rel ? "r" : "u")) void c.send(msg); };
  peer.on("connection", (c) => { // un solo invitado: las conexiones de otro peer se cierran
    if (c.peer.startsWith(VPFX)) {
      if (c.label !== "r" && c.label !== "u") return c.close();
      specs.add(c); c.on("close", () => specs.delete(c)); c.on("error", () => specs.delete(c));
      if (c.label === "r") c.on("open", () => { if (go) void c.send(go); }); // el que llega tarde también recibe la largada
      return;
    }
    guest ||= c.peer;
    if (c.peer === guest && (c.label === "r" || c.label === "u")) net.attach(c); else c.close();
  });
  return net;
}

/** Cliente: se une a la sala del código y resuelve cuando los dos canales están abiertos. */
export async function joinRoom(code: string) {
  const { Peer } = await import("peerjs");
  const peer = new Peer(await opts());
  const net = wrap(peer, false, code);
  peer.on("open", () => {
    net.attach(peer.connect(PFX + code, { label: "r", reliable: true, serialization: "json" }));
    net.attach(peer.connect(PFX + code, { label: "u", reliable: false, serialization: "json" }));
  });
  return net;
}

/** Espectador: Peer "jmv-<code>-<rand>" con el mismo token; mira la sala sin ocupar slot. Resuelve con los dos canales abiertos. */
export async function espectar(code: string) {
  const { Peer } = await import("peerjs");
  const peer = new Peer(`${VPFX}${code}-${newCode()}`, await opts());
  const net = wrap(peer, false, code);
  peer.on("open", () => {
    net.attach(peer.connect(PFX + code, { label: "r", reliable: true, serialization: "json" }));
    net.attach(peer.connect(PFX + code, { label: "u", reliable: false, serialization: "json" }));
  });
  return net;
}

export type Sala = { id: string; code: string; host: string; seg: number; espectadores: number };
/** GET /api/salas: partidas en curso (null sin servidor/sesión/red). */
export const salas = () => authGet<Sala[]>("/api/salas");
