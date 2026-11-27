// ULTRA-1 — "GUARDIAN OF LIGHT". A giant hero of silver and red
// fighting KAIJU-1 on the beach: silver body, red chest V and crest fin,
// glowing eyes, and a blue Color Timer pulsing on his chest. Fighting
// pose (reference: one arm forward) with a glowing blue ENERGY BLADE on
// his right forearm; the old crossed-forearm light beam is still built
// for gameplay, but shot 3 shows the blade. The look is inspired by the
// classic silver giant, but no trademarked name appears anywhere in the
// game text — the HUD calls him ULTRA-1 / GUARDIAN OF LIGHT.
// Built at ~40 m tall in local units (same scale family as the kaiju);
// the group origin is the waterline, the model faces local +Z.
import * as THREE from 'three';

export const ULTRA_HANDS_LOCAL = new THREE.Vector3(0, 25, 9);

function mat(color, rough = 0.5, metal = 0.45) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true });
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildUltra() {
  const g = new THREE.Group();
  const silver = mat(0xd8dce2, 0.45, 0.5);
  const silverDark = mat(0x9aa2ac, 0.5, 0.45);
  const red = mat(0xc22a1e, 0.5, 0.25);
  const dark = mat(0x2a2e33, 0.6, 0.3);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const timerMat = new THREE.MeshBasicMaterial({ color: 0x66d9ff });

  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };

  // legs: silver columns + red boots + shin guards + red side stripes
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 12, 8), silver);
    add(leg, side * 2.8, 7, 0);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 5.2), red);
    add(boot, side * 2.8, 1.3, 0.8);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), silverDark);
    add(knee, side * 2.8, 12.5, 0.8);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.5, 0.9), silverDark);
    add(shin, side * 2.8, 6.5, 2.3);
  }
  // hips + torso: tapered silver trunk
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.8, 4, 10), silverDark);
  add(hips, 0, 14.5, 0);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.2, 15, 10), silver);
  add(torso, 0, 21, 0);
  // red chest V: two slanted plates on the chest front
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 0.8), red);
    plate.rotation.z = side * 0.55;
    plate.rotation.x = -0.12;
    add(plate, side * 2.6, 24.5, 5.6);
  }
  // red spine stripe down the back
  const spine = new THREE.Mesh(new THREE.BoxGeometry(1.8, 13, 0.8), red);
  add(spine, 0, 21, -6.4);
  // Color Timer: glowing blue disc on the chest + halo
  const timer = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 0.7, 16),
    timerMat,
  );
  timer.rotation.x = Math.PI / 2;
  add(timer, 0, 24.5, 6.6);
  const timerRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.9, 0.35, 8, 20),
    silverDark,
  );
  add(timerRing, 0, 24.5, 6.7);
  const timerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(140,220,255,1)', 'rgba(40,140,255,0.7)'),
    transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  timerGlow.scale.set(8, 8, 1);
  add(timerGlow, 0, 24.5, 7.2);
  g.userData.timerGlow = timerGlow;

  // shoulders + arms — FIGHTING POSE (reference: one arm forward with
  // the glowing blue energy blade, the other bent in guard across the
  // chest). Red bands on the upper arms. Model's right arm is side -1
  // (facing +Z, right = -X).
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0xaadfff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const bladeHaloMat = new THREE.MeshBasicMaterial({ color: 0x2277ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  {
    const side = -1; // RIGHT arm: thrust forward, energy blade on the fist
    const sh = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 8), silver);
    add(sh, side * 6.8, 27.5, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1.4, 8), red);
    band.rotation.x = Math.PI / 2 - 0.25;
    add(band, side * 6.2, 26.5, 2.2);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 10, 8), silver);
    arm.rotation.x = Math.PI / 2 - 0.28; // forward, slightly down
    arm.rotation.z = side * 0.18; // angled inward
    add(arm, side * 3.4, 25.5, 4.6);
    const fist = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.4), silverDark);
    add(fist, side * 1.1, 24.8, 8.6);
    // energy blade: THIN glowing blade jutting forward from the fist —
    // bright blue core + deeper blue halo + pointed tip + base flare.
    // ITERASI 2: dulu core 2.4 tinggi kebaca PAPAN PUTIH — sekarang
    // 0.9 tipis + biru elektrik, jadi pedang energi, bukan papan.
    const blade = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 15), bladeMat);
    core.position.set(0, 0, 7.5);
    const halo = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.6, 15.5), bladeHaloMat);
    halo.position.set(0, 0, 7.5);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 4), bladeMat);
    tip.rotation.x = Math.PI / 2; // point forward (+Z)
    tip.scale.set(0.22, 1, 1.6); // flatten: a blade point, not a spike
    tip.position.set(0, 0, 16.5);
    const flare = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(190,230,255,1)', 'rgba(60,140,255,0.7)'),
      transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    flare.scale.set(7, 7, 1);
    blade.add(core, halo, tip, flare);
    blade.position.set(side * 1.1, 24.8, 9.6);
    g.add(blade);
    g.userData.blade = blade;
  }
  {
    const side = 1; // LEFT arm: bent guard across the chest
    const sh = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 8), silver);
    add(sh, side * 6.8, 27.5, 0);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 1.4, 8), red);
    band.rotation.x = Math.PI / 2 - 0.25;
    add(band, side * 6.2, 26.5, 2.2);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 9, 8), silver);
    arm.rotation.x = Math.PI / 2 - 1.05; // bent up toward the chest
    arm.rotation.z = -side * 0.4; // angled inward across the body
    add(arm, side * 4.6, 24.2, 3.6);
    const fist = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.4), silverDark);
    add(fist, side * 2.6, 23.0, 6.4);
  }

  // head: silver, tapered cranium + red crest fin + red ear fins,
  // glowing eyes, small dark mouth line
  const head = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.6, 4.4), silver);
  add(head, 0, 33.5, 0);
  const cranium = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 3.6), silver);
  add(cranium, 0, 36.2, -0.2);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0, 2.6), red);
    add(ear, side * 2.25, 34.5, 0);
  }
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.6, 5.2), red);
  add(crest, 0, 36.4, -0.2);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.6), dark);
  add(jaw, 0, 31.8, 2.2);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6), eyeMat);
    eye.scale.set(1.25, 0.7, 0.6);
    add(eye, side * 1.35, 34.2, 2.3);
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,242,176,1)', 'rgba(255,200,60,0.6)'),
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    eyeGlow.scale.set(4.5, 4.5, 1);
    add(eyeGlow, side * 1.35, 34.2, 3.0);
  }

  // ---- light beam: white-blue core + blue halo + hand flare + impact
  // flare. Built in WORLD space by aimBeam(): the cylinders are unit
  // length and scaled to the hands->target distance each time.
  const beam = new THREE.Group();
  const beamTex = glowTexture('rgba(220,240,255,1)', 'rgba(80,160,255,0.7)');
  const mkBeamPart = (r, color, opacity) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.add(m);
    return m;
  };
  const beamCore = mkBeamPart(0.9, 0xeaf6ff, 0.95);
  const beamHalo = mkBeamPart(2.4, 0x5599ff, 0.45);
  const handFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  handFlare.scale.set(12, 12, 1);
  beam.add(handFlare);
  const impactFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamTex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  impactFlare.scale.set(22, 22, 1);
  beam.add(impactFlare);
  beam.visible = false;
  beam.userData = { core: beamCore, halo: beamHalo, handFlare, impactFlare };

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, beam };
}

// Aim the beam from the hero's hands (world) to a target point (world).
export function aimBeam(beam, fromWorld, toWorld) {
  const dir = toWorld.clone().sub(fromWorld);
  const len = dir.length();
  dir.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  for (const part of [beam.userData.core, beam.userData.halo]) {
    part.quaternion.setFromUnitVectors(up, dir);
    part.scale.set(1, len, 1);
    part.position.copy(fromWorld).addScaledVector(dir, len / 2);
  }
  beam.userData.handFlare.position.copy(fromWorld);
  beam.userData.impactFlare.position.copy(toWorld);
  beam.visible = true;
}
