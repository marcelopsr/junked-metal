// Set de íconos propio: monolínea 24x24, trazo 1.8, puntas redondeadas.
// Dibujados a mano para RC Fight (sin emojis ni packs externos).

const P: Record<string, string> = {
  // Armas
  gomitas: `<path d="M8 6.5c0-1.9 1.8-3 4-3s4 1.1 4 3c1.7.6 2.5 2 2.5 3.8 0 1.5-.7 2.6-1.8 3.2.6.8.8 1.6.8 2.5 0 2.6-2.4 4.5-5.5 4.5S6.5 18.6 6.5 16c0-.9.2-1.7.8-2.5C6.2 12.9 5.5 11.8 5.5 10.3c0-1.8.8-3.2 2.5-3.8Z"/><circle cx="10.3" cy="8.3" r=".6" fill="currentColor"/><circle cx="13.7" cy="8.3" r=".6" fill="currentColor"/><path d="M10.5 11c.9.6 2.1.6 3 0"/>`,
  clips: `<path d="M9 7v9.5a3 3 0 0 0 6 0V5.5a2 2 0 0 0-4 0V16a1 1 0 0 0 2 0V8"/>`,
  chispero: `<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.4-5 3.4-8 .9 1.3 1.1 2.6 1 3.8C11.5 8.6 12.6 5.4 12 3c3.4 2.2 6.5 6.1 6.5 12 0 3.4-2.6 6-6.5 6Z"/><path d="M12 21c-1.6 0-2.8-1.1-2.8-2.7 0-1.8 1.6-2.8 2.2-4.3 1.5 1.1 3.4 2.4 3.4 4.3 0 1.6-1.2 2.7-2.8 2.7Z"/>`,
  petardos: `<rect x="5" y="9" width="11" height="6" rx="1" transform="rotate(-30 10.5 12)"/><path d="M15.2 7.3c.8-1.2 1.9-1.7 3.1-1.5"/><path d="M19.5 3.5v1.6M21.3 5.3h-1.6M20.8 3.9l-1 1"/><path d="M7.3 13.2l4.8-2.8"/>`,
  tesla: `<path d="M12 21V11"/><path d="M8.5 21h7"/><path d="M9 14.5 12 11l3 3.5"/><circle cx="12" cy="8.5" r="1.6"/><path d="M6 3.5 8.5 7l-2 1 2.5 3.5M18 3.5 15.5 7l2 1-2.5 3.5"/>`,
  lanza: `<path d="M4 20l1.2-4.4L15.8 5a2.1 2.1 0 0 1 3 3L8.3 18.6 4 20Z"/><path d="M5.2 15.6l3.1 3M14 6.8l3.2 3.2"/>`,
  agua: `<path d="M3.5 10h12l1.5-1.5h3.5v3.5h-3.5l-1 1h-2.5l-1.6 6.5H8.4l1.3-6H3.5Z"/><rect x="7" y="4.5" width="5" height="5.5" rx="1"/><path d="M21.3 16c0 .9-.6 1.5-1.3 1.5s-1.3-.6-1.3-1.5c0-.8 1.3-2.4 1.3-2.4s1.3 1.6 1.3 2.4Z"/>`,
  yoyo: `<path d="M12 2.5v5"/><circle cx="12" cy="14" r="6.5"/><circle cx="12" cy="14" r="1.8"/><path d="M7.6 11.2a5 5 0 0 1 2.2-2.1M16.4 16.8a5 5 0 0 1-2.2 2.1"/>`,
  bengalas: `<path d="M4.5 19.5l8.2-8.2 2 2-8.2 8.2Z"/><circle cx="16" cy="8" r="1.6"/><path d="M16 3v1.8M21 8h-1.8M19.5 4.5l-1.3 1.3M19.5 11.5l-1.3-1.3M12.5 4.5l1.3 1.3"/>`,
  regla: `<g transform="rotate(-35 12 13)"><rect x="3" y="10.5" width="18" height="5" rx=".6"/><path d="M6 10.5v2M9 10.5v1.3M12 10.5v2M15 10.5v1.3M18 10.5v2"/></g><path d="M4 7.5a10 10 0 0 1 9-4.5"/><path d="M11.2 1.8 13 3l-1.3 1.7"/>`,
  helado: `<path d="M7.5 11 12 21.5 16.5 11"/><circle cx="12" cy="8" r="4.6"/><path d="M9.6 6.4a3 3 0 0 1 2.6-1.4M8.2 11.2l7.6 0"/>`,
  bocina: `<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>`,
  trompo: `<path d="M12 2.5v3"/><path d="M5 8h14l-5.2 10h-3.6Z"/><path d="M12 18v3.5M8 11.5h8"/>`,
  // Fusiones
  yoyoelec: `<path d="M9.5 2.5v5"/><circle cx="9.5" cy="14" r="6"/><circle cx="9.5" cy="14" r="1.6"/><path d="M19.5 3 16.5 8.5h3.5l-3 5.5"/>`,
  vapor: `<path d="M12 21c-3.4 0-5.7-2.3-5.7-5.3 0-2.8 2.1-4.4 3-7 .8 1.1 1 2.3.9 3.3 1.3-1.9 2.3-4.7 1.8-6.8 3 1.9 5.7 5.3 5.7 10.5 0 3-2.3 5.3-5.7 5.3Z"/><path d="M4 6c1-1 1-2 0-3M20 7c1-1 1-2 0-3M17.5 3.5c.8-.8.8-1.6 0-2.4"/>`,
  chispazo: `<rect x="3.5" y="11" width="10" height="5.5" rx="1" transform="rotate(-30 8.5 13.75)"/><path d="M16 2.5 13 8h4l-3 5.5"/><path d="M18.5 13l2.5 2-2 1 2.5 2.5"/>`,
  globos: `<path d="M12 3.5c3.6 0 6 2.9 6 6.6 0 4-2.8 7.2-6 7.2s-6-3.2-6-7.2c0-3.7 2.4-6.6 6-6.6Z"/><path d="M11 17.3h2l-1 1.7Z"/><path d="M12 19c0 1.2-1 1.5-1 2.5"/><path d="M9 9a3 3 0 0 1 2-2.3"/>`,
  anillo: `<circle cx="12" cy="12" r="7"/><path d="M12 2.5c.9 1 1.2 1.8.9 2.6M21.5 12c-1 .9-1.8 1.2-2.6.9M12 21.5c-.9-1-1.2-1.8-.9-2.6M2.5 12c1-.9 1.8-1.2 2.6-.9"/><path d="M10.5 10.5v3a1.5 1.5 0 0 0 3 0V9.8a1 1 0 0 0-2 0v3.4"/>`,
  // Pasivas
  iman: `<path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4H6Z"/><path d="M6 7.5h4M14 7.5h4"/>`,
  resorte: `<path d="M8 3.5h8M8 20.5h8"/><path d="M16 3.5 8 6.3l8 2.8-8 2.8 8 2.8-8 2.8 8 2.8"/>`,
  turbo: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 10c0-2.5 1.2-4.6 3-6M14 12c2.5 0 4.6 1.2 6 3M12 14c0 2.5-1.2 4.6-3 6M10 12c-2.5 0-4.6-1.2-6-3"/>`,
  litio: `<rect x="7" y="4.5" width="10" height="16.5" rx="1.6"/><path d="M10 2.5h4"/><path d="M12.8 8 10.3 12.7h3.4L11.2 17.5"/>`,
  capacitor: `<path d="M12 3v6M12 15v6"/><path d="M6.5 9h11M6.5 15h11"/><path d="M15.5 4.5h3M17 3v3"/>`,
  lego: `<rect x="3.5" y="10" width="17" height="9" rx="1"/><rect x="6" y="6.5" width="4" height="3.5" rx=".6"/><rect x="14" y="6.5" width="4" height="3.5" rx=".6"/>`,
  lupa: `<circle cx="10" cy="10" r="6"/><path d="M14.5 14.5 20.5 20.5"/><path d="M7.4 8.6a3 3 0 0 1 2.1-2.1"/>`,
  // Otros
  heal: `<path d="M14.7 6.3a4 4 0 0 0-5.3 5.3l-5.7 5.7a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.4-.3-.3-2.4 2.5-2.5Z"/>`,
  evo: `<path d="M12 3.5l2.4 5.1 5.6.7-4.1 3.9 1 5.5L12 16l-4.9 2.7 1-5.5L4 9.3l5.6-.7L12 3.5Z"/>`,
  cofre: `<path d="M4 10h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10Z"/><path d="M4 10V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/><rect x="10.5" y="9" width="3" height="4" rx=".6"/>`,
  jefe: `<path d="M5 11a7 7 0 0 1 14 0v3l-2 1v3h-2.5v-2h-1v2h-3v-2h-1v2H7v-3l-2-1v-3Z"/><circle cx="9.3" cy="11.3" r="1.5" fill="currentColor"/><circle cx="14.7" cy="11.3" r="1.5" fill="currentColor"/>`,
  senal: `<path d="M5 19v-2M9 19v-5M13 19v-8M17 19V8M21 19V5"/>`,
  // Fabricación (telemetría RC)
  fab_chasis: `<rect x="5" y="8" width="14" height="9" rx="1"/><path d="M7 8V6.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V8"/><circle cx="8.5" cy="17.5" r="1.2"/><circle cx="15.5" cy="17.5" r="1.2"/><path d="M5 11h3M16 11h3"/>`,
  fab_rueda: `<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2"/><path d="M7.8 7.8l1.4 1.4M14.8 14.8l1.4 1.4M16.2 7.8l-1.4 1.4M9.2 14.8l-1.4 1.4"/>`,
  fab_arma: `<path d="M6 18h12"/><path d="M8 18V9l4-3 4 3v9"/><path d="M12 6v4"/><rect x="10.5" y="12" width="3" height="4" rx=".5"/>`,
  fab_especial: `<rect x="6" y="7" width="12" height="10" rx="1"/><path d="M9 7V5.5h6V7"/><circle cx="12" cy="12" r="1.5"/><path d="M8 15h8"/>`,
  fab_extra: `<path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M7.2 7.2l1.6 1.6M15.2 15.2l1.6 1.6M16.8 7.2l-1.6 1.6M8.8 15.2l-1.6 1.6"/><circle cx="12" cy="12" r="2.4"/>`,
  fab_layers: `<rect x="5" y="14" width="14" height="3" rx=".6"/><rect x="6.5" y="10" width="11" height="3" rx=".6"/><rect x="8" y="6" width="8" height="3" rx=".6"/><path d="M18 7.5h2M18 11.5h2M18 15.5h2"/>`,
  fab_zoom_in: `<circle cx="10" cy="10" r="5.5"/><path d="M14.2 14.2 19 19"/><path d="M10 7.5v5M7.5 10h5"/>`,
  fab_zoom_out: `<circle cx="10" cy="10" r="5.5"/><path d="M14.2 14.2 19 19"/><path d="M7.5 10h5"/>`,
  fab_plane_up: `<path d="M12 6.5 7.5 11h9L12 6.5Z"/><path d="M6 16.5h12"/>`,
  fab_plane_down: `<path d="M6 7.5h12"/><path d="M12 17.5 16.5 13h-9l4.5 4.5Z"/>`,
  fab_rot: `<path d="M16.5 7.5A6.5 6.5 0 0 0 8 9.5"/><path d="M7.5 6.5V10H4"/><path d="M7.5 16.5A6.5 6.5 0 0 0 16 14.5"/><path d="M16.5 17.5V14h3.5"/>`,
  fab_mirror: `<path d="M12 4v16"/><path d="M6.5 8 9.5 12 6.5 16"/><path d="M17.5 8 14.5 12 17.5 16"/>`,
  fab_undo: `<path d="M7.5 8H5.5a4 4 0 0 0 0 8h2"/><path d="M7.5 8 4 11.5 7.5 15"/>`,
  fab_erase: `<path d="M5 19h14"/><path d="M8.5 19 5 8.5l5.5-5.5 8 8L15.5 19"/><path d="M9.5 7.5 16 14"/>`,
};

