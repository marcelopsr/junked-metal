import { banner, damageNumber, hudArrows, hudBoss, hudSlots, hudUpdate, initHud, pickOffer, selectOffer, showOffers, uiTick } from "./ui";
import * as B from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import havokWasm from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { Car, CARS, drive } from "./car";
import { DEF, Enemy, pickWeighted, spawnTable, type Kind } from "./enemies";
import { engineSfx, engineStop, initAudio, SFX, toggleMute } from "./sfx";
import { clearFx, debris, FX, initFx, mark, tickFx } from "./fx";
import { input, isTouch, padPressed, pollInput, setupTouch } from "./input";
import { cyl, initModels, PAINTS, RIMS, sph, template, type CarKind } from "./models";
import { M, pbr, setQuality, setupRender, shadows, type Quality } from "./render";
import { evoOffer, levelOffers, makeWeapon, mountFor, passiveStats, type Ctx, type Offer, type PassiveId, type PStats, type Weapon, type WeaponId } from "./weapons";
import { buildWorld, HALF, hitBreakables, setWind, spawnPoint } from "./world";

const $ = (id: string) => document.getElementById(id)!;
const RUN_BOSSES: [number, Kind][] = [[180, "rey"], [360, "cortadora"], [540, "perro"]];

// ---------- Guardado ----------
type Save = { scrap: number; best: number; perm: { hp: number; dmg: number; spd: number; mag: number }; cars: CarKind[]; car: CarKind; quality: Quality; paint: string; rim: string };
const DEFAULT: Save = { scrap: 0, best: 0, perm: { hp: 0, dmg: 0, spd: 0, mag: 0 }, cars: ["buggy"], car: "buggy", quality: "auto", paint: "", rim: "" };
const save: Save = (() => {
  try { const s = JSON.parse(localStorage.getItem("rcfight2") ?? "{}"); return { ...DEFAULT, ...s, perm: { ...DEFAULT.perm, ...s.perm } }; }
  catch { return structuredClone(DEFAULT); }
})();
const persist = () => { try { localStorage.setItem("rcfight2", JSON.stringify(save)); } catch { /* sin storage */ } };

// ---------- Motor (WebGL2 por defecto, WebGPU con ?webgpu) ----------
const canvas = $("c") as HTMLCanvasElement;
const low = isTouch;
let engine: B.AbstractEngine;
if (location.search.includes("webgpu") && (await B.WebGPUEngine.IsSupportedAsync)) {
  const gpu = new B.WebGPUEngine(canvas, { antialias: true, stencil: true });
  await gpu.initAsync();
  engine = gpu;
} else engine = new B.Engine(canvas, true, { stencil: true }, true);
const scene = new B.Scene(engine);
scene.enablePhysics(new B.Vector3(0, -25, 0), new B.HavokPlugin(true, await HavokPhysics({ locateFile: () => havokWasm })));
scene.skipPointerMovePicking = true;

const cam = new B.FreeCamera("cam", new B.Vector3(0, 30, -40), scene);
cam.fov = 0.85;
cam.minZ = 0.3;
cam.maxZ = 1500;

setupRender(scene, cam, low);
initModels(scene);
initFx(scene, low);
buildWorld(scene, low);
setQuality(save.quality);
if (isTouch) setupTouch();
initHud();

// ---------- Estado de la partida ----------
type Gem = { m: B.InstancedMesh; xp: number; pull: boolean };
type Pickup = { m: B.Mesh; type: "pila" | "iman" | "cofre" };
type Spit = { m: B.InstancedMesh; v: B.Vector3; life: number };

let state: "menu" | "play" | "level" | "pause" | "over" = "menu";
let car: Car | null = null;
let weapons: Weapon[] = [];
let passives: Partial<Record<PassiveId, number>> = {};
let st: PStats = passiveStats({}, save.perm);
let hp = 100, maxHp = 100, boost = 100;
let xp = 0, level = 1, pendingLevels = 0;
let time = 0, kills = 0, runScrap = 0;
let enemies: Enemy[] = [];
let gems: Gem[] = [];
let pickups: Pickup[] = [];
let spits: Spit[] = [];
const spitTpl = () => template("spit", () => [sph(0.55, pbr("acid", { color: "#b5e61d", rough: 0.1, emissive: "#6b8f00", alpha: 0.9 }), [0, 0, 0])]);
let spawnAcc = 0, swarmT = 60, chestT = 100, ballT = 75, bossIdx = 0;
let shake = 0, camYaw = 0, dustT = 0;
let ball: { m: B.Mesh; agg: B.PhysicsAggregate; life: number } | null = null;
let offers: Offer[] = [];
let offerSel = 0;

