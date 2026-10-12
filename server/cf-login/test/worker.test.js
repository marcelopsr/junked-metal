import { test } from "node:test";
import assert from "node:assert/strict";
import { exchangeSig as wSig, safeReturn, accessEmail } from "../worker.js";
import { exchangeOk } from "../../lib.js";

test("firma de canje compatible con server/lib.js, ventana 60 s", async () => {
  const ts = 1e12, b = { email: "A@b.c", ts, sig: await wSig("s3", "A@b.c", ts) };
  assert.equal(exchangeOk("s3", b, ts + 59e3), "a@b.c");
  assert.equal(exchangeOk("s3", b, ts + 61e3), null);
  assert.equal(exchangeOk("otro", b, ts), null);
  assert.equal(exchangeOk("s3", { ...b, email: "z@b.c" }, ts), null);
});
test("return solo a orígenes permitidos", () => {
  assert.equal(safeReturn("https://marcelopsr.github.io/junked-metal/?x=1#y"), "https://marcelopsr.github.io/junked-metal/?x=1");
  assert.equal(safeReturn("https://evil.com/"), null);
  assert.equal(safeReturn("https://a@marcelopsr.github.io/"), null);
});
test("JWT de Access: firma, aud, iss, exp", async () => {
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1" };
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const team = "https://t.cloudflareaccess.com";
  const mk = async (claims) => { const hp = b({ alg: "RS256", kid: "k1" }) + "." + b(claims); return hp + "." + Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(hp))).toString("base64url"); };
  const ok = { aud: ["A"], iss: team, exp: 2e9, email: "X@Y.com" };
  assert.equal(await accessEmail(await mk(ok), team, "A", 1e12, [jwk]), "x@y.com");
  assert.equal(await accessEmail(await mk(ok), team, "B", 1e12, [jwk]), null);
  assert.equal(await accessEmail(await mk({ ...ok, exp: 1 }), team, "A", 1e12, [jwk]), null);
  assert.equal(await accessEmail(await mk({ ...ok, iss: "https://o.com" }), team, "A", 1e12, [jwk]), null);
  const t = await mk(ok); assert.equal(await accessEmail(t.slice(0, -4) + "AAAA", team, "A", 1e12, [jwk]), null);
});
