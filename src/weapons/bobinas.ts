import * as B from "@babylonjs/core";
import { FX } from "../fx";
import { box, cyl, sph, template, tor } from "../models";
import { M, pbr } from "../render";
import { at, hd, onFloor, orient } from "../moon";
import { Weapon, cant, W, X, type Ctx } from "./base";

// Distancia de p al segmento a-b
const _ab = new B.Vector3(), _ap = new B.Vector3();
function distSeg(p: B.Vector3, a: B.Vector3, b: B.Vector3) {
  b.subtractToRef(a, _ab); p.subtractToRef(a, _ap);
  const t = B.Scalar.Clamp(B.Vector3.Dot(_ap, _ab) / Math.max(_ab.lengthSquared(), 1e-6), 0, 1);
  return B.Vector3.Distance(p, _ab.scaleInPlace(t).addInPlace(a));
}

// Bobinas: el auto va soltando bobinas detrás; entre dos bobinas seguidas corre un arco eléctrico que quema a quien lo cruza y lo frena.
// Evolución (Línea de alta tensión): más bobinas, duran más y cada una también se une con la anterior a la anterior (red).
export class Bobinas extends Weapon {
  nodes: { m: B.InstancedMesh; life: number }[] = [];
  beams: B.InstancedMesh[] = [];
  last: B.Vector3 | null = null;
  tpl = template("bobina", () => [
    cyl(0.28, 0.34, 0.9, M.metal("#b87333"), [0, 0.45, 0], undefined, 8),
    tor(0.4, 0.06, M.metal("#8a5a2b"), [0, 0.35, 0], undefined, 8),
    sph(0.22, M.glow("#35d0ff"), [0, 1.0, 0]),
  ]);
  beamTpl = template("arco", () => [box(1, 1, 1, pbr("arcoMat", { color: "#7de8ff", rough: 0.2, emissive: "#35d0ff", alpha: 0.85 }), [0, 0, 0.5])]); // largo 1 sobre +z: se escala al largo del arco
  update(c: Ctx) {
    const cfg = W.bobinas, ev = this.evolved;
    const n = ev ? cfg.n_evo : cant(cfg, this.lv), life = ev ? cfg.duracion_evo : cfg.duracion_base + cfg.duracion_nivel * this.lv;
    const r = (ev ? cfg.area_evo : cfg.area_base + cfg.area_nivel * this.lv) * c.st.area;
    if (Math.abs(c.fs) > X.chispero_vel_min && (!this.last || hd(this.last, c.car.pos) >= X.bobinas_paso_m)) {
      const m = this.tpl.createInstance("b");
      onFloor(c.car.pos, 0.02, m.position); orient(m);
      this.nodes.push({ m, life });
      this.last = c.car.pos.clone();
      FX.hit(at(m.position, 0, 1, 0));
    }
    for (let i = this.nodes.length - 1; i >= 0; i--) if ((this.nodes[i].life -= c.dt) <= 0 || this.nodes.length > n) { this.nodes[i].m.dispose(); this.nodes.splice(i, 1); }
    // Arcos entre bobinas vecinas (y, evolucionada, también a dos de distancia)
    const segs: [B.Vector3, B.Vector3][] = [];
    for (let i = 1; i < this.nodes.length; i++) for (let j = i - 1; j >= Math.max(0, i - (ev ? 2 : 1)); j--) {
      const a = this.nodes[j].m.position, b = this.nodes[i].m.position;
      if (B.Vector3.Distance(a, b) <= X.bobinas_seg_max) segs.push([a, b]);
    }
    while (this.beams.length < segs.length) this.beams.push(this.beamTpl.createInstance("a"));
    while (this.beams.length > segs.length) this.beams.pop()!.dispose();
    const dps = (ev ? cfg.dano_evo_fijo : this.dano(cfg)) * c.st.dmg, th = 0.12 + 0.1 * Math.random();
    segs.forEach(([a, b], i) => {
      const m = this.beams[i], A = at(a, 0, 0.9, 0), Bp = at(b, 0, 0.9, 0), len = B.Vector3.Distance(A, Bp);
      m.position.copyFrom(A); m.lookAt(Bp); orient(m);
      m.scaling.set(th, th, len);
      for (const e of c.enemies) {
        if (distSeg(e.pos, A, Bp) >= r + e.radius * 0.5) continue;
        c.damage(e, dps * c.dt);
        e.slow = Math.max(e.slow, X.bobinas_ralentiza_s);
      }
    });
    if (segs.length && Math.random() < c.dt * X.bobinas_chispas_s) FX.hit(at(segs[0][0], 0, 1, 0));
  }
  dispose() { for (const n of this.nodes) n.m.dispose(); for (const b of this.beams) b.dispose(); }
}