const xpNeed = (l: number) => Math.floor(4 + l * 2.5 + l * l * 0.3);

let hitStop = 0, smokeT = 0, skidT = 0, lastHpFrac = 1, smashCd = 0;

// Macetas rotas sueltan tuercas y a veces una pila
const smashed = (pots: B.Vector3[]) => { for (const p of pots) { SFX.break(); dropGems(p, 8); if (Math.random() < 0.35) dropPickup(p, "pila"); shake = Math.max(shake, 0.5); } };

// ---------- Plantillas de recolectables ----------
const gemTpl = (v: 1 | 5 | 20) => template("gem" + v, () => [
  cyl(0.5, 0.5, 0.22, M.metal(v === 1 ? "#cbd5e1" : v === 5 ? "#facc15" : "#38bdf8"), [0, 0.3, 0], [0.4, 0, 0], 6),
  cyl(0.22, 0.22, 0.24, M.matte("#1e293b"), [0, 0.3, 0], [0.4, 0, 0], 6),
], v === 20 ? 1.5 : 1);

function dropGems(pos: B.Vector3, amount: number) {
  if (gems.length > 350) { gainXp(amount); return; } // tope: se absorbe directo
  while (amount > 0) {
    const v: 1 | 5 | 20 = amount >= 20 ? 20 : amount >= 5 ? 5 : 1;
    amount -= v;
    const m = gemTpl(v).createInstance("gem");
    m.position.set(pos.x + (Math.random() - 0.5) * 1.5, 0, pos.z + (Math.random() - 0.5) * 1.5);
    gems.push({ m, xp: v, pull: false });
  }
}

function dropPickup(pos: B.Vector3, type: Pickup["type"]) {
  let m: B.Mesh;
  if (type === "pila") m = cyl(0.8, 0.8, 1.6, M.plastic("#22c55e"), [pos.x, 0.8, pos.z], [0, 0, Math.PI / 2], 12);
  else if (type === "iman") m = sph(1.2, M.plastic("#ef4444"), [pos.x, 0.8, pos.z]);
  else {
    m = cyl(2.2, 2.2, 1.6, M.metal("#d4a017"), [pos.x, 0.8, pos.z], undefined, 6);
    const beam = cyl(1.4, 1.4, 60, pbr("beam", { color: "#fde68a", emissive: "#fbbf24", alpha: 0.25 }), [0, 30, 0], undefined, 8);
    beam.parent = m;
  }
  shadows.addShadowCaster(m);
  pickups.push({ m, type });
}

// ---------- Flujo ----------
function recompute() {
  st = passiveStats(passives, save.perm);
  const newMax = car!.def.hp + st.maxHp;
  hp += Math.max(0, newMax - maxHp);
  maxHp = newMax;
  car!.setMass(car!.def.mass * st.mass);
  // Cada arma se ve montada en el auto y crece con el nivel
  for (const w of weapons) {
    if (!w.mount) { w.mount = mountFor(w.id, car!); shadows.addShadowCaster(w.mount); }
    w.mount.scaling.setAll(1 + (w.lv - 1) * 0.06 + (w.evolved ? 0.25 : 0));
  }
}

// Vista previa en las cartas: la pieza aparece montada en el auto mientras la mirás
let preview: B.Mesh | null = null;
function previewOffer(i: number) {
  preview?.dispose();
  preview = null;
  const o = offers[i];
  if (!car || !o || (o.kind !== "weapon" && o.kind !== "evo")) return;
  const owned = weapons.find((w) => w.id === o.id);
  if (!owned) preview = mountFor(o.id as WeaponId, car);
  else if (owned.mount) owned.mount.scaling.setAll(1.25 + (o.kind === "evo" ? 0.2 : 0));
}

function clearRun() {
  for (const e of enemies) e.dispose();
  for (const w of weapons) w.dispose();
  for (const g of gems) g.m.dispose();
  for (const p of pickups) p.m.dispose();
  for (const s of spits) s.m.dispose();
  spits = [];
  if (ball) { ball.agg.dispose(); ball.m.dispose(); ball = null; }
  preview?.dispose();
  preview = null;
  enemies = []; weapons = []; gems = []; pickups = [];
  clearFx();
  car?.dispose();
  car = null;
}

