import * as B from "@babylonjs/core";
import { BAL } from "../../balance";
import type { Enemy } from "../../enemies";

const ATK = BAL.ataques;
export const UP = B.Vector3.Up();
export const rot = (v: B.Vector3, a: number) => new B.Vector3(v.x * Math.cos(a) + v.z * Math.sin(a), 0, -v.x * Math.sin(a) + v.z * Math.cos(a));
export const DOG_RAM = { wind: ATK.perro_embestida_aviso_s, windRage: ATK.perro_embestida_aviso_furia_s, speed: ATK.perro_embestida_vel, len: ATK.perro_embestida_largo, width: ATK.perro_embestida_ancho, brake: ATK.perro_embestida_frenada_s };
/** Contexto de un cuadro de think(): lo de solo lectura + move/speed/turn, que la IA puede cambiar. */
export type Ctx = { dt: number; to: B.Vector3; dist: number; fwd: B.Vector3; diff: number; v: B.Vector3; target: B.Vector3; move: B.Vector3; speed: number; turn: number };
/** Devuelve un evento (string), true = think() retorna sin más, o nada = sigue con la lógica común. */
export type Think = (e: Enemy, c: Ctx) => string | boolean | void;
