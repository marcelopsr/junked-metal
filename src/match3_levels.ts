// Campaña de Junket Crush: "La Ruta del Desguace". Solo datos: un nivel nuevo = un objeto más (ver LevelDef en match3_logic.ts).
// Piezas: 0 Tuerca, 1 Cristal, 2 Batería, 3 Chip, 4 Componente, 5 Resorte. Estrellas ajustadas con test/match3_balance.test.ts.
import type { LevelDef } from "./match3_logic";

const L8 = (rows: string[]) => rows;
const OPEN8 = L8(["........", "........", "........", "........", "........", "........", "........", "........"]);

export const LEVELS: LevelDef[] = [
  {
    id: "l1", name: "Primeras tuercas", zone: "Taller chico",
    desc: "El taller abre la persiana. Juntar piezas iguales para sumar puntos.",
    tip: "Intercambiar dos piezas vecinas para alinear 3 iguales.",
    layout: ["#......#", "........", "........", "........", "........", "........", "........", "#......#"],
    types: 4, moves: 18, goals: [{ k: "score", n: 1800 }], stars: [1800, 4000, 6000],
  },
  {
    id: "l2", name: "Chatarra en cadena", zone: "Taller chico",
    desc: "Lo que cae puede volver a juntarse solo. Cada cadena multiplica los puntos.",
    tip: "Las piezas nuevas caen desde arriba: si forman otra línea, la cadena sigue sola.",
    layout: OPEN8, types: 4, moves: 18, goals: [{ k: "piece", t: 0, n: 32 }], stars: [3000, 6500, 9000],
    reward: { martillo: 2 },
  },
  {
    id: "l3", name: "Cuatro son mejor", zone: "Montaña de chatarra",
    desc: "Cuatro en línea arman una sierra: barre su fila o su columna entera.",
    tip: "4 en fila horizontal = sierra que barre la fila. 4 en columna = sierra que barre la columna.",
    layout: ["........", "........", "........", "........", "11.1....", "..1.....", "........", "........"],
    types: 5, moves: 22, goals: [{ k: "piece", t: 1, n: 22 }, { k: "score", n: 3500 }], stars: [3500, 5000, 6500],
  },
  {
    id: "l4", name: "El taller desordenado", zone: "Montaña de chatarra",
    desc: "Cajas por todos lados. Se rompen juntando piezas al lado o con especiales.",
    tip: "Las cajas no caen: se rompen con una línea pegada a ellas. Las de fleje necesitan dos golpes.",
    layout: ["........", "........", "..cccc..", ".cC..Cc.", ".cC..Cc.", "..cccc..", "........", "........"],
    types: 5, moves: 22, goals: [{ k: "crate", n: 16 }], stars: [3200, 4500, 5600],
    tools: { martillo: 1 }, reward: { sierra: 1 },
  },
  {
    id: "l5", name: "Sobrecarga", zone: "Zona de clasificación",
    desc: "Cinco en línea arman un núcleo. Cambiarlo con una pieza borra todas las de su tipo.",
    tip: "5 en línea = núcleo. Cambiarlo con un especial = sobrecarga: todas de ese tipo se vuelven especiales.",
    layout: ["........", "........", "........", "........", "22.22...", "..2.....", "........", "........"],
    types: 4, moves: 17, goals: [{ k: "score", n: 6500 }], stars: [6500, 9500, 12500],
    reward: { iman: 1 },
  },
  {
    id: "l6", name: "El desguace", zone: "Zona de clasificación",
    desc: "El piso está oxidado. Limpiar cada casilla marcada rompiendo la pieza que tiene encima.",
    tip: "Las casillas con óxido se limpian al romper la pieza que está arriba. Las sierras limpian rápido.",
    layout: ["........", ".rr..rr.", ".rr..rr.", "...rr...", "...rr...", ".rr..rr.", ".rr..rr.", "........"],
    types: 5, moves: 22, goals: [{ k: "rust", n: 20 }], stars: [3600, 5200, 7000],
    tools: { sierra: 1 },
  },
  {
    id: "l7", name: "Reacción industrial", zone: "Fábrica oxidada",
    desc: "Líneas cruzadas: una L arma una bomba de chatarra, una T arma una prensa en cruz.",
    tip: "L = bomba (rompe un área de 3x3). T o + = prensa (barre fila y columna). Cambiar dos especiales los combina.",
    layout: ["........", "..ccc...", "..ccc...", "..3.....", "..3.....", "...33...", "..3.....", "........"],
    types: 5, moves: 20, goals: [{ k: "piece", t: 2, n: 24 }, { k: "piece", t: 3, n: 24 }, { k: "crate", n: 6 }], stars: [5200, 6500, 8000],
    tools: { iman: 1 }, reward: { llave: 2 },
  },
  {
    id: "l8", name: "Cargamento perdido", zone: "Depósito de maquinaria",
    desc: "Motores perdidos entre la chatarra. Hay que bajarlos hasta la cinta del fondo.",
    tip: "Los motores no se rompen: se bajan rompiendo lo que tienen debajo. La llave inglesa mueve sin gastar movimiento.",
    layout: ["..g..g..", "........", "##....##", "........", "........", ".#....#.", "........"],
    types: 5, moves: 30, goals: [{ k: "cargo", n: 3 }], stars: [4500, 6500, 8500],
    tools: { llave: 2 },
  },
  {
    id: "l9", name: "Fábrica en crisis", zone: "Planta de reciclaje",
    desc: "Cadenas, cajas y óxido a la vez. Elegir bien qué atacar primero.",
    tip: "Las piezas encadenadas no se mueven ni caen: liberarlas con una línea que las incluya o con un especial.",
    layout: ["k......k", ".rrkkrr.", ".r.cc.r.", "..cCCc..", "..cCCc..", ".r.cc.r.", ".rrkkrr.", "k......k"],
    types: 5, moves: 30, goals: [{ k: "chain", n: 8 }, { k: "crate", n: 12 }, { k: "rust", n: 12 }], stars: [6000, 8500, 12000],
    reward: { martillo: 2, sierra: 1 },
  },
  {
    id: "l10", name: "El Gran Aplastador", zone: "La trituradora", boss: true,
    desc: "La trituradora escupe chatarra cada pocos movimientos. Romperle las placas y rescatar los motores.",
    tip: "Cada 4 movimientos la trituradora tira una caja nueva. Combinar especiales es la forma de ganarle.",
    layout: ["..CCCC...", "..CCCC...", "...g.....", ".........", ".........", ".........", "#.......#", "..k...k..", "........."],
    types: 5, moves: 32, goals: [{ k: "crate", n: 14 }, { k: "cargo", n: 2 }, { k: "chain", n: 2 }], stars: [9000, 13000, 18000],
    tools: { martillo: 1, sierra: 1, iman: 1, llave: 1 }, hazard: { every: 4, crates: 1 },
  },
];
