import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createMonitor, defaultChecks } from "../monitor.js";

test("caída → una auditoría y un notify; sigue caído → nada; vuelve → monitor-ok", async () => {
  let status = 302; const aud = [], nots = [];
  const checks = defaultChecks({
    db: { plans: () => [] }, dataDir: "/x",
    fetchFn: async () => ({ status }),
    netMod: { connect: () => { const s = new EventEmitter(); s.setTimeout = () => {}; s.destroy = () => {}; queueMicrotask(() => s.emit("connect")); return s; } },
    statfsFn: async () => ({ bavail: 50, blocks: 100 }),
  });
  const m = createMonitor({ checks, audit: (...a) => aud.push(a), notify: (...a) => nots.push(a), admin: "adm@x" });
  await m.run();
  assert.equal(aud.length, 0); assert.equal(nots.length, 0);
  status = 500;
  await m.run(); await m.run();
  assert.equal(aud.length, 1); assert.equal(aud[0][1], "monitor-caida"); assert.equal(aud[0][2], "worker");
  assert.equal(nots.length, 1); assert.equal(nots[0][0], "adm@x");
  assert.equal(m.estado().worker.ok, false);
  status = 302;
  await m.run();
  assert.equal(aud.length, 2); assert.equal(aud[1][1], "monitor-ok"); assert.equal(nots.length, 1);
});

test("disco < 10% y db caída fallan", async () => {
  const c = defaultChecks({ db: { plans: () => { throw new Error("locked"); } }, dataDir: "/x", statfsFn: async () => ({ bavail: 5, blocks: 100 }) });
  await assert.rejects(c.disco, /5\.0%/);
  await assert.rejects(c.db, /locked/);
});
