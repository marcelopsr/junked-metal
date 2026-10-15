// Paseo libre: desafíos opcionales (contrarreloj de obstáculos, trucos en el skatepark, bajada de la nieve). Lógica pura (sin motor ni DOM),
// probada en test/free_challenges.test.ts. El cartel/arco de inicio vive en cada barrio (src/zones/libre_*.ts); main.ts (libreHud) la alimenta.

export type DesafioId = "obs" | "skate" | "nieve";
/** tiempo: gana el menor tiempo (ms) al cruzar la meta (bx, bz, br); puntos: suma los trucos limpios durante `limite` segundos. */
export type Desafio = { id: DesafioId; nombre: string; tipo: "tiempo" | "puntos"; ax: number; az: number; ar: number; bx?: number; bz?: number; br?: number; limite: number };
export const DESAFIOS: Desafio[] = [
  // Largada y meta del carril de la cinta (libre_obstaculos.ts: gate(140, -140) y gate(246, -230))
  { id: "obs", nombre: "CONTRARRELOJ DE OBSTÁCULOS", tipo: "tiempo", ax: 140, az: -140, ar: 9, bx: 246, bz: -230, br: 11, limite: 300 },
  // Arco del skatepark (libre_skate.ts, junto a la entrada de la avenida)
  { id: "skate", nombre: "TRUCOS EN EL SKATEPARK", tipo: "puntos", ax: -70, az: 40, ar: 8, limite: 60 },
  // Arco de largada de la pista (libre_nieve.ts, s = 26) y llegada al lago congelado
  { id: "nieve", nombre: "BAJADA DE LA NIEVE", tipo: "tiempo", ax: -105, az: -200, ar: 9, bx: -196, bz: -94, br: 14, limite: 300 },
];
export type DesafioBest = Record<DesafioId, number>; // tiempo en ms (0 = sin marca) o puntos
export const newBest = (): DesafioBest => ({ obs: 0, skate: 0, nieve: 0 });

export type ChState = { d: Desafio | null; t: number; pts: number; lock: DesafioId | null }; // lock: arco ya cruzado (no reinicia hasta salir de él)
export const newCh = (): ChState => ({ d: null, t: 0, pts: 0, lock: null });
export type ChEvent = { kind: "inicio" | "fin" | "fallo"; d: Desafio; ms: number; pts: number; record: boolean } | null;

const dist = (x: number, z: number, cx: number, cz: number) => Math.hypot(x - cx, z - cz);

/** ¿Es mejor la marca? El tiempo gana si es menor (0 = sin marca); los puntos, si es mayor (y > 0). */
export const mejora = (d: Desafio, best: number, v: number) => v > 0 && (d.tipo === "tiempo" ? best === 0 || v < best : v > best);

/** Un cuadro. Cruzar el arco de inicio lo arma; salir y volver a cruzarlo reinicia la contrarreloj. Guarda el récord en `best` y lo informa en el evento. */
export function chStep(s: ChState, dt: number, x: number, z: number, best: DesafioBest): ChEvent {
  const dentro = DESAFIOS.find((d) => dist(x, z, d.ax, d.az) < d.ar);
  if (dentro && dentro.id !== s.lock && !(s.d === dentro && dentro.tipo === "puntos")) { s.d = dentro; s.t = 0; s.pts = 0; s.lock = dentro.id; return { kind: "inicio", d: dentro, ms: 0, pts: 0, record: false }; }
  if (dentro?.id !== s.lock) s.lock = null;
  const d = s.d;
  if (!d) return null;
  s.t += dt;
  const fin = (kind: "fin" | "fallo", ms: number, pts: number): ChEvent => {
    const v = d.tipo === "tiempo" ? ms : pts, record = kind === "fin" && mejora(d, best[d.id], v);
    if (record) best[d.id] = v;
    s.d = null;
    return { kind, d, ms, pts, record };
  };
  if (d.tipo === "tiempo" && dist(x, z, d.bx!, d.bz!) < d.br!) return fin("fin", Math.round(s.t * 1000), 0);
  if (s.t >= d.limite) return d.tipo === "puntos" ? fin("fin", 0, s.pts) : fin("fallo", 0, 0);
  return null;
}

/** Suma un truco limpio al desafío de puntos en curso. */
export const chTruco = (s: ChState, pts: number) => { if (s.d?.tipo === "puntos") s.pts += pts; };

/** Texto del reloj: "1:05,3". */
export const fmtMs = (ms: number) => `${Math.floor(ms / 60000)}:${(((ms % 60000) / 1000).toFixed(1).replace(".", ",")).padStart(4, "0")}`;
export const fmtMarca = (d: Desafio, v: number) => (v <= 0 ? "SIN MARCA" : d.tipo === "tiempo" ? fmtMs(v) : `${v} PTS`);
