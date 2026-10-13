import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb, extendEnd, csvCell } from "../db.js";

const DAY = 86400e3;
test("importa invites.json como activos una sola vez", () => {
  const dir = mkdtempSync(join(tmpdir(), "jm-")), f = join(dir, "inv.json");
  writeFileSync(f, JSON.stringify([{ email: "A@x.com", status: "active" }, { email: "b@x.com", status: "revoked" }]));
  const db = openDb(join(dir, "jm.db"), f);
  assert.equal(db.user("a@x.com").status, "active");
  assert.equal(db.user("b@x.com"), undefined);
});
test("invitar y canjear: código de ese mail, una vez, antes de vencer", () => {
  const db = openDb(":memory:");
  const { code } = db.invite("n@x.com", 0);
  assert.equal(db.user("n@x.com").status, "invited");
  assert.equal(db.redeem("n@x.com", null, 1), null, "sin código no activa");
  assert.equal(db.redeem("otro@x.com", code, 1), null, "otro mail no canjea");
  assert.equal(db.redeem("n@x.com", code, 8 * DAY), null, "vencido");
  assert.equal(db.redeem("n@x.com", code, 1).status, "active");
  const { code: c2 } = db.invite("m@x.com", 0);
  db.redeem("m@x.com", c2, 1); db.setStatus("m@x.com", "revoked");
  assert.equal(db.redeem("m@x.com", c2, 2), null, "revocado no entra");
});
test("revocar sube tokenVersion: el token viejo deja de valer", () => {
  const db = openDb(":memory:");
  db.invite("r@x.com"); db.setStatus("r@x.com", "active");
  const v = db.user("r@x.com").tokenVersion;
  assert.ok(db.tokenOk("r@x.com", v));
  db.setStatus("r@x.com", "revoked");
  assert.ok(!db.tokenOk("r@x.com", v));
  db.setStatus("r@x.com", "active");
  assert.ok(!db.tokenOk("r@x.com", v), "reactivar no revive tokens viejos");
  assert.ok(db.tokenOk("r@x.com", v + 1));
});
test("suscripción: pago extiende desde el vencimiento vigente, idempotente por ref", () => {
  const db = openDb(":memory:");
  db.savePlan({ id: "mes", name: "Mensual", price: 500, currency: "usd", period: "month" });
  db.invite("s@x.com");
  assert.ok(!db.subActive("s@x.com", 0));
  assert.equal(db.applyPayment({ ref: "a", provider: "stripe", email: "s@x.com", planId: "mes" }, 0), true);
  assert.equal(db.sub("s@x.com").currentPeriodEnd, 30 * DAY);
  assert.equal(db.applyPayment({ ref: "a", provider: "stripe", email: "s@x.com", planId: "mes" }, 0), false, "replay ignorado");
  db.applyPayment({ ref: "b", provider: "paypal", email: "s@x.com", planId: "mes" }, 10 * DAY);
  assert.equal(db.sub("s@x.com").currentPeriodEnd, 60 * DAY, "suma al vigente");
  assert.ok(db.subActive("s@x.com", 59 * DAY) && !db.subActive("s@x.com", 61 * DAY));
  db.applyPayment({ ref: "c", provider: "manual", email: "s@x.com", planId: "mes" }, 100 * DAY);
  assert.equal(db.sub("s@x.com").currentPeriodEnd, 130 * DAY, "vencida: suma desde ahora");
  db.cancelSub("s@x.com");
  assert.ok(!db.subActive("s@x.com", 101 * DAY));
  assert.equal(extendEnd(0, 365, 5), 5 + 365 * DAY);
  assert.throws(() => db.savePlan({ id: "X Y", name: "", price: 0, currency: "us", period: "week" }));
});

