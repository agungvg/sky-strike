// Cockpit: the full jet panel — 8 lit analog gauges on one canvas, a
// missile target strip (target name, range, lock bar, SHOOT cue), a lit
// switch row, a fighter yoke, and a throttle quadrant with an afterburner
// detent — under a canopy frame. The panel never eats more than ~37% of
// the frame; the runway, PAPI and terrain stay visible through the glass.
// v4: + MFD tactical screen (mini-map + target list), +4 switches,
// warning lamp strip, HUD combiner glass with lock symbology, visor
// reflection, engraved placard, panel rivets/wear (CSS).
import * as THREE from 'three';

export class Cockpit {
  constructor(root) {
    this.root = root;
    root.innerHTML = '';
    root.classList.add('cockpit');
    root.style.display = 'none';

    // canopy frame: dark pillars + top arch (SVG, over the 3D view)
    const frame = document.createElement('div');
    frame.className = 'cockpit-frame';
    frame.innerHTML = `<svg viewBox="0 0 1280 720" preserveAspectRatio="none">
      <path d="M0,0 L150,0 L110,720 L0,720 Z" fill="#14181f"/>
      <path d="M1280,0 L1130,0 L1170,720 L1280,720 Z" fill="#14181f"/>
      <path d="M0,0 L1280,0 L1280,42 L0,42 Z" fill="#14181f"/>
      <path d="M150,0 Q640,120 1130,0 L1130,26 Q640,140 150,26 Z" fill="#1a2029"/>
      <path d="M110,720 L640,470 L1170,720" fill="none" stroke="#14181f" stroke-width="10"/>
    </svg>`;
    root.appendChild(frame);

    // v4: visor reflection — a faint diagonal glare across the glass,
    // like sunlight on the canopy
    const visor = document.createElement('div');
    visor.className = 'cockpit-visor';
    root.appendChild(visor);

    // v4: HUD glass — green combiner symbology projected over the
    // windscreen (lock diamond + range + SHOOT, corner brackets)
    this.hudGlass = document.createElement('canvas');
    this.hudGlass.className = 'cockpit-hudglass';
    this.hudGlass.width = 1280;
    this.hudGlass.height = 720;
    root.appendChild(this.hudGlass);

    // instrument panel (bottom of frame)
    this.panel = document.createElement('div');
    this.panel.className = 'cockpit-panel';
    root.appendChild(this.panel);

    // gauge canvas: 8 gauges (v4: slightly smaller, room for the MFD)
    this.gaugeCanvas = document.createElement('canvas');
    this.gaugeCanvas.className = 'cockpit-gauges';
    this.gaugeCanvas.width = 780;
    this.gaugeCanvas.height = 190;
    this.panel.appendChild(this.gaugeCanvas);

    // v4: MFD — tactical mini-map + target list, right of the gauges
    this.mfdCanvas = document.createElement('canvas');
    this.mfdCanvas.className = 'cockpit-mfd';
    this.mfdCanvas.width = 280;
    this.mfdCanvas.height = 190;
    this.panel.appendChild(this.mfdCanvas);

    // missile target strip (HUD glass symbology, mirrored on the panel)
    this.tgtStrip = document.createElement('div');
    this.tgtStrip.className = 'cockpit-tgt';
    this.tgtStrip.innerHTML = `<span class="tgt-name" id="cp-tgt-name">NO TARGET</span><span class="tgt-rng" id="cp-tgt-rng">—</span><span class="tgt-lock" id="cp-tgt-lock">LOCK —</span><span class="tgt-shoot" id="cp-tgt-shoot">SHOOT</span>`;
    this.panel.appendChild(this.tgtStrip);
    this.tgtName = this.tgtStrip.querySelector('#cp-tgt-name');
    this.tgtRng = this.tgtStrip.querySelector('#cp-tgt-rng');
    this.tgtLock = this.tgtStrip.querySelector('#cp-tgt-lock');
    this.tgtShoot = this.tgtStrip.querySelector('#cp-tgt-shoot');

    // switch row (lit toggles) — v4: 12 switches + a lamp strip
    this.switchRow = document.createElement('div');
    this.switchRow.className = 'cockpit-switches';
    this.switches = {};
    for (const [key, label, lit] of [
      ['NAV', 'NAV', true], ['LAND', 'LAND', true], ['PITOT', 'PITOT', true],
      ['PUMP', 'FUEL PUMP', true], ['MASTER', 'MASTER ARM', false], ['STROBE', 'STROBE', true],
      ['AVION', 'AVIONICS', true], ['AB', 'AFTERBURNER', false],
      ['RADAR', 'RADAR', false], ['GUNS', 'GUNS', false], ['FLARE', 'FLARE', true],
      ['EJECT', 'EJECT', false],
    ]) {
      const s = document.createElement('div');
      s.className = 'cockpit-switch' + (lit ? ' lit' : '') + (key === 'EJECT' ? ' eject' : '');
      s.innerHTML = `<span class="sw-dot"></span><span class="sw-label">${label}</span>`;
      this.switchRow.appendChild(s);
      this.switches[key] = s;
    }
    this.panel.appendChild(this.switchRow);

    // v4: warning lamp strip — WARN / FIRE / HYD / ELEC / OXY / GEAR
    this.lampRow = document.createElement('div');
    this.lampRow.className = 'cockpit-lamps';
    this.lamps = {};
    for (const [key, label, cls] of [
      ['WARN', 'WARN', 'amber'], ['FIRE', 'FIRE', 'red'], ['HYD', 'HYD', 'green'],
      ['ELEC', 'ELEC', 'green'], ['OXY', 'OXY', 'green'], ['GEAR', 'GEAR', 'green'],
    ]) {
      const l = document.createElement('div');
      l.className = 'cockpit-lamp ' + cls;
      l.innerHTML = `<span class="lamp-dot"></span><span class="lamp-label">${label}</span>`;
      this.lampRow.appendChild(l);
      this.lamps[key] = l;
    }
    this.panel.appendChild(this.lampRow);

    // v4: engraved placard on the panel
    const placard = document.createElement('div');
    placard.className = 'cockpit-placard';
    placard.textContent = 'FALCON-7 · SN 07 · PILOT LYSO — "SKY STRIKE"';
    this.panel.appendChild(placard);

    // yoke (SVG silhouette, bottom centre)
    const yoke = document.createElement('div');
    yoke.className = 'cockpit-yoke';
    yoke.innerHTML = `<svg viewBox="0 0 220 120">
      <path d="M20,30 Q110,10 200,30 L200,62 Q110,44 20,62 Z" fill="#232a33" stroke="#3a4552" stroke-width="2"/>
      <rect x="100" y="52" width="20" height="58" rx="6" fill="#2c3540" stroke="#3a4552" stroke-width="2"/>
      <circle cx="110" cy="38" r="7" fill="#e85d10"/>
    </svg>`;
    this.panel.appendChild(yoke);

    // throttle quadrant: throttle / trim / flaps
    this.quadrant = document.createElement('div');
    this.quadrant.className = 'cockpit-quadrant';
    this.quadrant.innerHTML = `
      <div class="cq-title">THR · TRIM · FLAPS</div>
      <div class="cq-levers">
        <div class="cq-lever"><div class="cq-track"><div class="cq-knob" id="cq-thr"></div></div><span>THR</span></div>
        <div class="cq-lever"><div class="cq-track"><div class="cq-knob" id="cq-trim"></div></div><span>TRIM</span></div>
        <div class="cq-lever"><div class="cq-track"><div class="cq-knob" id="cq-flp"></div></div><span>FLP</span></div>
      </div>`;
    this.panel.appendChild(this.quadrant);
    this.thrKnob = this.quadrant.querySelector('#cq-thr');
    this.trimKnob = this.quadrant.querySelector('#cq-trim');
    this.flpKnob = this.quadrant.querySelector('#cq-flp');

    // status chips on the panel
    this.panelChips = document.createElement('div');
    this.panelChips.className = 'cockpit-chips';
    this.panelChips.innerHTML = `
      <span class="hud-mini-chip ok" id="cp-gear">GEAR DOWN</span>
      <span class="hud-mini-chip ok" id="cp-flaps">FLAPS SET</span>
      <span class="hud-mini-chip ok" id="cp-papi">PAPI LOCK</span>
      <span class="hud-mini-chip" id="cp-stall">STALL WARN</span>`;
    this.panel.appendChild(this.panelChips);
    this.cpGear = this.panelChips.querySelector('#cp-gear');
    this.cpFlaps = this.panelChips.querySelector('#cp-flaps');
    this.cpPapi = this.panelChips.querySelector('#cp-papi');
    this.cpStall = this.panelChips.querySelector('#cp-stall');
  }

