import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { sign, verify, turnCred, safeReturn, limiter } from "../lib.js";

test("token firma y verifica", () => {
  const t = sign("s", "g-abc");
  assert.equal(verify("s", t), "g-abc");
  assert.equal(verify("otro", t), null);
  assert.equal(verify("s", t.slice(0, -2) + "xx"), null);
  assert.equal(verify("s", "basura"), null);
  assert.equal(verify("s", undefined), null);
});
test("token vencido", () => {
  const t = sign("s", "u", 10, 0);
  assert.equal(verify("s", t, 5000), "u");
  assert.equal(verify("s", t, 11000), null);
});
test("credenciales TURN formato REST", () => {
  const c = turnCred("ts", "gh:ana", 3600, 1_000_000);
  assert.equal(c.username, "4600:gh-ana");
  assert.equal(c.credential, createHmac("sha1", "ts").update("4600:gh-ana").digest("base64"));
});
test("return solo a orígenes permitidos", () => {
  assert.equal(safeReturn("https://marcelopsr.github.io/junked-metal/?x=1#h"), "https://marcelopsr.github.io/junked-metal/?x=1");
  assert.ok(safeReturn("http://localhost:5174/"));
  for (const bad of ["https://evil.com", "https://marcelopsr.github.io.evil.com/", "//evil.com", "javascript:alert(1)", "https://a@marcelopsr.github.io/", "http://localhost:5175/", "http://marcelopsr.github.io/"])
    assert.equal(safeReturn(bad), null, bad);
});
test("limiter", () => {
  const ok = limiter(2, 1000);
  assert.deepEqual([ok("a", 0), ok("a", 1), ok("a", 2), ok("b", 2), ok("a", 1500)], [true, true, false, true, true]);
});
