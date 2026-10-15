import type { Kind } from "../../enemies";
import type { Think } from "./util";
import { robotAI } from "./robot";
import { escupidoraAI } from "./escupidora";
import { babosaAI, grilloAI, moscaAI } from "./chicos";
import { escarabajoAI } from "./escarabajo";
import { polillaAI } from "./polilla";
import { tarantulaAI } from "./tarantula";
import { aspiradoraAI } from "./aspiradora";
import { proyectorAI } from "./proyector";
import { gruaAI } from "./grua";
import { cortacercosAI } from "./cortacercos";
import { gatoAI } from "./gato";
import { payasoAI } from "./payaso";
import { limpiafondosAI } from "./limpiafondos";
import { perroAI } from "./perro";
import { cajaAI } from "./caja";
import { brincadorAI, escudoAI, francotiradorAI, kamikazeAI, ladronAI } from "./comunes";
import { falsoAI, munecoAI } from "./muneco";

// Comportamiento propio por bicho. Bicho nuevo = DEF + 1 archivo en ai/ + 1 línea acá. think() corre esto en el punto del flujo donde estaban los ifs.
export const AI: Partial<Record<Kind, Think>> = {
  robot: robotAI,
  cortadora: robotAI,
  cohete: robotAI,
  escupidora: escupidoraAI,
  mosca: moscaAI,
  grillo: grilloAI,
  babosa: babosaAI,
  escarabajo: escarabajoAI,
  polilla: polillaAI,
  tarantula: tarantulaAI,
  aspiradora: aspiradoraAI,
  proyector: proyectorAI,
  grua: gruaAI,
  cortacercos: cortacercosAI,
  gato: gatoAI,
  payaso: payasoAI,
  limpiafondos: limpiafondosAI,
  muneco: munecoAI,
  falso: falsoAI,
  perro: perroAI,
  caja: cajaAI,
  kamikaze: kamikazeAI,
  escudo: escudoAI,
  brincador: brincadorAI,
  francotirador: francotiradorAI,
  ladron: ladronAI,
  taladro: escarabajoAI, // embiste como el escarabajo (la lógica no depende del modelo)
  cangrejo: escudoAI, // blindado lento que gira despacio
};
