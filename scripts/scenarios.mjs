// Escenarios de prueba declarados una sola vez: los usan shots.mjs (capturas + diff) y perf.mjs (mediciones).
// sesión = una carga de página (contexto limpio) con `query`; sus shots corren en orden sobre esa misma página (cada carga cuesta ~1-5 s).
// Cada shot: { id, act(page), perf = true (perf.mjs lo mide), shot = true (shots.mjs lo captura), tol = % de píxeles que pueden cambiar }.
// Se ejecutan en los dos viewports (pc 1280x720 y cel 390x844 táctil) salvo `vps`. El id final es `<vp>-<sesión>-<shot>`.
// Todo avanza con __tick y esperas por condición (waitForFunction), no con sleeps largos.

const tick = (p, n = 3) => p.evaluate((n) => window.__tick(n), n);
const wait = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 8000, polling: 50 }); // 8 s: un paso roto en cascada (30 s x 20 pasos) parecía un cuelgue de minutos al 0 % de CPU
const info = (p) => p.evaluate(() => window.__info());

// Todos los bichos del bestiario (el yaw inicial por bicho vive en src/menu/beast_sheet.ts; el arrastre de 1 px solo frena el giro lento).
// Depuración: FK="hormiga@0.785,rey" (bicho@giro en rad sobre el yaw inicial) captura solo esas fichas.
const KINDS_FICHA = ["hormiga","escupidora","friccion","robot","polilla","escarabajo","grillo","mosca","babosa","fuego","cohete","enjambre","tirador","saltador","emboscador","flotante","tanque","explosivo","curandero","kamikaze","escudo","brincador","francotirador","divisor","cria","ladron","taladro","cangrejo","rey","cortadora","tarantula","perro","gato","aspiradora","proyector","payaso","muneco","limpiafondos","falso","grua","gusano","cortacercos","caja"];

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
const abrirGuia = async (p) => { await p.dispatchEvent('[data-act="ctlguide"]', "click"); await wait(p, () => !document.getElementById("ctlg").classList.contains("hidden")); await p.waitForTimeout(150); };
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
  await view("garage")(p); await p.dispatchEvent('[data-gtab="piezas"]', "click"); await tick(p, 90); await p.waitForTimeout(100); }; // 150 cuadros: la cámara viaja desde el Taller

