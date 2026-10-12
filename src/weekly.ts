/** Reglas del desafío semanal (ids = server/db.js REGLAS_SEMANA). */
export const REGLA_NM: Record<string, { nombre: string; txt: string }> = {
  solo_gomitas: { nombre: "Solo gomitas", txt: "Solo se ofrecen mejoras de gomitas." },
  doble_velocidad: { nombre: "Doble velocidad", txt: "Todo va a velocidad x1,5." },
  sin_curas: { nombre: "Sin curas", txt: "No hay curaciones ni recogibles de vida." },
};
/** Ganchos que main.ts conecta; cada regla toca solo el que necesita. ponytail: sin ganchos de oferta aún, se cablean en main.ts. */
export type ReglaCtx = {
  /** multiplica la velocidad de simulación (dt) */ setTimeScale?(k: number): void;
  /** filtra el pool de mejoras ofrecidas */ filtrarOfertas?(f: (id: string) => boolean): void;
  /** bloquea toda curación */ bloquearCuras?(): void;
};
export function aplicarRegla(regla: string | null | undefined, ctx: ReglaCtx): void {
  if (regla === "doble_velocidad") ctx.setTimeScale?.(1.5);
  else if (regla === "solo_gomitas") ctx.filtrarOfertas?.((id) => id.startsWith("gom"));
  else if (regla === "sin_curas") ctx.bloquearCuras?.();
}
