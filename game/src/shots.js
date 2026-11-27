// Shot presets: the 4 dossier frames, each a real render of the live game
// with a fixed, seeded state — no faked images. A shot sets the mission,
// the plane, the weather and the HUD numbers, then freezes the sim so the
// frame is the same on every load. ?shot=cover|cockpit|storm|map
//
// v4 staging numbers are this game's own: cover SPD 284 / score 2146 /
// fuel 68%, cockpit SPD 388 / score 2150 / fuel 68% (the round-canopy
// reference's own numbers: 388 KT, SCORE 2150, FUEL 68%, HULL 94%),
// battle shot score 6890 / fuel 23% / KILLS 1/1, debrief 9,218 PTS with
// an itemized breakdown that sums to the total (+5,000 +2,600 +2,000
// −274 −108).
// Shots 1/3/4 use the bright DAY palette (ref2's lighter render); shot 2
// (cockpit) uses the dusk/golden look of its round-canopy reference.
import * as THREE from 'three';
import { KT } from './flight.js';
import { KAIJU_CHEST_LOCAL } from './kaiju.js';
import { makeNoise, mulberry32 } from './random.js';
import { groundHeight } from './terrain.js';
import { SEED } from './config.js';

// Place the plane and freeze the flight state for a shot.
function pose(game, { x, y, z, headingDeg, pitchDeg = 0, rollDeg = 0, speedKt = 280, throttle = 0.72, fuel = 74, score = 0, gates = 0, flaps = 0 }) {
  const f = game.flight;
  f.pos.set(x, y, z);
  f.heading = THREE.MathUtils.degToRad(headingDeg);
  f.pitch = THREE.MathUtils.degToRad(pitchDeg);
  f.roll = THREE.MathUtils.degToRad(rollDeg);
  f.speed = speedKt * KT;
  f.throttle = throttle;
  f.afterburner = throttle > 0.92;
  f.fuel = fuel;
  f.hull = 96;
  f.score = score;
  f.gatesCleared = gates;
  f.flaps = flaps;
  f.gear = false;
  f.vsi = -318 / 196.85;
  f.g = 1.2;
  f.aoa = 2;
  f.stallWarn = false;
  f.overG = false;
}

// Bright-day look for every shot: blue sky, white puffy clouds.
function dayLook(game) {
  game.sky.apply('day', 'day');
  game.clouds.tint(0xffffff, 0xd8e4ee);
  game.weather.setStorm(false);
  game.lightning.auto = false;
}

// Dusk look for the cockpit shot only (the round-canopy reference is a
// dusk canyon run): the golden palette, warm-tinted clouds, and the sun
// ahead-RIGHT and low — the reference's sun sits at the right edge — via
// the dusk sun direction. The other three shots stay bright day.
function duskLook(game) {
  game.sky.apply('golden', 'dusk');
  game.clouds.tint(0xffd9b0, 0xff9d7a);
  game.weather.setStorm(false);
  game.lightning.auto = false;
}

// Ronde 4 (cockpit, Lyso: ronde 3 "tetep gagal", langit masih merah):
// ronde 3's blue-grey override was still too warm — the horizon was a
// warm taupe (0xcdbca6) and the mid a grey (0x93a3b8), so the whole
// visible sky band read pale mauve/warm grey. Now the gradient is
// decisively BLUE at every stop (deep slate zenith, clear blue mid,
// cool pale-blue horizon) with the warm sun colour kept ONLY in the
// sun disc + halo at the right edge, like the reference. Key + hemi
// go neutral-cool so the snow walls stay white, not tan.
function cockpitDuskSky(game) {
  const u = game.sky.uniforms;
  u.uZenith.value.setHex(0x3f5c7e);   // deep slate blue zenith
  u.uMid.value.setHex(0x7d9cbd);      // clear blue mid band
  u.uHorizon.value.setHex(0xb4c2d2);  // cool pale blue-grey horizon
  u.uSunColor.value.setHex(0xffe6bb); // warm halo ONLY at the sun (right edge)
  u.uSunCore.value.setHex(0xfff9e2);
  if (game.scene.fog) game.scene.fog.color.setHex(0xa8bdd2); // cool blue-grey fog
  game.sky.key.color.setHex(0xf2f6ff); // neutral-cool key: snow reads white
  game.sky.hemi.color.setHex(0xa8c0e0);
  game.sky.hemi.groundColor.setHex(0x6a7684);
  game.sky.hemi.intensity = 0.95;
  game.clouds.tint(0xe9eff5, 0xbcc9d8); // pale blue-grey clouds, not warm
}