// Colores por ícono (degradado del trazo): armas cálidas, pasivas variadas, fusiones lima. Por defecto, plata.
const COL: Record<string, [string, string]> = {
  gomitas: ["#b6ff6a", "#3ed87a"], clips: ["#f0f5fa", "#9bb0c2"], chispero: ["#ffd84d", "#ff5a36"], petardos: ["#ff8a6b", "#ff3a3a"], tesla: ["#9bf0ff", "#4a8bff"],
  lanza: ["#ffe27a", "#ff9d2e"], agua: ["#9be3ff", "#3a8bff"], yoyo: ["#ff9bd4", "#b783ff"], bengalas: ["#ffd84d", "#ff5a5a"], regla: ["#ffe9a0", "#f0a030"],
  helado: ["#ff9bd4", "#9be3ff"], bocina: ["#ffe27a", "#ff7a3a"], trompo: ["#b783ff", "#35c9ff"],
  yoyoelec: ["#ff9bd4", "#7de8ff"], vapor: ["#ffffff", "#ff9d6b"], chispazo: ["#ffd84d", "#7de8ff"], globos: ["#9be3ff", "#ff9bd4"], anillo: ["#ffd84d", "#ff7a3a"],
  iman: ["#ff7a7a", "#7d9bff"], resorte: ["#d9b8ff", "#8a6bff"], turbo: ["#ffe27a", "#ffa02e"], litio: ["#9bff9b", "#2fcf6a"], capacitor: ["#9bf0ff", "#4a8bff"], lego: ["#ffa07a", "#ff4d4d"], lupa: ["#fff0a0", "#6bd8ff"],
  heal: ["#9bff9b", "#2fcf6a"], evo: ["#fff0a0", "#ffb02e"], cofre: ["#ffe27a", "#c47a2e"], jefe: ["#ff9b9b", "#ff4d4d"], senal: ["#9bf0ff", "#7dffb0"],
  fab_chasis: ["#ffa07a", "#ff5a4d"], fab_rueda: ["#9bf0ff", "#4a8bff"], fab_arma: ["#ffe27a", "#ff7a3a"], fab_especial: ["#9bff9b", "#2fcf6a"],
  fab_extra: ["#d9b8ff", "#8a6bff"], fab_layers: ["#9bf0ff", "#35c9ff"], fab_zoom_in: ["#fff0a0", "#6bd8ff"], fab_zoom_out: ["#fff0a0", "#6bd8ff"],
  fab_plane_up: ["#7dffb0", "#35c9ff"], fab_plane_down: ["#7dffb0", "#35c9ff"], fab_rot: ["#ffd84d", "#ff9d2e"], fab_mirror: ["#9be3ff", "#6b8bff"],
  fab_undo: ["#f0f5fa", "#9bb0c2"], fab_erase: ["#ff9b9b", "#ff5a5a"],
};
export const icon = (id: string, size = 24) => {
  const [a, b] = COL[id] ?? ["#ffffff", "#9bb0c2"], g = "ig-" + id;
  return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="url(#${g})" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="3" y1="3" x2="21" y2="21"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>${P[id] ?? P.evo}</svg>`;
};

// ---------- Íconos de interfaz (familia industrial de Junket Crush) ----------
// Glifo RELLENO con degradado vertical (luz arriba = volumen), contorno oscuro de 1.3 (#0B0F14) igual en todos,
// y en los de navegación una placa de chapa oscura con borde naranja (como la Guía UI de docs/images).
const star = (n: number, r1: number, r2: number) => `M${Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; return `${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`; }).join("L")}Z`;
const gearD = (() => {
  const n = 8, out: string[] = [];
  for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2, r = i % 4 < 2 ? 9.5 : 7.2; out.push(`${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`); }
  return `M${out.join("L")}Z M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z`;
})();
const UI: Record<string, { d: string; c: [string, string] }> = {
  ajustes: { d: `<path d="${gearD}"/>`, c: ["#e5e7eb", "#9CA3AF"] },
  audio: { d: `<path d="M3.5 9h4l5-4.5v15l-5-4.5h-4Z"/><path d="M15 7.2a6.5 6.5 0 0 1 0 9.6l-1.6-1.7a4.2 4.2 0 0 0 0-6.2Z"/><path d="M17.8 4.4a10.4 10.4 0 0 1 0 15.2l-1.6-1.7a8 8 0 0 0 0-11.8Z"/>`, c: ["#FFD166", "#FFB400"] },
  pausa: { d: `<path d="M6.5 5h4v14h-4ZM13.5 5h4v14h-4Z"/>`, c: ["#FFD166", "#FFB400"] },
  jugar: { d: `<path d="M7 4.5 19.5 12 7 19.5Z"/>`, c: ["#86efac", "#22C55E"] },
  inicio: { d: `<path d="M12 3.5 3 11.5h2.5v8.5h5v-5h3v5h5v-8.5H21Z"/>`, c: ["#FFD166", "#FFB400"] },
  atras: { d: `<path d="M10.5 5 3.5 12l7 7v-4.3h10v-5.4h-10Z"/>`, c: ["#FFD166", "#FF9138"] },
  pantalla: { d: `<path d="M4 4h6v2.6H6.6V10H4ZM20 4v6h-2.6V6.6H14V4ZM4 20v-6h2.6v3.4H10V20ZM20 20h-6v-2.6h3.4V14H20Z"/>`, c: ["#e5e7eb", "#9CA3AF"] },
  vida: { d: `<path d="M12 20.5 4.6 13.3A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 7.4 6.1Z"/>`, c: ["#86efac", "#22C55E"] },
  energia: { d: `<path d="M13.5 2.5 5 13.5h5.5L9.5 21.5 19 10h-5.6Z"/>`, c: ["#FFD166", "#FFB400"] },
  nivel: { d: `<path d="${star(5, 9.5, 4.2)}"/>`, c: ["#FFD166", "#FF9138"] },
  bajas: { d: `<path fill-rule="evenodd" d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.4 3 5.4V20h9v-4.1c1.7-1 3-2.8 3-5.4A7.5 7.5 0 0 0 12 3Zm-3.2 6.8a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm6.4 0a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z"/>`, c: ["#fca5a5", "#FF3B2E"] },
  vehiculo: { d: `<path d="M2.5 15.5v-4l2.8-1 2.4-3.8h7.8l2.9 3.8 3.1 1v4Z"/><circle cx="7" cy="16.5" r="2.6"/><circle cx="17" cy="16.5" r="2.6"/>`, c: ["#7fe3ff", "#00C2FF"] },
  armas: { d: `<path fill-rule="evenodd" d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 3a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"/><path d="M11 1.5h2v7h-2ZM11 15.5h2v7h-2ZM1.5 11h7v2h-7ZM15.5 11h7v2h-7Z"/>`, c: ["#ffc08a", "#FF9138"] },
  habilidades: { d: `<path d="M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8Z"/>`, c: ["#c4b5fd", "#8B5CF6"] },
  garaje: { d: `<path fill-rule="evenodd" d="M12 3 2.5 9v12h3v-9h13v9h3V9Z"/><path d="M7 13.5h10v1.8H7ZM7 16.6h10v1.8H7ZM7 19.7h10v1.3H7Z"/>`, c: ["#FFD166", "#FFB400"] },
  bestiario: { d: `<ellipse cx="12" cy="14.5" rx="4.4" ry="5.8"/><circle cx="12" cy="6.4" r="2.6"/><path d="M2.8 9.6h5v1.6h-5ZM16.2 9.6h5v1.6h-5ZM2.8 14h4.8v1.6H2.8ZM16.4 14h4.8v1.6h-4.8ZM3.4 18.4h4.6V20H3.4ZM16 18.4h4.6V20H16Z"/>`, c: ["#86efac", "#22C55E"] },
  taller: { d: `<path d="M14.7 3.3a5 5 0 0 0-4.6 6.8L3.3 16.9a2.2 2.2 0 0 0 3.1 3.1l6.8-6.8a5 5 0 0 0 6.8-4.6l-3 3-2.8-.4-.4-2.8Z"/>`, c: ["#e5e7eb", "#9CA3AF"] },
  info: { d: `<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm-1.4 8h2.8v7h-2.8Zm1.4-4.6a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z"/>`, c: ["#7fe3ff", "#00C2FF"] },
  arcade: { d: `<path d="M6 3h12v6l-2 2v10H8V11L6 9Z"/>`, c: ["#ffc08a", "#FF9138"] },
};
/** Ícono de interfaz. `plate`: sobre placa de chapa (navegación y botones cuadrados). */
export const uiIcon = (id: string, size = 24, plate = false) => {
  const g = UI[id] ?? UI.info, gid = "ui-" + id;
  const glyph = `<g fill="url(#${gid})" stroke="#0B0F14" stroke-width="1.3" stroke-linejoin="round"${plate ? ` transform="translate(3.36 3.36) scale(.72)"` : ""}>${g.d}</g>`;
  const pl = plate ? `<rect x="1" y="1" width="22" height="22" rx="3" fill="url(#ui-plate)" stroke="#b5651d" stroke-width="1.4"/><path d="M3.5 3.2h17" stroke="#ffffff" stroke-opacity=".18"/><circle cx="3.6" cy="20.4" r=".8" fill="#6b4a2a"/><circle cx="20.4" cy="20.4" r=".8" fill="#6b4a2a"/>` : "";
  return `<svg class="ico jm-ico" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g.c[0]}"/><stop offset="1" stop-color="${g.c[1]}"/></linearGradient>${plate ? `<linearGradient id="ui-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4556"/><stop offset="1" stop-color="#14181F"/></linearGradient>` : ""}</defs>${pl}${glyph}</svg>`;
};
/** El mismo ícono como url() para CSS (barras del HUD). */
export const uiIconUrl = (id: string) => `url("data:image/svg+xml,${encodeURIComponent(uiIcon(id).replace(' class="ico jm-ico"', ' xmlns="http://www.w3.org/2000/svg"'))}")`;
/** Botones fijos del HTML que llevan ícono, por data-go / data-act. */
export const UI_BTN_ICON: Record<string, string> = {
  play: "jugar", daily: "nivel", race: "vehiculo", duel: "armas", match3: "arcade", garage: "garaje", shop: "taller", bestiary: "bestiario",
  config: "ajustes", credits: "info", back: "atras", quit: "inicio", resume: "jugar", controls: "ajustes",
};
