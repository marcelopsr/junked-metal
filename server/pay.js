// Pasarelas de pago sin SDK (fetch contra las APIs REST oficiales; fuentes en server/README.md § Portal admin).
// Cada función recibe `env` y `fetchFn` para poder probarse sin red.
import { createHmac, timingSafeEqual } from "node:crypto";

export const stripeOn = (E) => !!(E.STRIPE_SECRET_KEY && E.STRIPE_WEBHOOK_SECRET);
export const paypalOn = (E) => !!(E.PAYPAL_CLIENT_ID && E.PAYPAL_SECRET && E.PAYPAL_WEBHOOK_ID);
const paypalBase = (E) => (E.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
// ponytail: monedas con 2 decimales (USD, EUR, ARS...); JPY y similares (0 decimales) necesitarían su tabla.
const decimal = (cents) => (cents / 100).toFixed(2);
// custom_id de PayPal admite 127 caracteres: plan|mail.
export const refOf = (planId, email) => `${planId}|${email}`;
export const parseRef = (s) => { const i = String(s || "").indexOf("|"); return i > 0 ? { planId: s.slice(0, i), email: s.slice(i + 1) } : null; };

// Stripe: Checkout Session en modo payment (POST /v1/checkout/sessions, form-urlencoded).
export async function stripeCheckout(E, { plan, email, successUrl, cancelUrl }, fetchFn = fetch) {
  const body = new URLSearchParams({
    mode: "payment", success_url: successUrl, cancel_url: cancelUrl, customer_email: email, client_reference_id: refOf(plan.id, email),
    "metadata[plan]": plan.id, "metadata[email]": email,
    "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": plan.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(plan.price), "line_items[0][price_data][product_data][name]": `Junked Metal: ${plan.name}`,
  });
  const r = await fetchFn("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${E.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = await r.json();
  if (!r.ok || !j.url) throw new Error(`Stripe ${r.status}: ${j.error?.message || "sin url"}`);
  return { url: j.url, ref: j.id };
}

// Stripe-Signature: "t=<ts>,v1=<hex>[,v1=...]"; firma = HMAC-SHA256(secret, "<t>.<cuerpo crudo>") en hex; tolerancia 300 s.
export function stripeVerify(secret, rawBody, header, now = Date.now(), tolSec = 300) {
  if (!secret || !header || !Buffer.isBuffer(rawBody)) return null;
  const parts = String(header).split(","), t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length || Math.abs(now / 1000 - +t) > tolSec) return null;
  const want = Buffer.from(createHmac("sha256", secret).update(`${t}.`).update(rawBody).digest("hex"));
  if (!sigs.some((s) => { const b = Buffer.from(s); return b.length === want.length && timingSafeEqual(b, want); })) return null;
  try { return JSON.parse(rawBody.toString("utf8")); } catch { return null; }
}
// Evento verificado → pago a aplicar (o null si no corresponde).
export function stripePayment(ev) {
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(ev?.type)) return null;
  const s = ev.data?.object;
  if (!s || s.payment_status !== "paid") return null;
  const r = parseRef(s.client_reference_id);
  return r && { ref: "stripe:" + s.id, provider: "stripe", email: r.email, planId: r.planId, amount: s.amount_total, currency: String(s.currency || "").toUpperCase() };
}

async function paypalToken(E, fetchFn) {
  const r = await fetchFn(paypalBase(E) + "/v1/oauth2/token", {
    method: "POST", body: "grant_type=client_credentials",
    headers: { Authorization: "Basic " + Buffer.from(`${E.PAYPAL_CLIENT_ID}:${E.PAYPAL_SECRET}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`PayPal oauth ${r.status}`);
  return j.access_token;
}
const pp = async (E, fetchFn, path, body) => {
  const r = await fetchFn(paypalBase(E) + path, { method: "POST", headers: { Authorization: `Bearer ${await paypalToken(E, fetchFn)}`, "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`PayPal ${path} ${r.status}: ${j.message || j.name || ""}`);
  return j;
};

// PayPal Orders v2: crea la orden (intent CAPTURE) y devuelve el link de aprobación (rel payer-action).
export async function paypalCheckout(E, { plan, email, returnUrl, cancelUrl }, fetchFn = fetch) {
  const custom = refOf(plan.id, email);
  if (custom.length > 127) throw new Error("Mail demasiado largo para PayPal");
  const j = await pp(E, fetchFn, "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{ reference_id: plan.id, custom_id: custom, description: `Junked Metal: ${plan.name}`, amount: { currency_code: plan.currency, value: decimal(plan.price) } }],
    payment_source: { paypal: { experience_context: { return_url: returnUrl, cancel_url: cancelUrl, user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } },
  });
  const url = j.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!url) throw new Error("PayPal sin link de aprobación");
  return { url, ref: j.id };
}
// Captura tras la aprobación (return_url trae ?token=<orderId>). Devuelve el pago o null si no quedó COMPLETED.
export async function paypalCapture(E, orderId, fetchFn = fetch) {
  if (!/^[A-Z0-9]{5,40}$/.test(String(orderId))) return null;
  const j = await pp(E, fetchFn, `/v2/checkout/orders/${orderId}/capture`);
  return paypalPayment({ event_type: "PAYMENT.CAPTURE.COMPLETED", resource: j.purchase_units?.[0]?.payments?.captures?.[0] });
}
export function paypalPayment(ev) {
  const c = ev?.event_type === "PAYMENT.CAPTURE.COMPLETED" ? ev.resource : null;
  if (!c || c.status !== "COMPLETED") return null;
  const r = parseRef(c.custom_id);
  return r && { ref: "paypal:" + c.id, provider: "paypal", email: r.email, planId: r.planId, amount: Math.round(+c.amount?.value * 100), currency: c.amount?.currency_code };
}
// Verificación de webhook por API: POST /v1/notifications/verify-webhook-signature → verification_status SUCCESS.
export async function paypalVerify(E, headers, event, fetchFn = fetch) {
  const h = (k) => headers[k];
  const need = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"];
  if (!event || need.some((k) => !h(k))) return false;
  try {
    const j = await pp(E, fetchFn, "/v1/notifications/verify-webhook-signature", {
      auth_algo: h("paypal-auth-algo"), cert_url: h("paypal-cert-url"), transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"), transmission_time: h("paypal-transmission-time"), webhook_id: E.PAYPAL_WEBHOOK_ID, webhook_event: event,
    });
    return j.verification_status === "SUCCESS";
  } catch { return false; }
}