function startRun() {
  initAudio();
  clearRun();
  car = new Car(scene, save.car, save.paint || undefined, save.rim || undefined);
  lastHpFrac = 1;
  passives = {};
  weapons = [makeWeapon("gomitas")];
  maxHp = car.def.hp;
  recompute();
  hp = maxHp; boost = 100;
  xp = 0; level = 1; pendingLevels = 0;
  time = 0; kills = 0; runScrap = 0;
  spawnAcc = 0; swarmT = 60; chestT = 100; ballT = 75; bossIdx = 0;
  camYaw = 0;
  state = "play";
  scene.physicsEnabled = true;
  for (const id of ["menu", "over", "levelup"]) $(id).classList.add("hidden");
  $("hud").classList.remove("hidden");
  hudBoss(null);
  banner("SOBREVIVÍ");
}

function endRun(win: boolean, why: string) {
  state = "over";
  engineStop();
  runScrap += Math.floor(time / 20) + Math.floor(kills / 25);
  save.scrap += runScrap;
  save.best = Math.max(save.best, Math.floor(time));
  persist();
  $("overTitle").textContent = win ? "¡VICTORIA!" : "FIN DE LA PARTIDA";
  $("overTxt").innerHTML = `${why}<br>${fmt(time)} · Nivel ${level} · ${kills} enemigos · +${runScrap} chatarra`;
  $("over").classList.remove("hidden");
  $("hud").classList.add("hidden");
}

function toMenu() {
  engineStop();
  $("pause").classList.add("hidden");
  clearRun();
  state = "menu";
  scene.physicsEnabled = true;
  $("over").classList.add("hidden");
  $("menu").classList.remove("hidden");
  renderMenu();
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------- Nivel / cofre ----------
function gainXp(n: number) {
  xp += n;
  while (xp >= xpNeed(level)) { xp -= xpNeed(level); level++; pendingLevels++; }
}

function openOffers(list: Offer[], title: string) {
  state = "level";
  scene.physicsEnabled = false;
  offers = list;
  offerSel = 0;
  SFX.levelUp();
  engineStop();
  showOffers(title, list, 0, choose, previewOffer);
}

function choose(i: number) {
  if (state !== "level") return;
  preview?.dispose();
  preview = null;
  const o = offers[i];
  if (o.kind === "weapon") {
    const w = weapons.find((x) => x.id === o.id);
    if (w) w.lv++; else weapons.push(makeWeapon(o.id as WeaponId));
  } else if (o.kind === "passive") passives[o.id as PassiveId] = o.lv!;
  else if (o.kind === "evo") { weapons.find((x) => x.id === o.id)!.evolved = true; banner(o.title.toUpperCase()); }
  else hp = Math.min(maxHp, hp + 40);
  recompute();
  state = "play";
  scene.physicsEnabled = true;
}

function openChest() {
  const evo = evoOffer(weapons, passives);
  openOffers(evo ? [evo] : levelOffers(weapons, passives, 3), evo ? "Cofre · Evolución" : "Cofre");
}

function togglePause() {
  if (state === "play") { state = "pause"; scene.physicsEnabled = false; engineStop(); $("pause").classList.remove("hidden"); }
  else if (state === "pause") { state = "play"; scene.physicsEnabled = true; $("pause").classList.add("hidden"); }
}
$("resume").onclick = togglePause;
$("quit").onclick = toMenu;

addEventListener("keydown", (e) => {
  if (e.code === "Escape" || e.code === "KeyP") togglePause();
  if (e.code === "KeyM") $("muted").classList.toggle("hidden", !toggleMute());
  if (state === "level" && /^Digit[1-3]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < offers.length) pickOffer(i); }
  if (e.code === "Enter") { if (state === "menu") startRun(); else if (state === "over") toMenu(); else if (state === "level") pickOffer(offerSel); }
});

