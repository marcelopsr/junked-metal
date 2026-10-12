// Monitoreo mínimo: chequeos periódicos, estado en memoria, auditoría solo en cambios (sin spam).
import net from "node:net";
import { statfs } from "node:fs/promises";

export function defaultChecks({ db, dataDir, fetchFn = fetch, netMod = net, statfsFn = statfs, workerUrl = "https://jm-login.mesr-96.workers.dev/", minFree = 0.1 }) {
  return {
    worker: async () => {
      if (process.env.MONITOR_OFF) return; // tests/carga: sin red; el check queda "ok" simulado
      const r = await fetchFn(workerUrl, { redirect: "manual", signal: AbortSignal.timeout(8000) });
      if (r.status !== 302) throw new Error("HTTP " + r.status + " (esperaba 302)");
    },
    coturn: () => new Promise((ok, no) => {
      const s = netMod.connect({ port: 3478, host: "127.0.0.1" });
      s.setTimeout(3000);
      s.once("connect", () => { s.destroy(); ok(); });
      s.once("timeout", () => { s.destroy(); no(new Error("timeout :3478")); });
      s.once("error", (e) => no(new Error(e.message)));
    }),
    disco: async () => {
      const f = await statfsFn(dataDir), libre = f.bavail / f.blocks;
      if (libre < minFree) throw new Error(`libre ${(libre * 100).toFixed(1)}%`);
    },
    db: async () => { db.plans(); },
  };
}

export function createMonitor({ checks, audit, notify, admin, now = Date.now }) {
  const estado = {}; // nombre -> { ok, detail, desde, ultima }
  async function run() {
    for (const [name, fn] of Object.entries(checks)) {
      let ok = true, detail = "";
      try { await fn(); } catch (e) { ok = false; detail = String(e?.message || e).slice(0, 200); }
      const prev = estado[name], t = now();
      estado[name] = { ok, detail, desde: prev && prev.ok === ok ? prev.desde : t, ultima: t };
      if (prev && prev.ok === ok) continue;
      if (!ok) { audit("sistema", "monitor-caida", name, detail); notify(admin, `CAIDA ${name}: ${detail}`); }
      else if (prev) audit("sistema", "monitor-ok", name, "recuperado");
    }
  }
  return { run, estado: () => ({ ...estado }) };
}