export const sessions = [
  // Portada de quien ya largó una expedición: aparece «Seguir» (siembra el guardado y recarga; sin congelar, por eso tol alta)
  { id: "portada_seguir", query: "?mute&seed=3", shots: [
    { id: "portada-seguir", tol: 0.08, act: async (p) => {
      await p.evaluate(() => localStorage.setItem("rcfight2", JSON.stringify({ encore: { runs: 3, wins: 1, best: { loop: 0, stage: 2, t: 400 } } })));
      p.removeAllListeners("framenavigated"); await p.reload({ waitUntil: "domcontentloaded" });
      await p.waitForFunction(() => typeof window.__sim === "function", null, { timeout: 150000, polling: 50 });
      await wait(p, () => document.querySelector("#scr-title.on #titleGo:not(.hidden)")); await sinCarga(p); await p.waitForTimeout(600);
    } },
  ] },
  { id: "menu", query: "?mute&seed=3", shots: [
    { id: "carga", act: carga, perf: false },
    { id: "portada", act: sinCarga },
    { id: "principal", act: async (p) => { await p.dispatchEvent("#scr-title", "click"); await wait(p, () => document.querySelector("#scr-main.on")); await tick(p, 180); await p.waitForTimeout(150); } }, // 180 cuadros: la cámara termina de viajar desde la portada
    { id: "garaje", act: async (p) => { await view("garage")(p); await tick(p, 40); } }, // espera el fundido de entrada de la escena (con 3 cuadros la exposición estaba al 16 %)
    { id: "garaje-vista-previa", act: async (p) => { await p.evaluate(() => window.__cfg({ cars: ["buggy"] })); /* menu.ts desbloquea todos los autos al cargar: se bloquea el tanque para tener la vista previa */ await view("garage")(p); await p.focus('.carc.locked[data-k="tanque"]'); await p.waitForTimeout(400); } },
    { id: "taller", act: view("shop") },
    // Con runs===0 «Jugar» va directo a largar (menu.ts): para ver la pantalla ENCORE hay que simular una expedición ya jugada
    { id: "encore", act: async (p) => { await p.evaluate(() => window.__cfg({ encore: { best: { loop: 0, stage: 2, t: 400 }, wins: 1, runs: 3, lastLoop: 0, lastCause: "", secrets: [], tips: [], seenPacts: [], seenVariants: [] } })); await view("encore")(p); } },
    // "Cómo se juega" y el grupo Online desplegados (el foco queda en Largar al entrar)
    { id: "encore-abierto", act: async (p) => { await p.evaluate(() => document.querySelectorAll("#scr-encore .how, #scr-encore #netGrp").forEach((d) => { d.open = true; })); await p.waitForTimeout(150); } },
    { id: "config", act: view("config") },
    // Imagen con Escalado FSR: la escala % se oculta y aparece el modo FSR (fila dependiente)
    { id: "config-fsr", act: async (p) => { await p.evaluate(() => { const s = document.querySelector('select[data-set="scaler"]'); s.value = "fsr"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(150); } },
    { id: "controles", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ scaler: "simple" })); await ctlTab(p); } },
    { id: "guia-controles", perf: false, act: async (p) => { await ctlTab(p); await abrirGuia(p); } }, // teclado en compu, táctil en celu
    { id: "bestiario", act: async (p) => { await view("bestiary")(p); } },
    { id: "ficha", act: async (p) => { await p.dispatchEvent("#beasts [data-beast]", "click"); await wait(p, () => document.querySelector("#scr-beast.on")); await tick(p, 90); await p.waitForTimeout(300); } },
    // Ficha en 3/4 frontal: un arrastre corto sobre #bstage fija BV.yaw (yaw inicial de la ficha + dx*0.012) y frena el giro lento.
    ...(process.env.FK ? process.env.FK.split(",") : KINDS_FICHA).map((kk) => { const [k, o = "0"] = kk.split("@"); return { id: "ficha-" + kk.replace("@", "_"), act: async (p) => {
      await view("bestiary")(p);
      await p.dispatchEvent(`[data-beast="${k}"]`, "click");
      await wait(p, () => document.querySelector("#scr-beast.on"));
      const b = await p.locator("#bstage").boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2;
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 1 + Math.round(+o / 0.012), y, { steps: 2 }); await p.mouse.up();
      await tick(p, 90);
      await p.waitForTimeout(300);
    } }; }),
    { id: "creditos", act: view("credits") },
    { id: "jugar", perf: false, act: async (p) => {
      await p.evaluate(() => window.__cfg({ unlocked: ["zone:jardin"], stats: { runs: 4, wins: 1, time: 1800, dist: 5000, dmg: {}, zone: { patio: { t: 612, kills: 420 } } } }));
      await toMain(p);
      await p.dispatchEvent('#scr-main [data-go="modes"]', "click"); await wait(p, () => document.querySelector("#scr-modes.on")); await p.dispatchEvent('#scr-modes [data-act="playmenu"]', "click");
      await wait(p, () => document.querySelector("#scr-play.on"));
      await p.waitForTimeout(150);
    } },
    { id: "diario", perf: false, act: view("daily") },
    { id: "diario-ranking", perf: false, act: async (p) => {
      await p.evaluate(() => { window.__dailyMock = { date: "2026-10-13", seed: 4242, mine: { win: true, t: 541, rank: 3 }, board: ["Tuerca", "Chasis", "MarceloS", "Pistón", "Oruga", "Bujía", "Remache", "Cadena", "Llanta", "Resorte"].map((name, i) => ({ name, win: i < 6, t: 600 - i * 17 })) }; });
      await view("daily")(p);
      await p.waitForTimeout(300);
    } },
    { id: "carrera-menu", perf: false, act: async (p) => {
      await toMain(p);
      await p.dispatchEvent('#scr-main [data-go="modes"]', "click");
      await wait(p, () => document.querySelector("#scr-modes.on"));
      await p.dispatchEvent('#scr-modes [data-go="race"]', "click");
      await wait(p, () => document.querySelector("#scr-race.on"));
      await p.waitForTimeout(150);
    } },
    { id: "mas-modos", perf: false, act: view("modes") },
    { id: "bestiario-pilotos", perf: false, act: async (p) => {
      await p.evaluate(() => window.__cfg({
        pilot: "divorciada", unlocked: ["pilot:divorciada", "zone:jardin"], cars: ["sedan", "buggy"], best: 512,
        ach: ["gana_sedan", "rey", "racha"],
        slain: { hormiga: 340, escarabajo: 120, arana: 85, polilla: 60, rey: 3, tarantula: 1 },
        stats: { runs: 6, wins: 2, time: 2940, dist: 14200, dmg: { clips: 18400, gomitas: 9200, tesla: 6100 }, zone: { patio: { t: 612, kills: 420 }, jardin: { t: 485, kills: 310 } } },
        runs: [{ t: 612, kills: 420, lv: 18, seed: 3041, win: true }, { t: 512, kills: 355, lv: 15, seed: 8812, win: false }],
      }));
      await view("bestiary")(p);
      await p.dispatchEvent('[data-btab="pilotos"]', "click");
      await p.waitForTimeout(150);
    } },
    { id: "bestiario-logros", perf: false, act: async (p) => {
      await p.dispatchEvent('[data-btab="logros"]', "click");
      await p.waitForTimeout(150);
    } },
    { id: "bestiario-stats", perf: false, act: async (p) => {
      await p.dispatchEvent('[data-btab="stats"]', "click");
      await p.waitForTimeout(150);
    } },
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
    { id: "garaje-pintura", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ car: "buggy", paint: "#4cc3c9", trim: "", rim: "" })); await view("garage")(p); await p.dispatchEvent('[data-gtab="pintura"]', "click"); await tick(p, 90); await p.waitForTimeout(100); } },
    { id: "garaje-pintura-libre", perf: false, act: async (p) => { await p.evaluate(() => { for (const [k, v] of [["h", 280], ["s", 70], ["v", 85]]) { const i = document.querySelector(`[data-hsv="${k}"]`); i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); } document.querySelector('[data-hsv="s"]').focus(); }); await tick(p, 5); await p.waitForTimeout(100); } },
    { id: "garaje-pintura-zonas", perf: false, act: async (p) => { await p.evaluate((u) => window.__cfg({ unlocked: u, kit: { wing: "alto", decal: "nada", lamp: "calido", exhaust: "nada", bumper: "cano", tires: "serie", acc: "pelotita" }, paint: "#1d4ed8", trim: "#d4af37", rim: "#ff4fa3" }), PIEZAS);
      await view("garage")(p); await p.dispatchEvent('[data-gtab="pintura"]', "click"); await p.dispatchEvent('[data-pz="trim"]', "click"); await tick(p, 90); await p.waitForTimeout(100); } },
    { id: "garaje-arma", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ pilot: "robot", unlocked: ["arma:clips"], weapon: "clips" })); await view("garage")(p); await p.dispatchEvent('[data-gtab="arma"]', "click"); await p.waitForTimeout(150); } },
  ] },
  { id: "controles", query: "?mute&seed=3", vps: ["pc"], shots: [
    { id: "probar-control", perf: false, act: async (p) => { await ctlTab(p); await fakePad(p); await tick(p, 3); await p.evaluate(() => document.getElementById("ptest").scrollIntoView({ block: "center" })); await tick(p, 2); await p.waitForTimeout(100); } },
    { id: "guia-mando", perf: false, act: async (p) => { await p.keyboard.press("Escape"); await ctlTab(p); await fakePad(p); await tick(p, 3); await abrirGuia(p); } },
  ] },
  // Primera partida: sin guardado, "Largar" muestra antes la guía de controles (compu: teclado; celu: táctil)
  { id: "primera_vez", query: "?mute&seed=3", shots: [
    { id: "guia", perf: false, act: async (p) => {
      await p.dispatchEvent("#scr-title", "click"); await toMain(p);
      // primera vez (runs=0): Jugar abre la guía mínima directo, sin pasar por la pantalla ENCORE
      await p.dispatchEvent('#scr-main [data-go="encore"]', "click"); await wait(p, () => !document.getElementById("ctlg").classList.contains("hidden")); await p.waitForTimeout(150);
    } },
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
    // Flechas de peligro en el borde (ui.ts threatAt): 4 avisos fuera de cámara en las cuatro direcciones
    { id: "flecha-peligro", perf: false, act: async (p) => { await labReady(p); await p.evaluate(() => { window.__lab({}); for (const [x, z] of [[80, 0], [-80, 0], [0, 80], [0, -80]]) window.__threat(x, z); }); await tick(p, 6); } },
    { id: "niebla", act: lab({ climate: "niebla" }) },
    { id: "farol", act: lab({ climate: "farol" }) },
    { id: "hormigas300", act: labAnts, shot: false }, // solo medición: 300 instancias
    { id: "preset-bajo", act: async (p) => { await labReady(p); await p.evaluate(() => { window.__cfg({ preset: "bajo" }); window.__lab({}); }); } }, // preajuste Bajo (lo demás corre en Medio, el de fábrica)
    { id: "fsr-fxaa", act: async (p) => { await labReady(p); await p.evaluate(() => { window.__cfg({ preset: "medio", scaler: "fsr", fsr: "rendimiento", aa: "fxaa", sharpen: 0.6 }); window.__lab({}); window.__tick(8); }); await p.waitForTimeout(400); } }, // FXAA antes del agrandado de FSR; los postprocesos nuevos compilan sus shaders en los primeros cuadros (con 3 sale el fondo liso): se les da tiempo
    // Modos de cámara (Configuración → Juego), al final de la sesión: __cfg cambia el modo sin guardar y __lab rearma la escena. En cel solo los fijos
    ...["actual", "cenital", "iso", "baja", "dinamica"].map((m) => ({ id: "cam-" + m, perf: false, vps: m === "actual" || m === "dinamica" ? ["pc"] : undefined,
      act: async (p) => { await labReady(p); await p.evaluate((m) => { window.__cfg({ preset: "medio", scaler: "simple", aa: "none", sharpen: 0, camMode: m }); window.__lab({}); }, m); } })),
    // Teléfono apaisado (último: deja el viewport girado para el resto de la sesión)
    { id: "cam-baja-apaisado", perf: false, vps: ["cel"], act: async (p) => { await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(100); await labReady(p); await p.evaluate(() => { window.__cfg({ camMode: "baja" }); window.__lab({}); }); } },
  ] },
  { id: "lab-garaje", query: "?mute&seed=3&lab&zone=garaje", shots: [
    { id: "huellas", act: async (p) => { await wait(p, () => window.__lab); await labReady(p); await p.evaluate(() => window.__lab({})); } },
  ] },
  { id: "lab-luz-mediodia", query: "?mute&seed=3&lab&climate=mediodia", shots: [{ id: "jefes", act: lab({ boss: true }) }] },
  { id: "partida", query: "?mute&seed=3", shots: [
    { id: "curso", act: partida(90) },
    { id: "cartas", act: async (p) => { await p.evaluate(() => window.__xp(9999)); await tick(p, 4); await wait(p, () => !document.getElementById("levelup").classList.contains("hidden")); await p.waitForTimeout(300); } },
    { id: "pausa", vps: ["pc"], act: async (p) => { await partida(90)(p); await p.keyboard.press("Escape"); await wait(p, () => document.querySelector("#scr-pause.on")); await p.waitForTimeout(200); } },
    { id: "outro", perf: false, act: async (p) => { await p.evaluate(() => window.__outro()); await tick(p, 40); await wait(p, () => !document.getElementById("outro").classList.contains("hidden")); await p.waitForTimeout(150); } },
    { id: "resultados", perf: false, act: async (p) => { await tick(p, 270); await wait(p, () => document.querySelector("#scr-over.on") && !document.getElementById("overPhoto").classList.contains("hidden") && document.getElementById("overPhotoImg").complete); await p.waitForTimeout(200); } },
  ] },
  // Muestra una evolución real en su carta: canicas + pasiva preparada, cofre lunar forzado con hooks de dev.
  { id: "evo-cards", query: "?mute&encore&seed=58", shots: [
    { id: "canicas", act: async (p) => {
      await wait(p, () => window.__enc?.info());
      await wait(p, () => window.__info?.().state === "play");
      const setup = await p.evaluate(() => { window.__god(); const evo = window.__enc.evo("canicas"); return { evo, chest: window.__enc.shop("cofre") }; });
      if (setup.evo !== "evo" || !setup.chest) throw new Error(`evo-cards setup: ${JSON.stringify(setup)}`);
      await tick(p, 120);
      await wait(p, () => !document.getElementById("levelup").classList.contains("hidden"));
      await wait(p, () => { const img = document.querySelector(".offer.evo .evo-thumb-img"); return !!img?.complete && img.naturalWidth > 0; });
      await p.waitForTimeout(150);
    } },
  ] },
  // Zonas de pacto (src/pact_zones.ts): una por tipo, en el patio (escenario 0) y en la luna (escenario 1). Se fuerza el pacto en erun.pacts,
  // se acerca el anillo de aparición a 4 m del auto (BAL vivo, mismo módulo que la app en dev) y se saltan al escenario; 260 cuadros = aviso de 2 s cumplido.
  { id: "zonas", query: "?mute&encore&seed=58", shots: ["maquillaje:camerino", "cobro:iman", "sorpresa:foco", "blindaje:pegamento", "patrocinio:cables", "nocturno:trampilla"].flatMap((pz) => [["patio", 0], ["luna", 1]].map(([lugar, stage]) => ({ id: `${pz.split(":")[1]}-${lugar}`, perf: false, act: async (p) => {
    await wait(p, () => window.__enc?.info());
    await wait(p, () => window.__info?.().state === "play");
    // Candidatos (vuelta, escenario): el hash de la zona decide el rumbo, así que se prueba hasta que caiga delante del auto (cámara de juego) y en el lugar pedido.
    let ok = false;
    for (const [lo, st] of [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [2, 3], [0, 1], [0, 2], [0, 3]]) {
      const zona = await p.evaluate(async ([pacto, lo, st]) => {
        const { BAL } = await import("/src/balance.ts");
        BAL.ritmo.zona_dist_min = 5; BAL.ritmo.zona_dist_max = 6;
        window.__god(); document.getElementById("hint")?.classList.add("hidden"); document.getElementById("dirSub")?.classList.add("hidden");
        const pacts = window.__enc.info().pacts; pacts.length = 0; pacts.push({ id: pacto, left: Infinity }); // info() devuelve el mismo arreglo que erun.pacts
        const z = window.__enc.jump(lo, st); window.__killAll();
        return z;
      }, [pz.split(":")[0], lo, st]);
      if ((zona === "luna") !== (lugar === "luna")) continue;
      await tick(p, 4);
      ok = await p.evaluate(async () => {
        const Z = await import("/src/pact_zones.ts"), c = window.__car(), z = Z.zonesInfo()[0];
        if (!z) return false;
        const dx = z.x - c.p.x, dz = z.z - c.p.z, d = Math.hypot(dx, dz);
        return (dx * c.f.x + dz * c.f.z) / d > 0.6;
      });
      if (ok) break;
    }
    if (!ok) throw new Error(`zonas: sin zona delante del auto (${pz} ${lugar})`);
    await tick(p, 260);
    await p.evaluate(() => { document.getElementById("hint")?.classList.add("hidden"); document.getElementById("dirSub")?.classList.add("hidden"); });
  } }))) },
  // ENCORE en la Luna con 1, 2 y 4 jugadores (compu; split screen solo en compu): escenario 1 tras 25 s del bot y oferta de pactos abierta (__enc)
  ...[1, 2, 4].map((n) => ({ id: `encore_pacto${n}`, query: `?mute&encore&seed=58&players=${n}`, vps: ["pc"], shots: [
    { id: "juego", act: async (p) => { await wait(p, () => window.__enc?.info()); await p.evaluate(() => { window.__god(); window.__sim(25); }); await tick(p, 45); } },
    { id: "pacto", act: async (p) => { await p.evaluate(() => { const e = window.__enc; e.land(); e.board(); if (e.info().phase === "overload") e.tick(30); if (e.info().phase === "guest") window.__killBoss(); }); await tick(p, 20); await p.evaluate(() => window.__enc.pick(1)); await tick(p, 20); } },
  ] })),
  // Luna (src/moon.ts): selector de mapa, lado del Sol, lado oscuro con bichos acercándose (luces), la Tierra en el cielo y cráter/montículo en vivo (__luna)
  { id: "luna", query: "?mute&seed=3&zone=luna", shots: [
    { id: "selector", perf: false, act: async (p) => {
      await labReady(p); await p.evaluate(() => window.__cfg({ zone: "luna" }));
      if (await p.$("#scr-title.on")) await p.dispatchEvent("#scr-title", "click");
      await toMain(p); await p.dispatchEvent('#scr-main [data-go="modes"]', "click"); await wait(p, () => document.querySelector("#scr-modes.on")); await p.dispatchEvent('#scr-modes [data-act="playmenu"]', "click");
      await wait(p, () => document.querySelector("#scr-play.on")); await p.waitForTimeout(150);
    } },
    { id: "sol", act: async (p) => { await labReady(p); await p.evaluate(() => { window.__play(3); window.__god(); window.__sim(30); window.__killAll(); window.__luna.go("sol"); window.__luna.ring(10, 13); }); await tick(p, 60); } },
    { id: "tierra", perf: false, act: async (p) => { await p.evaluate(() => { window.__cfg({ camMode: "baja" }); window.__luna.go("tierra"); }); await tick(p, 40); } },
    { id: "oscuro", act: async (p) => { await p.evaluate(() => { window.__cfg({ camMode: "actual" }); window.__killAll(); window.__luna.go("oscuro"); window.__luna.ring(14, 24); window.__luna.ring(6, 32, "escarabajo"); }); await tick(p, 70); } },
    // Aliens (src/aliens.ts): fila con los 4 primeros (el enjambre ya pidió su manada, el emboscador empieza a enterrarse) y el tirador con su onda en vuelo
    { id: "aliens", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.row(["enjambre", "tirador", "saltador", "emboscador"], 8, 3); }); await tick(p, 6); } },
    { id: "aliens-onda", perf: false, act: async (p) => {
      await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.row(["tirador"], 15); });
      for (let i = 0; i < 80 && !(await p.evaluate(() => window.__luna.info().spits > 0)); i++) await tick(p, 4);
      await tick(p, 26);
    } },
    { id: "crater", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.crater(8, 3, 13); window.__luna.crater(4, -1.6, 24); }); await tick(p, 40); } },
    // Eventos (src/moon_events.ts): lluvia de meteoritos (mapa en rojo, marcas en el piso, meteoros en vuelo, cráteres con humo) y erupción que se expande
    { id: "meteoritos", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.meteor(14); }); await tick(p, 90); } },
    { id: "erupcion", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.erupt(); }); await tick(p, 360); } },
    // Sol y Tierra lanzan bichos (src/moon_sky.ts): __luna.astro(true|false) lanza ya; go(lugar, true) pone el auto de frente al Sol
    { id: "astro-fuego", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go([0.5, 0.2, 0], true); }); await tick(p, 30); await p.evaluate(() => window.__luna.astro(true)); await tick(p, 112); } }, // cae desde arriba: a 112 cuadros ya entró en cuadro
    { id: "astro-cohete", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("tierra"); }); await tick(p, 20); await p.evaluate(() => window.__luna.astro(false)); await tick(p, 120); } },
    { id: "astro-impacto", perf: false, act: async (p) => { await tick(p, 40); } }, // el cohete ya cayó: cráter, humo y el bicho-cohete saliendo
    // Naves (src/moon_ships.ts): __luna.ship(id) borra las naves y pone una 14 m delante del auto
    { id: "nave-nodriza", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.ship("nodriza"); }); await tick(p, 90); } },
    { id: "nave-bombardera", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.ship("bombardera"); }); await tick(p, 90); } },
    { id: "nave-abductora", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.ship("abductora"); }); await tick(p, 230); } },
    { id: "nave-caza", perf: false, act: async (p) => { await p.evaluate(() => { window.__killAll(); window.__luna.go("sol"); window.__luna.ship("caza"); }); await tick(p, 24); } },
  ] },
  // Los 8 aliens (src/aliens.ts) en una carga limpia (sin XP previa: no sube de nivel en medio). Fila de los 8; después los 4 últimos heridos
  // a la mitad (el flotante ya subió, el tanque encara con la placa, el explosivo se arma con su aro, el curandero tira el rayo) y el cráter del explosivo
  { id: "luna_aliens", query: "?mute&seed=3&zone=luna", shots: [
    { id: "ocho", perf: false, act: async (p) => { await labReady(p); await p.evaluate(() => { window.__play(3); window.__god(); window.__luna.go("sol"); window.__luna.row(undefined, 11, 2.6); }); await tick(p, 30); } }, // 30 cuadros: ya salió la tanda inicial de bichos (nuevos la borra)
    { id: "nuevos", perf: false, act: async (p) => { await p.evaluate(() => { window.__luna.clear(); window.__luna.row(["flotante", "tanque", "explosivo", "curandero"], 9, 3.2); window.__luna.wound(0.5); }); await tick(p, 50); } },
    { id: "cadena", perf: false, act: async (p) => { await p.evaluate(() => { window.__luna.clear(); window.__luna.row(["explosivo", "explosivo", "explosivo"], 12, 2, false); }); await tick(p, 2); await p.evaluate(() => window.__luna.killOne?.("explosivo")); await tick(p, 8); } }, // 3 explosivos juntos, se mata uno: revientan en cadena
    { id: "crater", perf: false, act: async (p) => { await tick(p, 90); } }, // 2,5 s después: la nube se fue, queda el cráter humeante y el piso quemado
    { id: "boom", perf: false, act: async (p) => { // si las armas matan algo y sube de nivel, se elige la primera carta (última captura de la sesión)
      for (let i = 0; i < 9; i++) { await tick(p, 10); if (!(await p.evaluate(() => document.getElementById("levelup").classList.contains("hidden")))) { await p.keyboard.press("1"); await p.keyboard.press("Enter"); } }
    } },
  ] },
  // Gusano lunar (src/moon_worm.ts, jefe final de la luna): __luna.worm(dist) lo hace salir ya delante del auto; arco y cráteres
  { id: "luna_gusano", query: "?mute&seed=3&zone=luna", shots: [
    { id: "aviso", perf: false, act: async (p) => { await labReady(p); await p.evaluate(() => { window.__play(3); window.__god(); window.__luna.go("sol"); window.__luna.clear(); window.__luna.worm(9); }); await tick(p, 2); } },
    { id: "arco", perf: false, act: async (p) => { await tick(p, 120); } }, // a mitad del arco, delante del auto
    { id: "crateres", perf: false, act: async (p) => { await tick(p, 260); } }, // ya se hundió: dos cráteres humeantes
  ] },
  // Objetivos de la luna (src/moon_goals.ts): __luna.goal(tipo, dist) y __luna.rocket(dist) los ponen ya delante; baliza, aro de zona y radar
  { id: "luna_goals", query: "?mute&seed=3&zone=luna", shots: [
    { id: "celdas", perf: false, act: async (p) => { await labReady(p); await p.evaluate(() => { window.__play(3); window.__god(); window.__luna.go("sol"); window.__luna.clear(); window.__luna.goal("celdas", 18); }); await tick(p, 200); } },
    { id: "antena", perf: false, act: async (p) => { await p.evaluate(() => { window.__luna.clear(); window.__luna.goal("antena", 16); }); await tick(p, 200); } },
    { id: "cohete", perf: false, act: async (p) => { await p.evaluate(() => { window.__luna.clear(); window.__luna.rocket(18); }); await tick(p, 200); } },
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
    { id: "podio", perf: false, tol: 5, act: async (p) => { await p.evaluate(() => window.__race.podium()); await tick(p, 15); await wait(p, () => !document.getElementById("rres").classList.contains("hidden")); await p.waitForTimeout(150); } },
  ] },
  { id: "carrera2j", query: "?mute&race&players=2", vps: ["pc"], shots: [
    { id: "pantalla-dividida", tol: 8, act: async (p) => { await wait(p, () => window.__info?.().state === "race" && document.getElementById("load").classList.contains("hidden")); await p.evaluate(() => { window.__race.auto(); window.__race.sim(5); }); } },
  ] },
  { id: "match3", query: "?mute&match3", vps: ["pc", "cel", "nb", "celh"], shots: [
    { id: "mapa", act: async (p) => {
      await wait(p, () => window.__info?.().state === "match3" && document.getElementById("match3-ui")?.classList.contains("on"));
      await wait(p, () => document.getElementById("load")?.classList.contains("hidden"));
      await tick(p, 12);
      await p.evaluate(() => { window.__match3.resetProgress(); window.__match3.unlockAll(); window.__match3.map(); });
      await tick(p, 40);
    } },
    { id: "objetivos", act: async (p) => {
      await p.evaluate(() => window.__match3.level(9));
      await tick(p, 8);
    } },
    { id: "juego", act: async (p) => {
      await p.evaluate(() => document.getElementById("m3-play")?.click());
      await tick(p, 20);
    } },
    { id: "combo", act: async (p) => {
      await p.evaluate(() => { window.__match3.put(3, 0, "bomb", 1); window.__match3.put(4, 0, "h", 2); });
      const a = await p.evaluate(() => window.__match3.cellPx(3, 0)), b = await p.evaluate(() => window.__match3.cellPx(4, 0));
      await p.mouse.click(a.x, a.y); await p.mouse.click(b.x, b.y);
      await tick(p, 14);
    } },
    { id: "pausa", act: async (p) => {
      await tick(p, 200);
      await p.keyboard.press("Escape");
      await tick(p, 10);
    } },
    { id: "victoria", act: async (p) => {
      await p.keyboard.press("Escape");
      await p.evaluate(() => window.__match3.win());
      await tick(p, 260);
    } },
    { id: "jefe", act: async (p) => {
      await p.evaluate(() => window.__match3.level(10, true));
      await tick(p, 20);
    } },
    { id: "derrota", act: async (p) => {
      await p.evaluate(() => window.__match3.lose());
      await tick(p, 60);
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
      await p.click('#scr-main [data-go="modes"]');
      await wait(p, () => document.getElementById("scr-modes")?.classList.contains("on"));
      await p.click('#scr-modes [data-go="match3"]');
      await wait(p, () => document.getElementById("scr-match3")?.classList.contains("on"));
      await tick(p, 8);
    } },
  ] },
];
// ---------- ENCORE: la Luna con 1, 2 y 4 jugadores y el FINAL ACT (solo compu: en celular ENCORE es de 1) ----------
// Joysticks simulados 0..n-1 (sticks corridos distinto para que cada auto se mueva); para 3-4 jugadores el juego los espera conectados.
const fakePads = (n) => (p) => p.evaluate((n) => {
  const b = (on, v = on ? 1 : 0) => ({ pressed: on, touched: on, value: v });
  const pads = Array.from({ length: n }, (_, i) => ({ id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", index: i, connected: true, mapping: "standard", timestamp: 1,
    axes: [0.5 - i * 0.3, -0.4 + i * 0.2, 0.1, 0], buttons: Array.from({ length: 17 }, (_, k) => b(k === 7)) }));
  navigator.getGamepads = () => [...pads, ...Array(4 - n).fill(null)];
}, n);
const encoreIn = (n) => async (p) => { // ?encore arranca solo; se espera la partida, se arma la fila de bichos de la Luna y se corren cuadros
  if (n > 2) await fakePads(n)(p);
  await wait(p, () => window.__enc?.info?.() && window.__info().state === "play");
  await p.evaluate(() => { window.__god(); window.__luna.ring(10, 13); window.__luna.ring(14, 24); });
  await tick(p, 120);
};
// Salta de escenario en escenario por la API de __enc (aterrizar, abordar, avanzar, votar "final") hasta la fase final
const finalAct = async (p) => {
  await wait(p, () => window.__enc?.info?.());
  for (let i = 0; i < 60 && (await p.evaluate(() => window.__enc.info().phase)) !== "final"; i++) await p.evaluate(() => {
    const E = window.__enc, ph = E.info().phase;
    if (ph === "stage") { E.land(); E.board(); }
    else if (ph === "teleporter" || ph === "stay") E.pick(1);
    else if (ph === "vote") E.pick(1);
    else if (ph === "guest") { window.__killBoss(); E.tick(1); }
    else if (ph === "pact" || ph === "route") E.pick(0);
    else E.tick(60); // overload y demás: que corra el reloj de fase
    window.__tick(2);
  });
  if ((await p.evaluate(() => window.__enc.info().phase)) !== "final") throw new Error("no se llegó al FINAL ACT");
  await tick(p, 90);
};
const encoreSession = (n) => ({ id: `encore${n}`, query: `?mute&seed=3&encore&players=${n}`, vps: ["pc"], shots: [
  { id: "luna", act: encoreIn(n) },
  { id: "final", act: finalAct },
] });