// ---------- Menú ----------
const SHOP: { k: keyof Save["perm"]; name: string }[] = [
  { k: "hp", name: "+10 vida" }, { k: "dmg", name: "+10% daño" }, { k: "spd", name: "+4% velocidad" }, { k: "mag", name: "+10% imán" },
];
const shopCost = (l: number) => 15 * (l + 1);
function renderMenu() {
  $("bank").textContent = `· ${save.scrap} tornillos · récord ${fmt(save.best)}`;
  $("cars").innerHTML = (Object.keys(CARS) as CarKind[]).map((k) => {
    const c = CARS[k], own = save.cars.includes(k);
    const bar = (v: number, max: number) => `<i style="width:${(v / max) * 100}%"></i>`;
    return `<div class="carc ${save.car === k ? "sel" : ""} ${own ? "" : "locked"}" data-k="${k}"><b>${c.name}</b>${c.desc}<div class="st"><span>Carrocería</span>${bar(c.hp, 150)}<span>Velocidad</span>${bar(c.speed, 19)}<span>Embestida</span>${bar(c.ram, 4.5)}</div>${own ? "" : `<div class="price">Bloqueado · ${c.cost} tornillos</div>`}</div>`;
  }).join("");
  $("shop").innerHTML = SHOP.map((s) => {
    const l = save.perm[s.k], cost = shopCost(l);
    return `<button data-k="${s.k}" ${save.scrap < cost || l >= 5 ? "disabled" : ""}>${s.name} (${l}/5) — ${l >= 5 ? "MAX" : cost}</button>`;
  }).join("");
  ($("quality") as HTMLSelectElement).value = save.quality;
  const cur = save.paint || PAINTS[0], rim = save.rim || RIMS[0];
  $("paint").innerHTML = `<span>Pintura</span>${PAINTS.map((c) => `<button class="sw ${c === cur ? "on" : ""}" data-paint="${c}" style="background:${c}"></button>`).join("")}`
    + `<span>Llantas</span>${RIMS.map((c) => `<button class="sw rim ${c === rim ? "on" : ""}" data-rim="${c}" style="background:${c}"></button>`).join("")}`;
}
$("cars").addEventListener("click", (e) => {
  const k = ((e.target as HTMLElement).closest(".carc") as HTMLElement | null)?.dataset.k as CarKind | undefined;
  if (!k) return;
  if (!save.cars.includes(k)) {
    if (save.scrap < CARS[k].cost) return;
    save.scrap -= CARS[k].cost;
    save.cars.push(k);
  }
  save.car = k;
  persist();
  renderMenu();
});
$("shop").addEventListener("click", (e) => {
  const k = (e.target as HTMLElement).dataset.k as keyof Save["perm"] | undefined;
  if (!k) return;
  const cost = shopCost(save.perm[k]);
  if (save.scrap < cost || save.perm[k] >= 5) return;
  save.scrap -= cost;
  save.perm[k]++;
  persist();
  renderMenu();
});
$("quality").addEventListener("change", (e) => {
  save.quality = (e.target as HTMLSelectElement).value as Quality;
  setQuality(save.quality);
  persist();
});
$("paint").addEventListener("click", (e) => {
  const d = (e.target as HTMLElement).dataset;
  if (d.paint) save.paint = d.paint;
  else if (d.rim) save.rim = d.rim;
  else return;
  persist();
  renderMenu();
});
$("play").onclick = startRun;
$("again").onclick = toMenu;
renderMenu();

