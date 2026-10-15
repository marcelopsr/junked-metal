// Paseo libre: 4 secretos escondidos (uno por barrio) que se descubren manejando hasta ellos. Lógica pura (sin motor ni DOM), probada en test/free_secrets.test.ts.
// Se guardan como 4 bits "0101" en save.libre.secretos; los lugares los arma zones/libre_secretos.ts con estas mismas coordenadas.
export type Secreto = { id: string; nombre: string; x: number; z: number; r: number; y: number };
/** (x, z) = centro; r = radio horizontal para descubrirlo; y = altura mínima del auto (la azotea exige estar arriba). */
export const SECRETOS: Secreto[] = [
  { id: "cueva", nombre: "La cueva tras la cascada", x: 178, z: 246, r: 4, y: 0 },
  { id: "tunel", nombre: "El túnel bajo el skatepark", x: -225, z: 222, r: 4, y: 0 },
  { id: "claro", nombre: "El claro del muñeco gigante", x: -45, z: -158, r: 11, y: 0 },
  { id: "azotea", nombre: "La azotea del salto", x: 80, z: -40, r: 6, y: 2.8 },
];
export const SECRETOS_N = SECRETOS.length;
export const SECRETOS_VACIO = "0".repeat(SECRETOS_N);
export const SECRETOS_RE = new RegExp(`^[01]{${SECRETOS_N}}$`);
/** Índice del secreto no descubierto que está al alcance del auto, o -1. */
export const secretoNear = (bits: string, x: number, y: number, z: number) =>
  SECRETOS.findIndex((s, i) => bits[i] !== "1" && y >= s.y && Math.hypot(x - s.x, z - s.z) < s.r);
export const secretosCount = (bits: string) => [...bits].filter((c) => c === "1").length;
