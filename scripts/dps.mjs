#!/usr/bin/env node
// DPS analítico por arma (sin simular): replica las fórmulas de src/weapons/*.ts con los números de src/balance.json.
// Uso: npm run dps [-- --json] [-- --recorte 30 --top 25% [--escribir]]
// Stats del auto en 1.0 (dmg, area, cooldown). Si cambia la fórmula de un arma, actualizar su modelo acá (test/dps.test.ts avisa).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ---------- Supuestos de encuentro (editables) ----------
export const SUP = {
  DENSIDAD: 0.04, // enemigos por m² alrededor del auto (horda media; 0.04 = 1 bicho cada 25 m²)
  R_ENEMIGO: 0.7, // radio promedio de un bicho (m); los chequeos de contacto suman e.radius
  VIDA: 30, // vida promedio de un bicho: overkill de dardos y tiempo de calentamiento de la lupa
  TOPE_BLANCOS: 15, // tope de bichos alcanzados por una misma área (el spawner no llena todo)
  VEL_AUTO: 12, // m/s del auto: armas que dejan cosas al andar (chispero, bobinas, chapitas, dominó, paraguas)
  FRAC_VEL_MAX: 0.6, // fracción de la velocidad máxima (órbita del avioncito)
  DIST_BLANCO: 8, // distancia típica al blanco (m): largo del bumerán
  FRAC_CHICOS: 0.85, // fracción de bichos "chicos" (imán de chatarra los aplasta ×3)
  ACIERTO: { dirigido: 0.85, no_dirigido: 0.6, area: 0.95, orbita: 1, instantaneo: 1, rastro: 1 },
};

const raw = JSON.parse(readFileSync(fileURLToPath(new URL("../src/balance.json", import.meta.url)), "utf8"));
export const NMAX = raw.ritmo.find((r) => r.id === "nivel_max").valor;
export const X = Object.fromEntries(raw.armas_extra.map((r) => [r.id, r.valor]));

// ---------- Fórmulas de weapons/base.ts ----------
export const dano = (w, lv) => w.dano_base + w.dano_nivel * lv;
export const recarga = (w, lv) => Math.max(w.recarga_min, w.recarga_base - w.recarga_nivel * lv);
export const cant = (w, lv) => w.n_base + Math.floor((lv - w.n_desde) / w.n_cada);
// recarga dividida (gomitas, helado): base / (1 + div·(lv-1)) / (evo ? evo_div : 1)
export const recDiv = (w, lv, ev) => w.recarga_base / (1 + w.recarga_div * (lv - 1)) / (ev ? w.recarga_evo_div : 1);
const cd = (w, lv, ev) => (ev ? w.recarga_evo : recarga(w, lv));
const area = (w, lv, ev) => (ev ? w.area_evo : w.area_base + w.area_nivel * lv);
const dur = (w, lv, ev) => (ev ? w.duracion_evo : w.duracion_base + w.duracion_nivel * lv);
const n = (w, lv, ev) => (ev ? w.n_evo : cant(w, lv));
const dm = (w, lv, ev) => dano(w, lv) * (ev ? w.dano_evo_mult : 1); // armas con dano_evo_mult
const df = (w, lv, ev) => (ev ? w.dano_evo_fijo : dano(w, lv)); // armas con dano_evo_fijo

// ---------- Geometría de encuentro ----------
const { PI } = Math;
const tope = (k) => Math.min(SUP.TOPE_BLANCOS, k);
export const blancos = (a) => tope(Math.max(1, a * SUP.DENSIDAD)); // el arma solo dispara si hay al menos un blanco
const enArea = (a) => tope(a * SUP.DENSIDAD); // zonas persistentes: puede no haber nadie
const circ = (r) => PI * r * r;
const cono = (half, R) => half * R * R; // sector de semiángulo half
const anillo = (r, ancho) => 2 * PI * r * ancho;
const RE = () => SUP.R_ENEMIGO;
// Órbita: cada bicho del anillo recibe golpes según las pasadas por segundo, con tope por la recarga de golpe por bicho
const orbita = (dmg, r, ancho, nObj, w, golpeS) => dmg * enArea(anillo(r, ancho)) * Math.min((nObj * w) / (2 * PI), 1 / golpeS);

