// H6-H9 (seguridad 1.0): servidor propio con tope global de telemetría bajo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { useServer, S } from "./_server.mjs";
import { sign, ipKey, exchangeSecretOf } from "../lib.js";
const srv = useServer({ TEL_GLOBAL_DAILY_MAX: "5" });
const xff = (ip) => ({ "X-Forwarded-For": ip });

test("H6: ipKey agrupa IPv6 por /64 y deja IPv4 igual", () => {
  assert.equal(ipKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), ipKey("2001:db8:1:2::1"));
  assert.notEqual(ipKey("2001:db8:1:3::1"), ipKey("2001:db8:1:2::1"));
  assert.equal(ipKey("::ffff:1.2.3.4"), "1.2.3.4");
  assert.equal(ipKey("1.2.3.4"), "1.2.3.4");
});
test("H6: rotar el lado izquierdo del XFF o los 64 bits bajos de IPv6 no esquiva el límite por IP", async () => {
  let last;
  for (let i = 0; i < 11; i++) last = (await srv.post("/api/invite-redeem", { code: "x" }, xff(`10.0.0.${i}, 5.5.5.5`))).status;
  assert.equal(last, 429, "mismo extremo derecho = misma IP");
  const url = srv.B + "/auth/login?return=" + encodeURIComponent("https://junkedmetal.duckdns.org/");
  for (let i = 0; i < 21; i++) last = (await fetch(url, { redirect: "manual", headers: xff(`2001:db8:9:9:${i + 1}::1`) })).status;
  assert.equal(last, 429, "mismo /64");
});
test("H7: tope global diario de telemetría aunque cada evento venga de un uid e IP distintos", async () => {
  let last;
  for (let i = 0; i < 6; i++) last = (await srv.post("/api/telemetry", { token: sign(S, "g-u" + i), type: "session", data: {} }, xff("11.0.0." + i))).status;
  assert.equal(last, 429);
});
test("H8: en producción el canje exige EXCHANGE_SECRET propio", () => {
  assert.throws(() => exchangeSecretOf({ NODE_ENV: "production", JM_SECRET: "j" }), /EXCHANGE_SECRET/);
  assert.throws(() => exchangeSecretOf({ NODE_ENV: "production", JM_SECRET: "j", EXCHANGE_SECRET: "j" }), /EXCHANGE_SECRET/);
  assert.equal(exchangeSecretOf({ NODE_ENV: "production", JM_SECRET: "j", EXCHANGE_SECRET: "e" }), "e");
  assert.equal(exchangeSecretOf({ JM_SECRET: "j" }), "j");
});
test("H9: intentos de clave de grupo y de admin limitados globalmente (rotando IP)", async () => {
  let last;
  for (let i = 0; i < 61; i++) last = (await srv.post("/api/login", { clave: "mala" }, xff("12.0.0." + i))).status;
  assert.equal(last, 429);
  for (let i = 0; i < 61; i++) last = (await srv.post("/admin/api/login", { key: "mala" }, xff("13.0.0." + i))).status;
  assert.equal(last, 429);
});
