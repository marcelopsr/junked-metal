// Genera balance.xlsx desde src/balance.json: una hoja por tabla (fila 1 = columnas, fila 2 = descripción de cada columna, datos desde la 3)
// y tres hojas CALCULADAS con fórmulas que se actualizan solas al editar las hojas de datos (Excel y Google Sheets).
// Uso: npm run balance:xlsx [-- salida.xlsx]      (por defecto ./balance.xlsx)
// Flujo completo y formato de vuelta (balance-import.mjs): sección "Balance" de CLAUDE.md.
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bal = JSON.parse(readFileSync(resolve(root, "src/balance.json"), "utf8"));
const out = resolve(process.argv[2] ?? resolve(root, "balance.xlsx"));

// ---------- descripciones de columnas (fila 2 de cada hoja) ----------
const LISTA = { id: "Identificador (no cambiar)", valor: "Número: editar solo esta columna", descripcion: "Qué controla" };
const DESC = {
  enemigos: {
    id: "Identificador del bicho (no cambiar)", nombre: "Nombre (referencia: el juego usa el del código)",
    tipo: "bicho, minijefe o jefe_final (referencia: define cómo calcula la hoja Golpes para matar)",
    vida: "Vida base. Bichos normales: × ritmo.dureza_vida y × el escalado por tiempo; jefes: se usa tal cual",
    velocidad: "Velocidad máxima (m/s)", dano: "Daño base de contacto (golpe real = dano × ritmo.contacto_dano; × dureza en bichos normales)",
    peso: "Masa física: cuánto cuesta empujarlo", xp: "Tuercas de XP que suelta (× dureza_xp en bichos normales)",
    aparece_min: "Minuto desde el que entra en la mezcla común (las plagas pueden adelantarlo)",
    peso_base: "Peso de aparición en la mezcla al llegar a su minuto", peso_por_min: "Peso extra por cada minuto de partida",
  },
  armas: {
    id: "Identificador del arma (no cambiar)", nombre: "Nombre (referencia)", unidad_dano: "Qué significa un golpe de esa arma (referencia, para leer la hoja Golpes para matar)",
    dano_base: "Daño = dano_base + dano_nivel × nivel (antes del daño del equipo)", dano_nivel: "Daño extra por nivel (Lápiz-lanza: +fracción de embestida por nivel)",
    dano_evo_mult: "Evolución: multiplicador del daño normal", dano_evo_fijo: "Evolución: daño fijo (0 = no aplica; manda sobre el multiplicador)",
    recarga_base: "Segundos entre disparos al nivel 0", recarga_min: "Piso de la recarga (segundos)", recarga_nivel: "Segundos menos de recarga por nivel: max(piso, base − nivel × N)",
    recarga_div: "Solo Gomitas y Helado: recarga = base ÷ (1 + div × (nivel − 1))", recarga_evo: "Evolución: recarga fija en segundos (0 = no aplica)",
    recarga_evo_div: "Evolución: divisor de la recarga (1 = sin cambio)",
    alcance: "Distancia (m) a la que busca objetivo", alcance_evo: "Ídem evolucionada (0 = no aplica)",
    area_base: "Radio, largo o tamaño del efecto (m) al nivel 0", area_nivel: "Metros extra por nivel", area_evo: "Ídem evolucionada (0 = no aplica; Lápiz-lanza: radio de la onda del Ariete)",
    n_base: "Proyectiles: base", n_cada: "Proyectiles: uno más cada tantos niveles", n_desde: "Proyectiles: cantidad = base + piso((nivel − desde) ÷ cada)", n_evo: "Evolución: cantidad fija (0 = no aplica)",
    duracion_base: "Segundos de vida del proyectil, zona o chorro", duracion_nivel: "Segundos extra por nivel", duracion_evo: "Ídem evolucionada (0 = no aplica)",
    velocidad: "Velocidad del proyectil (m/s)",
  },
  pasivas: {
    id: "Identificador (no cambiar)", nombre: "Nombre (referencia)",
    base: "Valor base (solo Imán: radio de recolección en m)",
    por_nivel: "Efecto por nivel: Imán, Resorte y Lupa +fracción; Turbo +fracción de velocidad; Litio +vida máxima; Capacitor y LEGO: multiplicador compuesto (0,92 = −8% por nivel)",
    base2: "Base del efecto secundario (Turbo: recarga del turbo por s; Litio: regeneración por s)",
    por_nivel2: "Efecto secundario por nivel (Turbo: +fracción de recarga; Litio: regeneración por s; LEGO: +fracción de peso)",
  },
  autos: {
    id: "Identificador (no cambiar)", nombre: "Nombre (referencia)", precio: "Precio en tornillos (0 = de serie)", vida: "Vida máxima", velocidad: "Velocidad máxima (m/s)",
    aceleracion: "Aceleración (m/s²)", giro: "Velocidad de giro", agarre: "Agarre lateral (más alto = menos derrape)", embestida: "Multiplicador del daño de embestida", masa: "Masa (peso al chocar)",
  },
  pilotos: {
    id: "Identificador (no cambiar)", nombre: "Nombre (referencia)", precio: "Precio en tornillos (0 = de serie o por logro)",
    dano_mult: "Multiplicador del daño del equipo (1 = sin cambio)", vida_mas: "Vida máxima extra (suma)", iman_mult: "Multiplicador del radio del imán",
    regen_mas: "Regeneración extra por segundo (suma)", blindaje_mult: "Multiplicador del daño recibido (0,88 = recibe 12% menos)", blindaje_mas: "Suma al blindaje (−0,1 = recibe 10% más)",
    velocidad_mult: "Multiplicador de velocidad", peso_mult: "Multiplicador de masa del auto", recarga_mult: "Multiplicador del tiempo de recarga de armas (1,1 = 10% más lentas)",
    xp_mult: "Multiplicador de XP", arma_inicial: "Arma con la que arranca (id de la hoja armas)",
  },
  precios: {
    id: "Identificador (no cambiar)", tipo: "mejora, habilidad, arma, zona o pieza (referencia)", nombre: "Nombre (referencia)",
    efecto: "Efecto por nivel de la mejora: Chasis +vida, Piñón +fracción de daño, Motor +fracción de velocidad, Imán +fracción, Contador de tuercas +fracción de XP, Placa de lata +fracción de blindaje, Cinta aisladora +vida/s, Nafta de encendedor +fracción de turbo (recarga y duración), Paragolpes de fierro +fracción de daño al embestir, Gatillo engrasado −fracción de recarga de armas (0 = fijo; habilidades: ver ritmo habilidad_cd_nivel y habilidad_efecto_nivel)",
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => ["nivel" + (i + 1), `Precio en tornillos del nivel ${i + 1} (vacío = ese nivel no existe)`])),
  },
  plagas: {
    id: "Identificador (no cambiar)", nombre: "Nombre (referencia)",
    ...Object.fromEntries(["hormiga", "friccion", "escupidora", "robot", "polilla", "escarabajo"].flatMap((k) => [["mult_" + k, `Multiplicador del peso de aparición: ${k}`], ["desde_" + k, `Minuto desde el que aparece ${k} (−1 = su minuto normal)`]])),
  },
  armas_extra: LISTA, ritmo: LISTA, ataques: LISTA,
  duelo: LISTA,
  duelo_chasis: {
    id: "Identificador (no cambiar)", nombre: "Nombre en UI (referencia)",
    masa_kg: "Masa del chasis (kg) para física y barras", hp_bonus: "Vida extra sumada a duelo.hp_base",
    traccion_mul: "Multiplicador de tracción (1 = referencia)", vel_max_mul: "Multiplicador de velocidad máxima",
    cog_y_m: "Centro de gravedad Y (m) para preview y física",
  },
  duelo_ruedas: {
    id: "Identificador (no cambiar)", nombre: "Nombre en UI (referencia)",
    masa_kg: "Masa (kg)", vel_max_mul: "Multiplicador de velocidad máxima",
    traccion_mul: "Multiplicador de tracción", lift_m: "Metros que eleva el chasis (gigantes)",
  },
  duelo_armas: {
    id: "Identificador (no cambiar)", nombre: "Nombre en UI (referencia)",
    masa_kg: "Masa (kg)", dano_base: "Daño base melee antes de velocidad/RPM",
    push_mul: "Multiplicador de empuje Havok", rpm_max: "RPM máxima (0 = no aplica)",
    rpm_carga_s: "Segundos para cargar de 0 a RPM máx (trompo; 0 = no aplica)",
    knock_up_n: "Impulso vertical en sierra (0 = no aplica)",
  },
  duelo_rival: {
    id: "Identificador del rival (no cambiar)", nombre: "Nombre en UI",
    chasis_id: "Id en duelo_chasis", ruedas_id: "Id en duelo_ruedas", arma_id: "Id en duelo_armas",
    cuerpo_color: "Color hex cuerpo", bandas_color: "Color hex bandas/orugas", pala_color: "Color hex del arma",
  },
};

