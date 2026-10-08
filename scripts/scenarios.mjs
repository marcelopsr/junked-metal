// Escenarios de prueba declarados una sola vez: los usan shots.mjs (capturas + diff) y perf.mjs (mediciones).
// sesión = una carga de página (contexto limpio) con `query`; sus shots corren en orden sobre esa misma página (cada carga cuesta ~1-5 s).
// Cada shot: { id, act(page), perf = true (perf.mjs lo mide), shot = true (shots.mjs lo captura), tol = % de píxeles que pueden cambiar }.
// Se ejecutan en los dos viewports (pc 1280x720 y cel 390x844 táctil) salvo `vps`. El id final es `<vp>-<sesión>-<shot>`.
// Todo avanza con __tick y esperas por condición (waitForFunction), no con sleeps largos.

const tick = (p, n = 3) => p.evaluate((n) => window.__tick(n), n);
const wait = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 30000, polling: 50 });
const info = (p) => p.evaluate(() => window.__info());

// ---------- menús ----------
const toMain = async (p) => {
  for (let i = 0; i < 6 && !(await p.$("#scr-main.on")); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(60); }
  await wait(p, () => document.querySelector("#scr-main.on"));
};
const view = (name) => async (p) => { await toMain(p); await p.dispatchEvent(`#scr-main [data-go="${name}"]`, "click"); await wait(p, (n) => document.querySelector(`#scr-${n}.on`), name); await p.waitForTimeout(150); };
// La pantalla de carga solo se ve unos instantes al arrancar: se muestra a mano con un avance y un consejo fijos para fijar su diseño
const carga = async (p) => p.evaluate(() => {
  const $ = (id) => document.getElementById(id);
  $("ldBar").style.width = "60%"; $("ldPct").textContent = "60%"; $("ldStep").textContent = "Encendiendo el auto"; $("ldTip").textContent = "Texto de consejo de ejemplo para fijar el diseño.";
  $("load").classList.remove("hidden", "out"); $("load").classList.add("in");
});
const sinCarga = (p) => p.evaluate(() => { document.getElementById("load").classList.add("hidden"); document.getElementById("load").classList.remove("in"); });

