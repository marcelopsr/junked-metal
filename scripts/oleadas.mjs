#!/usr/bin/env node
// Oleadas analíticas (sin jugar ni simular partidas): replica las fórmulas de spawnTable() (enemies.ts), el ritmo de aparición
// (run_drive.ts tickSpawner), la dureza/escala de vida (main.ts spawnEnemy), el daño por contacto (run_tick.ts) y los ataques
// a distancia (`ataques` de balance.json), y los cruza con el modelo de armas de scripts/dps.mjs.
// Uso: npm run oleadas [-- --json] [-- --zona patio|cocina|luna] [-- --plaga <id>|ninguna] [-- --dur 600] [-- --ttk]
// Si cambia una fórmula del juego, actualizar acá (test/oleadas.test.ts avisa).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MODELOS, NMAX, SUP } from "./dps.mjs";

const raw = JSON.parse(readFileSync(fileURLToPath(new URL("../src/balance.json", import.meta.url)), "utf8"));
const kv = (t) => Object.fromEntries(raw[t].map((r) => [r.id, r.valor]));
export const R = kv("ritmo"), ATK = kv("ataques");
export const EN = Object.fromEntries(raw.enemigos.map((e) => [e.id, e]));
export const ARMAS = Object.fromEntries(raw.armas.map((w) => [w.id, w]));
export const PLAGAS = Object.fromEntries(raw.plagas.map((p) => [p.id, p]));
const AUTO_HP = raw.autos.find((a) => a.id === "buggy").vida; // vida base del auto inicial (sin taller ni pasivas)

// ---------- Supuestos propios de este script (editables) ----------
export const SUPO = {
  DUR_S: 600, // duración de la partida (jefe_final_s)
  FRAC_CONTACTO: 0.5, // fracción del tiempo vivo que un bicho pasa en contacto con el auto (el resto persigue o lo embisten)
  EXPO_MAX_S: 6, // tope de segundos que un bicho vive pegado al auto aunque tarde más en morir (el auto se mueve)
  K_BLANCOS: { dirigido: 1, instantaneo: 2, area: 3, orbita: 2, rastro: 2 }, // bichos que ya cuenta el DPS de dps.mjs por tipo de arma: DPS por blanco = DPS / K
  ACIERTO_DIST: 0.35, // probabilidad de que un proyectil/flema/bala enemiga conecte (el auto se mueve; todos están telegrafiados)
  ACIERTO_KAMIKAZE: 0.5, // probabilidad de que el kamikaze explote con el auto dentro del aro
  FRAC_FRENTE_ESCUDO: 0.7, // fracción de golpes que entran por el frente del escudero (gira a escudo_giro hacia el auto: más que 1/3 geométrico)
  FRAC_CARTAS_PASIVAS: 0.3, // fracción de las cartas de nivel que se gastan en pasivas (no suman DPS acá)
  BONUS_DMG_POR_NIVEL: 0, // multiplicador de daño acumulado por nivel del jugador (pasivas/taller); 0 = solo armas (conservador)
  TTK_OK_S: 3, // TTK mediano (armas nv5, minuto de referencia) a partir del cual un bicho se marca
  MIN_REF: 5, // minuto de referencia para vida efectiva en tablas de TTK
  HP_XP_RATIO: 2, // marca si vida/XP del bicho supera N veces la mediana
};
// Builds de referencia: cada elemento es UNA carta elegida al subir de nivel (nivel L = L-1 cartas); se parte con Gomitas nv1 (soldadito).
// "id" sube/consigue el arma; "evo:id" la evoluciona (queda en nivel máx); sin pasivas.
// Máximo 6 armas (weapons/offers.ts). hondo = cada arma a nv5 antes de pasar a la siguiente; ancho = armas nuevas primero y luego una carta a cada una por vuelta. Evoluciones al final.
const evos = (ids) => ids.map((id) => "evo:" + id);
const hondo = (ids) => [...ids.flatMap((id) => (id === "gomitas" ? Array(4).fill(id) : [id, ...Array(4).fill(id)])), ...evos(ids)];
const ancho = (ids) => [...ids.filter((id) => id !== "gomitas"), ...Array(4).fill(ids).flat(), ...evos(ids)];
export const BUILDS = {
  foco: hondo(["gomitas", "tesla", "petardos", "bengalas", "cohete", "avioncito"]),
  mixto: ancho(["gomitas", "petardos", "tesla", "bengalas", "cohete", "avioncito"]),
  area: ancho(["petardos", "bengalas", "agua", "canicas", "pintura", "ventilador"]),
};

