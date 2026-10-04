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

// ---------- partida ----------
const lab = (o) => async (p) => { await wait(p, () => window.__lab); await p.evaluate((o) => window.__lab(o), o); };
const partida = (secs) => async (p) => { await p.evaluate((s) => { window.__play(3); window.__god(); window.__sim(s); }, secs); await tick(p, 45); }; // semilla 3; god: la captura no depende de que el bot sobreviva; 45 cuadros para que la cámara alcance al auto
const labAnts = async (p) => { await p.evaluate(() => { window.__lab({ frames: 2 }); window.__ants(300); }); };

export const sessions = [
  { id: "menu", query: "?mute&seed=3", shots: [
    { id: "carga", act: carga, perf: false },
    { id: "portada", act: sinCarga },
    { id: "principal", act: async (p) => { await p.dispatchEvent("#scr-title", "click"); await wait(p, () => document.querySelector("#scr-main.on")); await p.waitForTimeout(150); } },
    { id: "garaje", act: view("garage") },
    { id: "garaje-vista-previa", act: async (p) => { await view("garage")(p); await p.focus('.carc.locked[data-k="tanque"]'); await p.waitForTimeout(400); } },
    { id: "taller", act: view("shop") },
    { id: "config", act: view("config") },
    // Imagen con Escalado FSR: la escala % se oculta y aparece el modo FSR (fila dependiente)
    { id: "config-fsr", act: async (p) => { await p.evaluate(() => { const s = document.querySelector('select[data-set="scaler"]'); s.value = "fsr"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await p.waitForTimeout(150); } },
    { id: "bestiario", act: async (p) => { await p.evaluate(() => window.__cfg({ scaler: "simple" })); await view("bestiary")(p); } },
    { id: "ficha", act: async (p) => { await p.dispatchEvent("#beasts [data-beast]", "click"); await wait(p, () => document.querySelector("#scr-beast.on")); await p.waitForTimeout(500); } },
    { id: "creditos", act: view("credits") },
  ] },
  { id: "lab", query: "?mute&seed=3&lab", shots: [
    { id: "noche", act: async (p) => { await wait(p, () => window.__lab); await p.evaluate(() => window.__lab({})); } }, // se rearma a mano: el arranque solo del ?lab corre con tiempo real
    { id: "jefes", act: lab({ boss: true }) },
    { id: "niebla", act: lab({ climate: "niebla" }) },
    { id: "farol", act: lab({ climate: "farol" }) },
    { id: "hormigas300", act: labAnts, shot: false }, // solo medición: 300 instancias
    { id: "preset-bajo", act: async (p) => { await p.evaluate(() => { window.__cfg({ preset: "bajo" }); window.__lab({}); }); } }, // preajuste Bajo (lo demás corre en Medio, el de fábrica)
    { id: "fsr-fxaa", act: async (p) => { await p.evaluate(() => { window.__cfg({ preset: "medio", scaler: "fsr", fsr: "rendimiento", aa: "fxaa", sharpen: 0.6 }); window.__lab({}); }); } }, // FXAA antes del agrandado de FSR
  ] },
  { id: "partida", query: "?mute&seed=3", shots: [
    { id: "curso", act: partida(90) },
    { id: "cartas", act: async (p) => { await p.evaluate(() => window.__xp(9999)); await tick(p, 4); await wait(p, () => !document.getElementById("levelup").classList.contains("hidden")); await p.waitForTimeout(300); } },
  ] },
  { id: "carrera", query: "?mute&race", shots: [
    { id: "largada", act: async (p) => { await wait(p, () => window.__info?.().state === "race" && document.getElementById("load").classList.contains("hidden")); } },
    { id: "curso", tol: 8, act: async (p) => { await p.evaluate(() => { window.__race.auto(); window.__race.sim(8); }); } }, // tol alto: kart.ts usa Math.random en objetos y partículas
  ] },
  { id: "carrera2j", query: "?mute&race&players=2", vps: ["pc"], shots: [
    { id: "pantalla-dividida", tol: 8, act: async (p) => { await wait(p, () => window.__info?.().state === "race" && document.getElementById("load").classList.contains("hidden")); await p.evaluate(() => { window.__race.auto(); window.__race.sim(5); }); } },
  ] },
];
export { tick, info };
