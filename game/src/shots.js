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
  //    switches + lamp strip + yoke + levers all present.
  cockpit(game) {
    game.setMission(1, { silent: true });
    duskLook(game);
    // gate G-06 (index 5) is the ring in the windscreen: the plane sits
    // 160 m south of it, 20 m below its centre, so the ring reads big
    // (~250 px) and centred under the bow, FPV low inside it. G-06, not
    // G-05: this far up the canyon the plane is above the near slope, so
    // the snowy north ridge — not the brown hillside — fills the glass.
    const gate = game.runner.gates[5].pos;
    pose(game, {
      x: gate.x, y: gate.y - 20, z: gate.z + 160, headingDeg: 359, pitchDeg: 0, rollDeg: 0,
      speedKt: 388, throttle: 0.86, fuel: 68, score: 2150, gates: 5, flaps: 0,
    });
    game.flight.hull = 94;
    game.flight.g = 1.0;
    game.flight.vsi = 0;
    game.runner.nextGate = 5;
    game.runner.gateMeshes.forEach((m, i) => {
      m.visible = i >= 5;
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
    kaiju.group.rotation.y = -1.0; // faces west-southwest toward ULTRA-1 AND the camera (was -1.26: jaw faced away, cyan unreadable)
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
      // ITERASI 2: fireball DIKECILIN (dulu 1.2x/1.4x menutupi jet +
      // dada kaiju) dan DIGESER ke timur (kanan frame) supaya JET
      // KELIHATAN di antara kedua raksasa, bukan tertutup bola api.
      boom.flash.scale.setScalar(0.8);
      boom.fire.scale.set(boom.fire.scale.x * 1.0, boom.fire.scale.y * 1.0, 1);
      boom.smoke.forEach((s) => { s.scale.x *= 1.0; s.scale.y *= 1.0; });
      // pull the burst off the chest surface toward the kaiju's east
      // side, or the torso curve hides it behind the lock diamond
      boom.group.position.x += 14;
      boom.group.position.z -= 6;
    }
    // lock the boss: diamond on its chest + range + SHOOT
    game.missiles.lock = {
      target: kaiju, progress: 1, locked: true,
      range: game.flight.pos.distanceTo(kaiju.pos),
    };
    // blade, not beam, in this frame: the old light beam stays in the
    // game for gameplay, but the reference face-off is won by the blade
    game.missiles.ultra.beam.visible = false;
    // close framing: the giants fill the frame, the jet reads small
    // between them
    game.setCameraMode('chase', { side: 0.3, dist: 45, height: 10 });
    game.hud.setMission(game.runner.mission, game.flight);
    game.hud.showToast('ULTRA-1 — GUARDIAN OF LIGHT · ENERGY BLADE', 4000);
    // burning wreck smoke + fire over the two warships
    addSmokeFire(game, [[-530, 1600], [-300, 1610]]);
    // re-assert the face-off rotations last (staging above must not move them)
    kaiju.group.rotation.y = -1.0;
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
  fn(game);
  game.shotMode = true;
  game.shotName = name;
  return true;
}
