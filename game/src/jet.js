// Falcon-7 rebuilt as an F-22 Raptor (v4 jet rebuild, 2026-11-27).
// Procedural from Three.js primitives only — no downloaded model.
// Proportions measured off the real F-22 (length 18.9 m, span 13.56 m,
// height 5.08 m => span/length 0.72, height/length 0.27) and scaled to
// this game's airframe: fuselage z +5.95 .. -5.20 (11.15 long), span
// 8.4 (ratio 0.75), fin tip ~2.4 above centreline (height ~3.1, 0.28).
// Signatures that must read at a glance, in priority order:
//   1. trapezoid/diamond wing — LE swept 42 deg, TE swept slightly
//      FORWARD toward the tip (the F-22 diamond, not a delta);
//   2. twin tails canted OUT 28 deg, trapezoidal, all-moving look;
//   3. chined nose — the forebody is a faceted diamond cross-section,
//      not a cone: sharp chines run from the nose tip back past the
//      canopy (built as a loft of 8-point diamond sections);
//   4. frameless bubble canopy, GOLD-tinted like the real Have Glass jet;
//   5. TWIN RECTANGULAR 2D nozzles (flat wide boxes, not round pipes)
//      with a flat beaver-tail deck between them;
//   6. grey Have Glass livery (medium grey + darker panels), caret
//      intakes on the flanks, NO blue cheatline / white airframe.
// The reference photo (ref-f22-raptor.jpg) was NOT in refs/ when this
// was built (searched the whole workspace: no such file) — proportions
// are from the F-22's published dimensions + the builder's eye, and the
// report says so honestly. If the photo turns up, re-check against it.
//
// Pose hook: main.js drives group.rotation from flight state every
// frame (rotation.z = f.roll), so a plain group rotation would be
// overwritten. The whole airframe therefore lives in an inner
// `airframe` group: setBank(deg) banks the MODEL on top of the flight
// roll, without touching flight state, HUD or the cockpit camera.
// shots.js can call game.jet.setBank(deg) — e.g. an extra +8 deg of
// visual bank on the cover while flight roll stays 16 deg. Default 0.
import * as THREE from 'three';

