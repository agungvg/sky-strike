// Lightning: branching bolts, built from a jagged midpoint-displacement
// path with 2-4 side branches, drawn as additive lines with a glow sprite
// at the strike point. A flash light briefly lights the whole scene.
import * as THREE from 'three';
import { mulberry32 } from './random.js';

export class Lightning {
  constructor(scene) {
    this.scene = scene;
    this.rand = mulberry32(777);
    this.flashLight = new THREE.PointLight(0xbfd0ff, 0, 3000, 1.2);
    scene.add(this.flashLight);
    this.active = null;   // { line, core, branches, glow, ttl }
    this.timer = 2.0;
    this.auto = false;
    this.flash = 0;
  }

  // Build one bolt from (x, topY, z) down to the ground.
  strike(x, z, topY = 1100) {
    this.clear();
    const pts = [];
    const segs = 14;
    let px = x, pz = z;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const y = topY - t * (topY - 60);
      px += (this.rand() - 0.5) * 90 * (1 - t * 0.4);
      pz += (this.rand() - 0.5) * 90 * (1 - t * 0.4);
      pts.push(new THREE.Vector3(px, y, pz));
    }
    // branches off the middle of the main channel
    const branchPts = [];
    for (let b = 0; b < 3; b++) {
      const startIdx = 3 + Math.floor(this.rand() * 7);
      const start = pts[startIdx];
      let bx = start.x, by = start.y, bz = start.z;
      const dir = this.rand() > 0.5 ? 1 : -1;
      for (let i = 0; i < 5; i++) {
        bx += dir * (18 + this.rand() * 26);
        by -= 40 + this.rand() * 40;
        bz += (this.rand() - 0.5) * 50;
        branchPts.push(new THREE.Vector3(bx, by, bz));
        branchPts.push(new THREE.Vector3(bx + 4, by - 6, bz));
      }
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 32, 1.6, 5, false);
    const line = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0xeaf2ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    line.frustumCulled = false;
    // a thin bright core line inside the tube for crispness
    const coreGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const core = new THREE.Line(coreGeo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
    }));
    core.frustumCulled = false;
    const bgeo = new THREE.BufferGeometry().setFromPoints(branchPts);
    const branches = new THREE.LineSegments(bgeo, new THREE.LineBasicMaterial({
      color: 0xbdd2ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
    }));
    branches.frustumCulled = false;
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(26, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.position.copy(pts[pts.length - 1]);
    this.scene.add(line, core, branches, glow);
    this.flashLight.position.set(x, 500, z);
    this.flashLight.intensity = 900;
    this.flash = 1;
    this.active = { line, core, branches, glow, ttl: 0.45 };
  }

  clear() {
    if (!this.active) return;
    this.scene.remove(this.active.line, this.active.core, this.active.branches, this.active.glow);
    this.active.line.geometry.dispose();
    this.active.core.geometry.dispose();
    this.active.branches.geometry.dispose();
    this.active = null;
  }

  update(dt) {
    if (this.active) {
      this.active.ttl -= dt;
      const f = Math.max(0, this.active.ttl / 0.45);
      this.active.line.material.opacity = f;
      this.active.core.material.opacity = f;
      this.active.branches.material.opacity = f * 0.9;
      this.active.glow.material.opacity = f * 0.55;
      if (this.active.ttl <= 0) this.clear();
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 3.2);
      this.flashLight.intensity = this.flash * 900;
    }
    if (this.auto) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 3 + this.rand() * 5;
        this.strike((this.rand() * 2 - 1) * 1200, (this.rand() * 2 - 1) * 1200);
      }
    }
  }
}
