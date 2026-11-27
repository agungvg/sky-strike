// Clouds, two systems:
//  - disc clouds: flat-shaded layered discs drifting in three layers
//    (the sunset look of the reference covers)
//  - the cloud deck: a flyable layer of soft billboard puffs at ~880 m.
//    Sortie 05 flies ABOVE it, in the sun; from below it reads as a ceiling.
import * as THREE from 'three';
import { SEED } from './config.js';
import { mulberry32 } from './random.js';

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  const blob = (cx, cy, r, a) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  };
  blob(128, 78, 62, 0.85); blob(84, 84, 42, 0.7); blob(176, 84, 46, 0.7);
  blob(108, 62, 36, 0.6); blob(152, 60, 34, 0.6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Clouds {
  constructor(scene) {
    this.scene = scene;
    this.rand = mulberry32(SEED + 55);
    this.puffTex = puffTexture();
    this.groups = [];
    this.deck = [];
    this.discs = [];

    // --- disc clouds, 3 altitude layers ---
    // Chunky discs (height ~1/5 of radius) so they read from above as
    // well as edge-on; a warm emissive lift keeps their shaded sides
    // from going dark against the bright deck.
    const discGeo = new THREE.CylinderGeometry(1, 1, 0.6, 24);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xffd9b0, roughness: 1, flatShading: true, transparent: true, opacity: 0.92,
      emissive: 0x9a5a30, emissiveIntensity: 0.55,
    });
    for (let i = 0; i < 26; i++) {
      const r = 30 + this.rand() * 70;
      const m = new THREE.Mesh(discGeo, discMat);
      const layer = i % 3;
      const alt = [620, 820, 1050][layer];
      m.position.set((this.rand() * 2 - 1) * 1900, alt + this.rand() * 90, (this.rand() * 2 - 1) * 1900);
      m.scale.set(r, r * 0.35, r * 0.75);
      m.rotation.y = this.rand() * Math.PI;
      m.userData.drift = 2 + this.rand() * 4;
      scene.add(m);
      this.discs.push(m);
    }

    // --- the flyable cloud deck: soft billboards at ~880 m ---
    // v4: 420 puffs in 3-5 sprite CLUSTERS so each cloud has volume
    // (a bright white crown + a grey-blue underside sprite below it),
    // dense enough that from above it reads as a deck, not scattered puffs.
    const deckMat = new THREE.SpriteMaterial({
      map: this.puffTex, transparent: true, opacity: 0.92, depthWrite: false, fog: false,
    });
    const underMat = new THREE.SpriteMaterial({
      map: this.puffTex, transparent: true, opacity: 0.85, depthWrite: false, fog: false,
    });
    const addPuff = (mat, cx, cy, cz, w, op, drift) => {
      const s = new THREE.Sprite(mat.clone());
      s.position.set(cx, cy, cz);
      s.scale.set(w, w * 0.32, 1);
      s.material.opacity = op;
      s.userData.drift = drift;
      scene.add(s);
      this.deck.push(s);
      return s;
    };
    let placed = 0;
    while (placed < 420) {
      const cx = (this.rand() * 2 - 1) * 1700;
      const cz = (this.rand() * 2 - 1) * 1700;
      const cy = 880 + this.rand() * 60;
      const drift = 3 + this.rand() * 5;
      // underside first (drawn behind): grey-blue, slightly lower
      const u = addPuff(underMat, cx, cy - 26, cz + 10, 380 + this.rand() * 300, 0.75 + this.rand() * 0.2, drift);
      u.material.color.setHex(0xd8e4ee);
      u.userData.under = true;
      const n = 3 + Math.floor(this.rand() * 3);
      for (let k = 0; k < n && placed < 420; k++) {
        const w = 300 + this.rand() * 360;
        addPuff(deckMat, cx + (this.rand() * 2 - 1) * 150, cy + (this.rand() * 2 - 1) * 26, cz + (this.rand() * 2 - 1) * 150, w, 0.7 + this.rand() * 0.28, drift);
        placed++;
      }
    }

    // --- high wisps above the deck for the golden cover ---
    const wispMat = new THREE.SpriteMaterial({
      map: this.puffTex, transparent: true, opacity: 0.5, depthWrite: false, fog: false,
    });
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(wispMat.clone());
      s.position.set((this.rand() * 2 - 1) * 1800, 1250 + this.rand() * 220, (this.rand() * 2 - 1) * 1800);
      const w = 320 + this.rand() * 420;
      s.scale.set(w, w * 0.2, 1);
      s.userData.drift = 4 + this.rand() * 4;
      scene.add(s);
      this.deck.push(s);
    }
    this.tint(0xffd9b0, 0xff9d7a);
  }

  // Tint every cloud with the palette (pink-orange undersides sell sunset;
  // white crowns + grey-blue undersides sell bright day). Underside
  // sprites take the bottom colour, crowns and discs the top colour.
  tint(topHex, bottomHex) {
    const top = new THREE.Color(topHex);
    const bot = new THREE.Color(bottomHex);
    for (const s of this.deck) s.material.color.copy(s.userData.under ? bot : top);
    for (const p of this.discs) {
      p.material.color.copy(top);
      p.material.emissive.copy(top).multiplyScalar(0.35);
    }
  }

  setStorm(on) {
    this.tint(on ? 0x3c4356 : 0xffd9b0, on ? 0x12161f : 0xff9d7a);
    for (const p of this.discs) p.material.opacity = on ? 0.97 : 0.9;
    for (const s of this.deck) s.material.opacity = Math.min(1, s.material.opacity + (on ? 0.05 : -0.05));
  }

  update(dt) {
    for (const p of this.discs) {
      p.position.x += p.userData.drift * dt;
      if (p.position.x > 2000) p.position.x = -2000;
    }
    for (const s of this.deck) {
      s.position.x += s.userData.drift * dt;
      if (s.position.x > 2000) s.position.x = -2000;
    }
  }
}
