// Solo dev: bot de playtest. Juega sin trampas (sin god ni saltos de tiempo): orbita el patio
// esquivando macetas, se destraba con marcha atrás y elige mejoras (evolución > arma nueva > primera).
// Uso en consola (con ?mute): await __bot(60) → resumen. Correr en tandas: el tool del navegador corta a los ~40 s.
type W = { __info(): { time: number; state: string; level: number; hp: number; enemies: number; weapons: string[] }; __carObj(): { pos: { x: number; z: number }; root: { forward: { x: number; z: number } }; body: { getLinearVelocity(): { x: number; z: number } } } | null; __tick(n: number): void };

// Decisión de manejo del bot (la usan __bot y __sim): órbita amplia con turbo en rectas y destrabe.
let stuck = 0, back = 0;
export const resetBot = () => { stuck = back = 0; };
type P = { x: number; z: number };
export function botSteer(c: { pos: P; root: { forward: P }; body: { getLinearVelocity(): P } }, threats?: P[], obs?: { x: number; z: number; r: number }[]) {
  const v = c.body.getLinearVelocity();
  stuck = Math.hypot(v.x, v.z) < 2 ? stuck + 1 : 0;
  if (stuck > 50) { back = 40; stuck = 0; }
  if (back > 0) { back--; return { throttle: -1, steer: 1, boost: false }; }
  const have = Math.atan2(c.root.forward.x, c.root.forward.z);
  let want = have;
  if (threats) {
    // Evalúa 12 rumbos: lejos de la horda, sin obstáculos ni bordes, preferir seguir derecho
    // Kiting: preferir el rumbo tangente a un círculo amplio (radio 55) alrededor del centro
    const ang = Math.atan2(c.pos.z, c.pos.x) + 0.35, orbit = Math.atan2(Math.cos(ang) * 55 - c.pos.x, Math.sin(ang) * 55 - c.pos.z);
    let best = -Infinity;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
      let sc = Math.cos(a - have) * 1.2 + Math.cos(a - orbit) * 2.5;
      for (const e of threats) { const ex = e.x - c.pos.x, ez = e.z - c.pos.z, d = Math.hypot(ex, ez); if (d < 22) sc -= ((ex * dx + ez * dz) / d) * (22 - d) / 6; }
      for (const o of obs!) { for (const t of [4, 9]) { const px = c.pos.x + dx * t, pz = c.pos.z + dz * t; if (Math.hypot(px - o.x, pz - o.z) < o.r + 2) sc -= 12 / t; } }
      const fx = c.pos.x + dx * 14, fz = c.pos.z + dz * 14;
      if (Math.abs(fx) > 88 || Math.abs(fz) > 88) sc -= 8;
      if (sc > best) { best = sc; want = a; }
    }
  } else {
    const a = Math.atan2(c.pos.z, c.pos.x) + 0.4;
    want = Math.atan2(Math.cos(a) * 44 + 8 - c.pos.x, Math.sin(a) * 44 - 12 - c.pos.z);
  }
  const d = Math.atan2(Math.sin(want - have), Math.cos(want - have));
  return { throttle: 1, steer: Math.max(-1, Math.min(1, d * 3)), boost: Math.abs(d) < 0.2 && Math.sin(c.pos.x * 0.3 + c.pos.z * 0.2) > 0.4 };
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
