// Missiles: lock-on, launch, smoke trail, hit, explosion.
// A target locks only when it sits inside the nose cone (28 deg) and
// within 2800 m; the lock builds for ~1.2 s, then the HUD shows SHOOT.
// A fired missile steers onto the target and detonates on impact:
// flash + fireball + smoke, the ship lists and sinks, the radar tower
// burns. Each kill scores 1000 and counts toward the sortie.
import * as THREE from 'three';
import { TARGETS } from './config.js';
import { groundHeight } from './terrain.js';
import { buildKaiju, KAIJU_SCALE, KAIJU_CHEST_LOCAL } from './kaiju.js';
import { buildUltra, aimBeam, ULTRA_HANDS_LOCAL } from './ultra.js';
import { clamp } from './random.js';

// ULTRA-1's beach position: WEST of the kaiju, between the jet's
// attack run and the boss — from the chase camera he stands left of
// frame, energy blade forward toward the kaiju's chest. Wading in the
// shallows. (The shot preset moves both giants closer for the face-off.)
export const ULTRA_POS = new THREE.Vector3(-480, 2, 1520);
export const ULTRA_YAW = 2.06; // faces the kaiju at (-350, 1450)

const LOCK_CONE = 0.6;      // radians off the nose (~34 deg)
const LOCK_RANGE = 2800;    // metres
const LOCK_TIME = 1.2;      // seconds to full lock
const MISSILE_SPEED = 340;  // m/s
const KILL_SCORE = 1000;

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

export class MissileSystem {
  constructor(scene) {
    this.scene = scene;
    this.fireTex = glowTexture('rgba(255,240,180,1)', 'rgba(255,110,20,0.85)');
    this.smokeTex = glowTexture('rgba(200,200,200,0.9)', 'rgba(90,90,95,0.55)');
    this.whiteTex = glowTexture('rgba(255,255,255,1)', 'rgba(240,240,240,0.8)');
    this.targets = [];
    for (const t of TARGETS) {
      const isKaiju = t.kind === 'kaiju';
      // The kaiju's lock / hit point is the south face of its chest
      // (facing the jet's approach): the chest centre in world space,
      // pushed ~18 m south so the missile and fireball sit ON the body,
      // not buried inside it.
      let pos;
      let group;
      if (isKaiju) {
        group = buildKaiju().group;
        group.scale.setScalar(KAIJU_SCALE);
        group.position.set(t.x, 2, t.z);
        group.rotation.y = 0.55; // 3/4 toward the camera: chest + breath read, spines still on the silhouette, tail right
        group.updateMatrixWorld(true);
        const chest = group.localToWorld(KAIJU_CHEST_LOCAL.clone());
        pos = chest.clone().add(new THREE.Vector3(0, 0, 18));
      } else {
        pos = new THREE.Vector3(t.x, t.y !== undefined ? t.y : groundHeight(t.x, t.z), t.z);
        group = t.kind === 'ship' ? this.buildShip(t) : this.buildRadar(t);
        group.position.copy(pos);
      }
      scene.add(group);
      this.targets.push({
        ...t, pos, group, alive: true, sinkT: 0,
        baseY: isKaiju ? 2 : pos.y,
        yaw: isKaiju ? 0.55 : 0,
        hp: isKaiju ? 100 : undefined, maxHp: isKaiju ? 100 : undefined,
        breath: isKaiju ? group.userData.breath : null,
      });
    }
    this.kaiju = this.targetById('KAIJU-1');
    // ULTRA-1: the ally giant. NOT a target — never lockable, never
    // scored — he stands on the beach and fights the kaiju (energy blade;
    // the beam is still aimed in gameplay) whenever the
    // boss sortie is active. Hidden everywhere else (cover / cockpit /
    // map frames must not leak him).
    const ultraBuilt = buildUltra();
    this.ultra = {
      group: ultraBuilt.group, beam: ultraBuilt.beam,
      pos: ULTRA_POS.clone(), yaw: ULTRA_YAW,
    };
    this.ultra.group.position.copy(ULTRA_POS);
    this.ultra.group.rotation.y = ULTRA_YAW;
    this.ultra.group.scale.setScalar(2.5); // ~100 m tall: a giant to match the 126 m kaiju, not a toy soldier
    this.ultra.group.visible = false;
    scene.add(this.ultra.group);
    scene.add(this.ultra.beam);
    this.aimUltraBeam();
    this.activeIds = null; // null = every target is fair game
    this.lock = { target: null, progress: 0, locked: false, range: null };
    this.missiles = [];
    this.explosions = [];
    this.cooldown = 0;
    this.kills = 0;
    this._tmp = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
  }

