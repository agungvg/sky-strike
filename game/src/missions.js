// Missions: 6 sorties, gold gate rings, strike targets, scoring, debrief.
// A gate is a gold ring in the sky; flying through it (within the ring
// radius, close to its centre) clears it and scores. Strike sorties
// complete when every assigned target is destroyed; landing sorties are
// scored on sink rate and centreline.
import * as THREE from 'three';
import { MISSIONS, RUNWAY } from './config.js';
import { groundHeight } from './terrain.js';
import { clamp } from './random.js';

export class MissionRunner {
  constructor(scene) {
    this.scene = scene;
    this.ringGeo = new THREE.TorusGeometry(30, 1.8, 10, 40);
    this.ringMat = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.95 });
    this.nextMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 1 });
    this.doneMat = new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.5 });
    this.gateMeshes = [];
    this.mission = null;
    this.gates = [];
    this.nextGate = 0;
    this.frontDistKm = 17;
    this.frontEtaSec = 151;
    this.killsNeeded = 0;
  }

  clearWorld() {
    for (const m of this.gateMeshes) this.scene.remove(m);
    this.gateMeshes = [];
  }

  // Lay out gates for a mission. Ring positions follow the coast so the
  // flight path reads as a route, not a random scatter.
  start(missionId, flight) {
    this.clearWorld();
    this.mission = MISSIONS[missionId - 1];
    this.nextGate = 0;
    this.frontEtaSec = this.mission.frontEtaSec || 151;
    this.frontDistKm = 17;
    this.killsNeeded = (this.mission.targets || []).length;
    this.gates = this.buildGates(this.mission);
    this.gates.forEach((g, i) => {
      const mesh = new THREE.Mesh(this.ringGeo, i === 0 ? this.nextMat : this.ringMat);
      mesh.position.copy(g.pos);
      mesh.lookAt(g.pos.x, g.pos.y, g.pos.z + 100);
      this.scene.add(mesh);
      this.gateMeshes.push(mesh);
    });
    return this.mission;
  }

  buildGates(m) {
    const gates = [];
    const at = (x, z, altAgl) => new THREE.Vector3(x, groundHeight(x, z) + altAgl, z);
    if (m.id === 1) { // Coastal Gate Run — north up the coast, then a
      // gentle two-step bend east along the low foothills. The peak face
      // past z=-800 rises ~0.5 m per metre — no gate goes there; the
      // bend uses ~350 m legs so a jet at 160 kt can finish each turn
      // before the next ring (a 190 m leg is shorter than its turn arc).
      const pts = [[150, 1450, 180], [140, 1000, 200], [120, 550, 210], [100, 100, 220], [60, -350, 230], [300, -650, 220], [550, -850, 180]];
      pts.forEach(([x, z, a]) => gates.push({ pos: at(x, z, a) }));
    } else if (m.id === 2) { // Coastal Landing — two gates ON the 6° final
      // (absolute heights from the threshold, not ground-relative: the
      // ground south of the strip dips toward the bay, so AGL would be wrong)
      gates.push({ pos: new THREE.Vector3(150, 163, 1700) });
      gates.push({ pos: new THREE.Vector3(150, 89, 1250) });
    } else if (m.id === 3 || m.id === 7) { // Sea Strike / KAIJU vs ULTRA — approach gates over the bay
      gates.push({ pos: new THREE.Vector3(-300, 220, 1750) });
      gates.push({ pos: new THREE.Vector3(200, 240, 1850) });
    } else if (m.id === 4) { // Storm Strike — one gate on the attack run
      gates.push({ pos: new THREE.Vector3(-420, 200, 1900) });
    } else if (m.id === 5) { // Above the Clouds — south to north over the deck
      const pts = [[-100, 1000, 0], [500, 400, 0], [-300, -100, 0], [200, -700, 0], [-500, -1200, 0]];
      pts.forEach(([x, z]) => gates.push({ pos: new THREE.Vector3(x, 1080, z) }));
    } else { // Night Ridge Strike — one gate on the ridge run
      gates.push({ pos: new THREE.Vector3(-700, 700, -600) });
    }
    return gates;
  }

  nextGatePos() {
    if (this.nextGate >= this.gates.length) return null;
    return this.gates[this.nextGate].pos;
  }

  gateDistance(flight) {
    const p = this.nextGatePos();
    if (!p) return null;
    return flight.pos.distanceTo(p);
  }

  update(dt, flight, events) {
    if (!this.mission) return;
    // storm front closes in on storm missions
    if (this.mission.weather === 'storm' && this.frontEtaSec > 0) {
      this.frontEtaSec -= dt;
      this.frontDistKm = Math.max(0, (this.frontEtaSec / 151) * 17);
    }
    // gate pass check (32 m: the ring reads 30 m, the pass is forgiving)
    const p = this.nextGatePos();
    if (p) {
      const d = flight.pos.distanceTo(p);
      if (d < 32) {
        const pts = flight.gateScore();
        flight.score += pts;
        flight.gatesCleared += 1;
        this.gateMeshes[this.nextGate].material = this.doneMat;
        this.nextGate += 1;
        if (this.nextGate < this.gateMeshes.length) this.gateMeshes[this.nextGate].material = this.nextMat;
        events.push({ type: 'gate', points: pts, index: this.nextGate });
      }
    }
  }

  isComplete(flight) {
    if (!this.mission) return false;
    if (this.mission.type === 'landing') return flight.landed;
    if (this.mission.type === 'strike') return flight.kills >= this.killsNeeded && this.killsNeeded > 0;
    return this.nextGate >= this.gates.length;
  }

  // Debrief grade + stats, mirroring the refs' S-grade panels.
  debrief(flight) {
    const m = this.mission;
    const sink = flight.landed ? flight.touchdownFpm : null;
    let grade = 'B';
    let stars = 2;
    const gateFrac = m.type === 'strike' ? (this.killsNeeded ? flight.kills / this.killsNeeded : 0)
      : m.type === 'landing' ? (flight.landed ? 1 : 0)
      : flight.gatesCleared / Math.max(1, this.gates.length);
    const fuelLeft = flight.fuel;
    const hull = flight.hull;
    // Kill points already land in flight.score via the kill event;
    // the debrief only adds the fuel / hull bonuses below.
    let score = flight.score;
    const baseScore = flight.score;
    let sinkBonus = 0, centreBonus = 0;
    if (flight.landed) {
      sinkBonus = sink <= 150 ? 900 : sink <= 300 ? 600 : sink <= 500 ? 300 : 100;
      centreBonus = flight.centrelineM <= 3 ? 600 : flight.centrelineM <= 8 ? 350 : 100;
      score += sinkBonus + centreBonus;
      if (sink <= 200 && flight.centrelineM <= 5 && fuelLeft > 20) { grade = 'S'; stars = 3; }
      else if (sink <= 400 && flight.centrelineM <= 10) { grade = 'A'; stars = 3; }
      else if (sink <= 600) { grade = 'B'; stars = 2; }
      else { grade = 'C'; stars = 1; }
    } else if (gateFrac >= 1 && fuelLeft > 25 && hull > 90) { grade = 'S'; stars = 3; }
    else if (gateFrac >= 1 && hull > 75) { grade = 'A'; stars = 3; }
    else if (gateFrac >= 0.6) { grade = 'B'; stars = 2; }
    else { grade = 'C'; stars = 1; }
    const fuelBonus = Math.round(fuelLeft * 8);
    const hullBonus = Math.round(hull * 2);
    score += fuelBonus + hullBonus;
    const mm = Math.floor(flight.flightTime / 60);
    const ss = Math.floor(flight.flightTime % 60);
    // v4: itemized breakdown — every point accounted for, like the ref2
    // debrief (its rows sum to the total; so do these).
    const breakdown = [
      { label: 'GATES + KILLS', detail: `${flight.gatesCleared} gates · ${flight.kills} kills`, pts: baseScore },
    ];
    if (flight.landed) {
      breakdown.push(
        { label: 'TOUCHDOWN — SINK RATE', detail: `${sink} FPM`, pts: sinkBonus },
        { label: 'TOUCHDOWN — CENTRELINE', detail: `${flight.centrelineM} m off the line`, pts: centreBonus },
      );
    }
    breakdown.push(
      { label: 'FUEL REMAINING', detail: `${Math.round(fuelLeft)}% in the tanks`, pts: fuelBonus },
      { label: 'AIRFRAME INTACT', detail: `${Math.round(hull)}% hull`, pts: hullBonus },
    );
    return {
      grade, stars, score, breakdown,
      sink, centrelineM: flight.centrelineM,
      gates: `${flight.gatesCleared}/${this.gates.length}`,
      kills: `${flight.kills}/${this.killsNeeded}`,
      fuel: Math.round(fuelLeft), hull: Math.round(hull),
      time: `${mm}:${String(ss).padStart(2, '0')}`,
      peakG: flight.peakG.toFixed(1),
    };
  }
}

export function fmtEta(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
