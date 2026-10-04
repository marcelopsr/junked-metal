import { HALF } from "./world";

// Solo dev: bot de playtest. Juega sin trampas (sin god ni saltos de tiempo): orbita el patio
// esquivando macetas, se destraba con marcha atrás y elige mejoras (evolución > arma nueva > primera).
// Uso en consola (con ?mute): await __bot(60) → resumen. Correr en tandas: el tool del navegador corta a los ~40 s.
type W = { __info(): { time: number; state: string; level: number; hp: number; enemies: number; weapons: string[] }; __carObj(): { pos: { x: number; z: number }; root: { forward: { x: number; z: number } }; body: { getLinearVelocity(): { x: number; z: number } } } | null; __tick(n: number): void };

// Decisión de manejo del bot (la usan __bot y __sim): órbita amplia con turbo en rectas y destrabe.
// Con jefe: lo rodea a distancia de combate (las armas le pegan), sale de los aros rojos y de la línea de carga.
// Sin trampas: solo usa lo que una persona ve (telegráficos, el jefe en el aire, hacia dónde mira la cortadora).
let stuck = 0, back = 0;
export const resetBot = () => { stuck = back = 0; };
type P = { x: number; z: number };
export type BotBoss = { x: number; z: number; kind: string; fx: number; fz: number; charge: boolean; ram: boolean };
const ORBIT_R: Record<string, number> = { rey: 10, tarantula: 13, cortadora: 15, perro: 14, gato: 12, aspiradora: 6, cortacercos: 14 }; // aspiradora: de cerca, como la juega una persona (a 22 m las armas no llegan y el duelo dura ~85 s en vez de ~11 s)
export function botSteer(c: { pos: P; root: { forward: P }; body: { getLinearVelocity(): P } }, threats?: P[], obs?: { x: number; z: number; r: number }[], boss?: BotBoss | null, zones: { x: number; z: number; r: number }[] = [], gems: P[] = []) {
  const v = c.body.getLinearVelocity();
  stuck = Math.hypot(v.x, v.z) < 2 ? stuck + 1 : 0;
  if (stuck > 50) { back = 40; stuck = 0; }
  if (back > 0) { back--; return { throttle: -1, steer: 1, boost: false }; }
  const have = Math.atan2(c.root.forward.x, c.root.forward.z);
  let want = have, escaping = false;
  if (threats) {
    // Kiting: rumbo tangente a un círculo; sin jefe, radio 55 alrededor del centro; con jefe, alrededor de él
    const cl = (u: number) => Math.max(-(HALF - 22), Math.min(HALF - 22, u));
    const cx = boss ? boss.x : 0, cz = boss ? boss.z : 0, R = boss ? ORBIT_R[boss.kind] ?? 12 : 55;
    const ang = Math.atan2(c.pos.z - cz, c.pos.x - cx) + (boss ? 0.6 : 0.35);
    const orbit = boss?.ram ? Math.atan2(boss.x - c.pos.x, boss.z - c.pos.z) // Ariete: embestir de frente
      : Math.atan2(cl(cx + Math.cos(ang) * R) - c.pos.x, cl(cz + Math.sin(ang) * R) - c.pos.z); // punto de órbita siempre lejos del borde
    const inZone = zones.find((zn) => Math.hypot(c.pos.x - zn.x, c.pos.z - zn.z) < zn.r + 1.5);
    // Rodeado y frenado: turbo hacia el hueco (una persona no se queda empujando la horda)
    const crowd = threats.filter((e) => Math.hypot(e.x - c.pos.x, e.z - c.pos.z) < 5).length;
    escaping = !!inZone || !!boss?.charge || (crowd >= 3 && Math.hypot(v.x, v.z) < 8);
    // Solo cuentan los bichos a menos de 22 m (más lejos no suman a ningún término): se miden una vez, no 16 veces
    const near = threats.map((e) => { const ex = e.x - c.pos.x, ez = e.z - c.pos.z; return { ex, ez, d: Math.hypot(ex, ez) }; }).filter((t) => t.d < 22);
    // Gemas cerca (como una persona: desvía la órbita para juntar XP); sin jefe. Vector suma pesado por cercanía
    let gx = 0, gz = 0;
    if (!boss) for (const g of gems) { const ex = g.x - c.pos.x, ez = g.z - c.pos.z, d = Math.hypot(ex, ez); if (d > 1 && d < 30) { gx += ex / (d * d); gz += ez / (d * d); } }
    const gem = Math.hypot(gx, gz) > 0.02 ? Math.atan2(gx, gz) : null;
    let best = -Infinity;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
      let sc = Math.cos(a - have) * 1.2 + Math.cos(a - orbit) * 2.5;
      if (gem !== null) sc += Math.cos(a - gem) * 2;
      for (const { ex, ez, d } of near) { const dot = (ex * dx + ez * dz) / d; sc -= dot * (22 - d) / 6; if (d < 6 && dot > 0.6) sc -= 2.5; } // muro de bichos pegado: buscar el hueco
      for (const o of obs!) { for (const t of [4, 9]) { const px = c.pos.x + dx * t, pz = c.pos.z + dz * t; if (Math.hypot(px - o.x, pz - o.z) < o.r + 2) sc -= 12 / t; } }
      // Bordes del patio: acorralarse contra la pared es la muerte (la horda empuja y no hay salida)
      for (const [t, pen] of [[5, 30], [14, 10]]) { const fx = c.pos.x + dx * t, fz = c.pos.z + dz * t; if (Math.abs(fx) > HALF - 10 || Math.abs(fz) > HALF - 10) sc -= pen; }
      if (Math.abs(c.pos.x) > HALF - 25 || Math.abs(c.pos.z) > HALF - 25) sc -= (dx * Math.sign(c.pos.x) * +(Math.abs(c.pos.x) > HALF - 25) + dz * Math.sign(c.pos.z) * +(Math.abs(c.pos.z) > HALF - 25)) * 4; // cerca del borde: volver hacia adentro
      // Aros rojos y caídas de salto: no entrar, y si ya está adentro, salir por el lado más corto
      for (const zn of zones) for (const t of [3, 7, 12]) { const px = c.pos.x + dx * t, pz = c.pos.z + dz * t; if (Math.hypot(px - zn.x, pz - zn.z) < zn.r + 2) sc -= 30 / t; }
      if (inZone) { const ox = c.pos.x - inZone.x, oz = c.pos.z - inZone.z, od = Math.hypot(ox, oz) || 1; sc += ((ox * dx + oz * dz) / od) * 6; }
      if (boss && !boss.ram) {
        const bx = c.pos.x - boss.x, bz = c.pos.z - boss.z, bd = Math.hypot(bx, bz) || 1, R = ORBIT_R[boss.kind] ?? 12;
        // Nunca pegarse al jefe: tocarlo duele (y embestirlo rebota) salvo con Ariete
        if (bd < R + 4) sc += ((bx * dx + bz * dz) / bd) * (R + 4 - bd) * 0.8;
        // Cortadora: mientras apunta o carga, salir de su línea (moverse de costado respecto de su frente)
        if (boss.kind === "cortadora" && bd < 45) {
          sc += Math.abs(dx * boss.fz - dz * boss.fx) * (boss.charge ? 6 : 2.5);
          for (const t of [0, 4, 9]) { const px = bx + dx * t, pz = bz + dz * t, along = px * boss.fx + pz * boss.fz; if (along > -2 && Math.abs(px * boss.fz - pz * boss.fx) < 6) sc -= (boss.charge ? 24 : 8) / (t + 2); }
        }
      }
      if (sc > best) { best = sc; want = a; }
    }
  } else {
    const a = Math.atan2(c.pos.z, c.pos.x) + 0.4;
    want = Math.atan2(Math.cos(a) * 44 + 8 - c.pos.x, Math.sin(a) * 44 - 12 - c.pos.z);
  }
  const d = Math.atan2(Math.sin(want - have), Math.cos(want - have));
  return { throttle: 1, steer: Math.max(-1, Math.min(1, d * 3)), boost: escaping || (Math.abs(d) < 0.35 && (!!boss?.ram || Math.sin(c.pos.x * 0.3 + c.pos.z * 0.2) > 0.4)) };
}

