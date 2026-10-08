// Escalado por IA (WebSR: red Anime4K 2x sobre WebGPU). La escena se dibuja a media resolución en #c y la red
// pinta el resultado agrandado en un canvas encima. Solo con el motor WebGPU (lo decide render.ts). Se carga a pedido.
import type * as B from "./bjs";

let out: HTMLCanvasElement | null = null, net: { destroy(): Promise<void> } | null = null, hook: B.Nullable<B.Observer<B.AbstractEngine>> = null, gen = 0;

export async function setSR(on: boolean, engine: B.AbstractEngine) {
  const g = ++gen; // un cambio más nuevo cancela uno que todavía está cargando
  if (hook) { engine.onEndFrameObservable.remove(hook); hook = null; }
  void net?.destroy(); net = null;
  if (!on) { out?.remove(); out = null; return; }
  const [{ default: WebSR }, { default: weights }] = await Promise.all([import("./websr_lib.js"), import("@websr/websr/weights/anime4k/cnn-2x-s-an.json")]);
  const gpu = await WebSR.initWebGPU();
  if (g !== gen || !gpu) return;
  const src = engine.getRenderingCanvas()!;
  if (!out) {
    out = document.createElement("canvas");
    out.id = "sr";
    src.after(out);
  }
  const sr = new WebSR({ canvas: out, weights, network_name: "anime4k/cnn-2x-s", gpu });
  net = sr;
  let busy = false;
  // ponytail: copia el canvas a un VideoFrame cada cuadro (GPU de Babylon → GPU de WebSR); compartir el GPUDevice evitaría la copia
  hook = engine.onEndFrameObservable.add(() => {
    if (busy || !src.width) return;
    busy = true;
    const f = new VideoFrame(src, { timestamp: performance.now() * 1000 });
    sr.render(f).finally(() => { f.close(); busy = false; });
  });
}