// ---------- Modelos por arma: (cfg, lv, ev) => DPS. tipo = categoría de acierto; aviso = ⚠ con lo que se aproximó ----------
const A = () => SUP.ACIERTO;
export const MODELOS = {
  gomitas: { tipo: "dirigido", f: (w, lv, ev) => (dm(w, lv, ev) * n(w, lv, ev) * (ev ? 1 + X.gomitas_rebotes_evo : 1) * A().dirigido) / recDiv(w, lv, ev) },
  clips: { tipo: "orbita", f: (w, lv, ev) => { const sc = ev ? 2 : 1 + lv * 0.1; return orbita(df(w, lv, ev), area(w, lv, ev) , 2 * (RE() + 0.5 * sc), n(w, lv, ev), ev ? 5 : 3.5, X.clips_golpe_recarga_s); } },
  chispero: { tipo: "rastro", aviso: "solo mientras el auto anda > chispero_vel_min; asume VEL_AUTO y densidad uniforme sobre la estela",
    f: (w, lv, ev) => { const r = area(w, lv, ev) + RE() * 0.5, fuegos = dur(w, lv, ev) / X.chispero_intervalo_s, sol = Math.max(1, (2 * r) / (SUP.VEL_AUTO * X.chispero_intervalo_s)); return df(w, lv, ev) * enArea(2 * r * SUP.VEL_AUTO * dur(w, lv, ev)) * Math.min(sol, fuegos); } },
  petardos: { tipo: "area", f: (w, lv, ev) => { const r = area(w, lv, false) + RE(), d = dano(w, lv); let x = d * blancos(circ(r)); if (ev) x += X.petardos_racimo_n * d * X.petardos_racimo_dano * blancos(circ(r * X.petardos_racimo_radio)); return (x * cant(w, lv) * A().area) / recarga(w, lv); } },
  tesla: { tipo: "instantaneo", f: (w, lv, ev) => (dm(w, lv, ev) * Math.min(n(w, lv, ev), 1 + enArea(circ(X.tesla_salto_alcance)) * 0.5)) / cd(w, lv, ev) }, // ½: solo busca hacia adelante en la cadena
  lanza: { sinModelo: "depende de la embestida (main.ts: velocidad y masa del choque), no de una cadencia" },
  agua: { tipo: "area", aviso: "empuja y ralentiza: el empuje saca bichos del cono (sobrestima)",
    f: (w, lv, ev) => { const R = area(w, lv, ev), d = dur(w, lv, ev); return (dm(w, lv, ev) * (d / X.agua_pulso_s) * blancos(cono(ev ? X.agua_cono_evo : X.agua_cono, R + RE()))) / (d + cd(w, lv, ev)); } },
  yoyo: { tipo: "dirigido", aviso: "evolucionado: órbita de radio variable aproximada como anillo en el radio medio",
    f: (w, lv, ev) => {
      if (ev) return orbita(w.dano_evo_fijo * (1 + X.yoyo_vuelta_mult) / 2, X.yoyo_orbita_min + X.yoyo_orbita_amp / 2, 2 * (RE() + 0.9) + X.yoyo_orbita_amp, 2, 2.6, X.yoyo_orbita_golpe_s);
      const R = area(w, lv, ev), vuelo = R / w.velocidad + R / (w.velocidad * X.yoyo_vuelta_vel);
      return (dano(w, lv) * cant(w, lv) * blancos(R * 2 * (RE() + 0.7)) * (1 + X.yoyo_vuelta_mult) * A().dirigido) / (vuelo + recarga(w, lv));
    } },
  bengalas: { tipo: "area", f: (w, lv, ev) => (df(w, lv, ev) * blancos(circ(area(w, lv, ev) + RE() * 0.5)) * n(w, lv, ev) * dur(w, lv, ev) * A().area) / cd(w, lv, ev) },
  regla: { tipo: "dirigido", f: (w, lv, ev) => {
    const R = area(w, lv, ev), sc = ev ? X.regla_tamano_evo : 1, a = R / 2, b = 0.35 * R, per = PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    return (df(w, lv, ev) * n(w, lv, ev) * blancos(per * 2 * (RE() + 1.2 * sc)) * A().dirigido) / ((ev ? w.duracion_evo : w.duracion_base) + cd(w, lv, ev));
  } },
  helado: { tipo: "dirigido", aviso: "ralentiza (y evolucionado congela y enfría en área): control no contado",
    f: (w, lv, ev) => (dm(w, lv, ev) * n(w, lv, ev) * A().dirigido) / recDiv(w, lv, ev) },
  bocina: { tipo: "instantaneo", aviso: "empuje y aturdido (desde nivel 3) no contados",
    f: (w, lv, ev) => (dm(w, lv, ev) * blancos(ev ? circ(area(w, lv, ev) + RE()) : cono(Math.acos(X.bocina_cono), area(w, lv, ev) + RE()))) / cd(w, lv, ev) },
  trompo: { tipo: "dirigido", aviso: "rebote entre blancos a la distancia media entre vecinos; estela y órbita del Ciclón como contacto promedio",
    f: (w, lv, ev) => {
      const d = dm(w, lv, ev), discos = X.trompo_estela_vida_s / X.trompo_estela_cada_s;
      const estela = d * X.trompo_estela_mult * X.trompo_estela_golpes_s * enArea(circ(0.9 + RE())) * discos; // por trompo activo
      if (ev) { const contacto = orbita(d * X.trompo_evo_contacto_mult, w.area_evo, 2 * (1.1 + RE()), X.trompo_evo_cantidad, 3.2, 1 / X.trompo_evo_golpes_s) * Math.max(1, Math.floor((2 * (1.1 + RE())) / (w.area_evo * 3.2) * X.trompo_evo_golpes_s)); return contacto + estela * X.trompo_evo_cantidad; }
      const vida = dur(w, lv, ev), vecino = 0.5 / Math.sqrt(SUP.DENSIDAD), golpesS = w.velocidad / vecino;
      return ((d * golpesS + estela) * vida) / (vida + recarga(w, lv));
    } },
  tuercas: { tipo: "dirigido", aviso: "la atracción hacia el anillo (control) no se cuenta",
    f: (w, lv, ev) => { const R = ev ? w.alcance_evo : w.alcance; return (dm(w, lv, ev) * n(w, lv, ev) * blancos(R * 2 * (X.tuercas_golpe_radio + RE())) * A().dirigido) / (Math.max(X.tuercas_rearme_s, R / w.velocidad) + cd(w, lv, ev)); } },
  bobinas: { tipo: "rastro", aviso: "solo al andar; recorrido recto (la red evolucionada a dos saltos supera bobinas_seg_max y no suma)",
    f: (w, lv, ev) => { const vivas = Math.min(n(w, lv, ev), (dur(w, lv, ev) * SUP.VEL_AUTO) / X.bobinas_paso_m + 1), segs = Math.max(0, vivas - 1); return df(w, lv, ev) * enArea(segs * X.bobinas_paso_m * 2 * (area(w, lv, ev) + RE() * 0.5)); } },
  ventilador: { tipo: "area", aviso: "empuje continuo: los bichos salen del cono (sobrestima)",
    f: (w, lv, ev) => dm(w, lv, ev) * blancos(cono(ev ? X.ventilador_cono_evo : X.ventilador_cono, area(w, lv, ev) + RE())) },
  canicas: { tipo: "area", f: (w, lv, ev) => { const vivas = (n(w, lv, ev) * dur(w, lv, ev)) / cd(w, lv, ev), barrido = w.velocidad * 2 * (X.canicas_golpe_radio + RE()) * SUP.DENSIDAD; return dm(w, lv, ev) * Math.min(vivas, 40) * Math.min(barrido, enArea(circ(area(w, lv, ev))) / X.canicas_rearme_s); } },
  burbujas: { tipo: "dirigido", aviso: "atrapa (inmoviliza) al bicho: el control vale más que el daño; daño al reventar",
    f: (w, lv, ev) => { const d = dm(w, lv, ev); return ((d + (ev ? d * X.burbujas_salpica_dano * blancos(circ(X.burbujas_salpica + RE())) : 0)) * n(w, lv, ev) * A().dirigido) / cd(w, lv, ev); } },
  matamoscas: { tipo: "instantaneo", aviso: "aturde; ×aturdido_mult si el aturdido dura más que la recarga",
    f: (w, lv, ev) => { const R = area(w, lv, ev) + RE(), m = dur(w, lv, ev) >= cd(w, lv, ev) ? X.matamoscas_aturdido_mult : 1; return (dm(w, lv, ev) * m * blancos(ev ? circ(R) : cono(Math.acos(X.matamoscas_cono), R))) / cd(w, lv, ev); } },
  dardos: { tipo: "dirigido", aviso: "la explosión exige que el blanco sobreviva a los dardos previos (VIDA)",
    f: (w, lv, ev) => { const d = dm(w, lv, ev), need = ev ? X.dardos_pegados_evo : X.dardos_pegados, vive = d * (need - 1) < SUP.VIDA ? 1 : 0; return ((d + (vive * d * X.dardos_explosion_mult * blancos(circ(area(w, lv, ev) + RE()))) / need) * n(w, lv, ev) * A().dirigido) / cd(w, lv, ev); } },
  chapitas: { tipo: "rastro", aviso: "solo al andar; techo por pisotones (usos) de las chapitas soltadas",
    f: (w, lv, ev) => { const r = area(w, lv, ev) + RE() * 0.6, vivas = Math.min(n(w, lv, ev), (dur(w, lv, ev) * SUP.VEL_AUTO) / X.chapitas_paso_m), golpes = Math.min(enArea(vivas * circ(r)) / X.chapitas_golpe_recarga_s, (SUP.VEL_AUTO / X.chapitas_paso_m) * X.chapitas_usos); return dm(w, lv, ev) * golpes; } },
  paraguas: { tipo: "orbita", aviso: "empuja: cuenta solo los bichos que entran al andar (VEL_AUTO), un golpe cada uno",
    f: (w, lv, ev) => dm(w, lv, ev) * (ev ? 2 : 1) * 2 * (area(w, lv, ev) + RE() * 0.5) * SUP.VEL_AUTO * SUP.DENSIDAD },
  cohete: { tipo: "dirigido", f: (w, lv, ev) => (dm(w, lv, ev) * blancos(circ(area(w, lv, ev) + RE())) * n(w, lv, ev) * A().dirigido) / cd(w, lv, ev) },
  serpentinas: { tipo: "instantaneo", aviso: "ralentiza (evolucionada: inmoviliza): control no contado",
    f: (w, lv, ev) => (dm(w, lv, ev) * blancos((ev ? w.alcance_evo : w.alcance) * (area(w, lv, ev) + 2 * RE())) * n(w, lv, ev)) / cd(w, lv, ev) },
  tambor: { tipo: "instantaneo", aviso: "empuje del bombo (y aturdido evolucionado) no contados",
    f: (w, lv, ev) => { const R = area(w, lv, ev) + RE(), k = ev ? X.tambor_cada_evo : X.tambor_cada; return (dm(w, lv, ev) * ((k - 1) * blancos(circ(R)) + X.tambor_bombo_mult * blancos(circ(R * X.tambor_bombo_area))) / k) / cd(w, lv, ev); } },
  domino: { tipo: "rastro", aviso: "solo al andar; asume que cada ficha soltada termina tumbada por algún bicho",
    f: (w, lv, ev) => { const b = blancos(circ(area(w, lv, ev) + RE())); return (SUP.VEL_AUTO / X.domino_paso_m) * dm(w, lv, ev) * b * (ev ? 1 + X.domino_explosion_mult : 1); } },
  avioncito: { tipo: "orbita", f: (w, lv, ev) => {
    const R = area(w, lv, ev) * (1 + X.avion_vel_k * SUP.FRAC_VEL_MAX), nn = n(w, lv, ev), d = dm(w, lv, ev);
    return orbita(d, R, 2 * (1.1 + RE()), nn, w.velocidad, X.avion_golpe_s) + (ev ? (nn * d * X.avion_bomba_mult * enArea(circ(X.avion_bomba_radio + RE()))) / X.avion_bomba_s : 0);
  } },
  pintura: { tipo: "area", aviso: "pinta: los bichos pintados reciben ×pintura_vuln de TODA fuente (amplificador no contado) y se ralentizan",
    f: (w, lv, ev) => { const r = area(w, lv, ev), d = dano(w, lv) * (ev ? w.dano_evo_mult : 1), manchas = n(w, lv, ev) / cd(w, lv, ev); return manchas * (d * dur(w, lv, ev) * enArea(circ(r + RE() * 0.5)) + (ev ? d * X.pintura_explosion_mult * blancos(circ(r * 1.2 + RE())) : 0)); } },
  bumeran: { tipo: "dirigido", f: (w, lv, ev) => { const D = Math.min(w.alcance, SUP.DIST_BLANCO + 3); return (dm(w, lv, ev) * n(w, lv, ev) * 2 * blancos(D * 2 * (area(w, lv, ev) + RE()))) / (w.duracion_base + cd(w, lv, ev)); } },
  confeti: { tipo: "instantaneo", aviso: "empuje fuerte y aturdido: control no contado",
    f: (w, lv, ev) => (dm(w, lv, ev) * blancos(cono(Math.acos(X.confeti_cono), area(w, lv, ev) + RE()))) / cd(w, lv, ev) },
  lupasolar: { tipo: "instantaneo", aviso: "el calentamiento depende de cuánto vive el blanco (VIDA); sin bono de la luna",
    f: (w, lv, ev) => {
      const base = dano(w, lv), k = X.lupasolar_calor_k, hmax = X.lupasolar_calor_max_s;
      let t = 0, hp = SUP.VIDA; // integra hasta matar al blanco
      while (hp > 0 && t < 60) { const dt = 0.01; hp -= base * (1 + Math.min(t, hmax) * k) * dt; t += dt; }
      return (SUP.VIDA / t) * (ev ? w.n_evo : w.n_base);
    } },
  dron: { tipo: "dirigido", aviso: "solo dispara a bichos detrás del auto (asumido siempre hay uno)",
    f: (w, lv, ev) => (dm(w, lv, ev) * (ev ? w.n_evo : w.n_base) * A().dirigido) / cd(w, lv, ev) },
  lapices: { tipo: "rastro", f: (w, lv, ev) => {
    const r = area(w, lv, ev) + X.lapices_paso * 0.5 + RE() * 0.5, porTanda = n(w, lv, ev) * Math.floor(w.alcance / X.lapices_paso);
    const vivas = Math.min(X.lapices_trazos_max, (porTanda * dur(w, lv, ev)) / cd(w, lv, ev)), sol = (2 * r) / X.lapices_paso; // un bicho sobre la línea pisa ~sol trazos
    return dm(w, lv, ev) * enArea((vivas / sol) * circ(r)) * sol;
  } },
  jabon: { tipo: "dirigido", aviso: "ralentiza: control no contado; hijas limitadas por bichos a jabon_hija_alcance y jabon_tope",
    f: (w, lv, ev) => {
      const d = dm(w, lv, ev), r = area(w, lv, ev) + RE(), gens = ev ? X.jabon_cadena_evo : X.jabon_cadena, kids = ev ? X.jabon_hijas_evo : X.jabon_hijas;
      let hijas = 0, cap = Math.min(X.jabon_tope, enArea(circ(X.jabon_hija_alcance))) - 1;
      for (let g = 1; g <= gens; g++) { const k = Math.min(kids ** g, Math.max(0, cap)); hijas += k; cap -= k; }
      return ((d * blancos(circ(r)) + hijas * d * X.jabon_hija_mult * blancos(circ(r * X.jabon_hija_mult))) * n(w, lv, ev) * A().dirigido) / cd(w, lv, ev);
    } },
  teledirigido: { tipo: "dirigido", f: (w, lv, ev) => (n(w, lv, ev) * (ev ? X.tele_golpes_evo : X.tele_golpes) * dm(w, lv, ev) * (1 + (ev ? X.tele_explosion_mult * blancos(circ(X.tele_explosion_radio + RE())) : 0)) * A().dirigido) / cd(w, lv, ev) },
  imanchatarra: { tipo: "area", aviso: "arrastra bichos chicos al auto (control); asume el radio de aplastamiento lleno de lo atraído",
    f: (w, lv, ev) => (dm(w, lv, ev) * (SUP.FRAC_CHICOS * X.iman_aplasta_mult + 1 - SUP.FRAC_CHICOS) * blancos(circ((ev ? X.iman_aplasta_evo_radio : X.iman_aplasta_radio) + RE()))) / cd(w, lv, ev) },
};