test("redeemCode: válido una vez, reusado, vencido, revocado, activo con link nuevo", () => {
  const db = openDb(":memory:");
  const { code } = db.invite("c@x.com", 0);
  assert.equal(db.redeemCode("nope", 1).error, "Código inválido");
  assert.equal(db.redeemCode(code, 8 * DAY).error, "Código vencido");
  const r = db.redeemCode(code, 1);
  assert.equal(r.user.status, "active"); assert.equal(r.user.activatedAt, 1);
  assert.equal(db.redeemCode(code, 2).error, "Código ya usado");
  const { code: c2 } = db.invite("c@x.com", 3); // activo pide otro dispositivo
  assert.equal(db.redeemCode(c2, 4).user.activatedAt, 1);
  const { code: c3 } = db.invite("c@x.com", 5);
  db.setStatus("c@x.com", "revoked");
  assert.equal(db.redeemCode(c3, 6).error, "Usuario revocado");
});
test("telemetryAnalysis: agregados de 30 días e ignora lo viejo", () => {
  const db = openDb(":memory:"), now = 100 * DAY, J = JSON.stringify, t = (u, ty, d, at = now) => db.track(u, ty, J(d), at);
  t("a", "pact_pick", { id: "x", accepted: true }); t("a", "pact_pick", { id: "x", accepted: false }); t("b", "pact_pick", { id: "x", accepted: true });
  t("a", "pact_pick", { id: "x", accepted: true }, now - 40 * DAY);
  t("a", "stage_end", { choice: "stay", stage: 0 }); t("b", "stage_end", { choice: "advance", stage: 0 }); t("b", "stage_end", { choice: "advance", stage: 1 });
  for (let i = 0; i < 12; i++) t("a", "upgrade_pick", { id: "u" + i, mode: "encore" });
  t("a", "upgrade_pick", { id: "u0", mode: "encore" }); t("a", "upgrade_pick", { id: "z", mode: "arcade" });
  t("a", "route_pick", { variant: "v1" }); t("b", "route_pick", { variant: "v1" }); t("b", "route_pick", { variant: "v2" });
  t("a", "run_start", {}); t("a", "run_end", {}); t("a", "run_start", {}, now - DAY);
  db.track("a", "pact_pick", "no json", now);
  const r = JSON.parse(JSON.stringify(db.telemetryAnalysis(now - 30 * DAY)));
  assert.deepEqual(r.pacts, [{ id: "x", accepted: 2, rejected: 1 }]);
  assert.deepEqual(r.stages, [{ stage: 0, stay: 1, advance: 1 }, { stage: 1, stay: 0, advance: 1 }]);
  const enc = r.upgrades.filter((u) => u.mode === "encore");
  assert.equal(enc.length, 10); assert.deepEqual(enc[0], { mode: "encore", id: "u0", n: 2 });
  assert.deepEqual(r.upgrades.filter((u) => u.mode === "arcade"), [{ mode: "arcade", id: "z", n: 1 }]);
  assert.deepEqual(r.routes, [{ variant: "v1", n: 2 }, { variant: "v2", n: 1 }]);
  assert.deepEqual(r.perDay, [{ day: "1970-04-11", started: 1, ended: 1 }, { day: "1970-04-10", started: 1, ended: 0 }]);
});

