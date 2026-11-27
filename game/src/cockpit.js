// Cockpit: the full jet panel — 8 lit analog gauges on one canvas, a
// missile target strip (target name, range, lock bar, SHOOT cue), a lit
// switch row, a fighter yoke, and a throttle quadrant with an afterburner
// detent — under a canopy frame. The panel takes ~39% of the frame
// (ronde 2: 280 px, the reference's big bright displays); the round bow,
// the RECON ring and the canyon stay visible through the glass.
// v4: + MFD tactical screen (mini-map + target list), +4 switches,
// warning lamp strip, HUD combiner glass with lock symbology, visor
// reflection, engraved placard, panel rivets/wear (CSS).
// rev (round canopy, ref-cockpit-round): the frame is one big circular bow
// (see below); the panel is three displays — TAC RADAR scope left, 8
// gauges with the ADI centred, ENG / FUEL / SYS bars + quadrant right —
// and the combiner adds the yellow RECON gate ring with live readouts.
import * as THREE from 'three';

export class Cockpit {
  constructor(root) {
    this.root = root;
    root.innerHTML = '';
    root.classList.add('cockpit');
    root.style.display = 'none';

    // ROUND CANOPY (rev, ref-cockpit-round): one big circular bow over the
    // windscreen — a 560-radius circle centred at (640, 585), so the crown
    // clears the top edge (y 25) and the feet land at x 97 / 1183, just
    // inside the panel. Thick dark tube + a thin teal inner rim (the
    // reference's sunlit inner edge) + a faint outer rim. Slim dark side
    // rails only — no top band, no V nose line: the bow IS the frame.
    // Ronde 3 (ref-cockpit-clouds: "pilarnya keliatan"): the bow is
    // thicker (34) with a warm sunlit highlight across the crown, and
    // each side gets an inner PILLAR rail (r 505) following the bow's
    // curve from the panel up to y 180 — the canopy frame reads as
    // pillars left + right, like the reference, not a lone thin arc.
    const frame = document.createElement('div');
    frame.className = 'cockpit-frame';
    frame.innerHTML = `<svg viewBox="0 0 1280 720" preserveAspectRatio="none">
      <path d="M0,0 L46,0 L30,720 L0,720 Z" fill="#14181f"/>
      <path d="M1280,0 L1234,0 L1250,720 L1280,720 Z" fill="#14181f"/>
      <path d="M 149,720 A 505,505 0 0 1 339,180" fill="none" stroke="#10141a" stroke-width="13"/>
      <path d="M 1131,720 A 505,505 0 0 0 941,180" fill="none" stroke="#10141a" stroke-width="13"/>
      <path class="canopy-arch" d="M 97,720 A 560,560 0 1 1 1183,720" fill="none" stroke="#10141a" stroke-width="34"/>
      <path d="M 255,200 A 545,545 0 0 1 1025,200" fill="none" stroke="rgba(255,244,214,0.30)" stroke-width="5"/>
      <path d="M 81,720 A 575,575 0 1 1 1199,720" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="3"/>
      <path d="M 121,720 A 536,536 0 1 1 1159,720" fill="none" stroke="rgba(120,220,190,0.38)" stroke-width="4"/>
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

    // Ronde 3 (ref-cockpit-clouds): the CENTRE PILLAR — the HUD combiner
    // frame standing in the middle of the windscreen, like the reference:
    // two slim vertical posts + a top crossbar, landing on the panel,
    // with a faint combiner glass between them. It sits ABOVE the HUD
    // canvas (a physical frame occludes the projected symbology), but
    // the posts (x 600-612 / 668-680) pass through the RECON ring's
    // interior without crossing the ring itself, so the ring, the
    // 388 KT / 958 FT flanks and the RECON label all stay readable.
    // (Fix after the first render: the crossbar sat at y 142 and clipped
    // the bottom of the RECON glyphs — the frame top is now y 178, well
    // below the label, and the posts start at y 185 so the ring's top
    // arc passes above them.)
    // Inline styles only — the cockpit CSS lives in index.html, which
    // is outside this round's file boundary.
    this.hudFrame = document.createElement('div');
    this.hudFrame.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    this.hudFrame.innerHTML = `<svg viewBox="0 0 1280 720" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
      <rect x="600" y="185" width="12" height="285" fill="#10141a"/>
      <rect x="668" y="185" width="12" height="285" fill="#10141a"/>
      <rect x="594" y="178" width="92" height="10" fill="#10141a"/>
      <rect x="596" y="180" width="88" height="3" fill="rgba(255,244,214,0.22)"/>
      <rect x="606" y="188" width="68" height="278" fill="rgba(140,220,180,0.05)" stroke="rgba(140,220,180,0.28)" stroke-width="1"/>
    </svg>`;
    root.appendChild(this.hudFrame);

    // instrument panel (bottom of frame). Rev layout, like the reference's
    // three displays, left to right: TAC RADAR | 8 gauges (ADI centre) |
    // ENG / FUEL / SYS (bars over the throttle quadrant). Switches, lamps,
    // yoke, placard and status chips are unchanged.
    this.panel = document.createElement('div');
    this.panel.className = 'cockpit-panel';
    root.appendChild(this.panel);

    // rev: MFD first in the flex row, so the radar sits LEFT like the
    // reference — it is drawn as a circular TAC RADAR scope (see drawMfd).
    // Ronde 2: taller canvas (210) so the scope can grow and the text can
    // breathe — the panel is the reference's big bright display, not a
    // strip of small dark screens. Ronde 3: 224 tall, margin-top 38 (the
    // lamp row moves up to 24) so the displays eat the dead band at the
    // panel bottom; the button strip below covers only empty canvas.
    this.mfdCanvas = document.createElement('canvas');
    this.mfdCanvas.className = 'cockpit-mfd';
    this.mfdCanvas.width = 260;
    this.mfdCanvas.height = 224;
    this.mfdCanvas.style.marginTop = '38px';
    this.panel.appendChild(this.mfdCanvas);

    // gauge canvas: 8 gauges (ronde 2: 740 wide, r 56, taller 210 — the
    // strip is bigger and brighter; see draw() for the layout).
    // Ronde 3: 224 tall like the MFD, so the whole strip reads as one
    // lit display unit instead of dark circles on a black slab.
    this.gaugeCanvas = document.createElement('canvas');
    this.gaugeCanvas.className = 'cockpit-gauges';
    this.gaugeCanvas.width = 740;
    this.gaugeCanvas.height = 224;
    this.gaugeCanvas.style.marginTop = '38px';
    this.panel.appendChild(this.gaugeCanvas);

    // rev: ENG / FUEL / SYS — the reference's right display: THR / FUEL /
    // HULL bars over the throttle quadrant (the quadrant lives inside this
    // panel now, levers shortened so the status chips below still clear).
    // Ronde 3: a GREEN-SCREEN display like the reference's right MFD —
    // green-tinted face + green border + glow — so it reads as a lit
    // screen, not a dark box. (Inline styles: index.html is out of bounds.)
    this.engPanel = document.createElement('div');
    this.engPanel.className = 'cockpit-eng';
    this.engPanel.style.marginTop = '38px';
    this.engPanel.style.background = '#0a1a12';
    this.engPanel.style.border = '1px solid #2a7a4a';
    this.engPanel.style.boxShadow = '0 0 16px rgba(75,232,138,0.28)';
    this.engPanel.innerHTML = `
      <div class="eng-title">ENG / FUEL / SYS</div>
      <div class="eng-row"><span class="eng-label">THR</span><div class="eng-bar"><div class="eng-fill" id="eng-thr"></div></div><span class="eng-val" id="eng-thr-v">0%</span></div>
      <div class="eng-row"><span class="eng-label">FUEL</span><div class="eng-bar"><div class="eng-fill" id="eng-fuel"></div></div><span class="eng-val" id="eng-fuel-v">0%</span></div>
      <div class="eng-row"><span class="eng-label">HULL</span><div class="eng-bar"><div class="eng-fill" id="eng-hull"></div></div><span class="eng-val" id="eng-hull-v">0%</span></div>`;
    this.panel.appendChild(this.engPanel);
    this.engBars = {
      THR: { fill: this.engPanel.querySelector('#eng-thr'), val: this.engPanel.querySelector('#eng-thr-v') },
      FUEL: { fill: this.engPanel.querySelector('#eng-fuel'), val: this.engPanel.querySelector('#eng-fuel-v') },
      HULL: { fill: this.engPanel.querySelector('#eng-hull'), val: this.engPanel.querySelector('#eng-hull-v') },
    };

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
    // (ronde 3: top 24 so it clears the displays' new 38px margin-top)
    this.lampRow = document.createElement('div');
    this.lampRow.className = 'cockpit-lamps';
    this.lampRow.style.top = '24px';
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

    // Ronde 3 (ref-cockpit-clouds: "bawahnya jangan kotak"): the panel
    // bottom was a flat dark slab with only the placard line on it. It
    // is now a DENSE BUTTON STRIP — the reference's rows of small
    // labelled keys under the screens — spanning left + centre (the
    // status chips keep the right corner). The placard text survives
    // as the strip's leading label.
    const btnStrip = document.createElement('div');
    btnStrip.style.cssText = 'position:absolute;bottom:3px;left:14px;right:250px;height:24px;display:flex;gap:4px;align-items:center;';
    const stripLabel = document.createElement('span');
    stripLabel.textContent = 'FALCON-7 · SN 07';
    stripLabel.style.cssText = 'font-size:9px;letter-spacing:1px;color:#5a6472;margin-right:6px;white-space:nowrap;';
    btnStrip.appendChild(stripLabel);
    const litIdx = new Set([1, 4, 6, 11, 15]);
    ['NAV', 'COM', 'IFF', 'TAC', 'RDR', 'FLR', 'GEAR', 'BRK', 'OXY', 'HYD', 'ELEC', 'FUEL', 'ENG', 'AP', 'ALT', 'HDG', 'WPN', 'MSL', 'CHF', 'FLR2'].forEach((lab, i) => {
      const b = document.createElement('span');
      b.textContent = lab;
      b.style.cssText = `flex:1;min-width:0;text-align:center;font-size:8px;font-weight:bold;letter-spacing:0.5px;color:${litIdx.has(i) ? '#4be88a' : '#8a94a2'};background:${litIdx.has(i) ? 'rgba(75,232,138,0.10)' : '#171c24'};border:1px solid ${litIdx.has(i) ? '#2a7a4a' : '#2e3642'};border-radius:2px;padding:4px 0;white-space:nowrap;overflow:hidden;`;
      btnStrip.appendChild(b);
    });
    this.panel.appendChild(btnStrip);

    // yoke (SVG silhouette, bottom centre)
    const yoke = document.createElement('div');
    yoke.className = 'cockpit-yoke';
    yoke.innerHTML = `<svg viewBox="0 0 220 120">
      <path d="M20,30 Q110,10 200,30 L200,62 Q110,44 20,62 Z" fill="#232a33" stroke="#3a4552" stroke-width="2"/>
      <rect x="100" y="52" width="20" height="58" rx="6" fill="#2c3540" stroke="#3a4552" stroke-width="2"/>
      <circle cx="110" cy="38" r="7" fill="#e85d10"/>
    </svg>`;
    this.panel.appendChild(yoke);

    // throttle quadrant: throttle / trim / flaps (rev: inside ENG / FUEL / SYS)
    this.quadrant = document.createElement('div');
    this.quadrant.className = 'cockpit-quadrant';
    this.quadrant.innerHTML = `
      <div class="cq-title">THR · TRIM · FLAPS</div>
      <div class="cq-levers">
        <div class="cq-lever"><div class="cq-track"><div class="cq-knob" id="cq-thr"></div></div><span>THR</span></div>
        <div class="cq-lever"><div class="cq-track"><div class="cq-knob" id="cq-trim"></div></div><span>TRIM</span></div>
        <div class="cq-lever"><div class="cq-track"><div class="cq-knob" id="cq-flp"></div></div><span>FLP</span></div>
      </div>`;
    this.engPanel.appendChild(this.quadrant);
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
    // bezel + face (ronde 2: face lightened so the gauges read bright,
    // like the reference's lit displays, not black holes)
    x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2);
    x.fillStyle = '#12171f'; x.fill();
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
    x.font = 'bold 11px monospace'; x.textAlign = 'center'; x.fillStyle = '#ffd98a';
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

  draw(flight, papiState, lockState, targets, camera, ultraOn, runner) {
    const x = this.gaugeCanvas.getContext('2d');
    const W = this.gaugeCanvas.width, H = this.gaugeCanvas.height;
    x.clearRect(0, 0, W, H);
    // Ronde 3: a LIT display backing, so the whole strip reads as one
    // bright instrument panel (like the reference's centre display),
    // not 8 dark circles floating on a black slab.
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#181f2b');
    bg.addColorStop(1, '#0d1219');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 1;
    for (let gy = 24; gy < H; gy += 24) {
      x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke();
    }
    x.strokeStyle = 'rgba(126,232,255,0.35)'; x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, W - 1, H - 1);
    // ronde 2: bigger gauges (r 56, canvas 740x210) — the strip is the
    // reference's bright middle display, not a row of small dark dials.
    const r = 56;
    const y0 = 106;
    const xs = [42, 133, 224, 315, 406, 497, 588, 679];

    // rev: the centre display is the ADI / HORIZON — header over the
    // horizon ball (gauge 4), like the reference's middle panel.
    x.font = 'bold 13px monospace'; x.textAlign = 'center';
    x.fillStyle = '#3ddc84';
    x.fillText('ADI / HORIZON', xs[3], 14);

    // 1. AIRSPEED (knots, 0-520)
    this.gauge(x, xs[0], y0, r, 'AIRSPEED', (g) => {
      const a = (-Math.PI * 0.75) + (flight.speedKt / 520) * Math.PI * 1.5;
      this.needle(g, r, a);
      g.font = 'bold 18px monospace'; g.fillStyle = '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(flight.speedKt)), 0, r - 34);
    });
    // 2. ALTIMETER (feet, 0-4000)
    this.gauge(x, xs[1], y0, r, 'ALTITUDE', (g) => {
      const a = (-Math.PI * 0.75) + ((flight.altMslFt % 1000) / 1000) * Math.PI * 1.5;
      this.needle(g, r, a);
      const a2 = (-Math.PI * 0.75) + (Math.min(flight.altMslFt, 4000) / 4000) * Math.PI * 1.5;
      this.needle(g, r * 0.55, a2, '#ffd76a', 2);
      g.font = 'bold 18px monospace'; g.fillStyle = '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(flight.altMslFt)), 0, r - 34);
    });
    // 3. HEADING / COMPASS
    this.gauge(x, xs[2], y0, r, 'HEADING', (g) => {
      g.save();
      g.rotate(-flight.heading);
      g.font = 'bold 12px monospace'; g.textAlign = 'center';
      for (const [deg, lab] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) {
        const a = (deg * Math.PI) / 180;
        g.fillStyle = '#e8e4d8';
        g.fillText(lab, Math.sin(a) * (r - 22), -Math.cos(a) * (r - 22) + 4);
      }
      g.restore();
      g.fillStyle = '#ffd76a';
      g.beginPath(); g.moveTo(-5, -(r - 8)); g.lineTo(5, -(r - 8)); g.lineTo(0, -(r - 18)); g.closePath(); g.fill();
      g.font = 'bold 14px monospace'; g.fillStyle = '#7ee8ff';
      g.fillText(String(Math.round(flight.hdgDeg)).padStart(3, '0'), 0, r - 34);
    });
    // 4. ATTITUDE / ADI (artificial horizon) — rev: centre of the strip,
    // under the ADI / HORIZON header, like the reference's middle panel
    this.gauge(x, xs[3], y0, r, 'ADI', (g) => {
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
    // 5. ENGINE RPM % (afterburner zone past 92%)
    this.gauge(x, xs[4], y0, r, 'RPM %', (g) => {
      const rpm = flight.throttle * 100;
      const a = (-Math.PI * 0.75) + (rpm / 100) * Math.PI * 1.5;
      this.needle(g, r, a, flight.afterburner ? '#7ab8ff' : '#ffffff');
      // afterburner arc
      g.strokeStyle = '#7ab8ff'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r - 9, (-Math.PI * 0.75) + 0.92 * Math.PI * 1.5, (-Math.PI * 0.75) + Math.PI * 1.5); g.stroke();
      g.font = 'bold 18px monospace'; g.fillStyle = flight.afterburner ? '#7ab8ff' : '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(rpm)), 0, r - 34);
    });
    // 6. FUEL
    this.gauge(x, xs[5], y0, r, 'FUEL %', (g) => {
      const a = (-Math.PI * 0.75) + (flight.fuel / 100) * Math.PI * 1.5;
      this.needle(g, r, a, flight.fuel < 20 ? '#ff5040' : '#ffffff');
      g.font = 'bold 18px monospace'; g.fillStyle = flight.fuel < 20 ? '#ff5040' : '#7ee8ff'; g.textAlign = 'center';
      g.fillText(String(Math.round(flight.fuel)), 0, r - 34);
    });
    // 7. VSI (fpm, +/-2000)
    this.gauge(x, xs[6], y0, r, 'VSI FPM', (g) => {
      const vsi = flight.vsi * 196.85;
      const a = (-Math.PI * 0.75) + ((vsi + 2000) / 4000) * Math.PI * 1.5;
      this.needle(g, r, a);
      g.font = 'bold 16px monospace'; g.fillStyle = '#7ee8ff'; g.textAlign = 'center';
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
      g.font = 'bold 14px monospace'; g.fillStyle = flight.overG ? '#ff5040' : '#7ee8ff'; g.textAlign = 'center';
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
    // rev: ENG / FUEL / SYS bars (live values, same colours as the HUD)
    const setEng = (key, pct, color) => {
      const b = this.engBars[key];
      b.fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      b.fill.style.background = color;
      b.val.textContent = `${Math.round(pct)}%`;
    };
    setEng('THR', flight.throttle * 100, flight.afterburner ? '#7ab8ff' : '#ffd76a');
    setEng('FUEL', flight.fuel, flight.fuel < 20 ? '#ff5040' : '#35b8c8');
    setEng('HULL', flight.hull, flight.hull < 50 ? '#ff5040' : '#3ddc84');
    this.drawMfd(flight, targets, lk, ultraOn);
    this.drawHudGlass(lk, camera, flight, runner);
  }

  // rev: TAC RADAR — a circular green scope (rings + sweep + blips),
  // like the reference's left display. Heading-up: own ship fixed at the
  // centre pointing up, targets plotted by relative bearing / range.
  // Same tactical content as the v4 MFD (live targets + ally + list).
  drawMfd(flight, targets, lk, ultraOn) {
    const x = this.mfdCanvas.getContext('2d');
    const W = 260, H = 224;
    x.clearRect(0, 0, W, H);
    // Ronde 3: a lit green-screen face (was near-black #071410) — the
    // reference's left MFD is a bright green display, not a dark hole.
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d2417');
    bg.addColorStop(1, '#071410');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#2a7a4a'; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
    x.font = 'bold 13px monospace'; x.textAlign = 'left';
    x.fillStyle = '#4be88a'; x.fillText('TAC RADAR · 4 KM', 8, 18);
    x.fillStyle = '#8ef0ff'; x.textAlign = 'right'; x.fillText('RNG 4KM', W - 8, 18);
    const cx = W / 2, cy = 116, R = 74;
    // scope face
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2);
    x.fillStyle = '#0c2a18'; x.fill();
    // range rings + crosshair
    x.strokeStyle = 'rgba(61,220,132,0.4)'; x.lineWidth = 1;
    for (const r of [R / 3, (2 * R) / 3]) {
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    }
    x.beginPath();
    x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
    x.moveTo(cx, cy - R); x.lineTo(cx, cy + R);
    x.stroke();
    x.strokeStyle = '#3ddc84'; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
    // sweep: fixed at 40° (frozen frame), faint wedge trailing it
    const sa = -Math.PI / 2 + (40 * Math.PI) / 180;
    x.fillStyle = 'rgba(61,220,132,0.07)';
    x.beginPath(); x.moveTo(cx, cy);
    x.arc(cx, cy, R, sa - 0.5, sa); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(61,220,132,0.8)'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R); x.stroke();
    // blips: live targets by relative bearing, 4 km scope
    const RANGE = 4000;
    const plot = (wx, wz) => {
      const dx = wx - flight.pos.x, dz = wz - flight.pos.z;
      const range = Math.hypot(dx, dz);
      if (range > RANGE) return null;
      const rel = Math.atan2(dx, -dz) - flight.heading;
      const rr = (range / RANGE) * (R - 4);
      return [cx + Math.sin(rel) * rr, cy - Math.cos(rel) * rr];
    };
    const diamond = (sx, sy, color, r = 4) => {
      x.strokeStyle = color; x.lineWidth = 2;
      x.beginPath();
      x.moveTo(sx, sy - r); x.lineTo(sx + r, sy); x.lineTo(sx, sy + r); x.lineTo(sx - r, sy);
      x.closePath(); x.stroke();
    };
    if (targets) {
      for (const t of targets) {
        if (!t.alive) continue;
        const p = plot(t.pos.x, t.pos.z);
        if (!p) continue;
        diamond(p[0], p[1], t.id === 'KAIJU-1' ? '#ff8a7a' : '#3ddc84');
      }
    }
    if (ultraOn) {
      const p = plot(-480, 1520);
      if (p) diamond(p[0], p[1], '#7ee8ff', 5);
    }
    // own ship: white triangle, nose up (heading-up scope)
    x.fillStyle = '#ffffff';
    x.beginPath(); x.moveTo(cx, cy - 7); x.lineTo(cx + 5, cy + 6); x.lineTo(cx - 5, cy + 6); x.closePath(); x.fill();
    // target list (2 rows fit under the scope)
    x.font = '12px monospace'; x.textAlign = 'left';
    let ly = 196;
    const rows = [];
    if (targets) {
      for (const t of targets) {
        if (!t.alive) continue;
        const d = flight.pos.distanceTo(t.pos);
        rows.push([`${t.id}`, `${(d / 1000).toFixed(1)} KM`, lk.target === t ? '◄ LOCK' : '']);
      }
    }
    if (ultraOn) rows.push(['ULTRA-1', 'ALLY', 'BEAM']);
    for (const [name, dist, tag] of rows.slice(0, 2)) {
      x.fillStyle = name === 'KAIJU-1' ? '#ff8a7a' : name === 'ULTRA-1' ? '#7ee8ff' : '#e8e4d8';
      x.fillText(name, 8, ly);
      x.fillStyle = '#7ee8ff'; x.textAlign = 'right';
      x.fillText(dist, W - 52, ly);
      x.fillStyle = '#ffd76a';
      x.fillText(tag, W - 8, ly);
      x.textAlign = 'left';
      ly += 13;
    }
  }

  // v4 HUD combiner glass: green symbology over the windscreen —
  // corner brackets + the lock diamond / range / SHOOT at the target's
  // projected position, plus a faint sun glare streak.
  // Rev: + the RECON gate designator — a yellow combiner circle around
  // the real next gate ring (radius from its true distance), with RECON
  // and the live speed / altitude / Mach / G / fuel readouts flanking it,
  // like the reference's green HUD. (The DOM gate labels step aside in
  // cockpit mode; this ring carries the distance instead.)
  drawHudGlass(lk, camera, flight, runner) {
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
    // RECON gate designator on the next gate (live numbers, honest range)
    const nextGate = runner ? runner.nextGatePos() : null;
    if (nextGate && flight && camera) {
      const v = new THREE.Vector3().copy(nextGate).project(camera);
      if (v.z < 1) {
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        const dist = camera.position.distanceTo(nextGate);
        if (dist > 50 && sx > 110 && sx < W - 110 && sy > 70 && sy < 460) {
          const ringR = Math.min(200, (30 / dist) * (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
          const rr = ringR + 16;
          x.strokeStyle = '#ffd76a'; x.lineWidth = 2.5;
          x.beginPath(); x.arc(sx, sy, rr, 0, Math.PI * 2); x.stroke();
          x.beginPath();
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            x.moveTo(sx + dx * (rr + 4), sy + dy * (rr + 4));
            x.lineTo(sx + dx * (rr + 14), sy + dy * (rr + 14));
          }
          x.stroke();
          const gateLabel = runner.nextGate < runner.gates.length
            ? `G-${String(runner.nextGate + 1).padStart(2, '0')}` : 'GATE';
          const mach = flight.speedKt / 661.7;
          x.textAlign = 'center';
          x.font = 'bold 15px monospace'; x.fillStyle = '#6effaa';
          x.fillText('RECON', sx, sy - rr - 14);
          x.font = 'bold 13px monospace'; x.fillStyle = '#ffd76a';
          x.fillText(`${gateLabel} · ${Math.round(dist)} m`, sx, sy + rr + 18);
          // flank readouts, reference layout: speed left, altitude right
          x.font = 'bold 17px monospace'; x.fillStyle = '#6effaa';
          x.textAlign = 'right';
          x.fillText(`${Math.round(flight.speedKt)} KT`, sx - rr - 16, sy - 4);
          x.font = 'bold 13px monospace';
          x.fillText(`M ${mach.toFixed(2)}`, sx - rr - 16, sy + 16);
          x.fillText(`G ${flight.g.toFixed(1)}`, sx - rr - 16, sy + 34);
          x.textAlign = 'left';
          x.font = 'bold 17px monospace';
          x.fillText(`${Math.round(flight.altMslFt)} FT`, sx + rr + 16, sy - 4);
          x.font = 'bold 13px monospace';
          x.fillText(`FUEL ${Math.round(flight.fuel)}%`, sx + rr + 16, sy + 16);
        }
      }
    }
  }

}
