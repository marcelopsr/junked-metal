import { BAL } from "./balance";

// Logros: se otorgan en partida (main.ts: grant) y se guardan en save.ach. Solo datos: solo importa balance.json, nada que cree ciclos.
// scrap = tornillos de premio (una sola vez). reward = desbloqueable que regala (part:<ranura>:<opción> se agrega a save.unlocked; pilot:<id> lo resuelve pilots.ts).
export const ACH = {
  gana_buggy: { name: "Custodia compartida", txt: "Gana una partida con El Divorciado", reward: "part:decal:numero" },
  gana_monster: { name: "Crisis cuarentona", txt: "Gana una partida con El Loco Cuarentón", reward: "part:exhaust:chimenea" },
  gana_formula: { name: "Llegó a tiempo", txt: "Gana una partida con El Apurado", reward: "part:wing:alto" },
  gana_tanque: { name: "Cena familiar superada", txt: "Gana una partida con El Suegro", reward: "part:exhaust:doble" },
  gana_carrera: { name: "Sin póliza, sin problemas", txt: "Gana una partida con El Sin Seguro", reward: "part:decal:damero" },
  gana_axel: { name: "Licencia en trámite", txt: "Gana una partida con El Sin Licencia", reward: "part:lamp:ambar" },
  gana_helado: { name: "Entrega sin devoluciones", txt: "Gana una partida con El Tío del Helado", reward: "part:lamp:violeta" },
  gana_combi: { name: "Viaje sin explicaciones", txt: "Gana una partida con El Tío Raro", reward: "part:wing:doble" },
  rey: { name: "Golpe de Estado", txt: "Derrota al Escarabajo Rey y disuelve la monarquía", reward: "pilot:dino" },
  cortadora: { name: "Cortada por lo sano", txt: "Derrota a la Cortadora de césped. Domingos tranquilos", reward: "part:tires:todoterreno" },
  tarantula: { name: "Desalojo exitoso", txt: "Derrota a la Tarántula, inquilina sin contrato", reward: "part:bumper:cano" },
  gato: { name: "Le quedaban seis", txt: "Derrota a Eulalio el michu. Dormirá igual", scrap: BAL.ritmo.logro_gato_tornillos },
  chispazo: { name: "Cortocircuito", txt: "Fusiona Petardos y Antena Tesla. Prohibido en edificios", reward: "part:lamp:cian" },
  globos: { name: "Cumpleaños fuera de control", txt: "Fusiona Lanza-gomitas y Pistola de agua", reward: "part:acc:pelotita" },
  anillo: { name: "Compromiso en llamas", txt: "Fusiona Clips orbitales y Chispero", reward: "part:tires:rayos" },
  racha: { name: "Productividad récord", txt: "Encadena una racha de 100 bajas", reward: "part:decal:rayo" },
  intacto: { name: "Sin siniestros", txt: "Pasa 60 s sin recibir daño desde el minuto 5", reward: "part:bumper:antivuelco" },
  diez: { name: "Jornada completa", txt: "Sobrevive 10 minutos, sin horas extra", reward: "pilot:figura" },
  diario: { name: "Atrapado en la rutina", txt: "Gana un desafío diario", scrap: BAL.ritmo.logro_diario_tornillos },
} as const satisfies Record<string, { name: string; txt: string; reward?: string; scrap?: number }>;
export type AchId = keyof typeof ACH;
