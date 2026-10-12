import type { Car } from "../car";
import type { Enemy } from "../enemies";
import * as B from "@babylonjs/core";
import { BAL } from "../balance";
import type { PassiveId, PStats } from "./passives";

export const W = BAL.armas, X = BAL.armasExtra, NMAX = BAL.ritmo.nivel_max; // balance.json: tablas armas y armas_extra; nivel máximo de armas y pasivas
export const _hitPt = new B.Vector3(); // centro de golpe de proyectil (evita Vector3 por par enemigo×disparo)
// Proyectiles (o saltos, clips...) de un arma según su nivel: base + piso((nivel - desde) / cada)
export const cant = (w: { n_base: number; n_cada: number; n_desde: number }, lv: number) => w.n_base + Math.floor((lv - w.n_desde) / w.n_cada);

// ---------- Armas ----------
export interface Ctx {
  scene: B.Scene;
  car: Car;
  enemies: Enemy[];
  dt: number;
  st: PStats;
  fs: number;
  damage(e: Enemy, dmg: number, knock?: B.Vector3): void;
  explode(pos: B.Vector3, r: number, dmg: number): void;
}

export type WeaponId = "gomitas" | "clips" | "chispero" | "petardos" | "tesla" | "lanza" | "agua" | "yoyo" | "bengalas" | "regla" | "helado" | "bocina" | "trompo" | "tuercas" | "bobinas" | "ventilador" | "canicas" | FusionId;
export type FusionId = "chispazo" | "globos" | "anillo" | "yoyoelec" | "vapor";
export const WEAPONS: Record<WeaponId, { name: string; desc: string; evo: PassiveId; evoName: string; evoDesc: string }> = {
  gomitas: { name: "Lanza-gomitas", desc: "Dispara gomitas al enemigo más cercano. Artillería de papelería", evo: "resorte", evoName: "Gomitas Saltarinas", evoDesc: "5 gomitas que rebotan entre enemigos. Culpa repartida" },
  clips: { name: "Clips orbitales", desc: "Clips que giran alrededor del auto. Burocracia en órbita", evo: "iman", evoName: "Tornado de Clips", evoDesc: "8 clips enormes en órbita amplia. Ya no es papeleo, es un expediente" },
  chispero: { name: "Chispero", desc: "Deja fuego al manejar. Responsabilidad civil no incluida", evo: "turbo", evoName: "Estela Infernal", evoDesc: "Fuego ancho, largo y devastador. El seguro del hogar ya no cubre" },
  petardos: { name: "Petardos", desc: "Lanza petardos que explotan en área. Sin permiso municipal", evo: "litio", evoName: "Bomba de Racimo", evoDesc: "Cada explosión suelta 4 más. Efecto dominó, versión barrio" },
  tesla: { name: "Antena Tesla", desc: "Rayo que salta entre enemigos. Networking, versión eléctrica", evo: "capacitor", evoName: "Tormenta Eléctrica", evoDesc: "Cadenas de 10, casi sin recarga. Contactos de sobra" },
  lanza: { name: "Lápiz-lanza", desc: "+35% daño al embestir por nivel. Resolver diferencias a golpes", evo: "lego", evoName: "Ariete", evoDesc: "Invulnerable con turbo; embestir genera onda expansiva. Sin consecuencias legales" },
  agua: { name: "Pistola de agua", desc: "Chorro en cono que empuja y frena a los enemigos. Hidratación forzosa", evo: "lupa", evoName: "Hidrolavadora", evoDesc: "Chorro ancho, largo y casi continuo que frena en seco. Lavado de imagen" },
  // Una pasiva puede evolucionar más de un arma: evoOffer busca por arma (WEAPONS[id].evo)
  yoyo: { name: "Yo-yo", desc: "Va y vuelve en línea atravesando enemigos; pega más fuerte a la vuelta, como un ex", evo: "resorte", evoName: "Doble yo-yo", evoDesc: "Dos yo-yos en órbita que salen y vuelven sin parar. Relación tóxica, pero funcional" },
  bengalas: { name: "Bengalas", desc: "Dejan zonas en llamas donde caen. Celebración sin motivo", evo: "litio", evoName: "Lluvia de bengalas", evoDesc: "Seis bengalas por tanda; zonas grandes y duraderas. Fiesta de fin de año" },
  regla: { name: "Bumerán de regla", desc: "Una regla escolar que vuela en arco y vuelve, atravesando todo. Disciplina a distancia", evo: "iman", evoName: "Bumerán triple", evoDesc: "Tres reglas en abanico, más largas y rápidas. Año escolar completo" },
  helado: { name: "Helado congelante", desc: "Bochas de helado que ralentizan a lo que tocan. Sin gluten, sin piedad", evo: "capacitor", evoName: "Cono triple", evoDesc: "Tres bochas en abanico que congelan y enfrían en área. Frialdad corporativa" },
  bocina: { name: "Bocina", desc: "Onda sonora en cono que empuja y aturde. Para quien toca bocina en el semáforo", evo: "turbo", evoName: "Sirena", evoDesc: "Onda circular enorme que aturde a todo lo cercano. Tráfico a las seis de la tarde" },
  trompo: { name: "Trompo", desc: "Un trompo que rebota entre enemigos dejando una estela cortante. Da vueltas sin resolver nada", evo: "iman", evoName: "Ciclón", evoDesc: "Dos trompos orbitan el auto y barren todo a su paso. Mucho movimiento, ningún progreso" },
  tuercas: { name: "Imán de tuercas", desc: "Tuercas en órbita que atraen a los bichos y salen disparadas, una por blanco. Ferretería con malas pulgas", evo: "lego", evoName: "Electroimán de grúa", evoDesc: `${W.tuercas.n_evo} tuercas que arrastran al doble de fuerza y salen a gran distancia. El chatarrero de turno` },
  bobinas: { name: "Bobinas", desc: "Suelta bobinas al avanzar; entre dos seguidas corre un arco que quema y frena. Cableado a la vista", evo: "litio", evoName: "Línea de alta tensión", evoDesc: `${W.bobinas.n_evo} bobinas más duraderas, unidas también de a dos en red. Prohibido tocar` },
  ventilador: { name: "Ventilador de mesa", desc: "Cono de viento que oscila hacia el bicho más cercano, lo empuja y lo despeina a golpes. Brisa con antecedentes", evo: "turbo", evoName: "Ventilador industrial", evoDesc: "Cono ancho y largo, empuje brutal. Sensación térmica: demolición" },
  canicas: { name: "Resortera de canicas", desc: "Canicas que rebotan en el borde del corral y entre los bichos. Juego de patio, reglas de pelea", evo: "resorte", evoName: "Lluvia de canicas", evoDesc: `${W.canicas.n_evo} canicas, más tiempo y más golpe. Se perdió la bolsa entera` },
  // Fusiones: nunca salen sueltas en las cartas (ver FUSIONS); evoName = nombre porque nacen evolucionadas
  chispazo: { name: "Petardos eléctricos", desc: "", evo: "capacitor", evoName: "Petardos eléctricos", evoDesc: "" },
  globos: { name: "Globos de agua", desc: "", evo: "resorte", evoName: "Globos de agua", evoDesc: "" },
  anillo: { name: "Anillo de fuego", desc: "", evo: "iman", evoName: "Anillo de fuego", evoDesc: "" },
  yoyoelec: { name: "Yo-yo eléctrico", desc: "", evo: "resorte", evoName: "Yo-yo eléctrico", evoDesc: "" },
  vapor: { name: "Vapor", desc: "", evo: "litio", evoName: "Vapor", evoDesc: "" },
};

