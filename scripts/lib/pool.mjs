// Reparte `items` entre `n` trabajadores; cada uno con SU navegador (lazy, un proceso Chromium por trabajador: un navegador compartido no escala, el hilo principal es el cuello).
// fn(item, browser, índice) -> resultado; devuelve los resultados en el orden de `items`. Cierra los navegadores al terminar.
// launch() es idempotente con los candados (el segundo launch del mismo proceso no espera: ya los tiene).
import { launch } from "./browser.mjs";

export async function pool(n, items, fn) {
  const out = new Array(items.length), opened = [];
  let next = 0, chain = Promise.resolve();
  // los launch() van de a uno: pickServer() y los candados no toleran dos arranques concurrentes del mismo proceso (se esperaban a sí mismos); el 2.º y 3.º ya encuentran todo tomado
  const open1 = () => (chain = chain.then(() => launch()));
  try {
    await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
      let b; // promesa del navegador del trabajador, creada con su primer trabajo
      while (next < items.length) {
        const i = next++;
        if (!b) opened.push((b = open1()));
        out[i] = await fn(items[i], await b, i);
      }
    }));
  } finally { await Promise.all(opened.map((p) => p.then((b) => b.close(), () => {}))); }
  return out;
}