// ---------- utilidades ----------
const letter = (n) => { let s = ""; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; }; // 0 -> A
const LAST = 500; // las búsquedas miran hasta esta fila: sobra espacio para agregar filas a mano. ponytail: tope fijo, subirlo si una hoja pasa de 500 filas
const cols = (t) => Object.keys(bal[t][0]);
// =INDEX(hoja!columna, MATCH(clave, hoja!id, 0)): se busca por id, así se pueden reordenar las filas de las hojas de datos
const look = (tabla, col, key) => `INDEX(${tabla}!$${letter(cols(tabla).indexOf(col))}$3:$${letter(cols(tabla).indexOf(col))}$${LAST},MATCH(${key},${tabla}!$A$3:$A$${LAST},0))`;
const R = (id) => look("ritmo", "valor", `"${id}"`); // un valor de la hoja ritmo

const wb = new ExcelJS.Workbook();
wb.calcProperties = { fullCalcOnLoad: true };
const HEAD = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } }, INPUT = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2B3" } }, CALC = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F1FB" } };
const head = (cell) => { cell.fill = HEAD; cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; };

// ---------- 0) Leeme ----------
const info = wb.addWorksheet("Leeme");
[
  "Balance de Junked Metal. Esta planilla se genera desde src/balance.json (npm run balance:xlsx) y vuelve al juego con npm run balance:import.",
  "Hojas de datos (se importan): enemigos, armas, armas_extra, pasivas, ritmo, ataques, autos, pilotos, precios, plagas, duelo, duelo_chasis, duelo_ruedas, duelo_armas, duelo_rival. Fila 1 = columnas, fila 2 = qué significa cada una.",
  "Se editan SOLO los números. No cambiar los id, no agregar ni borrar filas ni columnas (el importador lo rechaza). Las columnas nombre y tipo son referencia.",
  "Hojas calculadas (no se importan): Golpes para matar, Tiempo jefe, Partidas para comprar. Se actualizan solas. Las celdas amarillas son supuestos editables solo de la hoja calculada.",
  "Para volver al juego: Archivo > Descargar > Valores separados por tabulaciones (.tsv) de cada hoja de datos, juntar en un .txt con una línea '### nombre_hoja' antes de cada una y correr npm run balance:import -- archivo.txt.",
  "Usar punto decimal (configuración regional de EE. UU.) o coma sin separador de miles. El importador avisa de las diferencias antes de escribir el JSON.",
].forEach((t, i) => { info.getCell(1 + i, 1).value = t; });
info.getColumn(1).width = 160;
info.getCell(1, 1).font = { bold: true };

