// Shot presets: the 4 dossier frames, each a real render of the live game
// with a fixed, seeded state — no faked images. A shot sets the mission,
// the plane, the weather and the HUD numbers, then freezes the sim so the
// frame is the same on every load. ?shot=cover|cockpit|storm|map
//
// v4 staging numbers are this game's own: cover SPD 284 / score 2146 /
// fuel 68%, cockpit SPD 132 / score 4762 / fuel 49%, battle shot score
// 6890 / fuel 23% / KILLS 1/1, debrief 9,218 PTS with an itemized
// breakdown that sums to the total (+5,000 +2,600 +2,000 −274 −108).
// All four shots use the bright DAY palette (ref2's lighter render).
import * as THREE from 'three';
import { KT } from './flight.js';

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

  // 2. COCKPIT — sortie 02 final approach over the bay, runway BIG and
  //    centred (350 m out, on the 6-degree glide, PAPI LOCK), 8 gauges +
  //    MFD + 12 switches + lamp strip + yoke + levers + HUD combiner
  //    glass visible. The "36" runway paint reads from the air. Both
  //    approach gates are already cleared, so their rings are hidden —
  //    the strip itself fills the windscreen.
  cockpit(game) {
    game.setMission(2, { silent: true });
    dayLook(game);
    pose(game, {
      x: 150, y: 42 + 37, z: 1150, headingDeg: 0, pitchDeg: -4, rollDeg: 0,
      speedKt: 132, throttle: 0.42, fuel: 49, score: 4762, gates: 2, flaps: 2,
    });
    game.flight.gear = true;
    game.flight.vsi = -1076 / 196.85;
    game.runner.nextGate = 2;
    game.runner.gateMeshes.forEach((m) => { m.visible = false; });
    game.setCameraMode('cockpit');
    game.hud.setMission(game.runner.mission, game.flight);
    game.terrain.setPapi('lock');
  },

// 3. KAIJU vs ULTRA — sortie 07: the battle on the beach. ULTRA-1
//    (silver + red, Color Timer glowing) stands left of frame beaming a
//    white-blue light beam across KAIJU-1's chest while the kaiju answers
//    with its blue atomic breath; the Falcon-7 (foreground, banked) puts
//    a missile into the kaiju (smoke trail, fireball frozen at 0.2 s,
//    boss HP 62%); WARSHIP-1 already sunk and listing left, WARSHIP-2
//    intact right. Bright day, turquoise sea, sand beach. HUD:
//    KAIJU-1 boss bar + ULTRA-1 ally chip + lock diamond + SHOOT.
//    KILLS 1/1, score 6890, fuel 23%.
  storm(game) {
    game.setMission(7, { silent: true });
    dayLook(game);
    // attack run 90 m over the sea, offset west so the kaiju stands clear
    // of the jet (not hidden behind it), 260 m out so the giants fit
    pose(game, {
      x: -420, y: 90, z: 1700, headingDeg: 0, pitchDeg: -2, rollDeg: -12,
      speedKt: 296, throttle: 0.64, fuel: 23, score: 6890, gates: 0, flaps: 0,
    });
    game.flight.gear = false;
    game.flight.hull = 83;
    game.flight.vsi = -542 / 196.85;
    // the near warship, intact and readable beside the kaiju (east of it,
    // pulled west so it sits inside the frame, not on the edge)
    const ship2 = game.missiles.targetById('WARSHIP-2');
    ship2.pos.set(-230, 6, 1470);
    ship2.group.position.set(-230, 6, 1470);
    ship2.group.rotation.y = 0.6;
    // WARSHIP-1: already sunk by the first missile — scorched, listing,
    // low in the water, left foreground. Explode it for the scorch + kill,
    // then pull the burst out so only one fireball (the kaiju's) shows.
    const ship1 = game.missiles.targetById('WARSHIP-1');
    ship1.pos.set(-520, 6, 1500);
    ship1.group.position.set(-520, 6, 1500);
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
    const kaiju = game.missiles.targetById('KAIJU-1');
    game.missiles.stageMissile(game.flight.pos.clone(), kaiju.pos.clone(), 0.65, kaiju, 2.0);
    game.missiles.explode(kaiju, null); // HP 100 -> 62, no kill, stays alive
    game.missiles.freezeBurst(0.2);
    const boom = game.missiles.explosions[game.missiles.explosions.length - 1];
    if (boom) {
      // a compact bright ball, not a pale balloon: the fire sprite is a
      // soft radial gradient, so 2.2x reads as a giant cream disc
      boom.flash.scale.setScalar(1.5);
      boom.fire.scale.set(boom.fire.scale.x * 1.8, boom.fire.scale.y * 1.8, 1);
      boom.smoke.forEach((s) => { s.scale.x *= 1.8; s.scale.y *= 1.8; });
      // pull the burst toward the camera off the chest surface, or the
      // torso curve hides it behind the lock diamond
      boom.group.position.x -= 8;
      boom.group.position.z += 14;
    }
    // lock the boss: diamond on its chest + range + SHOOT
    game.missiles.lock = {
      target: kaiju, progress: 1, locked: true,
      range: game.flight.pos.distanceTo(kaiju.pos),
    };
    game.setCameraMode('chase', { side: 0.35, dist: 55, height: 12 });
    game.hud.setMission(game.runner.mission, game.flight);
    game.hud.showToast('ULTRA-1 — GUARDIAN OF LIGHT · BEAM STRIKE', 4000);
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
