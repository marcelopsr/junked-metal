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
  // Fusiones
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
};

export const icon = (id: string, size = 24) =>
  `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[id] ?? P.evo}</svg>`;