  buildShip(t) {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x5a616a, roughness: 0.65, metalness: 0.4 }); // steel grey
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x7a828c, roughness: 0.7, metalness: 0.3 });
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x8a929c, roughness: 0.6, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2e33, roughness: 0.6, metalness: 0.4 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xaa3020, roughness: 0.6, metalness: 0.2 });
    // hull + pointed bow
    const hull = new THREE.Mesh(new THREE.BoxGeometry(30, 3.4, 8), hullMat);
    hull.position.y = 1.2;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 4), hullMat);
    bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4;
    bow.position.set(18, 1.2, 0);
    // deck + bridge with a window strip
    const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 2.6, 5.4), deckMat);
    deck.position.set(-2, 4.2, 0);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 5), bridgeMat);
    bridge.position.set(-6, 7.5, 0);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1, 5.2), darkMat);
    windows.position.set(-6, 8.6, 0);
    // funnel with a red band
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 5, 8), deckMat);
    funnel.position.set(2, 8, 0);
    const funnelBand = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 1, 8), accentMat);
    funnelBand.position.set(2, 9.5, 0);
    const funnelTop = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.8, 8), darkMat);
    funnelTop.position.set(2, 10.6, 0);
    // two gun turrets with barrels, bow + stern
    for (const [bx, dir] of [[12, 1], [-12, -1]]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 1.2, 8), hullMat);
      base.position.set(bx, 3.8, 0);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5, 8), darkMat);
      barrel.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      barrel.position.set(bx + dir * 2.5, 4.4, 0);
      g.add(base, barrel);
    }
    // mast + radar bar
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), deckMat);
    mast.position.set(-4, 9, 0);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.4), darkMat);
    radarBar.position.set(-4, 13.2, 0);
    // wake: a white V behind the hull so the ship reads at range
    for (const side of [-1, 1]) {
      const wake = new THREE.Mesh(
        new THREE.PlaneGeometry(30, 14),
        new THREE.MeshBasicMaterial({ color: 0xd8e8e8, transparent: true, opacity: 0.5, depthWrite: false }),
      );
      wake.rotation.x = -Math.PI / 2; wake.rotation.z = side * 0.5;
      wake.position.set(-26, 0.4, side * 3);
      g.add(wake);
    }
    g.add(hull, bow, deck, bridge, windows, funnel, funnelBand, funnelTop, mast, radarBar);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  buildRadar(t) {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.6, metalness: 0.5 });
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xd8dce2, roughness: 0.4, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 10), steel);
    base.position.y = 1.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 20, 8), steel);
    pole.position.y = 13;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(4.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dishMat);
    dish.rotation.x = -0.7;
    dish.position.y = 24;
    const dishGroup = new THREE.Group();
    dishGroup.add(dish);
    dishGroup.position.y = 0;
    g.add(base, pole, dishGroup);
    g.userData.dish = dishGroup;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  targetById(id) { return this.targets.find((t) => t.id === id) || null; }

  // Aim ULTRA-1's beam from his hands to the kaiju's chest (world).
  aimUltraBeam() {
    if (!this.ultra || !this.kaiju) return;
    this.ultra.group.updateMatrixWorld(true);
    const hands = this.ultra.group.localToWorld(ULTRA_HANDS_LOCAL.clone());
    aimBeam(this.ultra.beam, hands, this.kaiju.pos.clone());
  }

  // The ally giant, when he is on screen (boss sortie active).
  ultraActive() {
    return !!(this.ultra && this.ultra.group.visible
      && this.activeIds && this.activeIds.includes('KAIJU-1'));
  }

  setActive(ids) {
    this.activeIds = ids ? [...ids] : null;
    this.lock.target = null; this.lock.progress = 0; this.lock.locked = false;
    // the atomic breath shows only in the boss sortie (or once locked on);
    // it must NOT leak into the cover / cockpit / map frames
    if (this.kaiju && this.kaiju.breath) {
      this.kaiju.breath.visible = !!(ids && ids.includes('KAIJU-1'));
    }
    // ULTRA-1 + his beam show only in the boss sorties (3 and 7)
    if (this.ultra) {
      const on = !!(ids && ids.includes('KAIJU-1'));
      this.ultra.group.visible = on;
      this.aimUltraBeam();
      this.ultra.beam.visible = on;
    }
  }

  reset() {
    for (const t of this.targets) {
      t.alive = true; t.sinkT = 0;
      if (t.kind === 'kaiju') t.hp = 100;
      t.group.visible = true;
      t.group.rotation.set(0, t.yaw || 0, 0);
      t.group.position.y = t.baseY;
      t.group.traverse((o) => {
        if (o.isMesh && o.material && o.material.color) {
          if (o.userData.burnt) { o.material.color.setHex(o.userData.origColor); o.userData.burnt = false; }
        }
      });
    }
    for (const m of this.missiles) {
      this.scene.remove(m.mesh, m.trail);
      if (m.puffs) for (const p of m.puffs) this.scene.remove(p);
    }
    this.missiles = [];
    for (const e of this.explosions) this.scene.remove(e.group);
    this.explosions = [];
    this.lock.target = null; this.lock.progress = 0; this.lock.locked = false; this.lock.range = null;
    this.cooldown = 0;
    this.kills = 0;
  }

  // Where the nose points, in 3D (heading + pitch).
  noseDir(flight, out) {
    const cp = Math.cos(flight.pitch);
    out.set(Math.sin(flight.heading) * cp, Math.sin(flight.pitch), -Math.cos(flight.heading) * cp);
    return out;
  }

  update(dt, flight, events) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    // --- lock-on: nearest live target inside the nose cone + range ---
    const fwd = this.noseDir(flight, this._fwd);
    let best = null, bestScore = 1e9;
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (this.activeIds && !this.activeIds.includes(t.id)) continue;
      const d = this._tmp.copy(t.pos).sub(flight.pos);
      const dist = d.length();
      if (dist > LOCK_RANGE) continue;
      const ang = Math.acos(clamp(d.normalize().dot(fwd), -1, 1));
      if (ang > LOCK_CONE) continue;
      const score = ang * 1000 + dist * 0.1;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    if (best) {
      if (this.lock.target !== best) { this.lock.target = best; this.lock.progress = 0; }
      this.lock.progress = Math.min(1, this.lock.progress + dt / LOCK_TIME);
      this.lock.range = flight.pos.distanceTo(best.pos);
    } else {
      this.lock.progress = Math.max(0, this.lock.progress - dt * 2);
      if (this.lock.progress <= 0) this.lock.target = null;
      this.lock.range = null;
    }
    this.lock.locked = this.lock.progress >= 1 && !!this.lock.target;

    // the boss breathes fire once you lock it, in any sortie
    if (this.kaiju && this.kaiju.breath) {
      this.kaiju.breath.visible = (this.activeIds && this.activeIds.includes('KAIJU-1')) || this.lock.target === this.kaiju;
    }

    // --- missiles in flight ---
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.age += dt;
      const tgt = m.target;
      const toT = this._tmp.copy(tgt.pos).sub(m.pos);
      const dist = toT.length();
      if (dist < 20 || m.age > 12) {
        if (dist < 20 && tgt.alive) this.explode(tgt, events);
        this.scene.remove(m.mesh, m.trail);
        if (m.puffs) for (const p of m.puffs) this.scene.remove(p);
        this.missiles.splice(i, 1);
        continue;
      }
      // steer the velocity toward the target, turn-rate limited
      const want = toT.normalize();
      const cur = m.vel.clone().normalize();
      const turn = Math.min(1, dt * 2.4);
      const dir = cur.lerp(want, turn).normalize();
      m.vel.copy(dir).multiplyScalar(MISSILE_SPEED);
      m.pos.addScaledVector(m.vel, dt);
      m.mesh.position.copy(m.pos);
      m.mesh.lookAt(tgt.pos);
      // smoke trail: shift the ring buffer, newest point at the tail
      m.trailPts.push(m.pos.x, m.pos.y, m.pos.z);
      if (m.trailPts.length > 48 * 3) m.trailPts.splice(0, 3);
      const attr = m.trail.geometry.attributes.position;
      for (let p = 0; p < m.trailPts.length / 3; p++) {
        attr.setXYZ(p, m.trailPts[p * 3], m.trailPts[p * 3 + 1], m.trailPts[p * 3 + 2]);
      }
      attr.needsUpdate = true;
      m.trail.geometry.setDrawRange(0, m.trailPts.length / 3);
    }

    // --- explosions animate, dead ships list and sink ---
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.age += dt;
      this.applyBurst(e, e.age);
      if (e.age > 3.2) {
        this.scene.remove(e.group);
        this.explosions.splice(i, 1);
      }
    }
    for (const t of this.targets) {
      if (t.alive) {
        if (t.kind === 'radar' && t.group.userData.dish) t.group.userData.dish.rotation.y += dt * 0.7;
        continue;
      }
      t.sinkT += dt;
      if (t.kind === 'ship') {
        t.group.rotation.z = Math.min(0.3, t.sinkT * 0.08);
        if (t.sinkT > 1.2) t.group.position.y = t.pos.y - (t.sinkT - 1.2) * 1.4;
        if (t.group.position.y < t.pos.y - 9) t.group.visible = false;
      } else if (t.kind === 'kaiju') {
        // the boss lists and sinks back into the bay
        t.group.rotation.z = Math.min(0.25, t.sinkT * 0.06);
        if (t.sinkT > 1.2) t.group.position.y = t.baseY - (t.sinkT - 1.2) * 1.4;
        if (t.group.position.y < t.baseY - 12) t.group.visible = false;
      } else {
        t.group.rotation.z = Math.min(0.5, t.sinkT * 0.15);
      }
    }
  }

  // Fire one missile at the locked target. Returns a status for the toast.
  fire(flight) {
    if (this.cooldown > 0) return 'reloading';
    if (!this.lock.locked || !this.lock.target) return 'no-lock';
    const tgt = this.lock.target;
    this.cooldown = 1.5;
    const fwd = this.noseDir(flight, new THREE.Vector3());
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
    const side = Math.random() > 0.5 ? 1 : -1;
    const start = flight.pos.clone()
      .addScaledVector(fwd, 4)
      .addScaledVector(right, side * 3.6)
      .add(new THREE.Vector3(0, -0.4, 0));
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.4 }),
    );
    body.rotation.x = Math.PI / 2;
    const noseCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xe85d10, roughness: 0.4 }),
    );
    noseCone.rotation.x = Math.PI / 2; noseCone.position.z = 1.85;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    flame.rotation.x = -Math.PI / 2; flame.position.z = -2.2;
    mesh.add(body, noseCone, flame);
    mesh.position.copy(start);
    mesh.lookAt(tgt.pos);
    this.scene.add(mesh);
    // smoke trail: a line that grows behind the missile
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3));
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.75 }));
    trail.frustumCulled = false;
    this.scene.add(trail);
    this.missiles.push({
      mesh, trail, trailPts: [start.x, start.y, start.z],
      pos: start, vel: fwd.clone().multiplyScalar(flight.speed + 120),
      target: tgt, age: 0,
    });
    return 'fired';
  }

  // A hit on the boss: damage only (38 HP per missile, 100 HP total).
  // No scorch, no kill, no score — the kaiju keeps fighting until HP 0.
  // Any other target: scorch + kill + score.
  explode(target, events) {
    if (!target.alive) return;
    if (target.kind === 'kaiju') {
      target.hp = Math.max(0, (target.hp ?? 100) - 38);
      this.spawnExplosion(target, 0); // pos IS the hit point on its flank
      if (target.hp > 0) return;
    } else {
      // scorch the target dark
      target.group.traverse((o) => {
        if (o.isMesh && o.material && o.material.color && !o.userData.burnt) {
          o.userData.origColor = o.material.color.getHex();
          o.material.color.setHex(0x1a1a1a);
          o.userData.burnt = true;
        }
      });
      this.spawnExplosion(target, target.kind === 'ship' ? 4 : 14);
    }
    target.alive = false;
    target.sinkT = 0;
    this.kills += 1;
    if (events) events.push({ type: 'kill', target: target.id, points: KILL_SCORE });
  }

  // Flash + fireball + smoke at a target. yOff lifts the burst above the
  // hit point (ships +4, radars +14); the kaiju's pos is already the hit.
  spawnExplosion(target, yOff) {
    const group = new THREE.Group();
    group.position.copy(target.pos).add(new THREE.Vector3(0, yOff, 0));
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(10, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireTex, transparent: true, opacity: 1, depthWrite: false }));
    fire.scale.set(16, 16, 1);
    const smoke = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, opacity: 0.6, depthWrite: false }));
      s.position.set((Math.random() - 0.5) * 10, i * 8, (Math.random() - 0.5) * 10);
      s.scale.set(14, 14, 1);
      smoke.push(s);
      group.add(s);
    }
    group.add(flash, fire);
    this.scene.add(group);
    const exp = { group, flash, fire, smoke, age: 0 };
    this.explosions.push(exp);
    return exp;
  }

  // Set one explosion's visuals from its age (0..3.2 s). Used live and
  // by the dossier shot, which freezes the burst mid-explosion.
  applyBurst(e, age) {
    const f = clamp(age / 0.45, 0, 1);
    e.flash.scale.setScalar(1 + f * 4.5);
    e.flash.material.opacity = Math.max(0, 1 - age / 0.5);
    const fs = 16 + Math.min(age, 1.1) * 18 - Math.max(0, age - 1.1) * 10;
    e.fire.scale.set(Math.max(2, fs), Math.max(2, fs), 1);
    e.fire.material.opacity = clamp(1.2 - age / 1.1, 0, 1);
    e.smoke.forEach((s, i) => {
      s.position.y = i * 8 + age * 16;
      const sc = 14 + age * 12;
      s.scale.set(sc, sc * 0.8, 1);
      s.material.opacity = clamp(0.62 - age * 0.18, 0, 0.62);
    });
  }

  // Freeze the newest explosion at a given age (dossier shot helper).
  freezeBurst(age) {
    const e = this.explosions[this.explosions.length - 1];
    if (!e) return;
    e.age = age;
    this.applyBurst(e, age);
  }

  // Place a missile mid-flight with a pre-grown smoke trail (dossier shot).
  // target defaults to WARSHIP-1 (the old staging); pass the kaiju for the boss shot.
  // scale enlarges the missile for readability at range; smoke puffs make
  // the trail read as a white ribbon, not a 1px line.
  stageMissile(fromPos, targetPos, frac = 0.45, target = null, scale = 1) {
    const pos = fromPos.clone().lerp(targetPos, frac);
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.4 }),
    );
    body.rotation.x = Math.PI / 2;
    const noseCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0xe85d10, roughness: 0.4 }),
    );
    noseCone.rotation.x = Math.PI / 2; noseCone.position.z = 1.85;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 1.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    flame.rotation.x = -Math.PI / 2; flame.position.z = -2.2;
    mesh.add(body, noseCone, flame);
    mesh.position.copy(pos);
    mesh.lookAt(targetPos);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);
    const trailGeo = new THREE.BufferGeometry();
    const pts = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const p = fromPos.clone().lerp(pos, i / steps);
      pts.push(p.x, p.y, p.z);
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.75 }));
    trail.frustumCulled = false;
    this.scene.add(trail);
    const puffs = [];
    for (let i = 0; i < 8; i++) {
      const t = i / 7; // 0 = at the jet, 1 = at the missile
      const p = fromPos.clone().lerp(pos, t);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.whiteTex, transparent: true, opacity: 0.7 - t * 0.25, depthWrite: false }));
      const sz = (2.5 + t * 4) * scale;
      s.scale.set(sz, sz, 1);
      s.position.copy(p);
      this.scene.add(s);
      puffs.push(s);
    }
    this.missiles.push({ mesh, trail, trailPts: pts, pos, vel: new THREE.Vector3(), target: target || this.targetById('WARSHIP-1'), age: 99, puffs });
  }

  // The boss, when it should show a health bar: locked, or active in the
  // current sortie (mission 3). Null everywhere else.
  bossTarget() {
    const k = this.targetById('KAIJU-1');
    if (!k || !k.alive) return null;
    if (this.lock.target === k) return k;
    if (this.activeIds && this.activeIds.includes('KAIJU-1')) return k;
    return null;
  }

  lockState() {
    return {
      target: this.lock.target,
      progress: this.lock.progress,
      locked: this.lock.locked,
      range: this.lock.range,
    };
  }
}