// Paseo libre: menú (botón + selección de auto), un shot por barrio en vista de juego y la pausa con el selector de luz.
// El auto se coloca con el patrón de kart.ts (lakitu): cuerpo sin preStep, pose, velocidad cero y unos cuadros.
const libreAt = (x, z, yaw = 0) => async (p) => {
  await p.evaluate(([x, z, yaw]) => {
    const c = window.__carObj(); c.body.disablePreStep = false;
    c.root.position.set(x, 1.5, z); c.root.rotationQuaternion.copyFromFloats(0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2));
    c.body.setLinearVelocity({ x: 0, y: 0, z: 0 }); c.body.setAngularVelocity({ x: 0, y: 0, z: 0 });
  }, [x, z, yaw]);
  await tick(p, 6); await p.evaluate(() => { window.__carObj().body.disablePreStep = true; }); await tick(p, 80); await p.waitForTimeout(150);
};
sessions.push({ id: "libre", query: "?mute&seed=3", shots: [
  { id: "menu-boton", perf: false, act: async (p) => { await p.evaluate(() => window.__cfg({ controlesVistos: true, encore: { best: { loop: 0, stage: 0, t: 0 }, wins: 0, runs: 1, lastLoop: 0, lastCause: "", secrets: [], tips: [], seenPacts: [], seenVariants: [] } })); await toMain(p); await p.waitForTimeout(150); } },
  { id: "menu-auto", perf: false, act: async (p) => { await view("modes")(p); await p.dispatchEvent('#scr-modes [data-go="libre"]', "click"); await wait(p, () => document.querySelector("#scr-libre.on")); await p.waitForTimeout(150); await p.dispatchEvent('[data-act="lcar"]', "click"); await tick(p, 40); await p.waitForTimeout(150); } },
  { id: "centro", act: async (p) => { await p.dispatchEvent('[data-act="libregow"]', "click"); await wait(p, () => window.__info?.().state === "play"); await libreAt(0, -20)(p); } },
  { id: "skate", act: libreAt(-150, 130) },
  { id: "parque", act: libreAt(130, 20) },
  { id: "acuatico", act: libreAt(152, 130) },
  { id: "nieve", act: libreAt(-150, -100, Math.PI) },
  { id: "obstaculos", act: libreAt(160, -140, Math.PI / 2) }, // sobre el carril A, mirando al este: antes (150, -100) mostraba solo suelo y el circuito quedaba lejos
  { id: "tuerca", perf: false, act: libreAt(26, 28, 0.322) }, // tuerca dorada sobre el trampolín del atajo noreste, a ~20 m al frente (34, 3,5, 46)
  // Cartel de ayuda y botón táctil GIRO: el auto se suelta a 14 m (cae ~1,5 s) y se captura al poco de despegar, con el aviso de una sola vez
  { id: "aire", perf: false, act: async (p) => { await libreAt(-150, 130)(p); await p.evaluate(async () => { (await import("/src/menu.ts")).save.libre.aviso = false; }); // el cartel sale una sola vez: las caídas de libreAt ya lo gastaron
    await p.evaluate(() => { const c = window.__carObj(); c.body.disablePreStep = false; c.root.position.y = 14; c.body.setLinearVelocity({ x: 0, y: 0, z: 0 }); }); await tick(p, 40); await p.evaluate(() => { window.__carObj().body.disablePreStep = true; }); await p.waitForTimeout(200); } },
  // Cartel de truco y contador de tuercas: se disparan con las funciones del HUD (el truco real depende de la física; eso lo prueba la sonda de la tanda E6)
  { id: "truco", perf: false, act: async (p) => { await libreAt(-150, 130)(p); await p.evaluate(async () => { const u = await import("/src/ui.ts"); u.hudTruco("GIRO 360 + VUELTA", 640, 2, true, "RÉCORD"); u.hudTuercas(7, 24); }); await p.waitForTimeout(450); } },
  // Desafíos (free_challenges.ts): largada del contrarreloj, puntaje de trucos y llegada con récord guardado (la sonda falla si no se guarda)
  { id: "desafio-obs", perf: false, act: libreAt(140, -140, Math.PI / 2) },
  { id: "desafio-skate", perf: false, act: libreAt(-70, 40) },
  { id: "desafio-fin", perf: false, act: async (p) => { await libreAt(0, -20)(p); await libreAt(140, -140, Math.PI / 2)(p);
    await libreAt(246, -230, Math.PI / 2)(p); // directo a la meta: sin puntos de control NO termina
    const antes = await p.evaluate(async () => (await import("/src/menu.ts")).save.libre.desafio.obs); if (antes > 0) throw new Error("la meta contó sin pasar por los puntos de control: " + antes);
    await libreAt(250, -162)(p); await libreAt(140, -207)(p); await libreAt(246, -230, Math.PI / 2)(p);
    const r = await p.evaluate(async () => (await import("/src/menu.ts")).save.libre.desafio.obs); if (!(r > 0)) throw new Error("el récord del contrarreloj no se guardó: " + r); } },
  // Objetivo de barrio: bajar al bowl chico del skatepark lo tilda y avisa (sonda: falla si no queda en save.libre.metas)
  { id: "objetivo", perf: false, act: async (p) => { await libreAt(-45, 140)(p); await p.waitForTimeout(300);
    const m = await p.evaluate(async () => (await import("/src/menu.ts")).save.libre.metas); if (!m.includes("skate_bowl")) throw new Error("el objetivo del bowl no se tildó: " + m); } },
  { id: "pausa", perf: false, act: async (p) => { await p.keyboard.press("Escape"); await wait(p, () => document.querySelector("#scr-pause.on")); await p.waitForTimeout(200); } },
  { id: "pausa-noche", perf: false, act: async (p) => { await p.dispatchEvent('[data-act="luz:3"]', "click"); await tick(p, 4); await p.waitForTimeout(200); } },
  // Modo foto (F desde la pausa): captura con marco de polaroid; se intercepta la descarga y se muestra el PNG en pantalla
  { id: "polaroid", perf: false, act: async (p) => {
    await p.evaluate(() => { window.__blobs = []; const o = URL.createObjectURL; URL.createObjectURL = (b) => (window.__blobs.push(b), o(b)); HTMLAnchorElement.prototype.click = function () {}; document.getElementById("barrio").textContent = "Skatepark"; });
    await p.keyboard.press("KeyF"); await p.waitForTimeout(200); await p.keyboard.press("KeyC"); await tick(p, 3);
    await wait(p, () => window.__blobs.length); await p.waitForTimeout(150);
    await p.evaluate(async () => { const i = document.createElement("img"); i.src = URL.createObjectURL(window.__blobs[0]); i.style.cssText = "position:fixed;inset:0;margin:auto;max-width:92vw;max-height:92vh;z-index:9999;background:#000"; document.body.append(i); await i.decode(); });
    await p.waitForTimeout(150); } },
  { id: "polaroid-fin", perf: false, act: async (p) => { await p.evaluate(() => { document.querySelector("img[style*='9999']")?.remove(); }); await p.keyboard.press("Escape"); await p.waitForTimeout(150); } },
  { id: "salir", perf: false, act: async (p) => { await p.dispatchEvent('[data-act="luz:4"]', "click"); await p.dispatchEvent('[data-act="quit"]', "click"); await wait(p, () => document.querySelector("#scr-main.on")); await p.waitForTimeout(150); } },
] });

