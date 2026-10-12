// Precarga (node --import) para el servidor de prueba: todo fetch a un host que no sea 127.0.0.1 se registra en NET_GUARD_LOG y falla.
import { appendFileSync } from "node:fs";
const real = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const u = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (u.hostname !== "127.0.0.1") { appendFileSync(process.env.NET_GUARD_LOG, u.href + "\n"); return Promise.reject(new Error("red bloqueada en tests: " + u.hostname)); }
  return real(input, init);
};