// ---------- Cálculo ----------
export function calcular(armas = raw.armas) {
  return armas.map((w) => {
    const m = MODELOS[w.id];
    if (!m || m.sinModelo) return { id: w.id, nombre: w.nombre, sinModelo: m?.sinModelo ?? "sin modelo (arma nueva o desconocida)" };
    const niveles = Array.from({ length: NMAX }, (_, i) => m.f(w, i + 1, false));
    return { id: w.id, nombre: w.nombre, tipo: m.tipo, aviso: m.aviso, niveles, max: niveles[NMAX - 1], evo: m.f(w, NMAX, true), pendiente: (niveles[NMAX - 1] - niveles[0]) / (NMAX - 1) };
  });
}

// Nuevo dano_nivel que baja el DPS de nivel máximo un pct (dano_base fijo). Bisección: algunos modelos no son lineales (VIDA).
export function recorte(w, pct) {
  const m = MODELOS[w.id], antes = m.f(w, NMAX, false), meta = antes * (1 - pct / 100);
  const f = (dn) => m.f({ ...w, dano_nivel: dn }, NMAX, false);
  if (f(0) > meta) return { id: w.id, antes, despues: f(0), dano_nivel: 0, alcanzable: false, evoAntes: m.f(w, NMAX, true), evoDespues: m.f({ ...w, dano_nivel: 0 }, NMAX, true) };
  let lo = 0, hi = w.dano_nivel;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > meta) hi = mid; else lo = mid; }
  const dn = Math.round(((lo + hi) / 2) * 100) / 100, ww = { ...w, dano_nivel: dn };
  return { id: w.id, dano_nivel_antes: w.dano_nivel, dano_nivel: dn, antes, despues: f(dn), alcanzable: true, evoAntes: m.f(w, NMAX, true), evoDespues: m.f(ww, NMAX, true) };
}

