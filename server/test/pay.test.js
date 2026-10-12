import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { stripeVerify, stripePayment, paypalVerify, paypalPayment, paypalCheckout, stripeCheckout } from "../pay.js";

const ev = { type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", client_reference_id: "mes|a@x.com", amount_total: 500, currency: "usd" } } };
const raw = Buffer.from(JSON.stringify(ev));
const sig = (secret, t, body) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

test("stripe: firma válida acepta, inválida/vieja/alterada rechaza", () => {
  const now = 1_700_000_000_000, t = now / 1000;
  assert.deepEqual(stripePayment(stripeVerify("whsec", raw, sig("whsec", t, raw), now)), { ref: "stripe:cs_1", provider: "stripe", email: "a@x.com", planId: "mes", amount: 500, currency: "USD" });
  assert.equal(stripeVerify("whsec", raw, sig("otro", t, raw), now), null);
  assert.equal(stripeVerify("whsec", raw, sig("whsec", t - 600, raw), now), null);
  assert.equal(stripeVerify("whsec", Buffer.from(raw.toString().replace("500", "1")), sig("whsec", t, raw), now), null);
  assert.equal(stripeVerify("whsec", raw, undefined, now), null);
  assert.equal(stripePayment({ ...ev, data: { object: { ...ev.data.object, payment_status: "unpaid" } } }), null);
});

const E = { PAYPAL_CLIENT_ID: "id", PAYPAL_SECRET: "s", PAYPAL_WEBHOOK_ID: "wh", STRIPE_SECRET_KEY: "sk" };
const H = { "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.paypal.com/c", "paypal-transmission-id": "1", "paypal-transmission-sig": "x", "paypal-transmission-time": "t" };
const fake = (status) => async (url, o) => ({ ok: true, status: 200, json: async () => (url.endsWith("/oauth2/token") ? { access_token: "T" } : (fake.last = JSON.parse(o.body), { verification_status: status })) });
test("paypal: verificación por API, FAILURE o sin headers rechaza", async () => {
  const pev = { event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "C1", status: "COMPLETED", custom_id: "mes|a@x.com", amount: { value: "5.00", currency_code: "USD" } } };
  assert.equal(await paypalVerify(E, H, pev, fake("SUCCESS")), true);
  assert.equal(fake.last.webhook_id, "wh");
  assert.equal(await paypalVerify(E, H, pev, fake("FAILURE")), false);
  assert.equal(await paypalVerify(E, { ...H, "paypal-transmission-sig": undefined }, pev, fake("SUCCESS")), false);
  assert.deepEqual(paypalPayment(pev), { ref: "paypal:C1", provider: "paypal", email: "a@x.com", planId: "mes", amount: 500, currency: "USD" });
});
test("checkout arma los pedidos de las APIs oficiales", async () => {
  const plan = { id: "mes", name: "Mensual", price: 500, currency: "USD" };
  let req;
  const r = await stripeCheckout(E, { plan, email: "a@x.com", successUrl: "https://g/ok", cancelUrl: "https://g/no" }, async (u, o) => { req = { u, b: o.body.toString() }; return { ok: true, json: async () => ({ id: "cs_1", url: "https://checkout.stripe.com/x" }) }; });
  assert.equal(r.url, "https://checkout.stripe.com/x");
  assert.match(req.b, /line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=500/);
  const p = await paypalCheckout(E, { plan, email: "a@x.com", returnUrl: "https://s/r", cancelUrl: "https://g/no" }, async (u, o) => ({ ok: true, json: async () => (u.endsWith("/oauth2/token") ? { access_token: "T" } : (req = JSON.parse(o.body), { id: "O1", links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/x" }] })) }));
  assert.equal(p.url, "https://www.sandbox.paypal.com/x");
  assert.equal(req.purchase_units[0].amount.value, "5.00");
});
