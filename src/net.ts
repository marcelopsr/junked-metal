// R6b (docs/ENCORE/R0/R6_RED.md, opción A): transporte online de 2 jugadores con WebRTC DataChannel y PeerJS Cloud.
// Sala = peer id del anfitrión ("jm-" + código de 6). El cliente abre dos canales: "u" no fiable y desordenado (inputs y snapshots) y "r" fiable (comandos y eventos).
// peerjs se importa dinámico (chunk aparte): no pesa en la carga inicial.
// ponytail: sin TURN propio (STUN por defecto de PeerJS): redes simétricas o móviles pueden no conectar; TURN con Worker de credenciales en R6c.
// ponytail: sin rejoin: una caída cierra la sesión (R6d). JSON por canal (sin binario ni deltas): medir kB/s antes de cuantizar en bytes.
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
    },
  };
  const end = (why: string) => { if (closed) return; net.close(); net.onClose(why); };
  peer.on("disconnected", () => { if (!r?.open) end("Se perdió el servidor de salas."); }); // ya conectados, la señalización no hace falta
  peer.on("error", (e) => end(e.type === "peer-unavailable" ? "No existe una sala con ese código." : `Error de red (${e.type}).`));
  return net;
}

/** Anfitrión: abre la sala y resuelve cuando el cliente tiene los dos canales abiertos. Acepta un solo cliente (2 jugadores). */
export async function hostRoom(onCode: (code: string) => void) {
  const { Peer } = await import("peerjs");
  const code = newCode(), peer = new Peer(PFX + code, { debug: 0 });
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
  const peer = new Peer({ debug: 0 });
  const net = wrap(peer, false, code);
  peer.on("open", () => {
    net.attach(peer.connect(PFX + code, { label: "r", reliable: true, serialization: "json" }));
    net.attach(peer.connect(PFX + code, { label: "u", reliable: false, serialization: "json" }));
  });
  return net;
}
