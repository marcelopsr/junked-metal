// Cloudflare Access: la política de la app jm-login permite solo los mails no revocados con licencia vigente (más los admins).
// Sin CF_API_TOKEN / CF_ACCOUNT_ID / CF_ACCESS_APP / CF_ACCESS_POLICY no hace nada.
export const accessOn = (E) => !!(E.CF_API_TOKEN && E.CF_ACCOUNT_ID && E.CF_ACCESS_APP && E.CF_ACCESS_POLICY);

export const policyBody = (emails) => ({
  name: "Mail verificado", decision: "allow",
  include: [...new Set(emails)].sort().map((email) => ({ email: { email } })),
});

export async function syncAccess(E, emails, f = fetch) {
  if (!accessOn(E)) return false;
  const r = await f(`https://api.cloudflare.com/client/v4/accounts/${E.CF_ACCOUNT_ID}/access/apps/${E.CF_ACCESS_APP}/policies/${E.CF_ACCESS_POLICY}`, {
    method: "PUT", headers: { Authorization: `Bearer ${E.CF_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(policyBody(emails)),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error("Access: " + JSON.stringify(j.errors ?? r.status));
  return true;
}