// Ronde 2 (cockpit, ref-cockpit-round): SNOWY CANYON, shot-2 only. The
// reference is a snow canyon — white walls left/right, dusk sky — but the
// shared terrain's snowLine (900 m) leaves the canyon walls brown rock,
// which is why shot 2 read as "brown hills + pines". The terrain mesh is
// built fresh per shot load, so recoloring its vertex colors HERE touches
// only this frame: shots 1/3/4 keep the green day look (their md5s are
// verified unchanged after the re-render). Rule: above 320 m -> snow
// white, 170-320 m -> pale grey rock, below that keep the valley floor.
// Pines are hidden for this frame only (no treeline in a snow canyon);
// the instanced meshes are found by radial segments — canopy cones (7)
// and trunks (5) — village roofs (4) and all other meshes are untouched.
// Ronde 3: the valley floor (y <= 170) inside the canyon corridor is
// ALSO recolored — snow white with blue-grey rock patches and darker
// streaks, plus small fbm bumps so it reads as snowfield + rock, not a
// flat mauve wedge — and every band is tinted BLUE, because the warm
// dusk key turns neutral grey TAN (ronde 2's left wall). The bumps are
// deterministic per (x, z), so duplicated (non-indexed) vertices move
// together and the mesh never cracks; the sim is frozen in shot mode,
// so the visual mesh may differ a few metres from groundHeight().
function snowCanyon(game, gate) {
  const mesh = game.terrain.mesh;
  const pos = mesh.geometry.attributes.position;
  const col = mesh.geometry.attributes.color;
  const c = new THREE.Color();
  const fbmF = makeNoise(SEED + 13); // corridor-floor patch + bump noise
  const corridor = (x, z) => Math.abs(x - gate.x) < 450 && z > gate.z - 900 && z < gate.z + 500;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y0 = pos.getY(i), z = pos.getZ(i);
    // Ronde 3: valley floor inside the corridor — snow white with
    // blue-grey rock patches + darker streaks, and small fbm bumps
    // (deterministic per (x, z), so the non-indexed mesh never cracks).
    if (y0 <= 170) {
      if (!corridor(x, z)) continue;
      const n = fbmF(x * 0.02, z * 0.02, 3); // -1..1
      const t = Math.max(0, Math.min(1, (n - 0.1) / 0.5)); // 0 snow -> 1 rock
      const streak = 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(z * 0.05 + x * 0.01));
      c.setRGB(
        (0.88 + (0.40 - 0.88) * t) * streak,
        (0.91 + (0.43 - 0.91) * t) * streak,
        (0.99 + (0.55 - 0.99) * t) * streak,
      );
      col.setXYZ(i, c.r, c.g, c.b);
      pos.setY(i, y0 + fbmF(x * 0.015, z * 0.015, 2) * 5);
      continue;
    }
    // baked jitter + height/x striation bands, so the walls read as
    // rock strata under snow, not flat pink (first pass washed out to a
    // featureless salmon under the dusk key + fog). Snow is tinted
    // slightly blue so the warm key reads white; mid slopes go darker
    // grey for contrast. Ronde 3: every band is tinted BLUE — neutral
    // grey under the warm key read TAN on the left wall.
    const stripe = 0.80 + 0.20 * (0.5 + 0.5 * Math.sin(y0 * 0.06 + x * 0.008));
    const j = (0.88 + ((col.getX(i) + col.getY(i) * 0.7) % 0.12)) * stripe;
    if (y0 > 320) c.setRGB(0.86 * j, 0.90 * j, 1.00 * j);
    else c.setRGB(0.55 * j, 0.58 * j, 0.68 * j);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
  pos.needsUpdate = true;
  // halve the dusk fog for this frame only: the golden fog was washing
  // the far ridge into pink soup at 1.5 km; the canyon needs its strata.
  if (game.scene.fog) game.scene.fog.density = 0.00022;
  game.scene.traverse((o) => {
    if (o.isInstancedMesh && o.geometry && o.geometry.parameters) {
      const rs = o.geometry.parameters.radialSegments;
      if (rs === 7 || rs === 5) o.visible = false;
    }
  });
}