// ---------- 1) hojas de datos ----------
for (const t of Object.keys(DESC)) {
  const ws = wb.addWorksheet(t), cs = t in DESC && ["armas_extra", "ritmo", "ataques"].includes(t) ? ["id", "valor", "descripcion"] : cols(t);
  ws.addRow(cs); ws.addRow(cs.map((c) => DESC[t][c] ?? ""));
  for (const r of bal[t]) ws.addRow(cs.map((c) => (t === "precios" && c.startsWith("nivel") && r[c] === 0 ? null : r[c]))); // nivel sin precio = celda vacía
  ws.getRow(1).eachCell(head);
  ws.getRow(2).eachCell((c) => { c.font = { italic: true, color: { argb: "FF6B7280" } }; c.alignment = { wrapText: true, vertical: "top" }; });
  ws.getRow(2).height = 78;
  cs.forEach((c, i) => { ws.getColumn(i + 1).width = c === "descripcion" ? 95 : c === "id" ? 26 : c === "nombre" ? 26 : c === "valor" ? 11 : 13; });
  ws.getColumn(1).font = { bold: true };
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];
}

// ---------- 2) Golpes para matar ----------
{
  const ws = wb.addWorksheet("Golpes para matar");
  ws.getCell("A1").value = "Golpes para matar"; ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").value = "Cuántos golpes de cada arma (a nivel 1 y a nivel 5, sin evolución) y cuántas embestidas hacen falta para matar a cada bicho. Se recalcula con las hojas enemigos, armas, autos y ritmo.";
  const P = [
    ["Segundo de la partida (la vida de los bichos normales sube con el tiempo)", 0],
    ["Multiplicador de daño del equipo (pasivas Lupa, mejoras del taller, piloto)", 1],
    ["Auto de la embestida (id de la hoja autos)", "buggy"],
    ["Velocidad típica de embestida hacia el enemigo (m/s)", 12],
    ["Multiplicador extra de embestida (turbo 1,3; Lápiz-lanza nivel 5: 2,75)", 1],
  ];
  P.forEach(([t, v], i) => { ws.getCell(4 + i, 1).value = t; const c = ws.getCell(4 + i, 2); c.value = v; c.fill = INPUT; });
  const weapons = bal.armas.filter((a) => a.id !== "lanza"), W0 = 4; // primera columna de armas (E)
  ws.getCell("D9").value = "arma"; ws.getCell("D10").value = "id del arma"; ws.getCell("D11").value = "nivel"; ws.getCell("D12").value = "vida efectiva / daño por golpe";
  ["id", "nombre", "tipo"].forEach((h, i) => { ws.getCell(12, 1 + i).value = h; });
  weapons.forEach((w, i) => [1, 5].forEach((lv, j) => {
    const c = W0 + i * 2 + j, L = letter(c);
    ws.getCell(9, c + 1).value = { formula: look("armas", "nombre", `${L}$10`) };
    ws.getCell(10, c + 1).value = w.id;
    ws.getCell(11, c + 1).value = lv;
    ws.getCell(12, c + 1).value = { formula: `(${look("armas", "dano_base", `${L}$10`)}+${look("armas", "dano_nivel", `${L}$10`)}*${L}$11)*$B$5` };
  }));
  const RC = W0 + weapons.length * 2, RL = letter(RC); // columna de la embestida
  ws.getCell(9, RC + 1).value = "Embestida"; ws.getCell(10, RC + 1).value = "embestida";
  ws.getCell(12, RC + 1).value = { formula: `$B$7*${look("autos", "embestida", "$B$6")}*$B$8*$B$5` };
  bal.enemigos.forEach((e, i) => {
    const r = 13 + i, ID = `$A${r}`;
    ws.getCell(r, 1).value = e.id;
    ws.getCell(r, 2).value = { formula: look("enemigos", "nombre", ID) };
    ws.getCell(r, 3).value = { formula: look("enemigos", "tipo", ID) };
    // bichos normales: vida × dureza_vida × (1 + t / escala); jefes: vida tal cual (main.ts: spawnEnemy, Enemy)
    ws.getCell(r, 4).value = { formula: `IF($C${r}="bicho",${look("enemigos", "vida", ID)}*${R("dureza_vida")}*(1+$B$4/${R("vida_escala_seg")}),${look("enemigos", "vida", ID)})` };
    for (let c = W0; c <= RC; c++) ws.getCell(r, c + 1).value = { formula: `IF(${letter(c)}$12>0,ROUNDUP($D${r}/${letter(c)}$12,0),"-")` };
  });
  ws.getRow(12).eachCell((c) => { c.fill = CALC; c.font = { bold: true }; });
  ws.getRow(10).eachCell((c) => { c.font = { color: { argb: "FF6B7280" } }; });
  ws.getColumn(1).width = 62; ws.getColumn(2).width = 26; ws.getColumn(3).width = 12; ws.getColumn(4).width = 26;
  for (let c = W0; c <= RC; c++) ws.getColumn(c + 1).width = 13;
  ws.getRow(9).eachCell((c) => { c.alignment = { wrapText: true, vertical: "top" }; });
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: 12 }];
}