// Auditoría de arte 0.95 (docs/ROADMAP-1.0.md, contraste 0,19-0,23 con scripts/ref_measure.py): una captura por escena de ENCORE en la cámara de juego,
// con el auto quieto en la salida (0, y, 0) mirando a -z (como encScene), sin enemigos ni HUD. Las zonas planas se arman con setZone (sin pasar por el sorteo de zoneOf);
// la Luna de día es la salida (ARRIVE.salida) y la de noche la llegada "oscuro" (DARK_DIR, mirando al Sol).
const escena = (z) => async (p) => {
  await wait(p, () => window.__enc?.info?.() && window.__info().state === "play");
  await p.evaluate(async (z) => {
    // Determinismo de la medición: Math.random sembrado por escena (texturas canvas, rocas, parpadeos) y "calm" apaga el parpadeo del tubo del garaje (usa performance.now, no el tick)
    let sd = 0; for (const ch of z) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0;
    Math.random = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
    document.body.classList.add("calm");
    window.__god();
    const W = await import("/src/world.ts"), M = await import("/src/moon.ts"), R = await import("/src/encore_run.ts"), G = await import("/src/moon_goals.ts"), V = window.__carObj().root.position.constructor; // Vector3 de Babylon sin resolver el paquete desde la página
    const luna = z.startsWith("luna");
    if (luna) window.__enc.jump(0, 1); else { G.goalsClear(); M.setMoon(false); W.setZone(z, false); W.buildLayout(); const cl = W.zoneClimate(); if (cl) (await import("/src/render.ts")).applyClimate(cl); } // clima propio de la zona (setZone no lo aplica y el ciclo solo reaplica al cambiar la hora) // goalsClear: cofres y decorado del escenario anterior (TV, pieza amarilla) no pasan a la zona nueva
    window.__killAll();
    if (luna) R.moonPlace(z === "luna-noche" ? M.DARK_DIR : V.Up(), z === "luna-noche" ? M.SUN_DIR : new V(0, 0, 1));
    else R.carPlace(new V(0, window.__carObj().def.size[1] / 2 + 0.3, 0), new V(0, 0, -1));
  }, z);
  await tick(p, 90); await p.waitForTimeout(600); await tick(p, 5); // la textura webp del piso de nieve carga async: sin la espera la primera captura salía celeste liso
  await p.evaluate(() => { window.__killAll(); for (const e of document.querySelectorAll("body *")) if (e.tagName !== "CANVAS" && !e.querySelector("canvas")) e.style.visibility = "hidden"; });
  await tick(p, 2); await p.waitForTimeout(150);
};
sessions.push({ id: "escenas", query: "?mute&seed=3&encore", vps: ["pc", "cel"], shots: ["patio", "jardin", "garaje", "galpon", "desvan", "pileta", "cocina", "bosque", "nieve", "ciudad", "industrial", "luna-dia", "luna-noche"].map((z) => ({ id: z, perf: false, act: escena(z) })) });

sessions.push(encoreSession(1), encoreSession(2), encoreSession(4));
export { tick, info };
