import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb, extendEnd } from "../db.js";

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
