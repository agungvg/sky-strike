// Shot presets: the 4 dossier frames, each a real render of the live game
// with a fixed, seeded state — no faked images. A shot sets the mission,
// the plane, the weather and the HUD numbers, then freezes the sim so the
// frame is the same on every load. ?shot=cover|cockpit|storm|map
//
// Staging numbers are this game's own: cover SPD 284 / score 2146 / fuel
// 68%, cockpit SPD 132 / score 4762 / fuel 49%, kaiju shot score 6890 /
// fuel 23% / KILLS 1/1, debrief sink -164 FPM / 9218 PTS / fuel 31% / hull 94%.
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

export const SHOTS = {
  // 1. COVER — sortie 01 over the sea, heading north toward the sun and
  //    the peaks: jet large + bright, afterburner lit, banked, 3/4 rear
  //    chase; gold gate G-02 at 523 m; glitter path on the sea below.
  cover(game) {
    game.setMission(1, { silent: true });
    game.sky.apply('golden', 'golden');
    game.clouds.tint(0xffe9c4, 0xffab7a);
    game.weather.setStorm(false);
    game.lightning.auto = false;
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

  // 2. COCKPIT — sortie 02 final approach over the bay, runway centred,
  //    PAPI LOCK, 8 gauges lit, target strip + yoke + levers visible.
  cockpit(game) {
    game.setMission(2, { silent: true });
    game.sky.apply('golden', 'golden');
    game.weather.setStorm(false);
    game.lightning.auto = false;
    pose(game, {
      x: 150, y: 42 + 121, z: 1950, headingDeg: 0, pitchDeg: -4, rollDeg: 0,
      speedKt: 132, throttle: 0.42, fuel: 49, score: 4762, gates: 0, flaps: 2,
    });
    game.flight.gear = true;
    game.flight.vsi = -1076 / 196.85;
    game.flight.gatesCleared = 0;
    game.runner.nextGate = 0;
    game.runner.gateMeshes.forEach((m, i) => { m.material = i === 0 ? game.runner.nextMat : game.runner.ringMat; });
    game.setCameraMode('cockpit');
    game.hud.setMission(game.runner.mission, game.flight);
    game.terrain.setPapi('lock');
  },

// 3. SEA STRIKE vs KAIJU — sortie 03: JET vs a GIANT KAIJU + WARSHIP off
//    the coast, golden-hour light, beach + coastline + glitter sea bright
//    and readable. The kaiju is 3x scale (~126 m, 9x the warship's mast):
//    head + layered blue-tipped spines + tail out of the sea, breathing a
//    bright blue atomic beam over the jet. A missile mid-flight off the
//    wing with a smoke-puff trail, fireball ON the kaiju's chest (boss HP
//    62%), WARSHIP-1 already sunk and listing (banner), WARSHIP-2 intact
//    beside the kaiju, boss bar KAIJU-1 + lock diamond + SHOOT. KILLS 1/1,
//    score 6890, fuel 23%. No storm front, no rain, no lightning.
  storm(game) {
    game.setMission(3, { silent: true });
    game.sky.apply('golden', 'golden');
    game.clouds.tint(0xffe9c4, 0xffab7a);
    game.weather.setStorm(false);
    game.lightning.auto = false;
    // attack run 90 m over the sea, offset west so the kaiju stands clear
    // of the jet (not hidden behind it), 260 m out so the giant fits
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
      boom.flash.scale.setScalar(1.2);
      boom.fire.scale.set(boom.fire.scale.x * 1.4, boom.fire.scale.y * 1.4, 1);
      boom.smoke.forEach((s) => { s.scale.x *= 1.8; s.scale.y *= 1.8; });
    }
    // lock the boss: diamond on its chest + range + SHOOT
    game.missiles.lock = {
      target: kaiju, progress: 1, locked: true,
      range: game.flight.pos.distanceTo(kaiju.pos),
    };
    game.setCameraMode('chase', { side: 0.35, dist: 55, height: 12 });
    game.hud.setMission(game.runner.mission, game.flight);
    game.hud.showToast('TARGET DESTROYED — WARSHIP-1  +1000', 4000);
  },

  // 4. MAP + DEBRIEF — campaign map + S debrief over the live dusk scene.
  map(game) {
    game.setMission(1, { silent: true });
    game.sky.apply('golden', 'golden');
    game.weather.setStorm(false);
    game.lightning.auto = false;
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
      missionName: 'COASTAL GATE RUN',
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