// ---------- Combate ----------
const toScreen = (p: B.Vector3) => B.Vector3.Project(p, B.Matrix.IdentityReadOnly, scene.getTransformMatrix(), cam.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
function damage(e: Enemy, dmg: number, knock?: B.Vector3, crit = false) {
  e.hp -= dmg;
  if (dmg >= 4) SFX.hit();
  if (dmg >= 5) {
    const sp = toScreen(e.pos.add(new B.Vector3(0, e.def.size[1] + 0.3, 0)));
    const k = innerWidth / engine.getRenderWidth();
    if (sp.z < 1) damageNumber(sp.x * k, sp.y * k, dmg, crit);
  }
  if (dmg >= 60 || e.def.boss && dmg >= 20) hitStop = Math.max(hitStop, crit ? 0.07 : 0.035);
  if (dmg >= 4 && Math.random() < 0.5) FX.hit(e.pos.add(new B.Vector3(0, 0.6, 0)));
  if (knock && !e.def.boss) e.body.applyImpulse(knock.scale(e.def.mass), e.pos);
}

function explode(pos: B.Vector3, r: number, dmg: number) {
  FX.explosion(pos.add(new B.Vector3(0, 0.5, 0)), r);
  SFX.explosion();
  mark("scorch", pos.x, pos.z, Math.random() * 6, r * 0.55, 14);
  smashed(hitBreakables(pos, r, dmg));
  shake = Math.max(shake, 0.25);
  for (const e of enemies) {
    const d = B.Vector3.Distance(e.pos, pos);
    if (d < r + e.radius) damage(e, dmg, e.pos.subtract(pos).normalize().addInPlace(new B.Vector3(0, 0.6, 0)).scale(6));
  }
}

function kill(e: Enemy) {
  kills++;
  SFX.kill();
  FX.death(e.pos.add(new B.Vector3(0, 0.5, 0)), e.def.boss);
  debris(e.pos, e.def.color, e.def.boss ? 30 : e.kind === "hormiga" ? 4 : 7, e.def.boss ? 14 : 6, e.def.scale ?? (e.def.boss ? 3 : 1));
  if (e.def.xp) dropGems(e.pos, e.def.xp);
  if (e.def.boss) {
    shake = 1.5;
    runScrap += 25;
    if (e.kind === "perro") { e.dispose(); return endRun(true, "¡Derrotaste al Perro!"); }
    dropPickup(e.pos, "cofre");
    hudBoss(null);
  } else {
    const r = Math.random();
    if (r < 0.012) dropPickup(e.pos, "pila");
    else if (r < 0.016) dropPickup(e.pos, "iman");
  }
  e.dispose();
}

function spawnEnemy(kind: Kind, p: B.Vector3) {
  enemies.push(new Enemy(kind, p, 1 + time / 100));
}

// ---------- Update ----------
function update(dt: number) {
  const c = car!;
  time += dt;

  // --- Manejo ---
  let throttle = input.throttle, steer = input.steer;
  if (input.move) {
    // Dirección relativa a la cámara: el auto gira solo hacia donde apunta el stick
    const f = new B.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw)), r = new B.Vector3(f.z, 0, -f.x);
    const want = r.scale(input.moveX).addInPlace(f.scale(input.moveY));
    const fwd = c.root.forward.clone(); fwd.y = 0; fwd.normalize();
    const diff = Math.atan2(B.Vector3.Cross(fwd, want).y, B.Vector3.Dot(fwd, want.normalizeToNew()));
    steer = B.Scalar.Clamp(diff * 2.5, -1, 1);
    throttle = Math.min(1, want.length());
  }
  const ariete = weapons.some((w) => w.id === "lanza" && w.evolved);
  const boosting = input.boost && boost > 3 && throttle >= 0;
  boost = boosting ? boost - 40 * dt : Math.min(100, boost + st.boostRegen * dt);
  const maxSpeed = c.def.speed * st.speedMul * (boosting ? 1.55 : 1);
  const r = drive(c.body, c.root, dt, {
    throttle: boosting ? 1 : throttle, steer, speed: maxSpeed,
    accel: c.def.accel * (boosting ? 1.8 : 1),
    turn: c.def.turn * (input.drift ? 1.4 : 1),
    grip: input.drift ? 1.3 : c.def.grip,
  });
  c.animate(dt, steer, r.fs, maxSpeed);
  engineSfx(Math.min(1, Math.abs(r.fs) / (c.def.speed * 1.55)), throttle, boosting);
  lastKmh = r.fs * 3.6; lastMaxKmh = c.def.speed * st.speedMul * 1.55 * 3.6;
  // Marcas de neumático al derrapar / patinar
  if (r.grounded && (Math.abs(r.ls) > 3.5 || (input.drift && Math.abs(r.fs) > 5)) && (skidT -= dt) <= 0) {
    skidT = 0.025;
    const yaw = Math.atan2(c.root.forward.x, c.root.forward.z);
    for (const w of c.model.wheels) if (!w.front) { const p = w.m.getAbsolutePosition(); mark("skid", p.x, p.z, yaw, 1, 7); }
  }
  // Daño visible: humo con media vida, humo negro y chispas con poca
  if (hp < maxHp * 0.5 && (smokeT -= dt) <= 0) {
    smokeT = hp < maxHp * 0.25 ? 0.06 : 0.14;
    const p = c.pos.add(new B.Vector3(0, 0.6, 0)).addInPlace(c.root.forward.scale(0.6));
    FX.smoke(p, hp < maxHp * 0.25);
    if (hp < maxHp * 0.25 && Math.random() < 0.3) FX.sparks(p);
  }
  if ((dustT -= dt) <= 0 && r.grounded && (Math.abs(r.ls) > 3 || boosting)) { dustT = 0.05; FX.dust(c.pos.add(c.root.forward.scale(-1.1))); }
  // Embestir objetos del patio los rompe
  const spd = Math.abs(r.fs);
  if (spd > 9 && (smashCd -= dt) <= 0) { const pots = hitBreakables(c.pos, 1.3, spd * c.def.ram * 1.5); if (pots.length) smashCd = 0.3; smashed(pots); }
  if (Math.abs(c.pos.x) > HALF + 5 || Math.abs(c.pos.z) > HALF + 5 || c.pos.y < -5) hp = 0;

  // --- Aparición de enemigos ---
  const maxAlive = Math.min(low ? 110 : 180, 25 + time / 2.2);
  // Aparecen sesgados hacia donde vas: manejar no es escapar gratis
  const cvel = c.body.getLinearVelocity();
  const ahead = c.pos.add(new B.Vector3(cvel.x, 0, cvel.z).scale(1.6));
  spawnAcc += (1 + time / 20) * dt;
  const normals = enemies.filter((e) => !e.def.boss).length;
  while (spawnAcc >= 1) { spawnAcc--; if (normals < maxAlive) spawnEnemy(pickWeighted(spawnTable(time)), spawnPoint(ahead, 24, 36)); }
  if ((swarmT -= dt) <= 0) {
    swarmT = 60;
    banner("ENJAMBRE", 1.4);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const p = new B.Vector3(c.pos.x + Math.cos(a) * 22, 1, c.pos.z + Math.sin(a) * 22); if (Math.abs(p.x) < HALF - 3 && Math.abs(p.z) < HALF - 3) spawnEnemy("hormiga", p); }
  }
  if (bossIdx < RUN_BOSSES.length && time >= RUN_BOSSES[bossIdx][0]) {
    const kind = RUN_BOSSES[bossIdx++][1];
    spawnEnemy(kind, spawnPoint(c.pos, 30, 36));
    banner(DEF[kind].name, 2.5);
    hudBoss(DEF[kind].name, 1);
    SFX.boss();
  }

  // --- Enemigos ---
  const cv = c.body.getLinearVelocity();
  const carR = Math.max(c.def.size[0], c.def.size[2]) / 2;
  let contactDps = 0;
  for (const e of enemies) {
    const ev = e.update(dt, c.pos);
    if (ev === "spit") {
      // Apunta adonde vas a estar (predicción simple): esquivar = cambiar de rumbo
      const cvl = c.body.getLinearVelocity(), from = e.pos.add(new B.Vector3(0, 0.6, 0));
      const t = B.Vector3.Distance(from, c.pos) / 16, aim = c.pos.add(new B.Vector3(cvl.x, 0, cvl.z).scale(t * 0.8));
      const m = spitTpl().createInstance("sp");
      m.position.copyFrom(from);
      spits.push({ m, v: aim.subtract(from).normalize().scale(16), life: 2.2 });
    }
    e.animate(dt);
    if (ev === "slam") {
      FX.slam(e.pos, 10);
      mark("scorch", e.pos.x, e.pos.z, 0, 7, 10);
      shake = 1.2;
      if (B.Vector3.Distance(e.pos, c.pos) < 11) hurt(35);
      for (const o of enemies) if (o !== e && B.Vector3.Distance(o.pos, e.pos) < 10) damage(o, 999);
    }
    const dist = Math.hypot(e.pos.x - c.pos.x, e.pos.z - c.pos.z);
    if (!e.def.boss && dist > 75) { e.hp = -1e9; continue; } // muy lejos: se recicla
    if (e.kind === "cortadora") for (const o of enemies) if (o !== e && !o.def.boss && B.Vector3.Distance(o.pos, e.pos) < e.radius + 0.5) damage(o, 999); // corta todo
    if (dist < e.radius + carR && c.pos.y - e.pos.y < e.def.size[1] + 0.5) {
      const dir = new B.Vector3(e.pos.x - c.pos.x, 0, e.pos.z - c.pos.z).normalize();
      const rel = B.Vector3.Dot(cv, dir); // solo cuenta TU velocidad hacia el enemigo
      if (rel > 5 && e.ramCd <= 0) {
        const lanza = weapons.find((w) => w.id === "lanza");
        const dmg = rel * c.def.ram * (1 + 0.35 * (lanza?.lv ?? 0)) * (boosting ? 1.3 : 1) * st.dmg * (lanza?.evolved ? 1.5 : 1);
        damage(e, dmg, dir.scale(rel * 0.8).addInPlace(new B.Vector3(0, rel * 0.2, 0)), true);
        FX.sparks(e.pos.add(new B.Vector3(0, 0.5, 0)));
        SFX.ram(rel);
        e.ramCd = 0.3;
        shake = Math.max(shake, 0.25);
        if (ariete) explode(e.pos, 4, dmg * 0.5);
        // Embestir algo más pesado que vos tiene costo: rebote y daño (salvo Ariete)
        if (e.def.mass > c.def.mass * st.mass * 1.8 && !ariete) {
          hurt(e.def.dmg * 0.6);
          c.body.applyImpulse(dir.scale(-rel * 0.9 * c.def.mass).addInPlace(new B.Vector3(0, 1.5, 0)), c.pos);
        }
      } else if (rel <= 5 && !(ariete && boosting)) contactDps += e.def.dmg;
    }
  }
  if (contactDps) { hurt(contactDps * dt, true); SFX.hurt(); }
  for (const e of enemies.filter((x) => x.hp <= 0)) {
    enemies.splice(enemies.indexOf(e), 1);
    if (e.hp < -1e8) e.dispose(); else kill(e);
    if (state !== "play") return;
  }
  const boss = enemies.find((e) => e.def.boss);
  if (boss) hudBoss(boss.def.name, Math.max(0, boss.hp / boss.maxHp));

  // --- Ácido de escupidoras ---
  for (let i = spits.length - 1; i >= 0; i--) {
    const s = spits[i];
    s.m.position.addInPlace(s.v.scale(dt));
    s.v.y -= 3 * dt;
    let dead = (s.life -= dt) <= 0 || s.m.position.y < 0.1;
    if (B.Vector3.Distance(s.m.position, c.pos) < carR + 0.3) { hurt(10); FX.hit(s.m.position); dead = true; }
    if (dead) { mark("scorch", s.m.position.x, s.m.position.z, Math.random() * 6, 0.6, 5); s.m.dispose(); spits.splice(i, 1); }
  }

  // --- Armas ---
  const ctx: Ctx = { scene, car: c, enemies, dt, st, fs: r.fs, damage, explode };
  for (const w of weapons) w.update(ctx);

  // --- Recolección ---
  const mag2 = st.magnet * st.magnet;
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const dx = c.pos.x - g.m.position.x, dz = c.pos.z - g.m.position.z, d2 = dx * dx + dz * dz;
    if (d2 < mag2) g.pull = true;
    g.m.rotation.y += dt * 2;
    if (g.pull) { const d = Math.sqrt(d2), sp = Math.min(d, (18 + 20 / (d + 0.5)) * dt); g.m.position.x += (dx / d) * sp; g.m.position.z += (dz / d) * sp; }
    if (d2 < 1.2) { gainXp(g.xp); SFX.gem(); if (g.xp > 1) FX.xp(g.m.position); g.m.dispose(); gems.splice(i, 1); }
  }
  for (const p of [...pickups]) {
    p.m.rotation.y += dt * 2;
    if (B.Vector3.Distance(p.m.position, c.pos) < 2.2) {
      SFX.pickup();
      if (p.type === "pila") hp = Math.min(maxHp, hp + 30);
      else if (p.type === "iman") for (const g of gems) g.pull = true;
      else openChest();
      p.m.dispose();
      pickups.splice(pickups.indexOf(p), 1);
      if (state !== "play") return;
    }
  }

  // --- Eventos del patio ---
  if ((chestT -= dt) <= 0) { chestT = 120; dropPickup(spawnPoint(c.pos, 20, 35), "cofre"); banner("COFRE EN EL PATIO", 1.6); }
  if ((ballT -= dt) <= 0 && !ball) {
    // Una pelota gigante cruza el patio aplastando todo
    ballT = 80;
    const from = spawnPoint(c.pos, 40, 45);
    const m = sph(8, pbr("bigball", { color: "#f97316", rough: 0.45 }), [from.x, 4, from.z], undefined, 16);
    shadows.addShadowCaster(m);
    const agg = new B.PhysicsAggregate(m, B.PhysicsShapeType.SPHERE, { mass: 30, restitution: 0.5 }, scene);
    agg.body.setLinearVelocity(c.pos.subtract(from).normalize().scale(26));
    ball = { m, agg, life: 7 };
    banner("¡PELOTA!", 1.2);
  }
  if (ball) {
    for (const e of enemies) if (!e.def.boss && B.Vector3.Distance(e.pos, ball.m.position) < 4 + e.radius) damage(e, 999);
    if (B.Vector3.Distance(c.pos, ball.m.position) < 4 + carR) hurt(20);
    if ((ball.life -= dt) <= 0) { ball.agg.dispose(); ball.m.dispose(); ball = null; }
  }

  hp = Math.min(maxHp, hp + st.regen * dt);
  if (hp <= 0) return endRun(false, "Tu auto quedó destrozado.");
  if (pendingLevels > 0 && state === "play") { pendingLevels--; openOffers(levelOffers(weapons, passives, 3), `Nivel ${level - pendingLevels}`); }
}

