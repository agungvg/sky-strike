// KAIJU-1 — the sea boss, rebuilt as a MECHA-KAIJU (reference: dark
// gunmetal plates, cyan-glowing jaw, red lights on the hull, sharp metal
// teeth, metal dorsal plates). A giant machine rising from the bay off
// the coast: huge torso with armor plates, a layered dorsal plate row
// with glowing cyan tips, head with snout + glowing red eyes + teeth, a
// muscular tail trailing into the water, and a blue atomic breath arcing
// from its cyan jaw toward ULTRA-1. Built from the same flat-shaded
// primitives as the rest of the game (cylinders, boxes, cones, spheres) —
// no realistic model, the silhouette does the work. The group origin is
// the waterline; the model faces local +Z. Built at ~43 m, the group is
// scaled 3x by the missile system, so the head tops ~126 m — about 9x a
// warship's mast, and the jet reads small beside it.
import * as THREE from 'three';

export const KAIJU_SCALE = 3;
// Chest centre in the group's local frame (the lock / hit point is
// computed from this in the missile system).
export const KAIJU_CHEST_LOCAL = new THREE.Vector3(0, 28, 1);

function mat(color, rough = 0.95, metal = 0.05) {
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

export function buildKaiju() {
  const g = new THREE.Group();
  // MECHA plating: dark gunmetal hull, steel belly, near-black joints,
  // polished-metal dorsal plates. The machine reads against the storm
  // sky; the cyan jaw + red lights are the colour accents. Metalness
  // kept LOW (<=0.35): with no env-map, high-metalness standard
  // materials render near-black — the first storm pass proved it.
  const skin = mat(0x4d565f, 0.45, 0.25); // gunmetal hull
  const bellyMat = mat(0x5d6773, 0.5, 0.2); // steel belly
  const ridgeMat = mat(0x2e343b, 0.5, 0.3); // dark joint plates
  const spineMat = mat(0xb8bec8, 0.35, 0.35); // polished-metal plates/teeth
  const dark = mat(0x1e242a, 0.5, 0.25);
  const blueGlow = new THREE.MeshBasicMaterial({ color: 0x66f6ff }); // cyan tips
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a }); // red machine eyes

  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };

  // legs: thick columns, mostly under the waterline
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 14, 8), skin);
    add(leg, side * 3.5, 0, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.6, 6), dark);
    add(foot, side * 3.5, -6.5, 1.5);
  }

  // torso: tapered trunk + chest + pale belly plate
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 9.5, 24, 10), skin);
  add(torso, 0, 19, 0);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(7.5, 12, 10), skin);
  chest.scale.set(1.15, 0.9, 0.9);
  add(chest, 0, 28, 1);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), bellyMat);
  belly.scale.set(1.0, 1.25, 0.55);
  add(belly, 0, 16, 4.5);

  // scale texture: ridge rings around the trunk + a scute row down the belly
  for (const [y, r] of [[12, 9.6], [18, 9.0], [24, 8.2]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.9, 10), ridgeMat);
    add(ring, 0, y, 0);
  }
  for (let i = 0; i < 6; i++) {
    const scute = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 0.8), ridgeMat);
    scute.rotation.x = -0.15;
    add(scute, 0, 8 + i * 3.2, 7.6 - i * 0.35);
  }
  // shoulder plates
  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 1), ridgeMat);
    plate.rotation.z = side * 0.4;
    add(plate, side * 7, 26, 4.5);
  }

  // red hull lights (reference: the mecha is studded with red lamps)
  // chest + shoulders + forearms + hips
  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff2a22 });
  for (const [x, y, z] of [
    [-3.5, 28, 7.2], [3.5, 28, 7.2],
    [-7.5, 30, 2.5], [7.5, 30, 2.5],
    [-8.5, 20, 4.5], [8.5, 20, 4.5],
    [-5, 12, 7.5], [5, 12, 7.5],
  ]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), redLightMat);
    add(l, x, y, z);
  }

  // bolted armor plates on the torso front
  for (const side of [-1, 1]) {
    const armor = new THREE.Mesh(new THREE.BoxGeometry(4.5, 8, 0.8), mat(0x4a525c, 0.5, 0.65));
    armor.rotation.z = side * 0.12;
    add(armor, side * 3.4, 20, 8.8);
  }

  // shoulders + short arms with claws
  for (const side of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), skin);
    add(sh, side * 7.5, 27, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.1, 8, 8), skin);
    arm.rotation.z = -side * 0.35; arm.rotation.x = 0.25;
    add(arm, side * 8.5, 21, 2.5);
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 6), spineMat);
      claw.rotation.x = Math.PI / 2 + 0.4;
      add(claw, side * 9 + (c - 1) * 0.8, 17, 4.5);
    }
  }

  // neck + head: cranium, snout, open jaw, brow, glowing eyes, teeth
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.0, 7, 8), skin);
  add(neck, 0, 33, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5, 6), skin);
  add(head, 0, 39, 0);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3, 4.5), bellyMat); // pale muzzle, reads against the dark head
  add(snout, 0, 38, 4.5);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 4), dark);
  jaw.rotation.x = 0.35; // hanging open, roaring
  add(jaw, 0, 35.6, 4.2);
  // cyan-glowing mouth interior (reference: the mecha's jaw burns cyan)
  // + halo sprite so it reads from across the bay
  const jawGlow = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 3.0), new THREE.MeshBasicMaterial({ color: 0x66f6ff }));
  add(jawGlow, 0, 36.9, 4.6);
  const jawFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(120,246,255,1)', 'rgba(40,180,255,0.6)'), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  jawFlare.scale.set(8, 8, 1);
  add(jawFlare, 0, 36.9, 5.6);
  g.userData.jawGlow = jawGlow;
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.2), dark);
    add(brow, side * 1.8, 40.5, 2.8);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), eyeMat);
    add(eye, side * 1.8, 39.5, 3.5);
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,80,60,1)', 'rgba(255,40,30,0.6)'), transparent: true, opacity: 0.85, depthWrite: false }));
    eyeGlow.scale.set(5, 5, 1);
    add(eyeGlow, side * 1.8, 39.5, 4.6);
  }
  for (let i = 0; i < 5; i++) { // upper teeth, pointing down
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 6), spineMat);
    tooth.rotation.x = Math.PI;
    add(tooth, -1.6 + i * 0.8, 36.6, 6.2);
  }
  for (let i = 0; i < 4; i++) { // lower teeth on the open jaw, pointing up
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.3, 6), spineMat);
    add(tooth, -1.2 + i * 0.8, 36.8, 5.6);
  }

  // dorsal spines: TWO layered rows, TALL so they crest above the back
  // and read from the front as a jagged silhouette. The main row runs
  // down the top of the back, tallest over the shoulders, plus a smaller
  // offset row so the crest reads layered, not a single line. Every
  // spine tip glows blue.
  const spineDefs = [
    [34, -4, 4.5, 1.9], [31, -4.5, 4.8, 2.0], [28, -4.5, 4.8, 2.0],
    [25, -4.5, 4.5, 1.9], [22, -4, 4.2, 1.8], [19, -4, 3.8, 1.7],
    [16, -3.5, 3.5, 1.6], [13, -3.5, 3.2, 1.5], [10, -3, 3.0, 1.4],
  ];
  const addSpine = (x, y, z, h, r) => {
    const s = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), spineMat);
    s.rotation.x = -0.3; // lean back
    s.rotation.y = Math.PI / 4; // diamond cross-section reads as a plate
    add(s, x, y, z);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.85, h * 0.9, 4), blueGlow);
    tip.rotation.x = -0.3; tip.rotation.y = Math.PI / 4;
    add(tip, x, y + h * 0.5, z - h * 0.16);
  };
  for (const [y, z, h, r] of spineDefs) addSpine(0, y, z, h, r);
  for (let i = 0; i < 7; i++) { // second row, offset sideways + lower
    const side = i % 2 ? 1 : -1;
    addSpine(side * 2.6, 12 + i * 3, -4.2 + i * 0.2, 3.6, 1.6);
  }
  for (const side of [-1, 1]) { // shoulder spikes, on the visible silhouette
    addSpine(side * 7.5, 30, 1.5, 3.4, 1.5);
    addSpine(side * 8.5, 26, 2.5, 3.0, 1.4);
  }

  // tail: thick, muscular, curving to the kaiju's right so it reads from
  // the front (a straight-back tail hides behind the body). Muscle rings
  // + spines on top.
  const tailSegs = [
    [4.0, 3.2, 11, 4, 9, -11, 0.8, -0.5],
    [3.2, 2.2, 11, 12, 5, -19, 1.15, -0.6],
    [2.2, 0.8, 10, 22, 3, -26, 1.4, -0.7],
  ];
  for (const [rTop, rBot, h, x, y, z, rx, rz] of tailSegs) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), skin);
    seg.rotation.x = rx; seg.rotation.z = rz;
    add(seg, x, y, z);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(rTop + 0.15, rTop + 0.15, 0.8, 8), ridgeMat);
    ring.rotation.x = rx; ring.rotation.z = rz;
    add(ring, x, y + h * 0.3, z - h * 0.15);
  }
  for (const [x, y, z] of [[6, 12, -12], [13, 8, -19], [20, 5, -24]]) {
    addSpine(x, y, z, 2.2, 1.1);
  }

  // ---- atomic breath: a bright blue beam from the mouth, arcing up and
  // forward over the jet. Core + outer glow + mouth flare + particles.
  // Built in the group's local frame (the 3x scale makes it ~150 m long);
  // the missile system hides it unless the boss is active or locked.
  const breath = new THREE.Group();
  const mouth = new THREE.Vector3(0, 37.5, 6.8);
  // up and leaning toward ULTRA-1: in the face-off the kaiju's yaw
  // turns a forward breath into a giant diagonal across the frame, so
  // the breath climbs instead of crossing. SHORT (14) and fat — a plume
  // of flame above the jaw, not a skyscraper laser.
  const dir = new THREE.Vector3(-0.35, 0.8, 0.3).normalize();
  const beamLen = 14;
  const blueTex = glowTexture('rgba(190,230,255,1)', 'rgba(40,140,255,0.7)');
  const orient = (mesh) => {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  };
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 1.0, beamLen, 8),
    new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  orient(core);
  core.position.copy(mouth).addScaledVector(dir, beamLen / 2);
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.5, beamLen, 8),
    new THREE.MeshBasicMaterial({ color: 0x22aaff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  orient(outer);
  outer.position.copy(mouth).addScaledVector(dir, beamLen / 2);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 9, 8),
    new THREE.MeshBasicMaterial({ color: 0x55ccff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  orient(tip);
  tip.position.copy(mouth).addScaledVector(dir, beamLen + 4);
  const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: blueTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  flare.scale.set(10, 10, 1);
  flare.position.copy(mouth);
  breath.add(core, outer, tip, flare);
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: blueTex, transparent: true, opacity: 0.7 - i * 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
    const s = 7 - i * 0.8;
    p.scale.set(s, s, 1);
    p.position.copy(mouth).addScaledVector(dir, 8 + i * 9);
    p.position.x += (i % 2 ? 1.5 : -1.5);
    breath.add(p);
  }
  breath.visible = false; // shown only when the boss is active / locked
  g.add(breath);
  g.userData.breath = breath;
  g.userData.mecha = true; // flags the mecha rebuild for the selftest

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g };
}
