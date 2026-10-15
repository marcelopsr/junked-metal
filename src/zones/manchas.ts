import * as B from "@babylonjs/core";
import { merge } from "../models";
import { canvasTex, pbr } from "../render";
import { decal, tex } from "./common";

// Variación de gran escala del piso (arte 0.95): manchas planas de borde suave, sin colisión, una malla fusionada por tono.
// Generador local (lcg) para no correr rng(); la textura se cachea una vez con tex() (no se fuga al rearmar).
const blobTex = () => {
  let k = 4242; const r = () => ((k = (k * 16807) % 2147483647) / 2147483647);
  const t = canvasTex(128, (c, s) => {
    c.clearRect(0, 0, s, s);
    for (let i = 0; i < 5; i++) { // varios degradés radiales superpuestos: silueta irregular, núcleo opaco y borde que se funde
      const x = s / 2 + (r() - 0.5) * s * 0.3, y = s / 2 + (r() - 0.5) * s * 0.3, rad = s * (0.28 + r() * 0.16), g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.55, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, s, s);
    }
  });
  t.hasAlpha = true;
  return t;
};

export type Mancha = { color: string; alpha: number; n: number; w: [number, number]; largo?: number; rot?: number };
/** Reparte manchas por tono en el rectángulo [x0, x1, z0, z1]. largo = relación largo/ancho (caminos); rot = ángulo fijo (si no, al azar). */
export function manchas(name: string, seed: number, area: [number, number, number, number], tonos: Mancha[], y = 0.012) {
  let k = (seed * 104729 + 1013904223) % 2147483647; const r = () => ((k = (k * 16807) % 2147483647) / 2147483647); // semilla dispersa: con una chica las primeras tiradas salen ~0 y las manchas se amontonan en una esquina
  const bt = tex("manchaSuave", blobTex);
  const [x0, x1, z0, z1] = area;
  tonos.forEach((t, ti) => {
    const mat = pbr(`mancha${t.color}${t.alpha}`, { color: t.color, rough: 0.95, tex: bt, alpha: t.alpha });
    mat.useAlphaFromAlbedoTexture = true; mat.transparencyMode = B.Material.MATERIAL_ALPHABLEND; mat.disableDepthWrite = true;
    const ds: B.Mesh[] = [];
    for (let i = 0; i < t.n; i++) {
      const w = t.w[0] + r() * (t.w[1] - t.w[0]);
      const d = decal(name, w, w * (t.largo ?? 0.6 + r() * 0.5), x0 + r() * (x1 - x0), z0 + r() * (z1 - z0), mat, y + ti * 0.001);
      d.rotation.y = t.rot ?? r() * 6.3; ds.push(d);
    }
    mat.zOffset = -8; // por encima de los decales de tierra del patio (zOffset propio)
    merge(`${name}${ti}`, ds, [mat]).alphaIndex = 100; // los decales de tierra son ALPHATESTANDBLEND: sin alphaIndex se ordenan por distancia y taparían estas manchas
  });
}