// ---------- Zonas y plagas (replican spawnTable, run.ts PLAGUES, zones/cocina.ts, aliens.ts) ----------
const PATIO = ["hormiga", "friccion", "escupidora", "robot", "escarabajo", "polilla", "grillo", "mosca", "babosa", "kamikaze", "escudo", "brincador", "francotirador", "divisor", "ladron", "taladro", "cangrejo"];
const ALIENS = ["enjambre", "tirador", "saltador", "emboscador", "flotante", "tanque", "explosivo", "curandero"];
export const KITCHEN_SPAWN = { hormiga: 1.6, mosca: 1.8, babosa: 1.4, polilla: 1.3, escarabajo: 1.3, robot: 0.5, friccion: 0.6, brincador: 1.5, divisor: 1.4, ladron: 1.3 };
const BASE6 = ["hormiga", "friccion", "escupidora", "robot", "escarabajo", "polilla"];
const PLAGUE_KINDS = ["hormiga", "friccion", "escupidora", "robot", "polilla", "escarabajo", "grillo", "mosca", "babosa"];
export const plagueOf = (id) => {
  const p = PLAGAS[id]; if (!p) return undefined;
  const mult = {}, from = {};
  for (const k of PLAGUE_KINDS) { mult[k] = p["mult_" + k]; if (p["desde_" + k] >= 0) from[k] = p["desde_" + k]; }
  return { mult, from };
};
export const kitchenPlague = (p) => { const mult = { ...p?.mult }; for (const [k, w] of Object.entries(KITCHEN_SPAWN)) mult[k] = w * (p?.mult[k] ?? 1); return { from: p?.from ?? {}, mult }; };
/** [tipo, peso] igual que spawnTable(t, plague) de enemies.ts; luna = lista de aliens. t en segundos de dificultad. */
export function tablaSpawn(t, plague, luna = false) {
  const m = t / 60;
  return (luna ? ALIENS : [...BASE6, ...PATIO.slice(6)]).map((k) => [k, EN[k].aparece_min, EN[k].peso_base + m * EN[k].peso_por_min])
    .filter(([k, from]) => m >= (plague?.from[k] ?? from)).map(([k, , w]) => [k, w * (plague?.mult[k] ?? 1)]);
}
export const ZONAS = {
  patio: { luna: false, plague: (p) => p, spawnK: 1, xpK: 1 },
  cocina: { luna: false, plague: kitchenPlague, spawnK: 1, xpK: 1 },
  luna: { luna: true, plague: (p) => p, spawnK: R.luna_aparicion_mult, xpK: R.luna_xp_mult },
};

