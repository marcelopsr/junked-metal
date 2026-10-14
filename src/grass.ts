import * as B from "@babylonjs/core";
import { pbr } from "./render";
import { scene, zoneId } from "./zones/common";

export let windT = 0;
export const windCar = new B.Vector3(0, -100, 0);
// Sombras de nubes: discos suaves que cruzan el piso, siempre alrededor del auto (solo de día; ponytail: 5 discos, sin forma real de nube)
export const clouds: B.Mesh[] = [];
export function cloudShadows(t: number, c: B.Vector3) {
  if (!clouds.length) {
    const mat = pbr("cloudShade", { color: "#102010", rough: 1, alpha: 0.2 });
    mat.disableLighting = true; mat.emissiveColor = B.Color3.FromHexString("#2c3a1c"); mat.alpha = 0.1; // sombra cálida y leve (antes manchas casi negras en el pasto) mat.zOffset = -3; mat.disableDepthWrite = true;
    const t = new B.DynamicTexture("cloudTex", 64, scene, false);
    const c = t.getContext() as unknown as CanvasRenderingContext2D, g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "#fff"); g.addColorStop(1, "#000"); c.fillStyle = g; c.fillRect(0, 0, 64, 64); t.update();
    t.getAlphaFromRGB = true; mat.opacityTexture = t; // borde difuso
    clouds.push(...Array.from({ length: 5 }, (_, i) => {
      const d = B.MeshBuilder.CreateDisc("cloud", { radius: 22 + i * 5, tessellation: 20 }, scene);
      d.rotation.x = Math.PI / 2; d.material = mat; d.isPickable = false; d.position.y = 0.06 + i * 0.001;
      return d;
    }));
  }
  const W = 260;
  clouds.forEach((d, i) => {
    d.position.x = ((((i * 97 + t * (2 + i * 0.4) - c.x) % W) + W) % W) - W / 2 + c.x;
    d.position.z = ((((i * 151 + t * 0.8 - c.z) % W) + W) % W) - W / 2 + c.z;
  });
}
export function setWind(t: number, car: B.Vector3 | null) { windT = t; if (car) { windCar.copyFrom(car); if (zoneId === "patio" || zoneId === "jardin") cloudShadows(t, car); } }

export class WindPlugin extends B.MaterialPluginBase {
  constructor(m: B.Material) { super(m, "Wind", 200, { WIND: false }); this._enable(true); }
  getClassName() { return "WindPlugin"; }
  prepareDefines(d: B.MaterialDefines) { d["WIND"] = true; }
  isCompatible() { return true; } // GLSL (WebGL) y WGSL (WebGPU)
  getUniforms(lang?: number) {
    return { ubo: [{ name: "windTime", size: 1, type: "float" }, { name: "windCar", size: 3, type: "vec3" }], vertex: lang === 1 ? "uniform windTime: f32;\nuniform windCar: vec3f;" : "uniform float windTime;\nuniform vec3 windCar;" };
  }
  bindForSubMesh(ubo: B.UniformBuffer) { ubo.updateFloat("windTime", windT); ubo.updateVector3("windCar", windCar); }
  getCustomCode(type: string, lang?: number) {
    if (type !== "vertex") return null;
    if (lang === 1) return {
      CUSTOM_VERTEX_UPDATE_WORLDPOS: `{
        let gh = max(worldPos.y, 0.0);
        let gw = sin(uniforms.windTime * 1.7 + worldPos.x * 0.33 + worldPos.z * 0.21) + 0.45 * sin(uniforms.windTime * 3.3 + worldPos.z * 0.9);
        worldPos.x += 0.8 * gw * gh * 0.16; worldPos.z += 0.5 * gw * gh * 0.16;
        let gd = worldPos.xz - uniforms.windCar.xz;
        let gp = 1.0 - smoothstep(0.7, 2.4, length(gd));
        let gn = normalize(gd + vec2f(0.0001)) * gp * gh * 0.9;
        worldPos.x += gn.x; worldPos.z += gn.y;
        worldPos.y = mix(worldPos.y, worldPos.y * 0.15, gp);
      }`,
    };
    return {
      CUSTOM_VERTEX_UPDATE_WORLDPOS: `
        float gh = max(worldPos.y, 0.0);
        float gw = sin(windTime * 1.7 + worldPos.x * 0.33 + worldPos.z * 0.21) + 0.45 * sin(windTime * 3.3 + worldPos.z * 0.9);
        worldPos.xz += vec2(0.8, 0.5) * gw * gh * 0.16;
        vec2 gd = worldPos.xz - windCar.xz;
        float gp = 1.0 - smoothstep(0.7, 2.4, length(gd));
        worldPos.xz += normalize(gd + vec2(0.0001)) * gp * gh * 0.9;
        worldPos.y = mix(worldPos.y, worldPos.y * 0.15, gp);
      `,
    };
  }
}