export async function bot(secs: number) {
  const w = window as unknown as W;
  const key = (k: string, d: boolean) => dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { code: k }));
  const $ = (id: string) => document.getElementById(id)!;
  const t0 = w.__info().time, w0 = performance.now();
  let minHp = Infinity, stuck = 0, back = 0;
  while (w.__info().time - t0 < secs && w.__info().state !== "over" && performance.now() - w0 < 36000) {
    if (w.__info().state === "level") {
      const i = Math.max(0, [...document.querySelectorAll(".offer")].findIndex((o) => /evo|rara/.test(o.className)));
      key("Digit" + (i + 1), true); key("Digit" + (i + 1), false);
      await new Promise((r) => setTimeout(r, 420));
      continue;
    }
    const c = w.__carObj()!;
    const v = c.body.getLinearVelocity();
    stuck = Math.hypot(v.x, v.z) < 2 ? stuck + 4 : 0;
    if (stuck > 50) { back = 40; stuck = 0; }
    if (back > 0) { back -= 4; key("KeyW", false); key("KeyS", true); key("KeyD", true); key("KeyA", false); w.__tick(4); continue; }
    key("KeyS", false);
    const a = Math.atan2(c.pos.z, c.pos.x) + 0.4, tx = Math.cos(a) * 44 + 8, tz = Math.sin(a) * 44 - 12;
    const want = Math.atan2(tx - c.pos.x, tz - c.pos.z), have = Math.atan2(c.root.forward.x, c.root.forward.z);
    const d = Math.atan2(Math.sin(want - have), Math.cos(want - have));
    key("KeyW", true); key("KeyD", d > 0.1); key("KeyA", d < -0.1); key("Space", Math.abs(d) < 0.2 && Math.random() < 0.25);
    w.__tick(4);
    minHp = Math.min(minHp, w.__info().hp);
  }
  for (const k of ["KeyW", "KeyA", "KeyD", "KeyS", "Space"]) key(k, false);
  const i = w.__info();
  const boss = !$("bossbar").classList.contains("hidden") ? ` JEFE ${$("bossName").textContent} ${($("bossHp") as HTMLElement).style.width}` : "";
  return `${Math.floor(i.time / 60)}:${String(Math.floor(i.time % 60)).padStart(2, "0")} nv${i.level} hp${Math.round(i.hp)} (min ${Math.round(minHp)}) en${i.enemies} bajas ${$("kills").textContent} [${i.weapons.join(" ")}] ${i.state}${boss}${i.state === "over" ? " · " + $("overTitle").textContent + " " + $("overTxt").textContent : ""}`;
}
