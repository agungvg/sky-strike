// Flight model for a fighter jet: arcade, but with real trade-offs.
// Throttle sets target speed (afterburner past 92%); pitch/roll steer;
// lift needs speed; slow flight stalls; hard turns load G; fuel burns
// with throttle (double in burner); over-G and hard landings damage the
// hull. All in metres / seconds, displayed in knots and feet.
import * as THREE from 'three';
import { JET, RUNWAY } from './config.js';
import { groundHeight } from './terrain.js';
import { clamp, lerp } from './random.js';

export const KT = 0.514444; // 1 knot in m/s

export class Flight {
  constructor() {
    this.reset();
  }

  reset() {
    this.pos = new THREE.Vector3(RUNWAY.x, 260, RUNWAY.z + 1500);
    this.heading = 0;          // radians, 0 = north (-z)
    this.pitch = 0;            // radians, + = nose up
    this.roll = 0;
    this.speed = 180 * KT;     // m/s
    this.throttle = 0.72;
    this.flaps = 0;            // 0 / 1 / 2
    this.gear = true;
    this.fuel = 74;            // %
    this.hull = 100;           // %
    this.g = 1.0;
    this.aoa = 2;
    this.vsi = 0;              // m/s
    this.score = 0;
    this.gatesCleared = 0;
    this.kills = 0;
    this.peakG = 1.0;
    this.crashed = false;
    this.crashReason = '';
    this.landed = false;
    this.touchdownFpm = 0;
    this.centrelineM = 0;
    this.flightTime = 0;
    this.stallWarn = false;
    this.overG = false;
    this.afterburner = false;
    this.gust = 0;
    this.windKt = 5;
    this.gustAmp = 0;
  }

  get altFt() { return (this.pos.y - groundHeight(this.pos.x, this.pos.z)) * 3.28084; }
  get altMslFt() { return this.pos.y * 3.28084; }
  get speedKt() { return this.speed / KT; }
  get hdgDeg() { return ((THREE.MathUtils.radToDeg(this.heading) % 360) + 360) % 360; }