test("expiring: 2 días aparece, 10 no; aviso una sola vez por período", () => {
  const db = openDb(join(mkdtempSync(join(tmpdir(), "jm-exp-")), "jm.db")), now = 1e12;
  db.savePlan({ id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" });
  for (const [m, d] of [["a@x.com", 2], ["b@x.com", 10], ["c@x.com", -2], ["r@x.com", 1]]) { db.invite(m, now); db.setSub(m, "mes", now + d * DAY); }
  db.setStatus("r@x.com", "revoked", now);
  const e = db.expiring(3, now);
  assert.deepEqual(e.soon.map((u) => u.email), ["a@x.com"]);
  assert.deepEqual(e.lapsed.map((u) => u.email), ["c@x.com"]);
  const calls = [];
  assert.deepEqual(db.noticeExpiring((m) => calls.push(m), now), ["a@x.com"]);
  assert.deepEqual(db.noticeExpiring((m) => calls.push(m), now + 3600e3), []);
  assert.equal(calls.length, 1);
  assert.equal(db.auditList().filter((a) => a.action === "licencia-por-vencer").length, 1);
  db.applyPayment({ ref: "p1", provider: "manual", email: "a@x.com", planId: "mes" }, now); // renueva: otro período, otro aviso futuro
  assert.deepEqual(db.expiring(3, now).soon, []);
});
import { checkAlias } from "../db.js";
test("alias: validación, unicidad sin mayúsculas, borrar, migración", () => {
  assert.equal(checkAlias("  Ana_Gómez-1 "), "Ana_Gómez-1");
  for (const m of ["ab", "a".repeat(17), "a@b.com", "ho!la", "", "Eres PUTO", "Mierda1"]) assert.throws(() => checkAlias(m), m);
  const db = openDb(":memory:");
  db.invite("a@x.com"); db.invite("b@x.com");
  db.setAlias("a@x.com", "Zeta");
  assert.throws(() => db.setAlias("b@x.com", "zETA"), /en uso/);
  db.setAlias("a@x.com", "ZETA"); // el mismo usuario puede recambiar mayúsculas
  assert.equal(db.aliasOf("cf-a@x.com"), "ZETA");
  db.setAlias("a@x.com", ""); assert.equal(db.aliasOf("cf-a@x.com"), null);
  assert.throws(() => db.setAlias("no@x.com", "Zeta"), /inexistente/);
  // base vieja sin columna: se migra
  const f = join(mkdtempSync(join(tmpdir(), "jm-")), "v.db");
  const old = new (db.db.constructor)(f); old.exec("CREATE TABLE users(email TEXT PRIMARY KEY, status TEXT NOT NULL, invitedAt INTEGER, activatedAt INTEGER, revokedAt INTEGER, note TEXT NOT NULL DEFAULT '', lastSeen INTEGER, tokenVersion INTEGER NOT NULL DEFAULT 0)"); old.close();
  assert.equal(openDb(f).user("x@x.com"), undefined);
});
test("dailySeed estable por fecha, distinta entre días, en 1..2^31; runEndSospechoso", async () => {
  const { dailySeed, runEndSospechoso } = await import("../db.js");
  const s = dailySeed("k", "2026-10-12");
  assert.equal(s, dailySeed("k", "2026-10-12"));
  assert.notEqual(s, dailySeed("k", "2026-10-13"));
  assert.notEqual(s, dailySeed("otra", "2026-10-12"));
  assert.ok(Number.isInteger(s) && s >= 1 && s <= 2 ** 31);
  assert.equal(runEndSospechoso({ t: 600, kills: 10, lv: 5 }), null);
  assert.equal(runEndSospechoso({ t: 240, loop: 1, stage: 0 }), null);
  assert.ok(runEndSospechoso({ t: 239, loop: 1, stage: 0 }));
  assert.ok(runEndSospechoso({ t: 100, loop: -1, stage: 0 }));
});

test("userStats: agregados del propio uid, sin mezclar con otros; vacío → ceros", () => {
  const db = openDb(":memory:"), J = JSON.stringify, t = (u, ty, d, at) => db.track(u, ty, J(d), at);
  assert.deepEqual(db.userStats("nadie"), { modes: [], encore: null, pacts: { top: [], accepted: 0, rejected: 0, rejectedPct: 0 }, stages: { stay: 0, advance: 0, stayPct: 0, advancePct: 0 }, upgrades: [], variants: [], last: null });
  t("a", "run_end", { mode: "encore", win: false, t: 200, loop: 0, stage: 2 }, 1); t("a", "run_end", { mode: "encore", win: true, t: 300, loop: 1, stage: 0 }, 2);
  t("a", "run_end", { mode: "arcade", win: true, t: 500, kills: 9, lv: 4 }, 3); t("a", "run_end", { mode: "arcade", win: true, t: 400 }, 4); t("a", "run_end", { mode: "arcade", win: false, t: 50, kills: 7, lv: 2 }, 5);
  t("b", "run_end", { mode: "arcade", win: true, t: 1, loop: 9, stage: 3 }, 6); t("b", "pact_pick", { id: "x", accepted: true }, 6);
  for (const [id, ok] of [["x", true], ["x", true], ["y", true], ["z", false]]) t("a", "pact_pick", { id, accepted: ok }, 7);
  for (const c of ["stay", "stay", "stay", "advance"]) t("a", "stage_end", { choice: c, stage: 0 }, 8);
  for (const id of ["u1", "u1", "u2", "u3", "u4", "u5", "u6"]) t("a", "upgrade_pick", { id, mode: "arcade" }, 9);
  t("a", "route_pick", { variant: "v1" }, 10); t("b", "route_pick", { variant: "v2" }, 10);
  const r = JSON.parse(JSON.stringify(db.userStats("a")));
  assert.deepEqual(r.modes, [{ mode: "arcade", played: 3, won: 2, bestTime: 400 }, { mode: "encore", played: 2, won: 1, bestTime: 300 }]);
  assert.deepEqual(r.encore, { loop: 1, stage: 0, t: 300, win: true });
  assert.deepEqual(r.pacts, { top: [{ id: "x", accepted: 2 }, { id: "y", accepted: 1 }], accepted: 3, rejected: 1, rejectedPct: 25 });
  assert.deepEqual(r.stages, { stay: 3, advance: 1, stayPct: 75, advancePct: 25 });
  assert.equal(r.upgrades.length, 5); assert.deepEqual(r.upgrades[0], { id: "u1", n: 2 });
  assert.deepEqual(r.variants, [{ variant: "v1", n: 1 }]);
  assert.deepEqual(r.last, { at: 5, mode: "arcade", win: false, t: 50, kills: 7, lv: 2 });
});
test("csvCell: escapa y neutraliza fórmulas solo en strings", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  for (const f of ["=1+1", "+1", "-1", "@x"]) assert.equal(csvCell(f), "'" + f);
  assert.equal(csvCell(-5), "-5"); assert.equal(csvCell(null), "");
});
test("pruneEvents borra solo los eventos más viejos que el corte", () => {
  const db = openDb(":memory:"), now = 100 * DAY;
  db.track("u", "x", "{}", now - 91 * DAY); db.track("u", "x", "{}", now - 89 * DAY);
  assert.equal(db.pruneEvents(now - 90 * DAY), 1);
  assert.equal(db.events().length, 1);
});

test("userLogros: podio semana cerrada, rachas del diario y veterano", () => {
  const db = openDb(":memory:"), D = 86400e3, mon = Date.UTC(2026, 0, 5); // lunes
  const run = (uid, at, d) => db.track(uid, "run_end", JSON.stringify(d), at);
  run("u", mon + 1, { kills: 10 }); run("a", mon + 2, { kills: 50 }); run("b", mon + 3, { kills: 40 }); run("c", mon + 4, { kills: 30 });
  const now = mon + 8 * D, L = (uid) => Object.fromEntries(db.userLogros(uid, now).map((l) => [l.id, l]));
  assert.equal(L("u").podio.done, false, "4º puesto");
  assert.equal(L("c").podio.done, true);
  assert.equal(db.userLogros("c", mon + 2 * D)[0].done, false, "semana en curso no cuenta");
  for (let i = 0; i < 7; i++) run("u", mon + 9 * D + i, { kills: 1, daily: new Date(mon + (9 + i) * D).toISOString().slice(0, 10) });
  assert.deepEqual([L("u").racha3.done, L("u").racha7.done, L("u").veterano.progress], [true, true, 8]);
  for (let i = 0; i < 50; i++) run("v", mon + i, { kills: 0 });
  assert.equal(L("v").veterano.done, true);
});
test("usageStats: partidas por día, modos y abandono", () => {
  const db = openDb(":memory:"), now = Date.now();
  db.track("u", "run_start", '{"mode":"encore"}', now); db.track("u", "run_start", '{"mode":"encore"}', now);
  db.track("u", "run_start", '{"mode":"diario"}', now); db.track("u", "run_end", "{}", now);
  db.track("u", "run_start", '{"mode":"x"}', now - 40 * DAY);
  const r = db.usageStats(now - 30 * DAY);
  assert.equal(r.started, 3); assert.equal(r.modes[0].mode, "encore"); assert.equal(r.perDay[0].n, 3); assert.equal(r.abandonPct, 67);
});
test("moderación: usuario vetado y partida oculta salen de los rankings", () => {
  const db = openDb(":memory:"), now = Date.now(), d = (k) => JSON.stringify({ kills: k, mode: "encore", loop: k, stage: 0, t: 1, weekly: "w", seed: 1 });
  db.track("cf-a", "run_end", d(10), now); db.track("cf-b", "run_end", d(5), now); db.track("cf-b", "run_end", d(3), now);
  assert.deepEqual(db.weeklyTop(0).map((r) => r.uid), ["cf-a", "cf-b"]);
  db.rankBan("cf-a", true);
  assert.deepEqual(db.weeklyTop(0).map((r) => r.uid), ["cf-b"]);
  assert.deepEqual(db.encoreTop().map((r) => r.uid), ["cf-b"]);
  db.rankBan("cf-a", false); assert.equal(db.weeklyBoard("w", 1).length, 2);
  const top = db.rankingRuns(0).find((r) => r.uid === "cf-b" && r.kills === 5);
  db.hideEvent(top.id, true);
  assert.equal(db.weeklyBoard("w", 1).find((r) => r.uid === "cf-b").score, 3);
  assert.throws(() => db.hideEvent(999, true));
});

test("borrar usuario: desaparece con su invitación y deja de valer el token", () => {
  const db = openDb(":memory:");
  db.invite("d@x.com"); db.setStatus("d@x.com", "active");
  const v = db.user("d@x.com").tokenVersion;
  assert.ok(db.deleteUser("D@x.com"));
  assert.equal(db.user("d@x.com"), undefined);
  assert.ok(!db.tokenOk("d@x.com", v));
  assert.ok(!db.deleteUser("d@x.com"), "borrar dos veces no rompe");
});

test("planes gratis y sin vencimiento: se guardan y el alta dura ~100 años", () => {
  const db = openDb(":memory:");
  db.savePlan({ id: "amigos", name: "Amigos", price: 0, currency: "USD", period: "forever" });
  db.invite("f@x.com");
  db.applyPayment({ ref: "manual:1", provider: "manual", email: "f@x.com", planId: "amigos" }, 0);
  assert.ok(db.sub("f@x.com").currentPeriodEnd > 99 * 365 * 86400e3);
  assert.throws(() => db.savePlan({ id: "x", name: "X", price: -1, currency: "USD", period: "month" }));
});
