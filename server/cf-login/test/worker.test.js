import { test } from "node:test";
import assert from "node:assert/strict";
import { exchangeSig as wSig, safeReturn, accessEmail, originsFor, exchangeSecret } from "../worker.js";
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
test("localhost solo con DEV_ORIGINS=true; secreto de canje propio con respaldo", () => {
  assert.equal(safeReturn("http://localhost:5173/", originsFor({})), null);
  assert.ok(safeReturn("http://localhost:5173/", originsFor({ DEV_ORIGINS: "true" })));
  assert.equal(exchangeSecret({ EXCHANGE_SECRET: "e", JM_SECRET: "j" }), "e");
  assert.equal(exchangeSecret({ JM_SECRET: "j" }), "j");
});
test("cabeceras PWA: sw.js no-cache, manifest con su MIME, resto intacto", async () => {
  const { pwaHeaders } = await import("../worker.js");
  const sw = pwaHeaders("/sw.js", new Response("x", { headers: { "Cache-Control": "max-age=3600", "Content-Type": "text/plain" } }));
  assert.equal(sw.headers.get("Cache-Control"), "no-cache");
  assert.match(sw.headers.get("Content-Type"), /^text\/javascript/);
  assert.equal(await sw.text(), "x");
  assert.equal(pwaHeaders("/manifest.webmanifest", new Response("{}")).headers.get("Content-Type"), "application/manifest+json");
  const nf = new Response("no", { status: 404 }); assert.equal(pwaHeaders("/sw.js", nf), nf);
  const o = new Response("a"); assert.equal(pwaHeaders("/index.html", o), o);
});