// Ronde 2: CANYON WALLS, shot-2 only (backdrop prop, like addSmokeFire).
// The shared world is a WIDE valley: the plane flies ~200 m above the
// floor, so the real ridges sit at/below eye level and the frame reads
// as flat snowfield. The reference is a NARROW slot canyon with walls
// towering on both sides. These two shot-only walls flank the flight
// path (gate.x +/- 160 m), rise ~330 m above the plane, and converge to
// the vanishing point past the gate — the west wall sunlit, the east
// wall in dusk shadow, like the reference. They exist only in this
// frame; gameplay and the other shots never see them.
function canyonWalls(game, gate) {
  const mkWall = (wallX, seed, flip) => {
    const fbm = makeNoise(seed);
    const geo = new THREE.PlaneGeometry(1200, 700, 48, 14);
    geo.rotateY(flip ? -Math.PI / 2 : Math.PI / 2);
    // displace along the wall normal (world X) with fbm, so the face is
    // faceted rock, not a flat billboard
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), z = pos.getZ(i);
      pos.setX(i, pos.getX(i) + fbm(z * 0.008, y * 0.008, 3) * 26);
    }
    geo.translate(wallX, 330, gate.z - 200);
    // vertex colours from WORLD position: snow cap, banded strata, dark base
    const flat = geo.toNonIndexed();
    const p2 = flat.attributes.position;
    const colors = new Float32Array(p2.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p2.count; i++) {
      const y = p2.getY(i), z = p2.getZ(i);
      const band = 0.5 + 0.5 * Math.sin(y * 0.09 + z * 0.02);
      const crack = 0.5 + 0.5 * Math.sin(z * 0.13 + y * 0.03);
      // brighter than the first pass: the warm dusk key turned the
      // 0.62-grey strata TAN and the shadowed wall near-black. Snow now
      // starts at 460 m (more of the visible wall is white), strata are
      // 0.80-based, base 0.58-based — the reference's walls are WHITE
      // snow + blue-grey rock, not brown. Ronde 3: every band is tinted
      // BLUE (B > R), because neutral grey under the warm key reads TAN
      // on the sunlit west wall; base lifted 0.58 -> 0.62.
      if (y > 420) c.setRGB(0.86, 0.90, 1.00); // snow cap
      else if (y > 380) { // mixed snow/rock strata
        const s = 0.80 + 0.18 * band;
        c.setRGB(s * 0.86, s * 0.90, s * 1.04);
      } else { // dark rock base with striations
        const s = (0.62 + 0.18 * band) * (0.75 + 0.25 * crack);
        c.setRGB(s * 0.82, s * 0.86, s * 1.06);
      }
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    flat.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
    game.scene.add(new THREE.Mesh(flat, mat));
  };
  mkWall(gate.x - 160, SEED + 31, false); // west wall, faces east (+x), sunlit
  mkWall(gate.x + 160, SEED + 47, true);  // east wall, faces west (-x), shadowed
}

// Ronde 3: CANYON FLOOR, shot-2 only (backdrop props, like canyonWalls).
// The recolored + bumped valley floor still reads flat from 200 m up,
// so the corridor gets real relief: snow-dusted boulders (white tops,
// blue-grey sides, flat-shaded) scattered along the flight path, plus
// low snow drifts. Positions are seeded (deterministic), sit on
// groundHeight PLUS the same fbm bump snowCanyon applied to the mesh
// (same seed, same call), and keep the centre 30 m clear so the gate
// sightline stays clean. Shot-only; gameplay never sees them.
function canyonFloor(game, gate) {
  const rand = mulberry32(SEED + 99);
  const fbmF = makeNoise(SEED + 13);
  const bump = (x, z) => fbmF(x * 0.015, z * 0.015, 2) * 5;
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xe8edf5, flatShading: true, roughness: 0.9, metalness: 0 });
  for (let i = 0; i < 26; i++) {
    const x = gate.x + (rand() * 2 - 1) * 260;
    if (Math.abs(x - gate.x) < 30) continue; // keep the sightline clear
    const z = gate.z - 750 + rand() * 900;
    const r = 5 + rand() * 13;
    const geo = new THREE.IcosahedronGeometry(r, 0);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const cc = new THREE.Color();
    for (let v = 0; v < p.count; v++) {
      const ly = p.getY(v) / r;
      if (ly > 0.3) cc.setRGB(0.90, 0.93, 1.0);       // snow top
      else if (ly > -0.4) cc.setRGB(0.55, 0.58, 0.68); // blue-grey side
      else cc.setRGB(0.32, 0.35, 0.46);                // dark base
      colors[v * 3] = cc.r; colors[v * 3 + 1] = cc.g; colors[v * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const b = new THREE.Mesh(geo, rockMat);
    b.position.set(x, groundHeight(x, z) + bump(x, z) + r * 0.15, z);
    b.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    b.scale.set(0.8 + rand() * 0.6, 0.55 + rand() * 0.45, 0.8 + rand() * 0.6);
    b.castShadow = true; b.receiveShadow = true;
    game.scene.add(b);
  }
  for (let i = 0; i < 12; i++) {
    const x = gate.x + (rand() * 2 - 1) * 300;
    const z = gate.z - 700 + rand() * 850;
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), snowMat);
    d.scale.set(18 + rand() * 20, 3 + rand() * 3, 12 + rand() * 10);
    d.position.set(x, groundHeight(x, z) + bump(x, z) + 0.5, z);
    d.receiveShadow = true;
    game.scene.add(d);
  }
}