  show(on) { this.root.style.display = on ? 'block' : 'none'; }

  gauge(x, cx, cy, r, label, draw) {
    x.save();
    x.translate(cx, cy);
    // bezel + face
    x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2);
    x.fillStyle = '#0c0f14'; x.fill();
    x.lineWidth = 4; x.strokeStyle = '#3a4552'; x.stroke();
    x.beginPath(); x.arc(0, 0, r - 5, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(255,220,140,0.55)'; x.lineWidth = 1; x.stroke();
    // glass highlight
    x.beginPath(); x.arc(-r * 0.3, -r * 0.35, r * 0.5, 0, Math.PI * 2);
    x.fillStyle = 'rgba(255,255,255,0.05)'; x.fill();
    // ticks
    x.strokeStyle = '#e8e4d8'; x.lineWidth = 1.5;
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 - Math.PI / 2;
      const major = a % 3 === 0;
      x.beginPath();
      x.moveTo(Math.cos(ang) * (r - (major ? 12 : 7)), Math.sin(ang) * (r - (major ? 12 : 7)));
      x.lineTo(Math.cos(ang) * (r - 3), Math.sin(ang) * (r - 3));
      x.stroke();
    }
    x.font = 'bold 10px monospace'; x.textAlign = 'center'; x.fillStyle = '#ffd98a';
    x.fillText(label, 0, r - 14);
    draw(x, r);
    x.restore();
  }

  needle(x, r, angle, color = '#ffffff', width = 2.5) {
    x.save();
    x.rotate(angle);
    x.strokeStyle = color; x.lineWidth = width;
    x.beginPath(); x.moveTo(0, 6); x.lineTo(0, -(r - 14)); x.stroke();
    x.restore();
    x.beginPath(); x.arc(0, 0, 4, 0, Math.PI * 2);
    x.fillStyle = '#ffd76a'; x.fill();
  }

  draw(flight, papiState, lockState, targets, camera, ultraOn) {
    const x = this.gaugeCanvas.getContext('2d');
    const W = this.gaugeCanvas.width, H = this.gaugeCanvas.height;
    x.clearRect(0, 0, W, H);
    const r = 56;
    const y0 = 78;
    const xs = [44, 140, 236, 332, 428, 524, 620, 716];

    // 1. AIRSPEED (knots, 0-520)
    this.gauge(x, xs[0], y0, r, 'AIRSPEED', (g) => {
      const a = (-Math.PI * 0.75) + (flight.speedKt / 520) * Math.PI * 1.5;
      this.needle(g, r, a);
      g.font = 'bold 16px monospace'; g.fillStyle = '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(flight.speedKt)), 0, r - 34);
    });
    // 2. ATTITUDE (artificial horizon)
    this.gauge(x, xs[1], y0, r, 'ATTITUDE', (g) => {
      g.save();
      g.beginPath(); g.arc(0, 0, r - 8, 0, Math.PI * 2); g.clip();
      g.rotate(-flight.roll);
      g.translate(0, flight.pitch * 90);
      g.fillStyle = '#3a7bd5'; g.fillRect(-r, -r, r * 2, r);
      g.fillStyle = '#8a5a30'; g.fillRect(-r, 0, r * 2, r);
      g.fillStyle = '#ffffff'; g.fillRect(-r, -1.5, r * 2, 3);
      g.restore();
      g.fillStyle = '#ffd76a';
      g.beginPath(); g.moveTo(-16, 0); g.lineTo(-4, 0); g.lineTo(-4, -5); g.lineTo(4, -5); g.lineTo(4, 0); g.lineTo(16, 0); g.lineTo(16, 3); g.lineTo(-16, 3); g.closePath(); g.fill();
    });
    // 3. ALTIMETER (feet, 0-4000)
    this.gauge(x, xs[2], y0, r, 'ALTITUDE', (g) => {
      const a = (-Math.PI * 0.75) + ((flight.altMslFt % 1000) / 1000) * Math.PI * 1.5;
      this.needle(g, r, a);
      const a2 = (-Math.PI * 0.75) + (Math.min(flight.altMslFt, 4000) / 4000) * Math.PI * 1.5;
      this.needle(g, r * 0.55, a2, '#ffd76a', 2);
      g.font = 'bold 16px monospace'; g.fillStyle = '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(flight.altMslFt)), 0, r - 34);
    });
    // 4. HEADING / COMPASS
    this.gauge(x, xs[3], y0, r, 'HEADING', (g) => {
      g.save();
      g.rotate(-flight.heading);
      g.font = 'bold 11px monospace'; g.textAlign = 'center';
      for (const [deg, lab] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) {
        const a = (deg * Math.PI) / 180;
        g.fillStyle = '#e8e4d8';
        g.fillText(lab, Math.sin(a) * (r - 22), -Math.cos(a) * (r - 22) + 4);
      }
      g.restore();
      g.fillStyle = '#ffd76a';
      g.beginPath(); g.moveTo(-5, -(r - 8)); g.lineTo(5, -(r - 8)); g.lineTo(0, -(r - 18)); g.closePath(); g.fill();
      g.font = 'bold 13px monospace'; g.fillStyle = '#7ee8ff';
      g.fillText(String(Math.round(flight.hdgDeg)).padStart(3, '0'), 0, r - 34);
    });
    // 5. ENGINE RPM % (afterburner zone past 92%)
    this.gauge(x, xs[4], y0, r, 'RPM %', (g) => {
      const rpm = flight.throttle * 100;
      const a = (-Math.PI * 0.75) + (rpm / 100) * Math.PI * 1.5;
      this.needle(g, r, a, flight.afterburner ? '#7ab8ff' : '#ffffff');
      // afterburner arc
      g.strokeStyle = '#7ab8ff'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r - 9, (-Math.PI * 0.75) + 0.92 * Math.PI * 1.5, (-Math.PI * 0.75) + Math.PI * 1.5); g.stroke();
      g.font = 'bold 16px monospace'; g.fillStyle = flight.afterburner ? '#7ab8ff' : '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(rpm)), 0, r - 34);
    });
    // 6. FUEL
    this.gauge(x, xs[5], y0, r, 'FUEL %', (g) => {
      const a = (-Math.PI * 0.75) + (flight.fuel / 100) * Math.PI * 1.5;
      this.needle(g, r, a, flight.fuel < 20 ? '#ff5040' : '#ffffff');
      g.font = 'bold 16px monospace'; g.fillStyle = flight.fuel < 20 ? '#ff5040' : '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(flight.fuel)), 0, r - 34);
    });
    // 7. VSI (fpm, +/-2000)
    this.gauge(x, xs[6], y0, r, 'VSI FPM', (g) => {
      const vsi = flight.vsi * 196.85;
      const a = (-Math.PI * 0.75) + ((vsi + 2000) / 4000) * Math.PI * 1.5;
      this.needle(g, r, a);
      g.font = 'bold 14px monospace'; g.fillStyle = '#7ee8ff'; g.textAlign = 'center';
      g.fillText((vsi >= 0 ? '+' : '') + String(Math.round(vsi)), 0, r - 34);
    });
    // 8. G METER / TURN (bank + ball + G)
    this.gauge(x, xs[7], y0, r, 'G LOAD', (g) => {
      g.save();
      g.rotate(flight.roll);
      g.fillStyle = '#e8e4d8';
      g.beginPath(); g.moveTo(-4, -(r - 14)); g.lineTo(4, -(r - 14)); g.lineTo(0, -(r - 26)); g.closePath(); g.fill();
      g.restore();
      const ballX = Math.sin(flight.roll) * 22;
      g.fillStyle = '#ffd76a';
      g.beginPath(); g.arc(ballX, r - 30, 6, 0, Math.PI * 2); g.fill();
      g.font = 'bold 13px monospace'; g.fillStyle = flight.overG ? '#ff5040' : '#7ee8ff'; g.textAlign = 'center';
      g.fillText(`${flight.g.toFixed(1)}G`, 0, r - 34);
    });

    // target strip: name / range / lock progress / SHOOT cue
    const lk = lockState || {};
    if (lk.target && lk.target.alive) {
      this.tgtName.textContent = `TGT ${lk.target.name}`;
      this.tgtRng.textContent = `RNG ${Math.round(lk.range || 0)}m`;
      this.tgtLock.textContent = lk.locked ? 'LOCK SOLID' : `LOCK ${Math.round((lk.progress || 0) * 100)}%`;
      this.tgtLock.className = 'tgt-lock' + (lk.locked ? ' on' : '');
      this.tgtShoot.style.display = lk.locked ? 'inline-block' : 'none';
    } else {
      this.tgtName.textContent = 'NO TARGET';
      this.tgtRng.textContent = '—';
      this.tgtLock.textContent = 'LOCK —';
      this.tgtLock.className = 'tgt-lock';
      this.tgtShoot.style.display = 'none';
    }

    // levers + chips
    this.thrKnob.style.bottom = `${8 + flight.throttle * 62}%`;
    this.trimKnob.style.bottom = `${8 + 31}%`;
    this.flpKnob.style.bottom = `${8 + flight.flaps * 31}%`;
    this.cpGear.textContent = flight.gear ? 'GEAR DOWN' : 'GEAR UP';
    this.cpGear.className = 'hud-mini-chip ' + (flight.gear ? 'ok' : 'warn');
    this.cpFlaps.textContent = flight.flaps ? 'FLAPS SET' : 'FLAPS UP';
    this.cpFlaps.className = 'hud-mini-chip ' + (flight.flaps ? 'ok' : '');
    this.cpPapi.textContent = `PAPI ${papiState || 'ACTIVE'}`;
    this.cpPapi.className = 'hud-mini-chip ' + (papiState === 'LOCK' ? 'ok' : '');
    this.cpStall.style.display = flight.stallWarn ? 'inline-block' : 'none';
    this.cpStall.className = 'hud-mini-chip danger';
    this.switches.LAND.classList.toggle('lit', flight.gear);
    this.switches.AB.classList.toggle('lit', flight.afterburner);
    this.switches.MASTER.classList.toggle('lit', !!(lk.target));
    this.switches.RADAR.classList.toggle('lit', !!(lk.target));
    this.switches.GUNS.classList.toggle('lit', !!lk.locked);
    // v4 lamp strip
    this.lamps.WARN.classList.toggle('on', flight.stallWarn || flight.overG);
    this.lamps.FIRE.classList.toggle('on', flight.hull < 50);
    this.lamps.HYD.classList.toggle('on', true);
    this.lamps.ELEC.classList.toggle('on', true);
    this.lamps.OXY.classList.toggle('on', flight.fuel > 10);
    this.lamps.GEAR.classList.toggle('on', flight.gear);
    this.drawMfd(flight, targets, lk, ultraOn);
    this.drawHudGlass(lk, camera);
  }

  // v4 MFD: tactical mini-map (land/sea, runway, targets, ally) + list.
  drawMfd(flight, targets, lk, ultraOn) {
    const x = this.mfdCanvas.getContext('2d');
    const W = 280, H = 190;
    x.clearRect(0, 0, W, H);
    x.fillStyle = '#06110a'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#1e5c38'; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
    x.font = 'bold 11px monospace'; x.textAlign = 'left';
    x.fillStyle = '#3ddc84'; x.fillText('MFD · TACTICAL', 8, 16);
    x.fillStyle = '#7ee8ff'; x.textAlign = 'right'; x.fillText('RNG 4KM', W - 8, 16);
    const mapY0 = 22, mapH = 108;
    x.fillStyle = '#0d2a18'; x.fillRect(4, mapY0, W - 8, mapH * 0.62); // land
    x.fillStyle = '#0a2e44'; x.fillRect(4, mapY0 + mapH * 0.62, W - 8, mapH * 0.38); // sea
    x.fillStyle = '#c8b888'; x.fillRect(4, mapY0 + mapH * 0.62 - 1, W - 8, 2); // beach
    const px = (wx) => ((wx + 2100) / 4200) * (W - 8) + 4;
    const py = (wz) => mapY0 + ((wz + 2100) / 4200) * mapH;
    // runway strip
    x.fillStyle = '#e8e8e8';
    x.fillRect(px(150) - 1.5, py(-100), 3, py(800) - py(-100));
    const diamond = (sx, sy, color, r = 5) => {
      x.strokeStyle = color; x.lineWidth = 2;
      x.beginPath();
      x.moveTo(sx, sy - r); x.lineTo(sx + r, sy); x.lineTo(sx, sy + r); x.lineTo(sx - r, sy);
      x.closePath(); x.stroke();
    };
    // strike targets (live only)
    if (targets) {
      for (const t of targets) {
        if (!t.alive) continue;
        diamond(px(t.pos.x), py(t.pos.z), t.id === 'KAIJU-1' ? '#ff5040' : '#ff8a7a');
      }
    }
    // ally giant: cyan diamond
    if (ultraOn) diamond(px(-480), py(1520), '#7ee8ff', 6);
    // own ship: white triangle, rotated by heading
    x.save();
    x.translate(px(flight.pos.x), py(flight.pos.z));
    x.rotate(flight.heading);
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill();
    x.restore();
    // target list
    x.font = '10px monospace'; x.textAlign = 'left';
    let ly = 146;
    const rows = [];
    if (targets) {
      for (const t of targets) {
        if (!t.alive) continue;
        const d = flight.pos.distanceTo(t.pos);
        rows.push([`${t.id}`, `${(d / 1000).toFixed(1)} KM`, lk.target === t ? '◄ LOCK' : '']);
      }
    }
    if (ultraOn) rows.push(['ULTRA-1', 'ALLY', 'BEAM']);
    for (const [name, dist, tag] of rows.slice(0, 3)) {
      x.fillStyle = name === 'KAIJU-1' ? '#ff8a7a' : name === 'ULTRA-1' ? '#7ee8ff' : '#e8e4d8';
      x.fillText(name, 8, ly);
      x.fillStyle = '#7ee8ff'; x.textAlign = 'right';
      x.fillText(dist, W - 52, ly);
      x.fillStyle = '#ffd76a';
      x.fillText(tag, W - 8, ly);
      x.textAlign = 'left';
      ly += 14;
    }
  }

  // v4 HUD combiner glass: green symbology over the windscreen —
  // corner brackets + the lock diamond / range / SHOOT at the target's
  // projected position, plus a faint sun glare streak.
  drawHudGlass(lk, camera) {
    const x = this.hudGlass.getContext('2d');
    const W = 1280, H = 720;
    x.clearRect(0, 0, W, H);
    // combiner brackets around the centre view
    x.strokeStyle = 'rgba(110,255,170,0.55)'; x.lineWidth = 2;
    const bx = 430, by = 130, bw = 420, bh = 300, L = 34;
    const corner = (cx, cy, dx, dy) => {
      x.beginPath();
      x.moveTo(cx + dx * L, cy); x.lineTo(cx, cy); x.lineTo(cx, cy + dy * L);
      x.stroke();
    };
    corner(bx, by, 1, 1); corner(bx + bw, by, -1, 1);
    corner(bx, by + bh, 1, -1); corner(bx + bw, by + bh, -1, -1);
    // sun glare streak across the glass
    const grad = x.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0.08, 'rgba(255,255,255,0.10)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.0)');
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
    // lock diamond at the target's screen position
    if (lk && lk.target && lk.target.alive && camera) {
      const v = new THREE.Vector3().copy(lk.target.pos).project(camera);
      if (v.z < 1) {
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        const s = lk.locked ? 34 : 24;
        x.strokeStyle = lk.locked ? '#ff5040' : 'rgba(110,255,170,0.95)';
        x.lineWidth = 2.5;
        x.beginPath();
        x.moveTo(sx, sy - s); x.lineTo(sx + s, sy); x.lineTo(sx, sy + s); x.lineTo(sx - s, sy);
        x.closePath(); x.stroke();
        x.font = 'bold 16px monospace'; x.textAlign = 'center';
        x.fillStyle = lk.locked ? '#ff5040' : '#6effaa';
        x.fillText(
          lk.locked ? `${lk.target.name} · ${Math.round(lk.range || 0)}m · SHOOT` : `${lk.target.name} · LOCK ${Math.round((lk.progress || 0) * 100)}%`,
          sx, sy + s + 24,
        );
      }
    }
  }

}
