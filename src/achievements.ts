import { BAL } from "./balance";

// Logros: se otorgan en partida (main.ts: grant) y se guardan en save.ach. Solo datos: solo importa balance.json, nada que cree ciclos.
// scrap = tornillos de premio (una sola vez). reward = desbloqueable que regala (part:<ranura>:<opción> se agrega a save.unlocked; pilot:<id> lo resuelve pilots.ts).
export const ACH = {
  gana_buggy: { name: "Buggy campeón", txt: "Gana una partida con el Buggy", reward: "part:decal:numero" },
  gana_monster: { name: "Pisotón final", txt: "Gana una partida con el Monster Truck", reward: "part:exhaust:chimenea" },
  gana_formula: { name: "Vuelta rápida", txt: "Gana una partida con el Fórmula", reward: "part:wing:alto" },
  gana_tanque: { name: "Blindaje total", txt: "Gana una partida con el Tanque de juguete", reward: "part:exhaust:doble" },
  gana_carrera: { name: "Cuerda infinita", txt: "Gana una partida con el Autito a fricción", reward: "part:decal:damero" },
  gana_axel: { name: "Rueda libre", txt: "Gana una partida con Axel", reward: "part:lamp:ambar" },
  gana_helado: { name: "Reparto exitoso", txt: "Gana una partida con el Camión de helados", reward: "part:lamp:violeta" },
  gana_combi: { name: "Viaje largo", txt: "Gana una partida con la Combi", reward: "part:wing:doble" },
  rey: { name: "Regicidio", txt: "Derrota al Escarabajo Rey", reward: "pilot:dino" },
  cortadora: { name: "Pasto largo", txt: "Derrota a la Cortadora de césped", reward: "pilot:dino" },
  tarantula: { name: "Sin telarañas", txt: "Derrota a la Tarántula", reward: "pilot:dino" },
  gato: { name: "Siete vidas", txt: "Derrota a Eulalio el michu", scrap: BAL.ritmo.logro_gato_tornillos },
  chispazo: { name: "Cortocircuito", txt: "Fusiona Petardos y Antena Tesla", reward: "part:lamp:cian" },
  globos: { name: "Guerra de agua", txt: "Fusiona Lanza-gomitas y Pistola de agua", reward: "part:lamp:ambar" },
  anillo: { name: "Anillo de fuego", txt: "Fusiona Clips orbitales y Chispero", reward: "part:wing:doble" },
  racha: { name: "Picadora", txt: "Encadena una racha de 100 bajas", reward: "part:decal:rayo" },
  intacto: { name: "Ni un rayón", txt: "Pasa 60 s sin recibir daño desde el minuto 5", reward: "part:lamp:violeta" },
  diez: { name: "Hasta el amanecer", txt: "Sobrevive 10 minutos", reward: "pilot:figura" },
  diario: { name: "Rutina diaria", txt: "Gana un desafío diario", scrap: BAL.ritmo.logro_diario_tornillos },
} as const satisfies Record<string, { name: string; txt: string; reward?: string; scrap?: number }>;
export type AchId = keyof typeof ACH;
