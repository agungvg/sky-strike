// KAIJU-1 — the sea boss, rebuilt ORGANIC (ronde 6): a LIVING sea
// monster, classic Godzilla — rough moss-green hide, bone dorsal
// spines, thick curling tail, glowing cyan jaw + red eyes. NO machine
// cues: no armor plates, no panel lines, no lamps, no metal, no
// symmetric collar/crest. The body is lumpy overlapping volumes
// (hips + torso + chest + belly bulge + back hump) with mottled hide
// lumps, short thick arms with bone claws, a wedge snout with visible
// teeth, and a tail that curls out to the kaiju's right (camera-right
// in shot 3) instead of hiding behind the body. Built from the same
// flat-shaded primitives as the rest of the game (spheres, cylinders,
// cones) — no realistic model, the silhouette does the work. The group
// origin is the waterline; the model faces local +Z. Built at ~43 m,
// the group is scaled 3x by the missile system, so the head tops
// ~126 m — about 9x a warship's mast, and the jet reads small beside it.
import * as THREE from 'three';

export const KAIJU_SCALE = 3;
// Chest centre in the group's local frame (the lock / hit point is
// computed from this in the missile system).
export const KAIJU_CHEST_LOCAL = new THREE.Vector3(0, 28, 1);

function mat(color, rough = 1, metal = 0, emissive = 0.22) {
  // Self-lit hide: with no scene env-map, pure standard materials
  // render near-black in the storm shot, so every hide material
  // carries its own colour as emissive — a low fraction, so the dark
  // moss green stays dark and keeps its shading instead of washing
  // out to flat grey (the iterasi-4 gunmetal lesson). Metalness stays
  // ZERO: this is skin, not steel.
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: true, emissive: color, emissiveIntensity: emissive });
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
  const hide = mat(0x4d5240, 1.0, 0, 0.22);      // dark moss-green hide
  const hideDark = mat(0x383d2c, 1.0, 0, 0.18); // shadowed hide
  const hideLight = mat(0x5f6a48, 1.0, 0, 0.22);// sunlit hide patches
  const bellyMat = mat(0x8a7f5e, 1.0, 0, 0.25); // pale olive-tan belly
  const bone = mat(0xd8d2c0, 0.9, 0, 0.08);     // bone spines / claws / teeth
  const dark = mat(0x241f18, 1.0, 0, 0.1);      // mouth cavity, jaw shadow
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe5230f }); // red eyes, deepened (iterasi 4b: pure 0xff3a2a bloomed into an orange balloon)

  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };

  // legs: thick haunches + knees, mostly under the waterline; feet
  // with bone toe claws, not flat machine plates.
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.6, 12, 8), hide);
    add(thigh, side * 3.6, 1, -0.5);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(3.0, 8, 6), hideDark);
    add(knee, side * 3.6, 5.5, 0.5);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(3.2, 8, 6), hide);
    foot.scale.set(1.1, 0.5, 1.4);
    add(foot, side * 3.6, -5.5, 1.5);
    for (let t = -1; t <= 1; t++) {
      const toe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.0, 6), bone);
      toe.rotation.x = Math.PI / 2 - 0.25; // point forward-down
      add(toe, side * 3.6 + t * 1.6, -5.0, 5.2);
    }
  }

  // hips + lumpy torso mass: overlapping rounded volumes, no straight
  // panels — the belly bulges forward (buncit), the back humps up.
  const hips = new THREE.Mesh(new THREE.SphereGeometry(8.5, 12, 10), hide);
  hips.scale.set(1.15, 0.8, 0.95);
  add(hips, 0, 8, 0);
  const torso = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 10), hide);
  torso.scale.set(1.05, 1.15, 0.9);
  add(torso, 0, 16, 0);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(7.5, 12, 10), hide);
  chest.scale.set(1.15, 0.9, 0.95);
  add(chest, 0, 27, 1);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 10), bellyMat);
  belly.scale.set(1.0, 1.1, 0.7);
  add(belly, 0, 14, 4);
  const hump = new THREE.Mesh(new THREE.SphereGeometry(6.5, 10, 8), hideDark);
  hump.scale.set(1.0, 0.9, 1.0);
  add(hump, 0, 25, -5);
  // hide mottling: irregular flattened lumps in lighter/darker hide,
  // breaking the smooth surface into organic patches.
  const warts = [
    [-6, 20, 6.5, 2.0, hideLight], [5, 23, 7, 1.6, hideDark], [0, 12, 8.2, 2.2, hideLight],
    [-7.5, 14, 3, 1.8, hideDark], [7.5, 18, 2, 1.5, hideLight], [-3, 28, 6.5, 1.4, hideDark],
    [4, 30, 5, 1.3, hideLight], [0, 22, -8.5, 2.4, hideDark], [-6, 10, -6, 1.8, hideLight],
  ];
  for (const [x, y, z, r, m] of warts) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
    w.scale.set(1.2, 0.45, 1.0);
    add(w, x, y, z);
  }
  // rounded belly lumps down the front — soft organic segmentation,
  // not machined scute plates.
  for (let i = 0; i < 4; i++) {
    const lump = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6), bellyMat);
    lump.scale.set(1.3, 0.6, 0.6);
    add(lump, 0, 9 + i * 3.4, 7.8 - i * 0.2);
  }

  // arms: SHORT and THICK, hanging down-forward with bone claws —
  // not long pistons splayed like a machine. Upper + forearm are
  // single tapered cylinders, no joints or segments.
  for (const side of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(3.0, 10, 8), hide);
    add(sh, side * 7, 26, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.5, 7, 8), hide);
    upper.rotation.z = -side * 0.45; upper.rotation.x = 0.2;
    add(upper, side * 9, 21, 1.5);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 5.5, 8), hide);
    fore.rotation.z = -side * 0.3; fore.rotation.x = 0.35;
    add(fore, side * 11, 15.5, 3);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 6), hideDark);
    add(hand, side * 12, 12.3, 4);
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 6), bone);
      claw.rotation.x = Math.PI / 2 + 0.5; // curve forward-down
      add(claw, side * 12 + c * 0.9, 11.2, 5.6);
    }
  }

  // neck + head: organic skull — round cranium, cheek lumps, a tapered
  // 4-sided wedge snout (flattened vertically), brow ridges, glowing
  // red eyes. No box head, no crown, no collar.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.4, 7, 8), hide);
  neck.rotation.x = 0.15;
  add(neck, 0, 33, -0.5);
  const throat = new THREE.Mesh(new THREE.SphereGeometry(3.0, 8, 6), bellyMat);
  throat.scale.set(1.0, 1.2, 0.8);
  add(throat, 0, 30.5, 3);
  const head = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10), hide);
  head.scale.set(1.0, 0.85, 1.15);
  add(head, 0, 39, 0.5);
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), hide);
    add(cheek, side * 2.4, 37.8, 2.2);
  }
  // snout: CylinderGeometry(4) rotated so the narrow end points +Z;
  // scale.z (local) flattens it vertically in world space. Spans
  // z 2..7, so the mouth block below sits on its front face.
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.8, 5, 4), hide);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1, 1, 0.75);
  add(snout, 0, 38, 4.5);
  // The mouth is rebuilt ON the snout's front face (z ~6.8): a dark
  // cavity plate, a cyan glow plate standing proud of it, a lower jaw
  // jutting forward below the snout, and both tooth rows in front of
  // the glow so the teeth read silhouetted against cyan — a jaw, not
  // a light blob. RONDE 6: narrowed to fit the tapered wedge snout
  // (glow 2.9 vs the ronde-5 3.8 on the 5.5-wide box head); the -0.7
  // shot yaw keeps the mouth near-frontal, so the narrower jaw still
  // reads as a mouth.
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 2.6), dark);
  jaw.rotation.x = 0.3; // hanging open, roaring — chin juts forward
  add(jaw, 0, 35.6, 5.8);
  const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x061014 }));
  add(mouthCavity, 0, 37.0, 6.8);
  // cyan-glowing mouth interior, standing proud of the dark cavity.
  const jawGlow = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.2, 0.5), new THREE.MeshBasicMaterial({ color: 0x2fd4f0 }));
  add(jawGlow, 0, 37.0, 7.1);
  const jawFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(120,246,255,1)', 'rgba(40,180,255,0.6)'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  jawFlare.scale.set(5, 5, 1); // RONDE 6b: 9 -> 5, opacity 0.85 -> 0.7 — flare 9 menutupi seluruh wajah jadi balon cyan, gigi + moncong tidak kebaca
  add(jawFlare, 0, 37.0, 8.4);
  // cyan strips flanking the mouth corners — the jaw outline.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.35), new THREE.MeshBasicMaterial({ color: 0x35d8f2 }));
    add(strip, side * 1.55, 37.0, 7.1);
  }
  g.userData.jawGlow = jawGlow;
  for (let i = 0; i < 5; i++) { // upper teeth, pointing down, in FRONT of the glow
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.5, 6), bone);
    tooth.rotation.x = Math.PI;
    add(tooth, -1.3 + i * 0.65, 36.2, 7.1);
  }
  for (let i = 0; i < 4; i++) { // lower teeth on the open jaw, pointing up, in FRONT of the glow
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 6), bone);
    add(tooth, -0.95 + i * 0.65, 36.4, 7.0);
  }
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.0), hideDark);
    brow.rotation.z = -side * 0.2; // angry slant
    add(brow, side * 1.8, 40.9, 3.0);
    // ITERASI 4b: eyes 1.75 -> 1.25, set deeper (z 3.5 -> 3.1), deeper
    // red — the iterasi-4 frame STILL showed one merged orange balloon:
    // the culprit was never the glow sprites (already 2.6/0.55), it is
    // the two big pure-red spheres themselves, projected on top of each
    // other by the -1.0 shot yaw and fused by bloom. Smaller, deeper-set,
    // deeper-red eyes read as two separate glowing dots, the reference look.
    // RONDE 6: eyes sit on the round cranium surface (z 3.65), not in a box.
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.15, 8, 6), eyeMat);
    add(eye, side * 1.8, 39.6, 3.65);
    // ITERASI 3: eye glow 5 -> 3.6 — the old sprite merged into one
    // big orange blob over the head; the eyes themselves now do the
    // reading, the glow is just a halo.
    // ITERASI 4: 3.6 -> 2.6, opacity 0.75 -> 0.55 — the iterasi-3
    // frame STILL merged both glows into one orange balloon sitting
    // on top of the head (the -1.0 yaw projects the eyes close
    // together, and the sprites + bloom fuse them). Smaller/dimmer
    // halos, so the two red eye spheres read as two eyes.
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,80,60,1)', 'rgba(255,40,30,0.6)'), transparent: true, opacity: 0.55, depthWrite: false }));
    eyeGlow.scale.set(2.6, 2.6, 1);
    add(eyeGlow, side * 1.8, 39.6, 4.8);
  }

  // dorsal spines: ONE irregular row of BONE spines down the back
  // ridge — varied heights, varied lean, no glow tips, no symmetry.
  // The tallest spines crest above the back so they read from the
  // front as a jagged silhouette. No collar, no crown, no shoulder
  // spikes: the back ridge alone carries the silhouette.
  const spineDefs = [
    // [y, z, h, r, tiltX, tiltZ]
    [33, -5.0, 7.0, 1.7, -0.35, 0.10],
    [30, -6.0, 6.5, 1.8, -0.30, -0.12],
    [26, -7.0, 5.0, 1.7, -0.30, 0.08],
    [23, -7.0, 4.5, 1.6, -0.25, -0.10],
    [20, -6.5, 4.0, 1.5, -0.25, 0.12],
    [17, -6.0, 3.5, 1.4, -0.20, -0.08],
    [14, -5.5, 3.0, 1.3, -0.20, 0.10],
    [11, -5.0, 2.6, 1.2, -0.15, -0.06],
  ];
  const addSpine = (x, y, z, h, r, tx = -0.3, tz = 0) => {
    const s = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), bone);
    s.rotation.x = tx; // lean back
    s.rotation.z = tz; // irregular sideways lean
    add(s, x, y, z);
  };
  for (const [y, z, h, r, tx, tz] of spineDefs) addSpine(0, y, z, h, r, tx, tz);
  // two small spines on the back of the neck
  addSpine(0, 35, -3.5, 3.0, 1.2, -0.4, 0.08);
  addSpine(0, 37, -2.5, 2.4, 1.0, -0.4, -0.08);
  // RONDE 6c: the back row sits behind the torso from the shot-3
  // camera, so it never crests the silhouette — only the tail spines
  // showed. Two IRREGULAR bone spines on the shoulder tops (different
  // heights/tilts, bone — not the symmetric robot collar) put the
  // jagged crest on the visible silhouette edge.
  addSpine(-6.5, 29, -1, 4.5, 1.5, -0.2, 0.25);
  addSpine(6.5, 28.5, -1, 3.8, 1.4, -0.25, -0.2);

  // tail: thick, muscular, curling out to the kaiju's RIGHT (local
  // +X) — the side facing the camera in shot 3 — instead of hiding
  // behind the body. Tapered CONES, wide end forward into the body,
  // apex trailing right-down toward the water: no flat disc ever
  // faces the camera. A few small bone spines ride on top.
  const tailSegs = [
    // [radius, length, x, y, z, dirX, dirY, dirZ] — dir = apex direction
    [4.2, 12, 2, 8, -7, 0.45, -0.15, -0.88],
    [3.0, 11, 8, 6.5, -11, 0.7, -0.2, -0.68],
    [1.9, 9, 13.5, 4.5, -13.5, 0.85, -0.3, -0.45],
  ];
  for (const [r, h, x, y, z, dx, dy, dz] of tailSegs) {
    const seg = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), hide);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    add(seg, x, y, z);
  }
  for (const [x, y, z] of [[2, 12.5, -7], [8, 10.5, -11], [13.5, 8, -13.5]]) {
    addSpine(x, y, z, 2.2, 1.1, -0.3, 0.1);
  }

  // ---- atomic breath: a bright blue beam from the mouth, arcing up and
  // forward over the jet. Core + outer glow + mouth flare + particles.
  // Built in the group's local frame (the 3x scale makes it ~150 m long);
  // the missile system hides it unless the boss is active or locked.
  const breath = new THREE.Group();
  const mouth = new THREE.Vector3(0, 37.5, 6.8);
  // ITERASI 2: dulu breath naik vertikal (dir -0.35, 0.8, 0.3) dan
  // kebaca KRISTAL MELAYANG di atas kepala. Sekarang breath menyembur
  // KE DEPAN (local +Z = arah hadap kaiju, ke ULTRA-1) — plume api
  // horizontal di antara kedua raksasa, bukan menara kristal.
  const dir = new THREE.Vector3(0.1, 0.18, 1).normalize();
  const beamLen = 16;
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
    new THREE.ConeGeometry(1.6, 6, 8),
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
    p.position.copy(mouth).addScaledVector(dir, 6 + i * 5);
    p.position.x += (i % 2 ? 1.5 : -1.5);
    breath.add(p);
  }
  breath.visible = false; // shown only when the boss is active / locked
  g.add(breath);
  g.userData.breath = breath;
  g.userData.organic = true; // flags the organic rebuild for the selftest (ronde 6: was mecha)

  // ---- self-lights (ITERASI 3): the model carries its own light so
  // it reads in the storm even where the scene key/fill never reach.
  // Physical falloff (decay 2): the key sits ~68 m (world) off the
  // chest front, so 2500 cd lands ~0.5 on the plates — a lift, not a
  // blowout — and spills a little cool light onto the jet's path too.
  // The jaw light sits just off the snout and tints the muzzle cyan.
  // Water is a ShaderMaterial, so these do NOT fix the black sea —
  // that needs a sky/shots change (reported to parent).
  const keyLight = new THREE.PointLight(0xbfd8ff, 2500, 500, 2);
  keyLight.position.set(0, 32, 30);
  g.add(keyLight);
  const jawLight = new THREE.PointLight(0x66f6ff, 500, 150, 2); // RONDE 6b: 900 -> 500 — spill cyan ikut menenggelamkan wajah
  jawLight.position.set(0, 37, 14);
  g.add(jawLight);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g };
}