// Fusiones: dos armas a nivel 5 (o evolucionadas) se combinan en una sola, que nace evolucionada y libera un lugar.
// La fusión conserva lo evolucionado de ambas y suma una sinergia (ver class Fusion).
export const FUSIONS: { id: FusionId; from: [WeaponId, WeaponId]; desc: string }[] = [
  { id: "chispazo", from: ["petardos", "tesla"], desc: "Racimo de petardos y tormenta eléctrica; cada explosión suelta un rayo en cadena. Fiesta con riesgo eléctrico" },
  { id: "globos", from: ["gomitas", "agua"], desc: "Gomitas saltarinas e hidrolavadora; cada gomita revienta y empapa en área. Cumpleaños infantil, versión bélica" },
  { id: "anillo", from: ["clips", "chispero"], desc: "Tornado de clips y estela infernal; los clips encendidos dejan fuego en su órbita. Compromiso eterno, con llamas" },
  { id: "yoyoelec", from: ["yoyo", "tesla"], desc: "Doble yo-yo y tormenta eléctrica; cada golpe del yo-yo suelta un rayo en cadena. Juguete con mala reputación" },
  { id: "vapor", from: ["bengalas", "agua"], desc: "Lluvia de bengalas e hidrolavadora; las zonas en llamas largan vapor que quema más, ocupa más y frena. Sauna con malas intenciones" },
];
export const isFusion = (id: WeaponId): id is FusionId => FUSIONS.some((f) => f.id === id);

export abstract class Weapon {
  lv = 1;
  evolved = false;
  cd = 0.5;
  cdMax = 1; // para el indicador circular del HUD
  mount?: B.Mesh; // pieza visible montada en el auto
  get cdFrac() { return Math.max(0, Math.min(1, this.cd / this.cdMax)); }
  constructor(public id: WeaponId) {}
  abstract update(c: Ctx): void;
  dispose() {}
  dano(cfg: { dano_base: number; dano_nivel: number }) { return cfg.dano_base + cfg.dano_nivel * this.lv; } // daño base por nivel (sin stats)
  recarga(cfg: { recarga_min: number; recarga_base: number; recarga_nivel: number }) { return Math.max(cfg.recarga_min, cfg.recarga_base - cfg.recarga_nivel * this.lv); }
}

export const nearest = (pos: B.Vector3, enemies: Enemy[], range: number, skip?: Set<Enemy>) => {
  let best: Enemy | null = null, bd = range;
  for (const e of enemies) { if (skip?.has(e)) continue; const d = B.Vector3.Distance(e.pos, pos); if (d < bd) { bd = d; best = e; } }
  return best;
};
