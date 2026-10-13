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
  gems?: { m: B.InstancedMesh; pull: boolean }[]; // gemas sueltas en el piso (Drones gemelos las atraen)
  damage(e: Enemy, dmg: number, knock?: B.Vector3): void;
  explode(pos: B.Vector3, r: number, dmg: number): void;
}

export type WeaponId = "gomitas" | "clips" | "chispero" | "petardos" | "tesla" | "lanza" | "agua" | "yoyo" | "bengalas" | "regla" | "helado" | "bocina" | "trompo" | "tuercas" | "bobinas" | "ventilador" | "canicas" | "burbujas" | "matamoscas" | "dardos" | "chapitas" | "paraguas" | "cohete" | "serpentinas" | "tambor" | "domino" | "avioncito" | "pintura" | "bumeran" | "confeti" | "lupasolar" | "dron" | "lapices" | "jabon" | "teledirigido" | "imanchatarra" | FusionId;
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
  burbujas: { name: "Pistola de burbujas", desc: "Burbujas lentas que encierran a un bicho y lo dejan flotando, inmóvil, hasta que revientan. Tarde de cumpleaños con rehenes", evo: "lupa", evoName: "Pompas gigantes", evoDesc: "Cuatro burbujonas que encierran más tiempo y salpican al reventar. Se fue de las manos el jabón" },
  matamoscas: { name: "Matamoscas eléctrico", desc: "Golpe en arco al bicho más cercano: aturde y pega doble al que ya está aturdido. Raqueta de verano con enchufe", evo: "capacitor", evoName: "Matamoscas zapador", evoDesc: "Golpea en círculo completo, más lejos y aturde el doble. Plaga resuelta, fusibles no" },
  dardos: { name: "Lanzadardos de goma", desc: "Dardos de ventosa que quedan pegados; al tercero en el mismo bicho explotan todos juntos. Pelea de hermanos con consecuencias", evo: "litio", evoName: "Dardos de pila", evoDesc: "Dos dardos por tanda que explotan al segundo pegado, en un radio mayor. Las pilas venían de regalo" },
  chapitas: { name: "Trompo de chapitas", desc: "Va regando chapitas de gaseosa que lastiman y frenan a quien las pisa. Abrojos de kiosco", evo: "iman", evoName: "Campo de abrojos", evoDesc: "Catorce chapitas más grandes que duran el doble y cortan más. Basural con denominación de origen" },
  paraguas: { name: "Paraguas giratorio", desc: "Un paraguas gira delante del auto como escudo: golpea y empuja a todo lo que toca. Previsión de tormenta", evo: "lego", evoName: "Paraguas blindado", evoDesc: "Dos paraguas enormes, uno adelante y otro atrás. Ni un mal día se cuela" },
  cohete: { name: "Cohete de botella", desc: "Cohete lento que gira hacia el bicho más cercano y explota en área. Fiesta patria con riesgo de incendio", evo: "turbo", evoName: "Enjambre de botellas", evoDesc: "Cuatro cohetes por tanda, explosión más ancha. Queda botella para el brindis" },
  serpentinas: { name: "Serpentinas", desc: "Cinta en línea que ata y frena a todos los que cruza. Cumpleaños con rehenes en fila", evo: "resorte", evoName: "Cintas de fiesta", evoDesc: "Tres cintas en abanico, más anchas y largas; los atados quedan inmóviles. Confeti con cadena perpetua" },
  tambor: { name: "Tambor de hojalata", desc: "Onda de choque rítmica alrededor del auto; cada cuarto golpe es un bombo más fuerte que empuja. Ensayo a las siete de la mañana", evo: "lupa", evoName: "Banda de hojalata", evoDesc: "Ritmo más rápido, bombo cada tercer golpe y aturde. Los vecinos ya llamaron" },
  domino: { name: "Fichas de dominó", desc: "Deja fichas de pie detrás del auto; cuando un bicho toca una, caen todas en cadena y cada caída pega. Efecto dominó, versión plaga", evo: "paragolpes", evoName: "Fichas de metal", evoDesc: "Más fichas, más grandes, y cada una explota al caer. Efecto dominó con detonador" },
  avioncito: { name: "Avioncitos de papel", desc: "Planeadores de papel que orbitan ancho alrededor del auto cortando lo que cruzan; cuanto más rápido va el auto, más abierta es la órbita. Clase de manualidades, con filo", evo: "antena", evoName: "Escuadrilla de chapa", evoDesc: "Cinco aviones de chapa que además sueltan minibombas al volar. Fuerza aérea de oficina" },
  pintura: { name: "Lata de pintura", desc: "Rocía manchas en el piso: los bichos que las pisan van lentos y reciben más daño de todo. Retoque de último momento", evo: "bidon", evoName: "Pintura explosiva", evoDesc: "Manchas más grandes y duraderas que explotan al secarse. Secado rápido, muy rápido" },
  bumeran: { name: "Bumerán cazador", desc: "Se lanza contra el bicho más fuerte, lo atraviesa y vuelve, pegando a la ida y a la vuelta. Siempre regresa, como la deuda", evo: "llavero", evoName: "Bumeranes cruzados", evoDesc: "Dos bumeranes que se cruzan en el aire, más grandes y rápidos. Doble vuelta, doble reclamo" },
  confeti: { name: "Cañón de confeti", desc: "Ráfaga corta en cono con un empuje fuerte que deja aturdido a lo que alcanza. Cumpleaños con efectos secundarios", evo: "pila", evoName: "Confeti metálico", evoDesc: "Cono más largo, daño mucho mayor: el confeti ahora corta. Fiesta con papeleo de urgencias" },
  lupasolar: { name: "Lupa solar", desc: "Rayo continuo sobre el bicho más cercano: cuanto más tiempo se sostiene, más quema. En la luna, del lado del sol, pega el doble. Travesura de patio, a escala industrial", evo: "llamas", evoName: "Lupa triple", evoDesc: "El rayo se reparte en tres blancos a la vez, con más alcance. Sol para todos" },
  dron: { name: "Mini dron", desc: "Un dron que acompaña al auto y dispara a los bichos que quedan atrás. Vigilancia aérea de bajo presupuesto", evo: "cinta", evoName: "Drones gemelos", evoDesc: "Dos drones que disparan más rápido y además atraen gemas. Logística en el aire" },
  lapices: { name: "Lápices de colores", desc: "Ráfaga de lápices en abanico que dejan trazos de color en el piso; quien los pisa se lastima. Arte contemporáneo con filo", evo: "resorte", evoName: "Estuche de colores", evoDesc: `${W.lapices.n_evo} lápices por ráfaga, trazos anchos que duran el doble y pegan más fuerte. La caja de 36, sin devolución` },
  jabon: { name: "Pistola de jabón", desc: "Burbujas que al tocar un bicho revientan, lo ralentizan y sueltan hijas que revientan en cadena contra los demás. Tarde de lavado, con efecto dominó", evo: "litio", evoName: "Espuma desatada", evoDesc: `${W.jabon.n_evo} burbujas más grandes que ralentizan más, con cadenas de ${X.jabon_cadena_evo} generaciones. Sin enjuague posible` },
  teledirigido: { name: "Avión teledirigido", desc: "Avión de papel guiado por control remoto: persigue al bicho más fuerte a su alcance, lo atraviesa y sigue con el siguiente. Aeromodelismo con objetivos", evo: "antena", evoName: "Escuadrilla guiada", evoDesc: `${W.teledirigido.n_evo} aviones de chapa más veloces; cada impacto explota en área. Torre de control sin torre` },
  imanchatarra: { name: "Imán de chatarra", desc: "Arrastra hacia el auto a los bichos chicos y las gemas sueltas, y cada tanto da un pulso que aplasta. Los grandes solo reciben el golpe. Taller de desguace móvil", evo: "capacitor", evoName: "Electroimán de desguace", evoDesc: "Atrae desde más lejos, pulsa más rápido y aplasta en un círculo más ancho. Prensa hidráulica incluida" },
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
