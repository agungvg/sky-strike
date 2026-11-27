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

function mat(color, rough = 0.95, metal = 0.05, emissive = 0.30) {
  // ITERASI 3: self-lit hull. With no scene env-map, high-metalness
  // standard materials render near-black in the storm shot, so every
  // hull material carries its own colour as emissive — the gunmetal
  // reads as gunmetal even where no key light reaches it. Emissive is
  // a fraction of the base colour, so plates keep their shading and
  // the silhouette keeps its dark/light contrast; it only lifts the
  // floor out of black. Metalness stays LOW for the same reason.
  // ITERASI 4: 0.38 -> 0.30 — the iterasi-3 frame rendered the hull
  // FLAT LIGHT GREY (emissive + env 0.15 + storm key/fill washed the
  // dark/light contrast out). 0.30 keeps the lift but lets the plates
  // read gunmetal again, closer to the reference's dark mecha.
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
  // MECHA plating: LIGHTER gunmetal hull + LOW metalness so the plates
  // read in the storm instead of going black. (Iterasi 2's 0x4d565f at
  // metalness 0.25 and the 0.65-metal chest armor both rendered as a
  // black silhouette in shot 3; the armor is the worst offender.)
  const skin = mat(0x6b7683, 0.5, 0.12); // gunmetal hull, lightened
  const bellyMat = mat(0x7d8894, 0.55, 0.1); // steel belly, lightened
  const ridgeMat = mat(0x424b55, 0.55, 0.15); // joint plates, lightened
  const spineMat = mat(0xc4cad4, 0.35, 0.2, 0.3); // polished-metal plates/teeth
  const dark = mat(0x333c46, 0.55, 0.15); // joints, lightened from near-black
  const blueGlow = new THREE.MeshBasicMaterial({ color: 0x66f6ff }); // cyan tips
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe5230f }); // red machine eyes, deepened (iterasi 4b: pure 0xff3a2a bloomed into an orange balloon)

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
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), redLightMat);
    add(l, x, y, z);
  }

  // bolted armor plates on the torso front
  for (const side of [-1, 1]) {
    const armor = new THREE.Mesh(new THREE.BoxGeometry(4.5, 8, 0.8), mat(0x565f6b, 0.5, 0.2));
    armor.rotation.z = side * 0.12;
    add(armor, side * 3.4, 20, 8.8);
  }
  // RONDE 5 — cyan edge strips on the armor plates: a vertical cyan
  // accent on each side of the chest so the grey torso separates
  // from the grey sea/sky at range.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7, 0.3), new THREE.MeshBasicMaterial({ color: 0x35d8f2 }));
    add(strip, side * 5.8, 20, 9.3);
  }

  // shoulders + LONG arms that break the torso silhouette. RONDE 5:
  // the ronde-4 arms (8 long, tucked at ±0.35) hugged the trunk and
  // vanished into the grey column — the kaiju read as a tower. The
  // arms are now 11 long, splayed OUTWARD (±0.8) with bigger spread
  // claws, so the silhouette has a visible limb on each side.
  for (const side of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), skin);
    add(sh, side * 7.5, 27, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 11, 8), skin);
    arm.rotation.z = -side * 0.8; arm.rotation.x = 0.25;
    add(arm, side * 10, 20, 2.5);
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.8, 6), spineMat);
      claw.rotation.x = Math.PI / 2 + 0.4;
      add(claw, side * 12.2 + (c - 1) * 1.0, 15.5, 4.5);
    }
  }

  // neck + head: cranium, snout, open jaw, brow, glowing eyes, teeth
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.0, 7, 8), skin);
  add(neck, 0, 33, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5, 6), skin);
  add(head, 0, 39, 0);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3, 4.5), bellyMat); // pale muzzle, reads against the dark head
  add(snout, 0, 38, 4.5);
  // ITERASI 3 — the mouth was INVISIBLE: the old jawGlow box
  // (3.6 x 1.6 x 3.6 at z 4.6) and both tooth rows sat INSIDE the
  // snout box (z 2.25–6.75, y 36.5–39.5), so from the camera the head
  // showed no cyan jaw at all. The whole mouth is now rebuilt ON the
  // snout's front face (z 6.75): a dark cavity plate, a cyan glow
  // plate standing proud of it, a lower jaw jutting forward below the
  // snout, and both tooth rows in front of the glow so the teeth read
  // silhouetted against cyan — a jaw, not a light blob.
  // RONDE 5 — the jaw is BIGGER and reads as a mouth, not a light
  // blob. The ronde-4 jaw (2.9-wide plate, 8-unit flare) rendered as
  // one ambiguous blue smudge: too small against the 5.5-wide head,
  // and the -1.0 shot yaw foreshortened the whole mouth face. The
  // plate is now 3.8 wide (most of the snout), the flare bigger and
  // deeper cyan, the chin juts further forward, and two cyan side
  // strips outline the mouth corners so the jaw reads even at range.
  // The shot yaw also turns to -0.7 (see shots.js), so the mouth face
  // is near-frontal instead of edge-on.
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.4, 2.8), dark);
  jaw.rotation.x = 0.3; // hanging open, roaring — chin juts forward
  add(jaw, 0, 35.6, 5.8);
  const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 0.4), new THREE.MeshBasicMaterial({ color: 0x061014 }));
  add(mouthCavity, 0, 37.0, 6.8);
  // cyan-glowing mouth interior, standing proud of the dark cavity.
  const jawGlow = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 0.5), new THREE.MeshBasicMaterial({ color: 0x2fd4f0 }));
  add(jawGlow, 0, 37.0, 7.1);
  const jawFlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(120,246,255,1)', 'rgba(40,180,255,0.6)'), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  jawFlare.scale.set(11, 11, 1);
  add(jawFlare, 0, 37.0, 8.4);
  // cyan strips flanking the mouth corners — the jaw outline.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 0.35), new THREE.MeshBasicMaterial({ color: 0x35d8f2 }));
    add(strip, side * 2.1, 37.0, 7.1);
  }
  g.userData.jawGlow = jawGlow;
  for (let i = 0; i < 5; i++) { // upper teeth, pointing down, in FRONT of the glow
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), dark);
    tooth.rotation.x = Math.PI;
    add(tooth, -2.0 + i * 1.0, 36.2, 7.1);
  }
  for (let i = 0; i < 4; i++) { // lower teeth on the open jaw, pointing up, in FRONT of the glow
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.5, 6), dark);
    add(tooth, -1.5 + i * 1.0, 36.4, 7.0);
  }
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 1.2), dark);
    add(brow, side * 1.8, 40.5, 2.8);
    // ITERASI 4b: eyes 1.75 -> 1.25, set deeper (z 3.5 -> 3.1), deeper
    // red — the iterasi-4 frame STILL showed one merged orange balloon:
    // the culprit was never the glow sprites (already 2.6/0.55), it is
    // the two big pure-red spheres themselves, projected on top of each
    // other by the -1.0 shot yaw and fused by bloom. Smaller, deeper-set,
    // deeper-red eyes read as two separate glowing dots, the reference look.
    const eye = new THREE.Mesh(new THREE.SphereGeometry(1.25, 8, 6), eyeMat);
    add(eye, side * 1.8, 39.5, 3.1);
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
    add(eyeGlow, side * 1.8, 39.5, 4.6);
  }
  // (teeth now live with the RONDE 5 jaw block above, widened to match
  // the 3.8-wide glow plate — the old loops here were removed as
  // duplicates.)

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
    // RONDE 5: 3.4/3.0 -> 5.0/4.2 tall — the old spikes were lost
    // against the trunk; these crest above the shoulder line.
    addSpine(side * 7.5, 30, 1.5, 5.0, 2.0);
    addSpine(side * 8.5, 26, 2.5, 4.2, 1.8);
  }
  // RONDE 5 — head crest: three cyan-tipped spikes on the crown, so
  // the head breaks the skyline instead of reading as a flat grey
  // block (the reference's mecha has a spiky head crest).
  for (const [x, h] of [[-1.8, 3.2], [0, 4.0], [1.8, 3.2]]) {
    addSpine(x, 42.5, -0.5, h, 1.3);
  }
  // RONDE 5 — chest collar: a jagged crest across the upper chest
  // FRONT. The dorsal row sits on the far side (invisible from this
  // camera); the collar gives the front a jagged crest too.
  for (let i = 0; i < 5; i++) {
    addSpine(-5 + i * 2.5, 32, 6.0, 2.6, 1.1);
  }

  // tail: thick, muscular, trailing BEHIND the body (local -Z, away
  // from the camera) and curving slightly to the kaiju's left, low over
  // the water. ITERASI 3: the old tail curved to local +X, which the
  // -1.0 shot yaw swings toward the camera — its flat 8-segment
  // cylinder end-caps + rings read as big grey octagon "rocks" at the
  // bottom-right frame edge (a ~19 m disc at ~170 m ≈ 130 px). The new
  // tail is tapered CONES, wide end forward into the body, apex
  // trailing back-down into the water: no flat disc ever faces the
  // camera, and no rings. A few small spines ride on top.
  const tailSegs = [
    // [radius, length, x, y, z, dirX, dirY, dirZ] — dir = apex direction
    [3.6, 12, -1, 9, -12, -0.15, -0.25, -1],
    [2.6, 11, -4, 6, -20, -0.25, -0.3, -1],
    [1.6, 9, -8, 3.5, -27, -0.3, -0.35, -1],
  ];
  for (const [r, h, x, y, z, dx, dy, dz] of tailSegs) {
    const seg = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), skin);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    add(seg, x, y, z);
  }
  for (const [x, y, z] of [[-1, 12.5, -12], [-4, 9, -20], [-8, 5.5, -27]]) {
    addSpine(x, y, z, 2.2, 1.1);
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
  g.userData.mecha = true; // flags the mecha rebuild for the selftest

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
  const jawLight = new THREE.PointLight(0x66f6ff, 900, 150, 2); // RONDE 5: 500 -> 900, the bigger jaw needs more cyan spill on the muzzle
  jawLight.position.set(0, 37, 14);
  g.add(jawLight);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g };
}