// ---------- Enemigos ----------
/** Vida efectiva de un bicho normal que nace en el segundo de dificultad tp (main.ts spawnEnemy: vida × dureza × (1 + tp/vida_escala_seg)). */
export const vidaEfectiva = (k, tp) => EN[k].vida * R.dureza_vida * (1 + tp / R.vida_escala_seg);
/** Multiplicador de daño que recibe (escudero: placa frontal). */
export const mulDanoRecibido = (k) => (k === "escudo" ? SUPO.FRAC_FRENTE_ESCUDO * ATK.escudo_blindaje + (1 - SUPO.FRAC_FRENTE_ESCUDO) : 1);
/** Daño que inflige: dpsContacto y dpsDist (por segundo mientras expone) y unico (daño por vida). */
export function ataque(k) {
  const e = EN[k], P = SUPO.ACIERTO_DIST;
  const dpsContacto = (e.dano * R.contacto_dano * R.dureza_dano) / R.contacto_recarga_s;
  let dpsDist = 0, unico = 0;
  if (k === "escupidora") dpsDist = (ATK.acido_dano * P) / ATK.escupidora_cada_s;
  if (k === "babosa") dpsDist = (ATK.babosa_dano * P) / ATK.babosa_cada_s;
  if (k === "francotirador") dpsDist = (ATK.francotirador_dano * P) / ATK.francotirador_cada_s;
  if (k === "kamikaze") unico = ATK.kamikaze_dano * SUPO.ACIERTO_KAMIKAZE;
  if (k === "tirador") dpsDist = (ATK.acido_dano * P) / ATK.alien_tirador_cada_s;
  if (k === "explosivo") unico = ATK.alien_explosivo_dano * SUPO.ACIERTO_KAMIKAZE;
  return { dpsContacto, dpsDist, unico };
}
export const AVISOS = {
  kamikaze: "explota al llegar: daño único kamikaze_dano × ACIERTO_KAMIKAZE y se va sin XP",
  escudo: "placa frontal: el daño efectivo se promedia con FRAC_FRENTE_ESCUDO (vida efectiva = vida / mulDanoRecibido)",
  brincador: "salta: el contacto real es en saltos, se promedia como contacto continuo",
  francotirador: "bala telegrafiada: daño a distancia × ACIERTO_DIST cada francotirador_cada_s",
  divisor: "al morir suelta divisor_crias crías: su vida y XP se suman al divisor",
  ladron: "casi no daña; roba XP de gemas (no contado): el XP real baja un poco",
  escupidora: "ataque a distancia × ACIERTO_DIST cada escupidora_cada_s",
  babosa: "flema a distancia × ACIERTO_DIST cada babosa_cada_s",
  tirador: "onda a distancia × ACIERTO_DIST cada alien_tirador_cada_s",
  explosivo: "explota (alien_explosivo_dano × ACIERTO_KAMIKAZE)",
};
/** Vida total y XP que aporta un spawn de k (el divisor incluye sus crías). */
export function aporte(k, tp) {
  const mul = mulDanoRecibido(k);
  let hp = vidaEfectiva(k, tp) / mul, xp = EN[k].xp;
  if (k === "divisor") { hp += (ATK.divisor_crias * vidaEfectiva("cria", tp)) / mulDanoRecibido("cria"); xp += ATK.divisor_crias * EN.cria.xp; }
  return { hp, xp };
}

// ---------- Armas y builds ----------
const nivelXp = (l) => Math.floor(R.xp_nivel_base + l * R.xp_nivel_lineal + l * l * R.xp_nivel_cuad);
const armasConModelo = () => Object.keys(ARMAS).filter((id) => MODELOS[id] && !MODELOS[id].sinModelo);
export const dpsArma = (id, lv, ev) => MODELOS[id].f(ARMAS[id], lv, ev);
/** Estado del build al nivel L: { id: {lv, ev} } aplicando las primeras L-1 cartas sobre Gomitas nv1. */
export function estadoBuild(build, nivel) {
  const s = { gomitas: { lv: 1, ev: false } };
  for (const carta of build.slice(0, Math.floor(Math.max(0, nivel - 1) * (1 - SUPO.FRAC_CARTAS_PASIVAS)))) {
    const evo = carta.startsWith("evo:"), id = evo ? carta.slice(4) : carta;
    const w = (s[id] ??= { lv: 0, ev: false });
    if (evo) { w.lv = NMAX; w.ev = true; } else if (!w.ev) w.lv = Math.min(NMAX, w.lv + 1);
  }
  return s;
}
export function dpsBuild(build, nivel) {
  let t = 0;
  for (const [id, w] of Object.entries(estadoBuild(build, nivel))) if (w.lv > 0 && MODELOS[id] && !MODELOS[id].sinModelo) t += dpsArma(id, w.lv, w.ev);
  return t * (1 + SUPO.BONUS_DMG_POR_NIVEL * (nivel - 1));
}