  step(dt, input, env) {
    if (this.crashed || this.landed) return;
    this.flightTime += dt;

    // --- throttle / afterburner ---
    this.throttle = clamp(this.throttle + (input.throttleDelta || 0) * dt, 0, 1);
    this.afterburner = this.throttle > 0.92;
    const topKt = this.afterburner ? JET.maxKtAB : JET.maxKt;
    const targetSpeed = lerp(52, topKt, this.throttle) * KT;
    this.speed += clamp(targetSpeed - this.speed, -30 * dt, this.afterburner ? 26 * dt : 16 * dt);
    // drag with flaps / gear
    this.speed -= (this.flaps * 2.2 + (this.gear ? 1.2 : 0)) * KT * dt;
    if (this.speed < 34 * KT) this.speed = 34 * KT;

    // --- steering: roll rate from input, pitch follows stick ---
    const rollRate = 1.9; // jets roll faster than a STOL prop
    this.roll += clamp(input.roll || 0, -1, 1) * rollRate * dt;
    this.roll = clamp(this.roll, -1.35, 1.35);
    // roll bleeds back toward level hands-off
    if (!input.roll) this.roll *= Math.pow(0.4, dt);
    const pitchRate = 0.7;
    this.pitch += clamp(input.pitch || 0, -1, 1) * pitchRate * dt;
    this.pitch = clamp(this.pitch, -0.55, 0.5);

    // --- gusts ---
    this.gust = Math.sin(this.flightTime * 0.9) * this.gustAmp + Math.sin(this.flightTime * 2.7) * this.gustAmp * 0.5;

    // --- turn: heading follows bank. Heading 0 = north, increasing =
    // clockwise (north -> east -> south); a right bank turns right.
    const turnRate = Math.tan(this.roll) * 9.81 / Math.max(this.speed, 20);
    this.heading += turnRate * dt;

    // --- G load from bank + pitch pull. A hard bank AND a hard pull
    // together can exceed the 6.0 G limit; level flight is 1.0 G.
    const gLoad = 1 / Math.max(Math.cos(this.roll), 0.2) + Math.sin(this.pitch) * 2 + Math.max(0, input.pitch || 0) * 0.9;
    this.g += (gLoad - this.g) * Math.min(1, dt * 4);
    this.peakG = Math.max(this.peakG, this.g);
    this.overG = this.g > JET.maxG;
    if (this.overG) this.hull -= 2.2 * dt * (this.g - JET.maxG);

    // --- lift / sink. Pitch authority is gentle and the vertical speed
    // is bounded: a full nose-down dive is ~3200 fpm, not a 9000 fpm
    // plunge, so a 120 m correction can't kill you.
    const stallKt = this.flaps > 0 ? JET.stallKtFlaps : JET.stallKt;
    this.stallWarn = this.speedKt < stallKt + 10;
    const lift = clamp((this.speedKt - stallKt) / 70, 0, 1.5);
    // climb uses lift up to 1.2; the sink term only counts lift up to 1.0
    // — extra lift must not balloon the jet upward at level pitch.
    const climb = Math.sin(this.pitch) * this.speed * Math.min(lift, 1.2) * 0.9;
    const sink = (1 - Math.min(lift, 1)) * 12;
    const prevY = this.pos.y;
    const vs = clamp(climb - sink + this.gust * 0.6, -18, 28); // jets climb fast
    this.pos.y += vs * dt;
    this.vsi = (this.pos.y - prevY) / Math.max(dt, 1e-4);
    this.aoa = Math.round(clamp(8 - (this.speedKt - stallKt) * 0.12, -2, 14));

    // --- move forward ---
    const fx = Math.sin(this.heading), fz = -Math.cos(this.heading);
    this.pos.x += fx * this.speed * Math.cos(this.pitch) * dt;
    this.pos.z += fz * this.speed * Math.cos(this.pitch) * dt;
    // crosswind push
    this.pos.x += (env.windKt || 0) * KT * 0.35 * dt;

    // --- fuel (burner drinks twice as fast) ---
    this.fuel -= this.throttle * JET.fuelBurnPerMin * (this.afterburner ? 2 : 1) * dt / 60;
    if (this.fuel <= 0) { this.fuel = 0; this.throttle = Math.max(this.throttle - dt * 0.2, 0.15); }

    // --- terrain / water collision ---
    const ground = groundHeight(this.pos.x, this.pos.z);
    const water = 2;
    const floor = Math.max(ground, water);
    if (this.pos.y <= floor + 1.2) {
      const sinkFpm = -this.vsi * 196.85;
      const nearRunway = Math.abs(this.pos.x - RUNWAY.x) < RUNWAY.width / 2 + 6
        && Math.abs(this.pos.z - RUNWAY.z) < RUNWAY.length / 2 + 40;
      if (nearRunway && this.gear && sinkFpm < 650 && Math.abs(this.roll) < 0.35 && this.speedKt < 150) {
        this.landed = true;
        this.pos.y = 42;
        this.touchdownFpm = Math.round(sinkFpm);
        this.centrelineM = Math.round(Math.abs(this.pos.x - RUNWAY.x));
      } else {
        this.crashed = true;
        this.crashReason = this.pos.y <= water + 1.2 && ground < 4 ? 'DITCHED IN THE SEA' : 'TERRAIN STRIKE';
        this.hull = 0;
      }
    }
    if (this.hull <= 0 && !this.crashed) { this.crashed = true; this.crashReason = 'AIRFRAME FAILURE'; }

    // --- keep inside the map ---
    const half = 2000;
    this.pos.x = clamp(this.pos.x, -half, half);
    this.pos.z = clamp(this.pos.z, -half, half);
  }

  // Score for passing a gate: base + smoothness bonus.
  gateScore() {
    const smooth = this.g < 1.8 ? 150 : this.g < 2.6 ? 60 : 0;
    return 400 + smooth;
  }
}