function hurt(n: number, continuous = false) {
  hp -= n * (1 - st.armor);
  if (!continuous) shake = Math.max(shake, 0.5);
}

let hudT = 0, lastKmh = 0, lastMaxKmh = 80;
function updateHud(dt: number) {
  hudSlots(weapons.map((w) => ({ id: w.id, lv: w.lv, evolved: w.evolved, cd: w.cdFrac })), (Object.entries(passives) as [PassiveId, number][]).map(([id, lv]) => ({ id, lv })));
  // Flechas hacia jefes y cofres fuera de pantalla
  const W = engine.getRenderWidth(), H = engine.getRenderHeight(), k = innerWidth / W, out: { x: number; y: number; kind: "jefe" | "cofre" }[] = [];
  const targets: [B.Vector3, "jefe" | "cofre"][] = [...enemies.filter((e) => e.def.boss).map((e) => [e.pos, "jefe"] as [B.Vector3, "jefe"]), ...pickups.filter((p) => p.type === "cofre").map((p) => [p.m.position, "cofre"] as [B.Vector3, "cofre"])];
  for (const [p, kind] of targets) {
    const sp = toScreen(p);
    let x = sp.x, y = sp.y;
    if (sp.z > 1) { x = W - x; y = H; } // detrás de la cámara
    if (sp.z > 1 || x < 0 || x > W || y < 0 || y > H) out.push({ x: x * k, y: y * k, kind });
  }
  hudArrows(out);
  if ((hudT -= dt) > 0) return;
  hudT = 0.05;
  // Daño visible: pintura gastada y piezas que saltan al cruzar 50% y 25%
  const frac = Math.max(0, hp / maxHp);
  car!.wear(frac);
  for (const t of [0.5, 0.25]) if (lastHpFrac > t && frac <= t) { debris(car!.pos, save.paint || "#d62828", 8, 7, 0.8); FX.sparks(car!.pos); shake = Math.max(shake, 0.6); }
  lastHpFrac = frac;
  hudUpdate({ hp, maxHp, boost, xp, need: xpNeed(level), level, time, kills, kmh: lastKmh, maxKmh: lastMaxKmh });
}