// ---------- Oleada por segundo de dificultad ----------
/** Composición, flujo y daño potencial en el instante tp (s) para una zona/plaga y un DPS de build dado. */
export function oleada(tp, zona = "patio", plagaId = null, dpsB = 0) {
  const Z = ZONAS[zona], tab = tablaSpawn(tp, Z.plague(plagueOf(plagaId)), Z.luna), W = tab.reduce((a, [, w]) => a + w, 0);
  const rate = (R.spawn_base + tp / R.spawn_seg) * R.dureza_cantidad * Z.spawnK; // bichos/s (horda 1, 1 jugador)
  const tope = Math.min(R.tope_vivos_pc, (R.tope_vivos_base + tp / R.tope_vivos_seg) * R.dureza_cantidad) * (Z.luna ? R.luna_tope_mult : 1);
  const swarm = ((R.enjambre_base + tp / R.enjambre_seg) * R.dureza_cantidad) / (R.enjambre_cada_min + R.enjambre_cada_rango / 2); // hormigas/s promedio del enjambre periódico
  const comp = tab.map(([k, w]) => ({ k, p: w / W, rate: (rate * w) / W })), swarmHp = swarm * vidaEfectiva("hormiga", tp);
  let hps = swarmHp, xps = swarm * EN.hormiga.xp * R.dureza_xp * Z.xpK, contacto = 0, dist = 0, unico = 0, hits = 0;
  const kPromedio = 2, dpsBlanco = dpsB / kPromedio;
  for (const c of comp) {
    const a = aporte(c.k, tp), at = ataque(c.k);
    hps += c.rate * a.hp; xps += c.rate * a.xp * R.dureza_xp * Z.xpK;
    const ttk = dpsBlanco > 0 ? vidaEfectiva(c.k, tp) / mulDanoRecibido(c.k) / dpsBlanco : SUPO.EXPO_MAX_S, expo = Math.min(ttk, SUPO.EXPO_MAX_S);
    contacto += c.rate * at.dpsContacto * expo * SUPO.FRAC_CONTACTO; dist += c.rate * at.dpsDist * expo; unico += c.rate * at.unico;
    hits += (c.rate * expo * SUPO.FRAC_CONTACTO) / R.contacto_recarga_s;
  }
  // las invulnerabilidades del auto (contacto_invuln_s) limitan los golpes de contacto por segundo
  const golpeMedio = hits > 0 ? contacto / hits : 0, contactoCap = Math.min(contacto, golpeMedio / R.contacto_invuln_s);
  const danoPot = contactoCap + dist + unico;
  return { tp, rate, tope, enjambre_hps: swarmHp, comp, hps, xps, dano_pot: danoPot, dano_contacto: contactoCap, dano_dist: dist, dano_unico: unico, seg_auto: danoPot > 0 ? AUTO_HP / danoPot : Infinity };
}

/** Progresión minuto a minuto (paso 1 s): nivel según XP cobrada (solo lo que el build alcanza a matar) y margen DPS/HP entrante. */
export function simular(build, zona = "patio", plagaId = null, dur = SUPO.DUR_S, paceS = 0) {
  let xp = 0, nivel = 1;
  const filas = [];
  for (let m = 0; m * 60 < dur; m++) {
    let o = null, dps = 0, mn = Infinity, lvIni = nivel, lvMid = nivel;
    for (let s = 0; s < 60 && m * 60 + s < dur; s++) {
      const t = m * 60 + s + paceS;
      dps = dpsBuild(build, nivel); o = oleada(t, zona, plagaId, dps);
      const kill = Math.min(1, dps / o.hps), temprano = m * 60 + s < R.xp_temprana_s ? R.xp_temprana_mult : 1;
      mn = Math.min(mn, dps / o.hps); if (s === 30) lvMid = nivel;
      xp += kill * o.xps * temprano; // gainXp: × early; dureza_xp ya está en xps
      while (xp >= nivelXp(nivel)) { xp -= nivelXp(nivel); nivel++; }
    }
    const dpsMid = dpsBuild(build, lvMid), mid = oleada(m * 60 + 30 + paceS, zona, plagaId, dpsMid);
    filas.push({ minuto: m, nivel_ini: lvIni, nivel: lvMid, dps: dpsMid, margen: dpsMid / mid.hps, margen_min: mn, ...mid });
  }
  return filas;
}