function mat(color, rough = 0.5, metal = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// --- fuselage loft -------------------------------------------------------
// One section = { z, w (half-width), top, bot }. The 8-point ring is a
// chined diamond: top centre, upper chines, max-width sides, lower
// chines, bottom centre — flat facets, stealth-style.
const SECTIONS = [
  { z: 5.95, w: 0.02, top: 0.02, bot: -0.02 }, // nose tip (a point)
  { z: 5.20, w: 0.22, top: 0.20, bot: -0.16 },
  { z: 4.40, w: 0.42, top: 0.38, bot: -0.30 },
  { z: 3.60, w: 0.62, top: 0.55, bot: -0.42 },
  { z: 2.80, w: 0.80, top: 0.68, bot: -0.50 },
  { z: 1.80, w: 0.98, top: 0.78, bot: -0.58 },
  { z: 0.60, w: 1.10, top: 0.82, bot: -0.60 }, // widest, intakes
  { z: -0.80, w: 1.12, top: 0.78, bot: -0.60 },
  { z: -2.20, w: 1.05, top: 0.70, bot: -0.56 },
  { z: -3.40, w: 0.98, top: 0.60, bot: -0.50 },
  { z: -4.40, w: 0.92, top: 0.52, bot: -0.44 },
  { z: -5.20, w: 0.88, top: 0.48, bot: -0.42 }, // nozzle face
];

function ringPoint(s, i) {
  // 0 top, 1 upper-right chine, 2 right, 3 lower-right chine,
  // 4 bottom, 5 lower-left chine, 6 left, 7 upper-left chine.
  switch (i % 8) {
    case 0: return [0, s.top];
    case 1: return [s.w * 0.92, s.top * 0.55];
    case 2: return [s.w, 0];
    case 3: return [s.w * 0.92, s.bot * 0.65];
    case 4: return [0, s.bot];
    case 5: return [-s.w * 0.92, s.bot * 0.65];
    case 6: return [-s.w, 0];
    default: return [-s.w * 0.92, s.top * 0.55];
  }
}

function loftGeometry() {
  const pos = [];
  const uv = [];
  const n = SECTIONS.length;
  const quad = (a, b, c, d, ua, ub, va, vb) => {
    // two triangles, non-indexed so facets stay crisp
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    uv.push(ua, va, ub, va, ub, vb, ua, va, ub, vb, ua, vb);
  };
  for (let k = 0; k < n - 1; k++) {
    const s0 = SECTIONS[k], s1 = SECTIONS[k + 1];
    const v0 = k / (n - 1), v1 = (k + 1) / (n - 1);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const [x0, y0] = ringPoint(s0, i);
      const [x1, y1] = ringPoint(s0, j);
      const [x2, y2] = ringPoint(s1, j);
      const [x3, y3] = ringPoint(s1, i);
      quad(
        [x0, y0, s0.z], [x1, y1, s0.z], [x2, y2, s1.z], [x3, y3, s1.z],
        i / 8, j / 8, v0, v1,
      );
    }
  }
  // end caps (nose tip is a near-point; tail face sits behind the nozzles)
  for (const [k, flip] of [[0, false], [n - 1, true]]) {
    const s = SECTIONS[k];
    const c = [0, (s.top + s.bot) / 2, s.z];
    for (let i = 0; i < 8; i++) {
      const [xa, ya] = ringPoint(s, i);
      const [xb, yb] = ringPoint(s, (i + 1) % 8);
      const a = [xa, ya, s.z], b = [xb, yb, s.z];
      if (flip) pos.push(...c, ...b, ...a);
      else pos.push(...c, ...a, ...b);
      uv.push(0.5, 0.5, 0, 0, 1, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

// Trapezoid planform (top view), built in shape space where shape-y IS
// world +z (rotateX(+PI/2)), so the numbers below are honest world
// stations: rootLEz is the root leading-edge z, leBack how far aft the
// tip leading edge sits (LE sweep), tipChord the tip chord. F-22 wing:
// LE swept back 42 deg, TE swept slightly forward — the diamond.
function trapWing(span, rootLEz, rootChord, tipChord, leBack) {
  const s = new THREE.Shape();
  s.moveTo(0, rootLEz);
  s.lineTo(span, rootLEz - leBack);
  s.lineTo(span, rootLEz - leBack - tipChord);
  s.lineTo(0, rootLEz - rootChord);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false });
  geo.rotateX(Math.PI / 2); // shape-y -> world +z, extrusion -> -y
  return geo;
}

// Grey Have Glass livery: canvas texture for the loft. Loft UVs: u runs
// around the 8-point ring (u=0/1 top centreline, u=0.5 belly), v runs
// the fuselage length — so panel stations are HORIZONTAL bands and the
// chine lines are VERTICAL. Lighter spine on top, darker belly, darker
// two-tone patches aft, panel lines at the stations.
function liveryTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#8b9096'; x.fillRect(0, 0, 512, 256); // Have Glass grey
  // lighter spine (top centreline wraps at u=0/1) — KEPT SUBTLE: the
  // first pass used 0.55 alpha and the sun + bloom blew the whole back
  // white in the cover shot, erasing the panel work.
  x.fillStyle = 'rgba(178,184,190,0.25)';
  x.fillRect(0, 0, 22, 256); x.fillRect(490, 0, 22, 256);
  // darker belly
  x.fillStyle = 'rgba(88,93,99,0.55)'; x.fillRect(228, 0, 56, 256);
  // darker two-tone patches (upper rear fuselage + nose)
  x.fillStyle = 'rgba(104,109,115,0.4)'; x.fillRect(0, 150, 512, 46);
  x.fillStyle = 'rgba(96,101,107,0.35)'; x.fillRect(0, 0, 512, 16);
  // panel lines across the length (stations)
  x.fillStyle = 'rgba(28,32,38,0.35)';
  for (const py of [34, 72, 108, 146, 184, 218]) x.fillRect(0, py, 512, 2);
  // chine lines around the ring
  x.fillStyle = 'rgba(28,32,38,0.22)';
  for (const px of [64, 192, 320, 448]) x.fillRect(px, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function buildJet() {
  const g = new THREE.Group();
  // Inner airframe: setBank() rotates THIS, so the visual bank composes
  // with main.js's flight roll instead of being overwritten by it.
  const airframe = new THREE.Group();
  g.add(airframe);

  const livery = liveryTexture();
  const grey = new THREE.MeshStandardMaterial({
    map: livery, color: 0xffffff, roughness: 0.5, metalness: 0.35,
    side: THREE.DoubleSide, flatShading: true,
  });
  const greyPlain = mat(0x8b9096, 0.5, 0.35);
  const darkGrey = mat(0x6e7378, 0.55, 0.35);
  const dark = mat(0x2e3136, 0.6, 0.45);
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.38, metalness: 0.75, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: 0xd9b45c, roughness: 0.12, metalness: 0.45, emissive: 0x201606, emissiveIntensity: 0.35 }); // gold-tinted canopy — light gold, low metalness so it reads gold even with no env map (metalness 0.85 went near-black)

  // --- chined fuselage loft + low spine ridge behind the canopy ---
  // The ridge is LOW and fuselage-grey (was a tall dark box: it read as
  // a pasted plank down the back in the top view).
  const fuselage = new THREE.Mesh(loftGeometry(), grey);
  airframe.add(fuselage);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.10, 2.6), greyPlain);
  spine.position.set(0, 0.76, -0.9);
  airframe.add(spine);

  // --- frameless gold bubble canopy on a dark frame base ---
  // Slimmer than the first pass: the old dome (0.55 wide, 0.5 tall) read
  // as a dark beetle shell dominating the forebody. Real F-22 canopy is
  // a low, sleek bubble, roughly half the fuselage width.
  const canopyBase = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), dark);
  canopyBase.scale.set(0.55, 0.36, 1.28);
  canopyBase.position.set(0, 0.60, 2.75);
  canopyBase.rotation.x = -0.15;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), glass);
  canopy.scale.set(0.48, 0.42, 1.18);
  canopy.position.set(0, 0.66, 2.75);
  canopy.rotation.x = -0.15;
  airframe.add(canopyBase, canopy);

  // --- caret intakes: dark-grey canted mouth plates + grey splitter ramps ---
  // Mouths were pure black boxes: they read as holes punched in the
  // flanks. Dark grey + slightly smaller keeps the intake read without
  // the black-rectangle look.
  for (const side of [-1, 1]) {
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 1.8), darkGrey);
    mouth.position.set(side * 1.02, -0.25, 1.1);
    mouth.rotation.y = -side * 0.3;
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 1.5), darkGrey);
    ramp.position.set(side * 1.0, 0.08, 1.2);
    ramp.rotation.y = -side * 0.25;
    airframe.add(mouth, ramp);
  }

  // --- diamond/trapezoid main wings (LE 42 deg, TE forward-swept) ---
  // semi-span 4.2 from centreline (fuselage half-width ~1.1, so 3.1
  // exposed); root chord 4.6 (z +1.4 .. -3.2), tip chord 1.1.
  const wingGeo = trapWing(4.2, 1.4, 4.6, 1.1, 2.88);
  const wingR = new THREE.Mesh(wingGeo, greyPlain);
  wingR.position.set(0, 0.05, 0);
  wingR.rotation.z = 0.02;
  const wingL = new THREE.Mesh(wingGeo, greyPlain);
  wingL.scale.x = -1; // mirror to the left
  wingL.position.set(0, 0.05, 0);
  wingL.rotation.z = -0.02;
  airframe.add(wingL, wingR);

  // --- wingtip rails + small grey AIM-9-style missiles (pylon joins
  // the missile to the wingtip so it does not dangle in thin air;
  // tucked up under the tip — the first pass hung visibly below it) ---
  for (const side of [-1, 1]) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 1.3), darkGrey);
    pylon.position.set(side * 4.15, -0.08, -1.9);
    airframe.add(pylon);
    const rail = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.6, 8), greyPlain);
    body.rotation.x = Math.PI / 2;
    const tipCone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 8), dark);
    tipCone.rotation.x = Math.PI / 2; tipCone.position.z = 1.0;
    rail.add(body, tipCone);
    rail.position.set(side * 4.15, -0.22, -1.9);
    airframe.add(rail);
  }

  // --- twin tails, canted OUT 28 deg, trapezoidal, swept ---
  // 0.16 thick (was 0.10): edge-on from the rear chase the old fins
  // nearly vanished against the sky.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(1.6, 1.9); // swept leading edge
  finShape.lineTo(2.3, 1.9); // tip chord
  finShape.lineTo(1.8, 0);   // root trailing edge
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: false });
  finGeo.rotateY(Math.PI / 2); // shape-x (aft) -> world -z
  finGeo.translate(-0.08, 0, 0); // centre the thickness
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(finGeo, greyPlain);
    fin.position.set(side * 0.72, 0.35, -3.2);
    fin.rotation.z = -side * 0.49; // 28 deg cant out
    airframe.add(fin);
    // all-moving stabilator: trapezoid, low-mounted
    const stab = new THREE.Mesh(trapWing(2.6, -2.5, 2.3, 0.85, 1.9), greyPlain);
    if (side < 0) stab.scale.x = -1;
    stab.position.set(0, -0.15, 0);
    airframe.add(stab);
  }

  // --- flat beaver-tail deck + TWIN RECTANGULAR 2D nozzles ---
  // Nozzles wider + flatter than the first pass (0.92 x 0.30): the flat
  // wide rectangle is the F-22 tail signature — it should read as a
  // slot, not a square pipe.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.0), darkGrey);
  deck.position.set(0, 0.42, -4.9);
  airframe.add(deck);
  const nozzles = [];
  for (const side of [-1, 1]) {
    const noz = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.26, 0.85), nozzleMat);
    noz.position.set(side * 0.47, -0.06, -5.35);
    airframe.add(noz);
    nozzles.push(noz);
  }

  // --- afterburner: one flattened flame tongue per rectangular nozzle
  // (wide in x, thin in y — the rectangular-nozzle plume), blue-white
  // outside, amber core. setAfterburner(level) drives both.
  // Narrower + shorter + bluer + less opaque than the first pass: the
  // old 2.6 m cones read as giant white paper triangles in the top view
  // and washed out to nothing against the sky in the chase view.
  const flames = [];
  const flameCores = [];
  for (const side of [-1, 1]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 2.2, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4f9dff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    flame.rotation.x = -Math.PI / 2; // apex points aft
    flame.scale.set(1.3, 1, 0.4);
    flame.position.set(side * 0.47, -0.06, -6.7);
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 1.5, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff9a1f, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    core.rotation.x = -Math.PI / 2;
    core.scale.set(1.3, 1, 0.4);
    core.position.set(side * 0.47, -0.06, -6.35);
    airframe.add(flame, core);
    flames.push(flame); flameCores.push(core);
  }
  const abLight = new THREE.PointLight(0x6aa8ff, 0, 90, 1.6);
  abLight.position.set(0, -0.06, -6.5);
  airframe.add(abLight);

  // nav lights: red left, green right — smaller than the first pass
  // (0.16 read as floating dots at the wingtips) and tucked inboard.
  // The model is yawed PI from the flight direction, so local -X is
  // the world's right wing (green)
  for (const side of [-1, 1]) {
    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 6),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0x20ff60 : 0xff2020 }),
    );
    nav.position.set(side * 4.2, 0.05, -2.0);
    airframe.add(nav);
  }
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(0, 0.55, -5.2);
  airframe.add(tailLight);

  // retractable gear: two mains + nose wheel
  const gear = new THREE.Group();
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    strut.position.set(side * 1.5, -1.2, 1.2);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), dark);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.5, -1.75, 1.2);
    gear.add(strut, wheel);
  }
  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6), dark);
  noseStrut.position.set(0, -1.15, 3.6);
  const noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10), dark);
  noseWheel.rotation.z = Math.PI / 2; noseWheel.position.set(0, -1.65, 3.6);
  gear.add(noseStrut, noseWheel);
  airframe.add(gear);

  airframe.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  for (const f of [...flames, ...flameCores]) f.castShadow = false;

  let abLevel = 0;
  let bankDeg = 0;
  return {
    group: g,
    gear,
    // Extra visual bank (deg, same sign as flight roll) on top of the
    // flight roll main.js applies — for shots that want the jet banked
    // harder without changing flight state / HUD / cockpit camera.
    // Hook for shots.js: game.jet.setBank(8) on the cover, setBank(0)
    // to clear. NOTE: shots.js already banks via pose() rollDeg
    // (cover 16 deg, storm -12 deg); use setBank only for EXTRA bank.
    setBank(deg) {
      bankDeg = deg;
      airframe.rotation.z = THREE.MathUtils.degToRad(deg);
    },
    get bank() { return bankDeg; },
    // Visual scale of the airframe only (default 1 — gameplay never
    // calls this; it scales the MODEL around the flight position, so
    // the flight model, HUD and cockpit camera are untouched). Hook
    // for shots.js: shot 3 stages the chase camera 45 m out, so the
    // jet is only ~60 px wide and the F-22 tells (gold canopy, diamond
    // wing, rectangular nozzles) do NOT resolve at that size — it reads
    // as "a small grey jet", not as an F-22. game.jet.setScale(1.4) in
    // the storm shot would bring it to ~85 px, where the canted twin
    // tails + gold canopy start to read. Reset with setScale(1) for
    // the other shots. NOT wired by jet.js itself — shots.js must call
    // it; until then shot 3 stays small (reported honestly to parent).
    setScale(s) {
      airframe.scale.setScalar(s);
    },
    setAfterburner(level, t) {
      abLevel = level;
      const flick = 1 + 0.12 * Math.sin(t * 31) + 0.07 * Math.sin(t * 57);
      const s = (0.25 + 0.75 * level) * flick;
      for (const f of flames) {
        f.visible = level > 0.03;
        f.scale.set(1.3 * s, 1 + 0.5 * level, 0.4 * s);
        f.material.opacity = 0.2 + 0.35 * level;
      }
      for (const f of flameCores) {
        f.visible = level > 0.03;
        f.scale.set(1.3 * s, 1 + 0.45 * level, 0.4 * s);
      }
      abLight.intensity = level * 45 * flick;
    },
    get afterburner() { return abLevel; },
  };
}
