// Integración (admin): servidor propio vía _server.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { useServer, S } from "./_server.mjs";
import { readFileSync } from "node:fs";
import { sign, exchangeSig } from "../lib.js";

const srv = useServer();
test("portal: sin sesión 401; clave → invitar → canjear → revocar corta /api/turn", async () => {
  assert.equal((await fetch(srv.B + "/admin")).status, 401);
  assert.equal((await fetch(srv.B + "/admin/api/users")).status, 401);
  assert.equal((await srv.post("/admin/api/login", { key: "mala" })).status, 401);
  const lr = await srv.post("/admin/api/login", { key: "clave-admin" });
  assert.equal(lr.status, 200);
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  assert.equal((await fetch(srv.B + "/admin", { headers: ck })).status, 200);
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  assert.equal((await srv.post("/admin/api/invite", { email: "z@x.com", planId: "mes" }, { ...ck, Origin: "https://evil.com" })).status, 403, "CSRF por Origin");
  const inv = await (await srv.post("/admin/api/invite", { email: "Z@x.com", planId: "mes" }, ck)).json();
  assert.match(inv.link, /^https:\/\/jm-login\.mesr-96\.workers\.dev\/\?invite=[\w-]+$/);
  const code = inv.link.split("invite=")[1];
  assert.equal((await srv.exchange("z@x.com")).status, 403, "invitado sin código");
  const { token } = await (await srv.exchange("z@x.com", code)).json();
  const turn = () => fetch(srv.B + "/api/turn", { headers: { Authorization: "Bearer " + token } }).then((r) => r.status);
  assert.equal(await turn(), 200);
  const users = await (await fetch(srv.B + "/admin/api/users", { headers: ck })).json();
  assert.equal(users.find((u) => u.email === "z@x.com").status, "active");
  assert.equal((await srv.post("/admin/api/user", { email: "z@x.com", op: "revoke" }, ck)).status, 200);
  assert.equal(await turn(), 401, "token revocado");
  assert.equal((await srv.exchange("z@x.com", code)).status, 403, "revocado no obtiene token nuevo");
  const audit = await (await fetch(srv.B + "/admin/api/audit", { headers: ck })).json();
  assert.ok(audit.some((a) => a.action === "user" && a.target === "z@x.com"));
});
test("invite-redeem: canje directo, reuso 403, revocar corta el token", async () => {
  const ck = await srv.adminLogin();
  const mk = async () => (await (await srv.post("/admin/api/invite", { email: "d@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const code = await mk();
  const ok = await srv.post("/api/invite-redeem", { code }, { Origin: "https://marcelopsr.github.io" });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://marcelopsr.github.io");
  const { token } = await ok.json();
  const turn = () => fetch(srv.B + "/api/turn", { headers: { Authorization: "Bearer " + token } }).then((r) => r.status);
  assert.equal(await turn(), 200);
  assert.equal((await srv.post("/api/invite-redeem", { code })).status, 403, "reuso");
  assert.equal((await srv.post("/api/invite-redeem", { code: "x" })).status, 403);
  const again = await mk(); // "Nuevo link" para un activo
  assert.equal((await srv.post("/api/invite-redeem", { code: again })).status, 200);
  assert.equal(await turn(), 200, "el token anterior sigue valiendo");
  await srv.post("/admin/api/user", { email: "d@x.com", op: "revoke" }, ck);
  assert.equal(await turn(), 401);
  assert.equal((await srv.post("/admin/api/invite", { email: "d@x.com", planId: "mes" }, ck)).status, 400, "revocado: primero Reactivar");
});
test("export CSV: sin admin 401; BOM, encabezados, escapado y fórmulas neutralizadas", async () => {
  assert.equal((await fetch(srv.B + "/admin/api/export?what=events")).status, 401);
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const code = (await (await srv.post("/admin/api/invite", { email: "csv@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await srv.post("/api/invite-redeem", { code })).json();
  await srv.post("/api/telemetry", { token, type: "pact_pick", data: { id: '=HYPERLINK("http://x","y")', accepted: true, stage: 1 } });
  await srv.post("/api/telemetry", { token, type: "upgrade_pick", data: { id: 'a,"b"\nc', mode: "arcade" } });
  assert.equal((await fetch(srv.B + "/admin/api/export?what=otra", { headers: ck })).status, 400);
  const r = await fetch(srv.B + "/admin/api/export?what=events&days=30", { headers: ck });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /^text\/csv; charset=utf-8/);
  assert.match(r.headers.get("content-disposition"), /^attachment; filename="telemetria-events-\d{4}-\d\d-\d\d\.csv"$/);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], "BOM UTF-8");
  const t = buf.toString("utf8");
  assert.ok(t.startsWith("\ufeffat,uid,type,mode,win,t,kills,lv,loop,stage,id,choice,variant,data\r\n"));
  assert.ok(t.includes(`,"'=HYPERLINK(""http://x"",""y"")"`), "fórmula neutralizada y escapada");
  assert.ok(t.includes(`"a,""b""\nc"`), "comas, comillas y saltos escapados");
  const a = Buffer.from(await (await fetch(srv.B + "/admin/api/export?what=analysis", { headers: ck })).arrayBuffer()).toString("utf8");
  assert.ok(a.startsWith("\ufeff# pactos\r\nid,aceptado,rechazado\r\n"));
  assert.ok(a.includes("\r\n\r\n# quedarse_avanzar") && a.includes("# por_dia"));
});

test("invite-batch: sin admin 401; mezcla válidos/inválidos/repetidos; límite 50; licencia obligatoria", async () => {
  assert.equal((await srv.post("/admin/api/invite-batch", { emails: ["a@x.com"], planId: "mes" })).status, 401);
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  await srv.post("/admin/api/invite", { email: "rev@x.com", planId: "mes" }, ck);
  await srv.post("/admin/api/user", { email: "rev@x.com", op: "revoke" }, ck);
  const r = await srv.post("/admin/api/invite-batch", { emails: ["b1@x.com", "no-es-mail", "B1@x.com", "b2@x.com", "rev@x.com"], planId: "mes" }, ck);
  assert.equal(r.status, 200);
  const { results } = await r.json();
  assert.equal(results.length, 5);
  assert.match(results[0].link, /\?invite=[\w-]+$/);
  assert.equal(results[1].error, "Mail inválido");
  assert.equal(results[2].error, "Repetido en el lote");
  assert.match(results[3].link, /\?invite=/);
  assert.match(results[4].error, /revocado/);
  const users = await (await fetch(srv.B + "/admin/api/users", { headers: ck })).json();
  assert.ok(["b1@x.com", "b2@x.com"].every((m) => users.find((u) => u.email === m)?.planId === "mes"), "licencia inicial");
  const big = Array.from({ length: 51 }, (_, i) => `m${i}@x.com`);
  assert.equal((await srv.post("/admin/api/invite-batch", { emails: big, planId: "mes" }, ck)).status, 400);
  const fifty = await srv.post("/admin/api/invite-batch", { emails: big.slice(0, 50), planId: "mes" }, ck);
  assert.equal(fifty.status, 200, "50 mails entran en el cuerpo");
  assert.equal((await srv.post("/admin/api/invite-batch", { emails: ["c@x.com"], planId: "nada" }, ck)).status, 400);
  assert.equal((await srv.post("/admin/api/invite-batch", { emails: "c@x.com", planId: "mes" }, ck)).status, 400);
});

test("detail: sin admin 401; inexistente 404; con datos escapa nada y devuelve stats/partidas/sesiones", async () => {
  assert.equal((await fetch(srv.B + "/admin/api/user/a%40x.com/detail")).status, 401);
  const ck = await srv.adminLogin();
  assert.equal((await fetch(srv.B + "/admin/api/user/nadie%40x.com/detail", { headers: ck })).status, 404);
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const code = (await (await srv.post("/admin/api/invite", { email: "det@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await srv.exchange("det@x.com", code)).json();
  await srv.post("/api/telemetry", { token, type: "session", data: { ua: "UA<b>", w: 390, h: 844, touch: true } });
  await srv.post("/api/telemetry", { token, type: "run_end", data: { mode: "classic", win: true, t: 300, kills: 50, lv: 5 } });
  const d = await (await fetch(srv.B + "/admin/api/user/DET%40x.com/detail", { headers: ck })).json();
  assert.equal(d.user.email, "det@x.com");
  assert.equal(d.user.tokenVersion, undefined);
  assert.equal(d.sub.planId, "mes");
  assert.equal(d.stats.modes[0].mode, "classic");
  assert.equal(d.runs.length, 1);
  assert.equal(d.runs[0].d.t, 300);
  assert.equal(d.sessions[0].d.ua, "UA<b>");
  assert.equal(d.sessions[0].d.w, 390);
});

test("T51: canje exige EXCHANGE_SECRET (JM_SECRET no vale) y una cookie firmada con él no es admin", async () => {
  const ts = Date.now();
  assert.equal((await srv.post("/api/cf-exchange", { email: "q@x.com", ts, sig: exchangeSig(S, "q@x.com", ts) })).status, 401);
  const forged = sign("canje-test", "admin:x:1", 60);
  assert.equal((await fetch(srv.B + "/admin/api/me", { headers: { Cookie: "jm_admin=" + forged } })).status, 401);
});
test("plantillas de correo: sin admin 401; defaults, guardar y leer, variables, tamaño 400", async () => {
  assert.equal((await fetch(srv.B + "/admin/api/templates")).status, 401);
  assert.equal((await srv.post("/admin/api/templates", {})).status, 401);
  const ck = await srv.adminLogin();
  const t0 = await (await fetch(srv.B + "/admin/api/templates", { headers: ck })).json();
  assert.deepEqual(Object.keys(t0), ["invite", "expiring", "lapsed"]);
  assert.match(t0.invite.body, /\{link\}/);
  const nuevo = { ...t0, invite: { subject: "Hola {alias}", body: "Entra {mail}: {link} hasta {vence} ({plan})" } };
  assert.equal((await srv.post("/admin/api/templates", nuevo, ck)).status, 200);
  const t1 = await (await fetch(srv.B + "/admin/api/templates", { headers: ck })).json();
  assert.deepEqual(t1.invite, nuevo.invite);
  assert.ok((await (await fetch(srv.B + "/admin/api/audit", { headers: ck })).json()).some((a) => a.action === "templates"), "auditado");
  // reemplazo de variables: se prueba la función real de admin.html
  const fill = new Function(`${readFileSync(new URL("../admin.html", import.meta.url), "utf8").match(/const fill = .*;/)[0]}; return fill;`)();
  assert.equal(fill(t1.invite.body, { mail: "a@x.com", link: "L", vence: "V", plan: "P" }), "Entra a@x.com: L hasta V (P)");
  assert.equal(fill("{alias}{otra}", {}), "{otra}");
  // tamaño excedido y plantilla incompleta: 400
  assert.equal((await srv.post("/admin/api/templates", { ...t0, lapsed: { subject: "x", body: "y".repeat(4001) } }, ck)).status, 400);
  assert.equal((await srv.post("/admin/api/templates", { ...t0, lapsed: { subject: "x".repeat(201), body: "y" } }, ck)).status, 400);
  assert.equal((await srv.post("/admin/api/templates", { invite: t0.invite }, ck)).status, 400);
  assert.deepEqual(await (await fetch(srv.B + "/admin/api/templates", { headers: ck })).json(), t1, "lo inválido no pisa lo guardado");
});

test("lista de espera: 202 siempre, honeypot, CORS, panel invitar/descartar, 401 sin admin, rate limit", async () => {
  let n = 0; const O = { Origin: "https://marcelopsr.github.io" }, ip = () => ({ ...O, "X-Forwarded-For": "10.3.0." + ++n }); // cada llamada desde otra IP, salvo el bloque final
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const r1 = await srv.post("/api/waitlist", { email: "W1@x.com", mensaje: "hola <b>" }, ip());
  assert.equal(r1.status, 202);
  assert.equal(r1.headers.get("access-control-allow-origin"), O.Origin);
  assert.equal((await srv.post("/api/waitlist", { email: "w1@x.com" }, ip())).status, 202, "repetido igual");
  assert.equal((await srv.post("/api/waitlist", { email: "d@x.com" }, ip())).status, 202, "ya es usuario igual");
  assert.equal((await srv.post("/api/waitlist", { email: "bot@x.com", web: "http://spam" }, ip())).status, 202, "honeypot");
  assert.equal((await srv.post("/api/waitlist", { email: "malo" }, ip())).status, 400);
  assert.equal((await srv.post("/api/waitlist", { email: "l@x.com", mensaje: "a".repeat(301) }, ip())).status, 400);
  assert.equal((await srv.post("/api/waitlist", { email: "e@x.com" }, { Origin: "https://evil.com", "X-Forwarded-For": "10.3.1.1" })).headers.get("access-control-allow-origin"), null);
  assert.equal((await fetch(srv.B + "/admin/api/waitlist")).status, 401);
  assert.equal((await srv.post("/admin/api/waitlist/invite", { email: "w1@x.com", planId: "mes" })).status, 401);
  const lista = await (await fetch(srv.B + "/admin/api/waitlist", { headers: ck })).json();
  assert.deepEqual(lista.map((w) => w.email).sort(), ["e@x.com", "w1@x.com"], "sin honeypot ni usuario existente");
  lista.splice(lista.findIndex((w) => w.email === "e@x.com"), 1);
  await srv.post("/admin/api/waitlist/discard", { email: "e@x.com" }, ck);
  assert.equal(lista[0].mensaje, "hola <b>");
  assert.equal((await srv.post("/admin/api/waitlist/invite", { email: "w1@x.com" }, ck)).status, 400, "sin licencia");
  const inv = await srv.post("/admin/api/waitlist/invite", { email: "w1@x.com", planId: "mes" }, ck);
  assert.equal(inv.status, 200);
  assert.match((await inv.json()).link, /\?invite=/);
  assert.equal((await (await fetch(srv.B + "/admin/api/waitlist", { headers: ck })).json()).length, 0, "invitado sale de pendientes");
  await srv.post("/api/waitlist", { email: "w2@x.com" }, ip());
  assert.equal((await srv.post("/admin/api/waitlist/discard", { email: "w2@x.com" }, ck)).status, 200);
  assert.equal((await (await fetch(srv.B + "/admin/api/waitlist", { headers: ck })).json()).length, 0);
  const H = { ...O, "X-Forwarded-For": "10.9.9.9" };
  for (let k = 0; k < 5; k++) assert.equal((await srv.post("/api/waitlist", { email: `r${k}@x.com` }, H)).status, 202);
  assert.equal((await srv.post("/api/waitlist", { email: "r5@x.com" }, H)).status, 429, "6.º intento de la hora por IP");
});

test("uso: /admin/api/uso exige admin y agrega partidas, modos y abandono", async () => {
  assert.equal((await fetch(srv.B + "/admin/api/uso")).status, 401);
  const ck = await srv.adminLogin();
  const u = await (await fetch(srv.B + "/admin/api/uso", { headers: ck })).json();
  assert.ok(Array.isArray(u.perDay) && Array.isArray(u.modes) && typeof u.abandonPct === "number");
});

test("aviso: público 204 → admin publica → 200 {texto,hasta}; vacío lo quita; vencimiento pasado 400", async () => {
  assert.equal((await fetch(srv.B + "/api/aviso")).status, 204);
  const ck = await srv.adminLogin();
  assert.equal((await srv.post("/admin/api/aviso", { texto: "x", hasta: Date.now() + 6e4 })).status, 401);
  assert.equal((await srv.post("/admin/api/aviso", { texto: "x", hasta: 1 }, ck)).status, 400);
  const hasta = Date.now() + 3600e3;
  assert.equal((await srv.post("/admin/api/aviso", { texto: "Mantenimiento 22h", hasta }, ck)).status, 200);
  assert.deepEqual(await (await fetch(srv.B + "/api/aviso")).json(), { texto: "Mantenimiento 22h", hasta });
  await srv.post("/admin/api/aviso", { texto: "" }, ck);
  assert.equal((await fetch(srv.B + "/api/aviso")).status, 204);
});

test("T51: logout admin invalida la cookie anterior", async () => {
  const ck = await srv.adminLogin(true); // sesión propia: el logout invalida la compartida
  assert.equal((await fetch(srv.B + "/admin/api/me", { headers: ck })).status, 200);
  assert.equal((await srv.post("/admin/api/logout", {}, ck)).status, 200);
  assert.equal((await fetch(srv.B + "/admin/api/me", { headers: ck })).status, 401);
});
