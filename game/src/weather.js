// Weather: slanted rain streaks (LineSegments, never square sprites),
// wind + gusts, and the storm-front wall that closes the coast.
import * as THREE from 'three';
import { mulberry32 } from './random.js';

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.rainCount = 900;
    const pos = new Float32Array(this.rainCount * 6);
    this.rainPos = pos;
    this.rand = mulberry32(4242);
    this.drops = [];
    for (let i = 0; i < this.rainCount; i++) {
      this.drops.push({
        x: (this.rand() * 2 - 1) * 260,
        y: this.rand() * 160,
        z: (this.rand() * 2 - 1) * 260,
        speed: 90 + this.rand() * 50,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x9fb4cc, transparent: true, opacity: 0.55,
    });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // storm-front wall: a dark band across the north end of the coast
    const wallGeo = new THREE.PlaneGeometry(3600, 900, 1, 1);
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x141824, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false,
    });
    this.front = new THREE.Mesh(wallGeo, wallMat);
    this.front.position.set(0, 450, -1850);
    this.front.visible = false;
    scene.add(this.front);

    this.windKt = 5;
    this.gustAmp = 0;
    this.raining = false;
    this.slant = 0.28; // rain slant from wind
  }

  setStorm(on, windKt = 18, gustAmp = 2.5) {
    this.raining = on;
    this.rain.visible = on;
    this.front.visible = on;
    this.windKt = on ? windKt : 5;
    this.gustAmp = on ? gustAmp : 0;
    this.slant = on ? 0.45 : 0.28;
  }

  update(dt, cx, cy, cz) {
    if (this.raining) {
      this.rain.position.set(cx, cy - 40, cz);
      for (let i = 0; i < this.rainCount; i++) {
        const d = this.drops[i];
        d.y -= d.speed * dt;
        d.x += this.slant * d.speed * dt * 0.4;
        if (d.y < 0) {
          d.y = 150 + this.rand() * 20;
          d.x = (this.rand() * 2 - 1) * 260;
          d.z = (this.rand() * 2 - 1) * 260;
        }
        const o = i * 6;
        this.rainPos[o] = d.x; this.rainPos[o + 1] = d.y; this.rainPos[o + 2] = d.z;
        this.rainPos[o + 3] = d.x - this.slant * 7; this.rainPos[o + 4] = d.y + 7; this.rainPos[o + 5] = d.z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
