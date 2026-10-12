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

const PFX = "jm-";
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
try {
  const u = new URL(location.href), inv = u.searchParams.get("invite");
  if (inv) { localStorage.setItem(INVITE, inv.slice(0, 64)); u.searchParams.delete("invite"); history.replaceState(null, "", u.pathname + u.search + u.hash); }
} catch { /* sin almacenamiento: la invitación se pierde y el administrador puede validar a mano */ }
const invite = () => { try { return localStorage.getItem(INVITE) ?? ""; } catch { return ""; } };
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
  let guest = "";
  peer.on("connection", (c) => { // un solo invitado: las conexiones de otro peer se cierran
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