// ---------- CLI ----------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
  const res = calcular(), ok = res.filter((r) => !r.sinModelo).sort((a, b) => b.max - a.max);
  const pct = opt("--recorte");
  let recs = null;
  if (pct) {
    const t = opt("--top") ?? "25%", N = t.endsWith("%") ? Math.ceil((ok.length * parseFloat(t)) / 100) : parseInt(t, 10);
    recs = ok.slice(0, N).map((r) => recorte(raw.armas.find((w) => w.id === r.id), parseFloat(pct)));
  }
  if (args.includes("--json")) console.log(JSON.stringify({ supuestos: SUP, nivel_max: NMAX, armas: res, recorte: recs }, null, 2));
  else {
    const f1 = (x) => x.toFixed(1).padStart(7);
    console.log(`Supuestos: ${JSON.stringify(SUP)}\nNivel máx ${NMAX}. DPS esperado por arma (stats 1.0).\n`);
    console.log("  # arma            tipo         nv1     nvMax   evo   pend/nv");
    ok.forEach((r, i) => console.log(`${String(i + 1).padStart(3)} ${(r.aviso ? "⚠ " : "  ") + r.id.padEnd(14)} ${r.tipo.padEnd(11)} ${f1(r.niveles[0])} ${f1(r.max)} ${f1(r.evo)} ${f1(r.pendiente)}`));
    console.log("\nRanking evolucionadas: " + [...ok].sort((a, b) => b.evo - a.evo).map((r, i) => `${i + 1}.${r.id} ${r.evo.toFixed(0)}`).join("  "));
    console.log("\n⚠ Aproximaciones:"); for (const r of ok) if (r.aviso) console.log(`  ${r.id}: ${r.aviso}`);
    console.log("\nSin modelo:"); for (const r of res) if (r.sinModelo) console.log(`  ${r.id}: ${r.sinModelo}`);
    if (recs) {
      console.log(`\nRecorte ${pct}% del DPS de nivel ${NMAX} (dano_base fijo; dano_evo_mult sin tocar):`);
      for (const r of recs) console.log(`  ${r.id.padEnd(14)} dano_nivel ${String(r.dano_nivel_antes ?? "-").padStart(5)} -> ${String(r.dano_nivel).padStart(5)}  DPS ${f1(r.antes)} -> ${f1(r.despues)}  evo ${f1(r.evoAntes)} -> ${f1(r.evoDespues)}${r.alcanzable ? "" : "  (no alcanzable con dano_base fijo)"}`);
    }
  }
  if (recs && args.includes("--escribir")) {
    const p = fileURLToPath(new URL("../src/balance.json", import.meta.url));
    let txt = readFileSync(p, "utf8");
    for (const r of recs) txt = txt.replace(new RegExp(`(\\{"id":"${r.id}","nombre"[^\\n]*?"dano_nivel":)[-\\d.]+`), `$1${r.dano_nivel}`);
    writeFileSync(p, txt);
    console.log("\nbalance.json actualizado.");
  }
}
