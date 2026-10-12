import * as B from "@babylonjs/core";
import { rng } from "../../rng";
import { BAL } from "../../balance";
import { alt, flatL, hflat, MOON } from "../../moon";
import type { Think } from "./util";

const ATK = BAL.ataques;

const polillaAI: Think = (e, c) => {
  const { dt, diff, v, target } = c;
  const d = e.def;
  // Va al faro: revolotea delante del auto (hacia donde avanza) y cada tanto se tira contra el parabrisas
  const cv = e.lastT ? target.subtract(e.lastT).scaleInPlace(1 / Math.max(dt, 1e-3)) : B.Vector3.Zero();
  (e.lastT ??= new B.Vector3()).copyFrom(target);
  hflat(cv, target);
  const cs = cv.length();
  e.timer -= dt;
  if (e.timer <= 0) { e.state = 1 - e.state; e.timer = e.state ? ATK.polilla_picada_s : ATK.polilla_vuelo_min + rng() * ATK.polilla_vuelo_rango; }
  const dive = e.state === 1;
  const goal = dive ? target.clone() : target.add(cs > 2 ? cv.scaleInPlace(4.5 / cs) : e.pos.subtract(target).normalize().scaleInPlace(3.5));
  if (!dive) goal.addInPlace(new B.Vector3(Math.sin(e.walk * 0.11) * 1.6, 0, Math.cos(e.walk * 0.07) * 1.6));
  const g = MOON.on ? flatL(goal.subtract(e.pos), e.pos) : goal.subtract(e.pos); g.y = 0;
  const gd = g.length();
  const sp = (dive ? d.speed * ATK.polilla_picada_vel : Math.min(d.speed, gd * 3)) * e.spd * (e.slow > 0 ? 0.45 : 1);
  const want = gd > 0.01 ? g.scaleInPlace(sp / gd) : g;
  const floor = MOON.on ? 0 : e.groundY(4) ?? e.pos.y - 1.7; // vuela a altura fija sobre el piso (montículos, rampas)
  const hy = MOON.on ? (dive ? 0.5 : 1.7 + Math.sin(e.walk * 0.05) * 0.3) - alt(e.pos) : floor + (dive ? 0.5 : 1.7 + Math.sin(e.walk * 0.05) * 0.3) - e.pos.y;
  const k = Math.min(1, dt * 5);
  e.body.setLinearVelocity(new B.Vector3(v.x + (want.x - v.x) * k, hy * 4, v.z + (want.z - v.z) * k));
  e.body.setAngularVelocity(new B.Vector3(0, B.Scalar.Clamp(diff * 8, -8, 8), 0));
  return true;
};

export { polillaAI };