// Storm-night look for the battle shot only (reference: dark storm sky,
// black smoke, orange fire on the horizon): storm palette + rain + the
// front wall, then a MUCH stronger key + fill exposure so the giants
// still read (the first storm pass at key 1.5 came out near-black).
function stormLook(game) {
  game.sky.apply('storm', 'golden');
  game.clouds.tint(0x3c4356, 0x12161f);
  game.weather.setStorm(true);
  game.lightning.auto = false;
  // ITERASI 2 (parent: shot gelap "jelek" — raksasa siluet hitam, laut
  // hitam): storm dusk TAPI raksasa kebaca. Key + hemi + exposure naik,
  // dan air laut diangkat dari near-black ke teal gelap supaya tidak
  // jadi lubang hitam di bawah frame.
  game.sky.key.intensity = 3.4;
  game.sky.hemi.intensity = 1.35;
  game.renderer.toneMappingExposure = 1.35;
  if (game.sky.waterMat) {
    game.sky.waterMat.uniforms.uDeep.value.setHex(0x14324a);
    game.sky.waterMat.uniforms.uShallow.value.setHex(0x1f4d61);
    game.sky.waterMat.uniforms.uGlitter.value.setHex(0x8fa8b8);
  }
}

// Burning wreck smoke + fire: dark columns with additive orange glows
// at their feet, placed over the two warships (guaranteed in frame and
// on the water — battle aftermath). Shot-only props; each shot loads fresh.
function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addSmokeFire(game, points) {
  const tex = smokeTexture();
  for (const [x, z] of points) {
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xff7a22, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    fire.scale.set(70, 40, 1);
    fire.position.set(x, 14, z);
    game.scene.add(fire);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x4a5058, transparent: true, opacity: 0.7 - i * 0.09, depthWrite: false }));
      const sc = 50 + i * 16;
      s.scale.set(sc, sc * 0.8, 1);
      s.position.set(x + i * 14, 65 + i * 55, z);
      game.scene.add(s);
    }
  }
}