// ---------- 3) Tiempo jefe ----------
{
  const ws = wb.addWorksheet("Tiempo jefe");
  ws.getCell("A1").value = "Tiempo para matar a cada jefe"; ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").value = "Segundos estimados = vida ÷ (DPS supuesto × presencia). El DPS es un SUPUESTO por jefe (calibrar con __bossDuel: ver CLAUDE.md); no sale de la hoja armas.";
  ws.getCell("A4").value = "Presencia: fracción del tiempo en que el equipo logra pegarle al jefe (0 a 1)"; ws.getCell("B4").value = 0.8; ws.getCell("B4").fill = INPUT;
  ["id", "nombre", "tipo", "vida (con segunda barra)", "DPS supuesto del equipo", "segundos para matarlo", "minutos"].forEach((h, i) => { const c = ws.getCell(6, 1 + i); c.value = h; head(c); });
  bal.enemigos.filter((e) => e.tipo !== "bicho").forEach((e, i) => {
    const r = 7 + i, ID = `$A${r}`;
    ws.getCell(r, 1).value = e.id;
    ws.getCell(r, 2).value = { formula: look("enemigos", "nombre", ID) };
    ws.getCell(r, 3).value = { formula: look("enemigos", "tipo", ID) };
    ws.getCell(r, 4).value = { formula: `${look("enemigos", "vida", ID)}*IF($C${r}="jefe_final",1+${look("ataques", "valor", '"segunda_barra_vida"')},1)` }; // jefe final: las dos barras
    ws.getCell(r, 5).value = e.tipo === "jefe_final" ? 600 : 200; ws.getCell(r, 5).fill = INPUT; // supuesto: equipo del minuto 10 / del minuto 3 a 7
    ws.getCell(r, 6).value = { formula: `IF($E${r}*$B$4>0,$D${r}/($E${r}*$B$4),"-")` };
    ws.getCell(r, 7).value = { formula: `IF(ISNUMBER($F${r}),$F${r}/60,"-")` };
    ws.getCell(r, 6).numFmt = "0.0"; ws.getCell(r, 7).numFmt = "0.0";
  });
  [26, 26, 12, 12, 24, 22, 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.getColumn(1).width = 70;
}

// ---------- 4) Partidas para comprar ----------
{
  const ws = wb.addWorksheet("Partidas para comprar");
  ws.getCell("A1").value = "Partidas para comprar"; ws.getCell("A1").font = { bold: true, size: 14 };
  ws.getCell("A2").value = "Precio ÷ tornillos promedio por partida, por cada nivel de mejora, auto, piloto, zona y pieza. Se recalcula con las hojas precios, autos, pilotos y ritmo.";
  ws.getCell("A4").value = "Tornillos promedio por partida (sale de ritmo tornillos_partida_tipica; el taller lo usa para decir cuántas partidas faltan)"; ws.getCell("B4").value = { formula: R("tornillos_partida_tipica") }; ws.getCell("B4").fill = CALC;
  ws.getCell("A5").value = "Referencia: tiempo medio sobrevivido (s)"; ws.getCell("B5").value = 420; ws.getCell("B5").fill = INPUT;
  ws.getCell("A6").value = "Referencia: bajas medias por partida"; ws.getCell("B6").value = 600; ws.getCell("B6").fill = INPUT;
  ws.getCell("A7").value = "Referencia: jefes derrotados por partida"; ws.getCell("B7").value = 1; ws.getCell("B7").fill = INPUT;
  ws.getCell("A8").value = "Tornillos por partida según la fórmula del juego con esas referencias (no alimenta nada)";
  ws.getCell("B8").value = { formula: `INT((B7*${R("tornillos_jefe")}+INT(B5/${R("tornillos_div_tiempo")})+INT(B6*${R("dureza_xp")}/${R("tornillos_div_bajas")})))` };
  const H = ["tipo", "id", "nombre", ...Array.from({ length: 10 }, (_, i) => "nivel" + (i + 1)), "total"];
  H.forEach((h, i) => { const c = ws.getCell(10, 1 + i); c.value = h; head(c); });
  const items = [
    ...bal.precios.map((p) => ({ tabla: "precios", tipo: p.tipo, id: p.id, niveles: Array.from({ length: 10 }, (_, i) => "nivel" + (i + 1)) })),
    ...bal.autos.map((p) => ({ tabla: "autos", tipo: "auto", id: p.id, niveles: ["precio"] })),
    ...bal.pilotos.map((p) => ({ tabla: "pilotos", tipo: "piloto", id: p.id, niveles: ["precio"] })),
  ];
  items.forEach((it, i) => {
    const r = 11 + i, ID = `$B${r}`;
    ws.getCell(r, 1).value = it.tipo; ws.getCell(r, 2).value = it.id;
    ws.getCell(r, 3).value = { formula: look(it.tabla, "nombre", ID) };
    it.niveles.forEach((col, j) => {
      const price = look(it.tabla, col, ID);
      ws.getCell(r, 4 + j).value = { formula: `IF(${price}>0,${price}/$B$4,"")` };
      ws.getCell(r, 4 + j).numFmt = "0.0";
    });
    ws.getCell(r, 14).value = { formula: `SUM(D${r}:M${r})` }; ws.getCell(r, 14).numFmt = "0.0";
  });
  const last = 10 + items.length;
  ws.getCell(last + 2, 3).value = "Todo el taller (partidas)"; ws.getCell(last + 2, 3).font = { bold: true };
  ws.getCell(last + 2, 14).value = { formula: `SUM(N11:N${last})` }; ws.getCell(last + 2, 14).numFmt = "0.0";
  [10, 26, 26, ...Array(10).fill(9), 10].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.getColumn(1).width = 70;
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: 10 }];
}

await wb.xlsx.writeFile(out);
console.log("balance.xlsx escrito:", out, `(${wb.worksheets.length} hojas)`);