// Configuración → Controles
const ctlTab = async (p) => { await view("config")(p); await p.dispatchEvent('[data-tab="ctl"]', "click");
  await p.evaluate(() => matchMedia("(pointer: coarse)").matches && dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" }))); // en cel el último control es el dedo
  await tick(p, 2); await p.waitForTimeout(150); };
// Joystick simulado (Xbox): sticks corridos, gatillos a medias, Y y RB apretados. Ninguno navega ni acepta en el menú.
const fakePad = (p) => p.evaluate(() => {
  const b = (on, v = on ? 1 : 0) => ({ pressed: on, touched: on, value: v });
  const pad = { id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", index: 0, connected: true, mapping: "standard", timestamp: 1,
    axes: [0.42, -0.31, 0.06, 0.03], buttons: Array.from({ length: 17 }, (_, i) => (i === 7 ? b(true, 0.7) : i === 6 ? b(false, 0.2) : b(i === 3 || i === 5))) };
  navigator.getGamepads = () => [pad, null, null, null];
});

// ---------- partida ----------
const labReady = async (p) => { await wait(p, () => window.__ready); await p.evaluate(() => window.__ready()); };
const lab = (o) => async (p) => { await wait(p, () => window.__lab); await labReady(p); await p.evaluate((o) => window.__lab(o), o); };
const partida = (secs) => async (p) => { await p.evaluate((s) => { window.__play(3); window.__god(); window.__sim(s); }, secs); await tick(p, 45); }; // semilla 3; god: la captura no depende de que el bot sobreviva; 45 cuadros para que la cámara alcance al auto
const labAnts = async (p) => { await labReady(p); await p.evaluate(() => { window.__lab({ frames: 2 }); window.__ants(300); }); };

const PIEZAS = ["wing:alto", "exhaust:chimenea", "bumper:cano", "bumper:antivuelco", "bumper:laterales", "tires:oruga", "tires:todoterreno", "tires:rayos", "acc:pelotita", "acc:banderita", "acc:matafuego"].map((x) => "part:" + x);
const garajePiezas = (car, kit) => async (p) => { await p.evaluate(([car, kit, unlocked]) => window.__cfg({ car, cars: ["buggy", car], unlocked, kit: { wing: "serie", decal: "nada", lamp: "calido", exhaust: "nada", ...kit } }), [car, kit, PIEZAS]);
  await view("garage")(p); await p.dispatchEvent('[data-gtab="piezas"]', "click"); await tick(p, 150); await p.waitForTimeout(100); }; // 150 cuadros: la cámara viaja desde el Taller

export const sessions = [
  { id: "menu", query: "?mute&seed=3", shots: [
    { id: "carga", act: carga, perf: false },
    { id: "portada", act: sinCarga },
    { id: "principal", act: async (p) => { await p.dispatchEvent("#scr-title", "click"); await wait(p, () => document.querySelector("#scr-main.on")); await tick(p, 180); await p.waitForTimeout(150); } }, // 180 cuadros: la cámara termina de viajar desde la portada
    { id: "garaje", act: view("garage") },
    { id: "garaje-vista-previa", act: async (p) => { await view("garage")(p); await p.focus('.carc.locked[data-k="tanque"]'); await p.waitForTimeout(400); } },
    { id: "taller", act: view("shop") },
    { id: "config", act: view("config") },
    // Imagen con Escalado FSR: la escala % se oculta y aparece el modo FSR (fila dependiente)
    { id: "config-fsr", act: async (p) => { await p.evaluate(() => { const s = document.querySelector('select[data-set="scaler"]'); s.value = "fsr"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(150); } },
    { id: "controles", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ scaler: "simple" })); await ctlTab(p); } },
    { id: "bestiario", act: async (p) => { await view("bestiary")(p); } },
    { id: "ficha", act: async (p) => { await p.dispatchEvent("#beasts [data-beast]", "click"); await wait(p, () => document.querySelector("#scr-beast.on")); await p.waitForTimeout(500); } },
    { id: "ficha-hormiga", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="hormiga"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-escupidora", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="escupidora"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-friccion", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="friccion"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-rey", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="rey"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-tarantula", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="tarantula"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-polilla", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="polilla"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-robot", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="robot"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "ficha-cortacercos", act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent('[data-beast="cortacercos"]', "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      await tick(p, 90);
      await p.waitForTimeout(300);
    } },
    { id: "creditos", act: view("credits") },
  ] },
  // Taller y garaje con compras: __cfg escribe el guardado en memoria (sin persistir) y la pantalla se vuelve a abrir para redibujarla
  { id: "taller", query: "?mute&seed=3", shots: [
    { id: "chasis-vista-previa", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ scrap: 260, perm: { hp: 3, dmg: 1, spd: 0, mag: 0, reroll: 0, cards: 0, extra: 0, revive: 0, xp: 0, arm: 2, reg: 0, tur: 1, ram: 0, cdr: 0 } }));
      await view("shop")(p); await p.focus('#shop [data-k="arm"]'); await p.waitForTimeout(100); } },
    ...["habilidades", "arsenal"].map((t) => ({ id: t, perf: false, act: async (p) => { await p.dispatchEvent(`[data-stab="${t}"]`, "click"); await p.focus("#shop .perk"); await p.waitForTimeout(100); } })),
    { id: "piezas-comprables-precio", perf: false, act: async (p) => { await p.dispatchEvent('[data-stab="piezas"]', "click"); await p.dispatchEvent('[data-sf="comprables"]', "click"); await p.dispatchEvent("[data-ss]", "click"); await p.waitForTimeout(100); } },
    { id: "garaje-piezas", perf: false, act: garajePiezas("buggy", { wing: "alto", bumper: "antivuelco", tires: "todoterreno", acc: "pelotita" }) },
    { id: "garaje-piezas-2", perf: false, act: garajePiezas("monster", { exhaust: "chimenea", bumper: "cano", tires: "oruga", acc: "banderita" }) },
    { id: "garaje-piezas-3", perf: false, act: garajePiezas("formula", { bumper: "laterales", tires: "rayos", acc: "matafuego" }) },
    // Pintura por zona: paleta, selector libre (perillas de tono/saturación/brillo) y detalles + llantas sobre piezas que los muestran
    { id: "garaje-pintura", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ car: "buggy", paint: "#4cc3c9", trim: "", rim: "" })); await view("garage")(p); await p.dispatchEvent('[data-gtab="pintura"]', "click"); await tick(p, 150); await p.waitForTimeout(100); } },
    { id: "garaje-pintura-libre", perf: false, act: async (p) => { await p.evaluate(() => { for (const [k, v] of [["h", 280], ["s", 70], ["v", 85]]) { const i = document.querySelector(`[data-hsv="${k}"]`); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); } document.querySelector('[data-hsv="s"]').focus(); }); await tick(p, 5); await p.waitForTimeout(100); } },
    { id: "garaje-pintura-zonas", perf: false, act: async (p) => { await p.evaluate((u) => window.__cfg({ unlocked: u, kit: { wing: "alto", decal: "nada", lamp: "calido", exhaust: "nada", bumper: "cano", tires: "serie", acc: "pelotita" }, paint: "#1d4ed8", trim: "#d4af37", rim: "#ff4fa3" }), PIEZAS);
      await view("garage")(p); await p.dispatchEvent('[data-gtab="pintura"]', "click"); await p.dispatchEvent('[data-pz="trim"]', "click"); await tick(p, 150); await p.waitForTimeout(100); } },
    { id: "garaje-arma", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ pilot: "robot", unlocked: ["arma:clips"], weapon: "clips" })); await view("garage")(p); await p.dispatchEvent('[data-gtab="arma"]', "click"); await p.waitForTimeout(150); } },
  ] },
  { id: "controles", query: "?mute&seed=3", vps: ["pc"], shots: [
    { id: "probar-control", perf: false, act: async (p) => { await ctlTab(p); await fakePad(p); await tick(p, 3); await p.evaluate(() => document.getElementById("ptest").scrollIntoView({ block: "center" })); await tick(p, 2); await p.waitForTimeout(100); } },
  ] },
  { id: "tactil", query: "?mute&seed=3", vps: ["cel"], shots: [
    { id: "editar", perf: false, act: async (p) => { await ctlTab(p); await p.dispatchEvent('[data-act="tedit"]', "click"); await wait(p, () => document.body.classList.contains("tedit")); await p.waitForTimeout(100); } },
    // Arrastrar TURBO hacia arriba a la izquierda y agrandar DERRAPE desde su esquina
    { id: "editar-movido", perf: false, act: async (p) => {
      const drag = async (sel, fx, fy, dx, dy) => { const r = await p.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, sel);
        const x = r[0] + r[2] * fx, y = r[1] + r[3] * fy; await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx, y + dy, { steps: 4 }); await p.mouse.up(); };
      await drag("#tBoost", 0.4, 0.4, -120, -160); await drag("#tDrift", 0.9, 0.9, 30, 30); await p.waitForTimeout(100); } },
  ] },
  { id: "lab", query: "?mute&seed=3&lab", shots: [
    { id: "noche", act: async (p) => { await wait(p, () => window.__lab); await labReady(p); await p.evaluate(() => window.__lab({})); } }, // se rearma a mano: el arranque solo del ?lab corre con tiempo real
    { id: "jefes", act: lab({ boss: true }) },
    { id: "niebla", act: lab({ climate: "niebla" }) },
    { id: "farol", act: lab({ climate: "farol" }) },
    { id: "hormigas300", act: labAnts, shot: false }, // solo medición: 300 instancias
    { id: "preset-bajo", act: async (p) => { await labReady(p); await p.evaluate(() => { window.__cfg({ preset: "bajo" }); window.__lab({}); }); } }, // preajuste Bajo (lo demás corre en Medio, el de fábrica)
    { id: "fsr-fxaa", act: async (p) => { await labReady(p); await p.evaluate(() => { window.__cfg({ preset: "medio", scaler: "fsr", fsr: "rendimiento", aa: "fxaa", sharpen: 0.6 }); window.__lab({}); }); } }, // FXAA antes del agrandado de FSR
    // Modos de cámara (Configuración → Juego), al final de la sesión: __cfg cambia el modo sin guardar y __lab rearma la escena. En cel solo los fijos
    ...["actual", "cenital", "iso", "baja", "dinamica"].map((m) => ({ id: "cam-" + m, perf: false, vps: m === "actual" || m === "dinamica" ? ["pc"] : undefined,
      act: async (p) => { await labReady(p); await p.evaluate((m) => { window.__cfg({ preset: "medio", scaler: "simple", aa: "none", sharpen: 0, camMode: m }); window.__lab({}); }, m); } })),
    // Teléfono apaisado (último: deja el viewport girado para el resto de la sesión)
    { id: "cam-baja-apaisado", perf: false, vps: ["cel"], act: async (p) => { await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(100); await labReady(p); await p.evaluate(() => { window.__cfg({ camMode: "baja" }); window.__lab({}); }); } },
  ] },
  { id: "partida", query: "?mute&seed=3", shots: [
    { id: "curso", act: partida(90) },
    { id: "cartas", act: async (p) => { await p.evaluate(() => window.__xp(9999)); await tick(p, 4); await wait(p, () => !document.getElementById("levelup").classList.contains("hidden")); await p.waitForTimeout(300); } },
    { id: "pausa", vps: ["pc"], act: async (p) => { await p.evaluate(() => window.__play(3)); await tick(p, 90); await p.keyboard.press("Escape"); await wait(p, () => document.querySelector("#scr-pause.on")); await p.waitForTimeout(200); } },
    // ponytail: shot de resultados/outro pendiente (revive + outro en headless); cubrir con escenario `over` en otra tanda
  ] },
  // partida_llena: 300 s de sim (partida avanzada, t=5 min) → mide el estado con armas evolucionadas y oleadas densas.
  // Medido: ~168 draws PC (thin-instances agrupan por tipo; menos que partida-curso/90 s por diferente mezcla de proyectiles).
  // Solo pc y solo medición de perf (shot: false); usar --only partida_llena para medir sin el resto.
  { id: "partida_llena", query: "?mute&seed=3", vps: ["pc", "cel"], shots: [
    { id: "llena", perf: true, shot: false, act: async (p) => { await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(300); }); await tick(p, 45); } },
  ] },
  { id: "carrera", query: "?mute&race", shots: [
    { id: "largada", act: async (p) => { await wait(p, () => window.__info?.().state === "race" && document.getElementById("load").classList.contains("hidden")); } },
    { id: "curso", tol: 8, act: async (p) => { await p.evaluate(() => { window.__race.auto(); window.__race.sim(8); }); } }, // tol alto: kart.ts usa Math.random en objetos y partículas
  ] },
  { id: "carrera2j", query: "?mute&race&players=2", vps: ["pc"], shots: [
    { id: "pantalla-dividida", tol: 8, act: async (p) => { await wait(p, () => window.__info?.().state === "race" && document.getElementById("load").classList.contains("hidden")); await p.evaluate(() => { window.__race.auto(); window.__race.sim(5); }); } },
  ] },
  { id: "duel", query: "?mute&duel", vps: ["pc", "cel"], shots: [
    { id: "armado", act: async (p) => {
      await wait(p, () => document.getElementById("duel-ui")?.classList.contains("fabricar") && !!document.getElementById("duel-fab-grid"));
      await p.evaluate(() => window.__duel.openDrawer(true));
      await p.evaluate(() => window.__duel.loadTemplate("cuna"));
      const info = await p.evaluate(() => window.__duel.info());
      if (info.phase !== "fabricar") throw new Error(`fabricar: phase=${info.phase}`);
      if (!info.build?.cells?.length) throw new Error("fabricar: build vacío");
      if (info.cfg.chassis !== "cuna") throw new Error(`fabricar: cfg.chassis=${info.cfg.chassis}`);
      await wait(p, () => document.getElementById("load")?.classList.contains("hidden"));
      await p.evaluate(() => window.__duel.shotCam(true));
      await tick(p, 15);
    } },
    { id: "countdown", act: async (p) => {
      await p.evaluate(() => { window.__duel.confirm(); window.__duel.shotCam(true); });
      await tick(p, 55);
    } },
    { id: "pelea", act: async (p) => {
      await p.evaluate(() => {
        const ph = window.__duel.info().phase;
        if (ph === "fabricar" || ph === "armado") window.__duel.confirm();
        window.__duel.auto(true);
        window.__duel.shotCam(true);
      });
      await tick(p, 220);
      await tick(p, 90);
    } },
  ] },
  { id: "match3", query: "?mute&match3", vps: ["pc", "cel", "nb", "celh"], shots: [
    { id: "gabinete", act: async (p) => {
      await wait(p, () => window.__info?.().state === "match3" && document.getElementById("match3-ui")?.classList.contains("on"));
      await wait(p, () => document.getElementById("load")?.classList.contains("hidden"));
      await tick(p, 12);
    } },
    { id: "objetivos", act: async (p) => {
      await p.evaluate(() => window.__match3.ready());
      await tick(p, 8);
    } },
    { id: "juego", act: async (p) => {
      await p.evaluate(() => { document.getElementById("m3-play")?.click(); window.__match3.start(); });
      await tick(p, 25);
    } },
    { id: "seleccion", act: async (p) => {
      const c = await p.evaluate(() => window.__match3.cellPx(3, 4));
      await p.mouse.click(c.x, c.y);
      await tick(p, 4);
    } },
    { id: "pausa", act: async (p) => {
      await p.keyboard.press("Escape");
      await tick(p, 10);
    } },
    { id: "victoria", act: async (p) => {
      await p.evaluate(() => window.__match3.setPhase("win"));
      await tick(p, 12);
    } },
    { id: "derrota", act: async (p) => {
      await p.evaluate(() => window.__match3.setPhase("lose"));
      await tick(p, 12);
    } },
  ] },
  // Banco Folded 2.5D (src/folded_lab.ts): paleta, materiales wear 0/0,5/1, trims, calcos y kit a 0/90/180/270 grados y desde arriba
  { id: "folded", query: "?mute&folded", vps: ["pc"], shots: [
    ...[0, 90, 180, 270].map((yaw) => ({ id: "y" + yaw, act: async (p) => {
      await wait(p, () => window.__folded && document.getElementById("load")?.classList.contains("hidden"));
      await p.evaluate((yaw) => window.__folded({ yaw }), yaw); await tick(p, 4);
    } })),
    { id: "top", act: async (p) => { await p.evaluate(() => window.__folded({ yaw: 30, top: true })); await tick(p, 4); } },
  ] },
  // Vertical slice Folded (Folded): hormiga, polilla, robot, buggy, caja y cerca a 0..315 grados y desde arriba (cámara cerca)
  { id: "folded2", query: "?mute&folded", vps: ["pc"], shots: [
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((yaw) => ({ id: "y" + yaw, act: async (p) => {
      await wait(p, () => window.__folded && document.getElementById("load")?.classList.contains("hidden"));
      await p.evaluate((yaw) => window.__folded({ yaw, slice: true }), yaw); await tick(p, 4);
    } })),
    { id: "top", act: async (p) => { await p.evaluate(() => window.__folded({ yaw: 30, top: true, slice: true })); await tick(p, 4); } },
  ] },
  // Jefes Folded (rey, tarántula, cortadora, aspiradora, cortacercos) a 1/5, fila z = 9 del banco
  { id: "folded2_jefes", query: "?mute&folded", vps: ["pc"], shots: [
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((yaw) => ({ id: "y" + yaw, act: async (p) => {
      await wait(p, () => window.__folded && document.getElementById("load")?.classList.contains("hidden"));
      await p.evaluate((yaw) => window.__folded({ yaw, slice: true, row: 6.4 }), yaw); await tick(p, 4);
    } })),
    { id: "top", act: async (p) => { await p.evaluate(() => window.__folded({ yaw: 30, top: true, slice: true, row: 6.4 })); await tick(p, 4); } },
  ] },
  { id: "match3_menu", query: "?mute", vps: ["pc"], shots: [
    { id: "entrada", act: async (p) => {
      await wait(p, () => document.getElementById("load")?.classList.contains("hidden"));
      if (await p.evaluate(() => document.getElementById("scr-title")?.classList.contains("on"))) await p.keyboard.press("Space");
      await toMain(p);
      await p.click('#scr-main [data-go="match3"]');
      await wait(p, () => document.getElementById("scr-match3")?.classList.contains("on"));
      await tick(p, 8);
    } },
  ] },
  { id: "duel_menu", query: "?mute", vps: ["pc"], shots: [
    { id: "fabricar", act: async (p) => {
      await wait(p, () => document.getElementById("load")?.classList.contains("hidden"));
      if (await p.evaluate(() => document.getElementById("scr-title")?.classList.contains("on"))) await p.keyboard.press("Space");
      await toMain(p);
      await p.click('#scr-main [data-go="duel"]');
      await wait(p, () => document.getElementById("scr-duel")?.classList.contains("on"));
      await p.click('#scr-duel [data-act="duelgo"]');
      await wait(p, () => document.getElementById("duel-ui")?.classList.contains("fabricar") && !!document.getElementById("duel-fab-grid"));
      await p.evaluate(() => window.__duel.loadTemplate("cuna"));
      await p.evaluate(() => { window.__duel.refreshGhost?.(); window.__duel.resetCam?.(); });
      await tick(p, 20);
    } },
  ] },
];
export { tick, info };