export const SHOTS = {
  // 1. COVER — sortie 01 over the green coast, heading north toward the
  //    high sun and the peaks: white-and-blue Falcon-7 large + bright,
  //    afterburner lit, banked, 3/4 rear chase; gold gate G-02 at 523 m;
  //    field patchwork + pine forest + turquoise sea below.
  cover(game) {
    game.setMission(1, { silent: true });
    dayLook(game);
    // gate G-02 (index 1) exactly 523 m ahead of the plane
    const gate = game.runner.gates[1].pos;
    const dir = new THREE.Vector3(0, 0, -1); // flying north, toward the sun
    const px = gate.x - dir.x * 523, pz = gate.z - dir.z * 523;
    pose(game, {
      x: px, y: gate.y + 24, z: pz, headingDeg: 0, pitchDeg: -1, rollDeg: 16,
      speedKt: 284, throttle: 0.95, fuel: 68, score: 2146, gates: 1,
    });
    game.flight.gatesCleared = 1;
    game.flight.vsi = -318 / 196.85;
    game.runner.nextGate = 1;
    game.runner.gateMeshes.forEach((m, i) => { m.material = i < 1 ? game.runner.doneMat : i === 1 ? game.runner.nextMat : game.runner.ringMat; });
    // the next ring reads bigger at 523 m, distance stays honest
    game.runner.gateMeshes[1].scale.setScalar(1.6);
    game.setCameraMode('chase', { side: 0.45, dist: 20, height: 8 });
    game.hud.setMission(game.runner.mission, game.flight);
  },

  // 2. COCKPIT — rev: the round-canopy reference shot. A recon run up the
  //    north canyon at dusk (golden palette, sun ahead-right low): the
  //    Falcon-7 threads gate G-06, 160 m ahead, the round bow framing the
  //    snowy ridge; TAC RADAR + ADI + ENG/FUEL/SYS on the panel, the
  //    combiner's yellow RECON ring on the gate. 8 gauges + MFD + 12
  //    switches + lamp strip + yoke + levers all present. Ronde 2: the
  //    world canyon is too wide to read, so shot-only canyon walls flank
  //    the path (see canyonWalls) and only G-06's ring is shown.
  cockpit(game) {
    game.setMission(1, { silent: true });
    duskLook(game);
    cockpitDuskSky(game); // ronde 4: decisively blue dusk sky, not warm/mauve
    // gate G-06 (index 5) is the ring in the windscreen: the plane sits
    // 160 m south of it, 20 m below its centre, so the ring reads big
    // (~250 px) and centred under the bow, FPV low inside it. G-06, not
    // G-05: this far up the canyon the plane is above the near slope, so
    // the snowy north ridge — not the brown hillside — fills the glass.
    const gate = game.runner.gates[5].pos;
    snowCanyon(game, gate); // ronde 2+3: white canyon walls, no pines — shot 2 only
    canyonWalls(game, gate); // ronde 2: slot-canyon walls flanking the path
    canyonFloor(game, gate); // ronde 3: boulders + drifts on the valley floor
    // cool fill from the west: lifts the shadowed east wall out of
    // near-black into blue-grey (the key comes from the north-east, so
    // the east face gets no key at all). Same pattern as stormLook's fill.
    const fill = new THREE.DirectionalLight(0xaec6e8, 0.8);
    fill.position.set(-1500, 700, -800);
    game.scene.add(fill);
    pose(game, {
      x: gate.x, y: gate.y - 20, z: gate.z + 160, headingDeg: 359, pitchDeg: 0, rollDeg: 0,
      speedKt: 388, throttle: 0.86, fuel: 68, score: 2150, gates: 5, flaps: 0,
    });
    game.flight.hull = 94;
    game.flight.g = 1.0;
    game.flight.vsi = 0;
    game.runner.nextGate = 5;
    // ronde 2: ONLY G-06 visible — the second ring (G-07) used to peek
    // cut off at the right edge of the frame, which read as a bug.
    game.runner.gateMeshes.forEach((m, i) => {
      m.visible = i === 5;
      m.material = i === 5 ? game.runner.nextMat : game.runner.ringMat;
    });
    game.setCameraMode('cockpit');
    game.hud.setMission(game.runner.mission, game.flight);
  },

// 3. KAIJU vs ULTRA — sortie 07: the battle on the beach, restaged as
//    a close cinematic FACE-OFF (reference: silver hero with a glowing
//    blue energy blade vs a dark mecha-kaiju with a cyan jaw, storm sky,
//    black smoke + orange fire on the horizon). ULTRA-1 stands left with
//    the blade forward; the MECHA-KAIJU stands right, jaws burning cyan,
//    answering with its blue atomic breath; the Falcon-7 (foreground,
//    banked) puts a missile into the kaiju (smoke trail, fireball frozen
//    at 0.2 s, boss HP 62%); WARSHIP-1 already sunk and listing left,
//    WARSHIP-2 intact right. Storm palette + rain + smoke + fire. HUD:
//    KAIJU-1 boss bar + ULTRA-1 ally chip + lock diamond + SHOOT.
//    KILLS 1/1, score 6890, fuel 23%.
  storm(game) {
    game.setMission(7, { silent: true });
    stormLook(game);
    // attack run 95 m over the sea, 120 m out so the giants loom large —
    // offset east so the jet does not sit on ULTRA-1's blade line
    pose(game, {
      x: -395, y: 95, z: 1680, headingDeg: 0, pitchDeg: -2, rollDeg: -12,
      speedKt: 296, throttle: 0.64, fuel: 23, score: 6890, gates: 0, flaps: 0,
    });
    game.flight.gear = false;
    game.flight.hull = 83;
    game.flight.vsi = -542 / 196.85;
    // CLOSE FACE-OFF: kaiju east, ultra west, 90 m apart at the same
    // waterline, both turned 3/4 toward each other (and the camera).
    // setMission's reset() zeroes rotations, so these are set here.
    // NOTE: kaiju.pos is the CHEST hit point (computed from
    // KAIJU_CHEST_LOCAL), never the waterline anchor — the missile,
    // the fireball and the lock diamond all sit on pos, so it must be
    // recomputed from the chest after the group moves.
    const kaiju = game.missiles.targetById('KAIJU-1');
    kaiju.group.position.set(-380, 2, 1560);
    kaiju.group.rotation.y = -0.7; // RONDE 5: -1.0 -> -0.7 — the mouth face was edge-on to the camera, foreshortening the jaw; -0.7 turns the face near-frontal while still facing west toward ULTRA-1
    kaiju.group.updateMatrixWorld(true);
    kaiju.pos.copy(kaiju.group.localToWorld(KAIJU_CHEST_LOCAL.clone())).add(new THREE.Vector3(0, 0, 18));
    const ultra = game.missiles.ultra;
    ultra.pos.set(-470, 2, 1560);
    ultra.group.position.set(-470, 2, 1560);
    ultra.group.rotation.y = 1.0; // faces east-southwest toward KAIJU-1 AND the camera (was 1.26)
    // cool fill light from the camera side: lifts the giants' faces out
    // of the storm black without warming the scene (iterasi 2: 1.1 -> 1.7)
    const fill = new THREE.DirectionalLight(0xaec6e8, 1.7);
    fill.position.set(-350, 400, 2000);
    game.scene.add(fill);
    // warm fire-side fill from the burning ships: rims the giants' lower
    // halves orange so they separate from the dark sky
    const fireFill = new THREE.DirectionalLight(0xff8a3a, 0.7);
    fireFill.position.set(-150, 120, 1750);
    game.scene.add(fireFill);
    // the near warship, intact and readable beside the kaiju (east of it,
    // pulled south so it sits inside the frame, not on the edge)
    const ship2 = game.missiles.targetById('WARSHIP-2');
    ship2.pos.set(-300, 6, 1610);
    ship2.group.position.set(-300, 6, 1610);
    ship2.group.rotation.y = 0.6;
    // WARSHIP-1: already sunk by the first missile — scorched, listing,
    // low in the water, left foreground. Explode it for the scorch + kill,
    // then pull the burst out so only one fireball (the kaiju's) shows.
    const ship1 = game.missiles.targetById('WARSHIP-1');
    ship1.pos.set(-530, 6, 1600);
    ship1.group.position.set(-530, 6, 1600);
    ship1.group.rotation.y = 0.4;
    game.missiles.explode(ship1, null);
    const w1boom = game.missiles.explosions.pop();
    if (w1boom) game.scene.remove(w1boom.group);
    ship1.group.rotation.z = 0.18;
    ship1.group.position.y -= 0.5;
    game.flight.kills = 1;
    // the frame shows the first warship kill banked; the kaiju is a boss
    // engagement, not part of the 1/1 tally
    game.runner.killsNeeded = 1;
    // the boss hit, frozen mid-burst: missile most of the way to the
    // kaiju's chest (smoke puffs + 2x missile read at range), fireball
    // frozen at 0.2 s — near-peak brightness, and the flash sphere is
    // still a compact 30 m core (it grows to a 55 m haze by 0.45 s and
    // washes the kaiju out). Scale the fire + smoke only.
    game.missiles.stageMissile(game.flight.pos.clone(), kaiju.pos.clone(), 0.65, kaiju, 2.0);
    game.missiles.explode(kaiju, null); // HP 100 -> 62, no kill, stays alive
    game.missiles.freezeBurst(0.2);
    const boom = game.missiles.explosions[game.missiles.explosions.length - 1];
    if (boom) {
      // ITERASI 2c: flash 0.5 (dulu 1.0: bola krem pucat menutupi api
      // oranye dan kebaca balon abu-abu) + burst ditarik 12 m ke arah
      // kamera supaya sprite api oranye duduk DI DEPAN permukaan dada,
      // bukan setengah tenggelam di torso.
      boom.flash.scale.setScalar(0.5);
      boom.fire.scale.set(boom.fire.scale.x * 1.0, boom.fire.scale.y * 1.0, 1);
      boom.smoke.forEach((s) => { s.scale.x *= 1.0; s.scale.y *= 1.0; });
      // pull the burst off the chest surface toward the kaiju's east
      // side and toward the camera, or the torso curve hides it behind
      // the lock diamond
      boom.group.position.x += 14;
      boom.group.position.z += 12;
    }
    // lock the boss: diamond on its chest + range + SHOOT
    game.missiles.lock = {
      target: kaiju, progress: 1, locked: true,
      range: game.flight.pos.distanceTo(kaiju.pos),
    };
    // blade, not beam, in this frame: the old light beam stays in the
    // game for gameplay, but the reference face-off is won by the blade
    game.missiles.ultra.beam.visible = false;
    // ITERASI 2b: the atomic breath is ALSO hidden in this frame — at 3x
    // group scale its 48 m translucent tube reads as a giant blue
    // capsule/rocket floating over the kaiju's head, not a flame plume.
    // Gameplay untouched (missiles.js still shows it in the boss sortie);
    // the jaw glow + fireball carry the fire in this shot.
    if (kaiju.breath) kaiju.breath.visible = false;
    // close framing: the giants fill the frame, the jet reads small
    // between them
    game.setCameraMode('chase', { side: 0.3, dist: 45, height: 10 });
    game.hud.setMission(game.runner.mission, game.flight);
    // RONDE 5: the ULTRA-1 toast is REMOVED — it ran horizontally
    // across the frame and covered the kaiju's head. The boss bar at
    // the top already names ULTRA-1, so nothing is lost.
    // burning wreck smoke + fire over the two warships
    addSmokeFire(game, [[-530, 1600], [-300, 1610]]);
    // re-assert the face-off rotations last (staging above must not move them)
    kaiju.group.rotation.y = -0.7; // RONDE 5, see above
    ultra.group.rotation.y = 1.0;
  },

  // 4. MAP + DEBRIEF — campaign map (7 sorties) + S debrief with GOLD
  //    medal + itemized +/- breakdown + NEW SESSION BEST, over the live
  //    bright-day scene (runway, terminal, hangar, parked Falcon-7).
  map(game) {
    game.setMission(1, { silent: true });
    dayLook(game);
    pose(game, {
      x: 150, y: 60, z: 900, headingDeg: 0, pitchDeg: 0, rollDeg: 0,
      speedKt: 93, throttle: 0.10, fuel: 31, score: 9218, gates: 7, flaps: 2,
    });
    game.flight.gear = true;
    game.flight.landed = false;
    game.setCameraMode('chase', { side: 0, dist: 30, height: 8 });
    // the debrief is real in this frame: mission 01 earned its S
    game.stars = { 1: 3 };
    game.updatePilotCards();
    game.hud.setMission(game.runner.mission, game.flight);
    game.showShot4({
      grade: 'S', stars: 3, score: 9218, sink: -164, centrelineM: 3,
      gates: '7/7', kills: '2/2', fuel: 31, hull: 94, time: '6:47', peakG: '2.1',
      missionName: 'COASTAL GATE RUN', newBest: true,
      breakdown: [
        { label: 'SMOOTH LANDING — RWY 36', detail: 'sink −164 FPM', pts: 5000 },
        { label: 'GATES CLEARED 7/7', detail: 'all gold rings', pts: 2600 },
        { label: 'TARGETS DESTROYED 2/2', detail: 'warships sunk', pts: 2000 },
        { label: 'SINK RATE', detail: '1.6 m/s at touchdown', pts: -274 },
        { label: 'OFF CENTRELINE', detail: '1.8 m left of the line', pts: -108 },
      ],
    });
  },
};

export function applyShot(name, game) {
  const fn = SHOTS[name];
  if (!fn) return false;
  // Ronde 4: the cockpit shot uses the slim RECON ring (small, no ticks)
  // so it never crowds the centre post again; every other shot keeps
  // the full ring. Reset here so gameplay cockpit mode is unaffected.
  if (game.cockpit) game.cockpit.slimRecon = name === 'cockpit';
  fn(game);
  game.shotMode = true;
  game.shotName = name;
  return true;
}