// ---------- Loop ----------
const camTarget = new B.Vector3();
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  pollInput();

  if (state === "level") {
    if (padPressed(14)) { offerSel = (offerSel + offers.length - 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(15)) { offerSel = (offerSel + 1) % offers.length; selectOffer(offerSel); }
    if (padPressed(0)) pickOffer(offerSel);
  } else if ((state === "menu" || state === "over") && padPressed(9)) state === "menu" ? startRun() : toMenu();
  else if ((state === "play" || state === "pause") && padPressed(9)) togglePause();

  if (state === "play") {
    // Hit-stop: congela el mundo un par de cuadros en los golpes fuertes
    if (hitStop > 0) { hitStop -= dt; scene.physicsEnabled = false; }
    else { scene.physicsEnabled = true; update(dt); }
    updateHud(dt);
  }
  tickFx(dt);
  uiTick(dt);

  // Cámara 3/4 elevada. Con teclado sigue el rumbo del auto; con stick queda fija
  // (si rotara, la dirección del stick cambiaría mientras girás).
  const k = 1 - Math.exp(-5 * dt);
  setWind(performance.now() / 1000, car?.pos ?? null);
  if (car) {
    if (!input.move && state === "play") {
      const f = car.root.forward;
      const target = Math.atan2(f.x, f.z);
      camYaw += Math.atan2(Math.sin(target - camYaw), Math.cos(target - camYaw)) * (1 - Math.exp(-2 * dt));
    }
    // Al elegir mejoras la cámara se acerca y gira a 3/4 frontal para ver la pieza montada
    const close = state === "level";
    const yaw = close ? camYaw + 2.5 : camYaw;
    const back = new B.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const want = car.pos.subtract(back.scale(close ? 5.5 : 15)).addInPlace(new B.Vector3(0, close ? 3.2 : 13, 0));
    cam.position = B.Vector3.Lerp(cam.position, want, close ? 1 - Math.exp(-8 * dt) : k);
    B.Vector3.LerpToRef(camTarget, close ? car.pos.add(new B.Vector3(0, -1.4, 0)) : car.pos.add(back.scale(3)), close ? 0.2 : k * 1.5, camTarget);
  } else {
    const t = performance.now() / 9000;
    cam.position.set(Math.sin(t) * 45, 22, Math.cos(t) * 45);
    camTarget.set(0, 2, 0);
  }
  shake = Math.max(0, shake - dt * 2);
  const s = shake * shake * 0.8;
  cam.setTarget(camTarget.add(new B.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0)));
});

engine.runRenderLoop(() => scene.render());
addEventListener("resize", () => engine.resize());

// Solo dev: avanzar frames a mano y atajos de prueba (pestaña oculta = sin requestAnimationFrame)
if (import.meta.env.DEV) Object.assign(window, {
  __tick: (n: number) => { const g = engine.getDeltaTime; engine.getDeltaTime = () => 1000 / 60; for (let i = 0; i < n; i++) { engine.beginFrame(); scene.render(); engine.endFrame(); } engine.getDeltaTime = g; },
  __killAll: () => enemies.forEach((e) => { if (!e.def.boss) e.hp = 0; }),
  __time: (s: number) => (time = s),
  __xp: (n: number) => gainXp(n),
  __god: () => (hp = maxHp = 1e6),
  __info: () => ({ state, time, level, hp, enemies: enemies.length, gems: gems.length, weapons: weapons.map((w) => w.id + w.lv), fps: engine.getFps() }),
  __car: () => car && { p: car.pos, f: car.root.forward },
  __scene: scene,
  __carObj: () => car,
});