// ---------- TTK enemigo × arma ----------
export function ttkTabla(kinds, tp) {
  return kinds.map((k) => {
    const hp = vidaEfectiva(k, tp) / mulDanoRecibido(k), por = {};
    for (const id of armasConModelo()) {
      const kb = SUPO.K_BLANCOS[MODELOS[id].tipo] ?? 1, v = [[1, false], [NMAX, false], [NMAX, true]].map(([lv, ev]) => hp / (dpsArma(id, lv, ev) / kb));
      por[id] = { nv1: v[0], nv5: v[1], evo: v[2] };
    }
    const med = (key) => { const a = Object.values(por).map((x) => x[key]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
    return { k, hp, xp: EN[k].xp, hp_xp: hp / aporte(k, tp).xp, ttk_med_nv1: med("nv1"), ttk_med_nv5: med("nv5"), ttk_med_evo: med("evo"), por };
  });
}
export function outliers(filas) {
  const s = filas.map((f) => f.hp_xp).sort((a, b) => a - b), med = s[Math.floor(s.length / 2)];
  return filas.filter((f) => f.ttk_med_nv5 > SUPO.TTK_OK_S || f.hp_xp > med * SUPO.HP_XP_RATIO).map((f) => ({ k: f.k, ttk_med_nv5: f.ttk_med_nv5, hp_xp: f.hp_xp, motivo: [f.ttk_med_nv5 > SUPO.TTK_OK_S && `TTK nv5 ${f.ttk_med_nv5.toFixed(1)}s > ${SUPO.TTK_OK_S}s`, f.hp_xp > med * SUPO.HP_XP_RATIO && `vida/XP ${f.hp_xp.toFixed(0)} > ${SUPO.HP_XP_RATIO}× mediana (${med.toFixed(0)})`].filter(Boolean).join("; ") }));
}

// ---------- CLI ----------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
  const zona = opt("--zona") ?? "patio", plaga = opt("--plaga") === "ninguna" ? null : opt("--plaga"), dur = Number(opt("--dur") ?? SUPO.DUR_S);
  if (!ZONAS[zona]) throw new Error(`zona desconocida: ${zona} (${Object.keys(ZONAS)})`);
  if (plaga && !PLAGAS[plaga]) throw new Error(`plaga desconocida: ${plaga} (${Object.keys(PLAGAS)})`);
  const sims = Object.fromEntries(Object.entries(BUILDS).map(([n, b]) => [n, simular(b, zona, plaga, dur)]));
  const kindsZona = tablaSpawn(1e4, ZONAS[zona].plague(plagueOf(plaga)), ZONAS[zona].luna).map(([k]) => k);
  const kinds = [...kindsZona, ...(kindsZona.includes("divisor") ? ["cria"] : [])];
  const tp5 = SUPO.MIN_REF * 60, ttk = ttkTabla(kinds, tp5), out = outliers(ttk);
  const variantes = [];
  for (const z of Object.keys(ZONAS)) for (const p of [null, ...Object.keys(PLAGAS)]) {
    if (z === "luna" && p) continue; // las plagas solo cambian la tabla del patio
    const f = simular(BUILDS.mixto, z, p, dur).filter((r) => r.minuto >= 1), pico = f.reduce((a, b) => (b.margen < a.margen ? b : a));
    variantes.push({ zona: z, plaga: p, margen_min: pico.margen, minuto_pico: pico.minuto });
  }
  if (args.includes("--json")) console.log(JSON.stringify({ supuestos: SUPO, dps_supuestos: SUP, zona, plaga, builds: BUILDS, minutos: sims, ttk: args.includes("--ttk") ? ttk : ttk.map(({ por, ...r }) => r), outliers: out, variantes }, null, 2));
  else {
    const f1 = (x, w = 6) => (Number.isFinite(x) ? x.toFixed(1) : "inf").padStart(w), f2 = (x, w = 5) => (Number.isFinite(x) ? x.toFixed(2) : "inf").padStart(w);
    console.log(`Oleadas analíticas — zona ${zona}${plaga ? ", plaga " + plaga : ""}, ${dur}s. Auto base ${AUTO_HP} HP. Supuestos: ${JSON.stringify(SUPO)}\n`);
    console.log("Enemigo         vida(0')  vida(5')  vel  ctto DPS  dist DPS  único  XP   ⚠");
    for (const k of kinds) { const a = ataque(k); console.log(`${k.padEnd(15)} ${f1(vidaEfectiva(k, 0), 8)}  ${f1(vidaEfectiva(k, 300), 8)} ${f1(EN[k].velocidad, 4)} ${f1(a.dpsContacto, 8)}  ${f1(a.dpsDist, 8)} ${f1(a.unico, 6)} ${f1(EN[k].xp, 4)}   ${AVISOS[k] ? "⚠ " + AVISOS[k] : ""}`); }
    for (const [n, fs] of Object.entries(sims)) {
      console.log(`\nBuild "${n}": cartas ${BUILDS[n].join(",")}`);
      console.log("min niv  DPS  HP/s  en/s  tope  margen(mín)  daño/s  auto(s)  composición (top 4)");
      for (const r of fs) {
        const top = [...r.comp].sort((a, b) => b.p - a.p).slice(0, 4).map((c) => `${c.k} ${(c.p * 100).toFixed(0)}%`).join(", ");
        console.log(`${String(r.minuto).padStart(2)}${r.margen < 1 ? "⚠" : " "} ${String(r.nivel).padStart(3)} ${f1(r.dps, 5)} ${f1(r.hps, 5)} ${f2(r.rate, 5)} ${f1(r.tope, 5)} ${f2(r.margen)} (${f2(r.margen_min)}) ${f1(r.dano_pot, 6)} ${f1(r.seg_auto, 7)}  ${top}`);
      }
    }
    console.log(`\nVariantes (build mixto, desde el minuto 1; el 0 es la apertura con Gomitas nv1): margen mínimo y minuto del pico`);
    for (const v of variantes) console.log(`  ${v.zona.padEnd(7)} ${(v.plaga ?? "ninguna").padEnd(18)} ${f2(v.margen_min)} @min ${v.minuto_pico}${v.margen_min < 1 ? "  ⚠" : ""}`);
    console.log(`\nTTK mediano de las ${armasConModelo().length} armas (stats 1.0, vida del minuto ${SUPO.MIN_REF}), nv1 / nv5 / evo:`);
    for (const r of ttk) console.log(`  ${r.k.padEnd(14)} vida ${f1(r.hp, 6)}  ${f1(r.ttk_med_nv1, 6)}s ${f1(r.ttk_med_nv5, 6)}s ${f1(r.ttk_med_evo, 6)}s  vida/XP ${f1(r.hp_xp, 5)}`);
    console.log("\nOutliers:"); for (const o of out) console.log(`  ⚠ ${o.k}: ${o.motivo}`); if (!out.length) console.log("  ninguno");
    console.log("\nSin modelar: jefes/minijefes, élites, formaciones, eventos de mitad de partida, pasivas y taller (BONUS_DMG_POR_NIVEL), embestida/ariete del auto (daño de choque: el margen real es mayor, sobre todo al inicio), movimiento del auto, coop. --ttk con --json agrega TTK por arma.");
  }
}
