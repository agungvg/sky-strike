// Sky Strike — main loop, cameras, input, screens, mission flow.
// The game is a real playable sim: 6 sorties, fuel/hull/G rules, missile
// lock-on and kills, landing scoring, debriefs and a campaign map.
// ?shot=cover|cockpit|storm|map renders one deterministic dossier frame
// of the live game.
import * as THREE from 'three';
import { PALETTES, MISSIONS, RUNWAY } from './config.js';
import { Sky } from './sky.js';
import { Terrain, groundHeight } from './terrain.js';
import { Clouds } from './clouds.js';
import { buildJet } from './jet.js';
import { Flight, KT } from './flight.js';
import { MissionRunner } from './missions.js';
import { MissileSystem } from './missiles.js';
import { Weather } from './weather.js';
import { Lightning } from './lightning.js';
import { HUD } from './hud.js';
import { Cockpit } from './cockpit.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';
import { clamp } from './random.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.state = 'menu'; // menu | map | fly | debrief | crash | help | shot
    this.shotMode = false;
    this.shotName = '';
    this.cameraMode = 'chase';
    this.chaseOpts = { side: 0.3, dist: 26, height: 7 };
    this.selectedMission = 1;
    this.stars = {}; // mission id -> stars
    this.flown = 0;
    this.paused = false;
    this.time = 0;
    this.frameTimes = [];
    this.events = [];
    this.wasLocked = false;

    // --- renderer ---
    const canvas = $('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // r187: PCFSoftShadowMap removed

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 14000);
    this.camera.position.set(0, 300, 1600);

    // --- world ---
    this.sky = new Sky(this.scene, this.renderer);
    // Warm bounce fill from the sea below: the key sun is ahead of the
    // plane, so without this the chase view reads as a black silhouette.
    this.fill = new THREE.DirectionalLight(0xffc890, 0.85);
    this.scene.add(this.fill);
    this.scene.add(this.fill.target);
    this.terrain = new Terrain(this.scene);
    this.sky.bindWater(this.terrain.waterMat);
    this.clouds = new Clouds(this.scene);
    this.weather = new Weather(this.scene);
    this.lightning = new Lightning(this.scene);

    // --- jet ---
    const built = buildJet();
    this.jetGroup = built.group;
    this.jetGroup.rotation.order = 'YXZ';
    this.jetGroup.position.set(RUNWAY.x, 42, RUNWAY.z + 100);
    this.scene.add(this.jetGroup);
    this.jet = built;

    // --- sim ---
    this.flight = new Flight();
    this.runner = new MissionRunner(this.scene);
    this.missiles = new MissileSystem(this.scene);
    this.audio = new AudioEngine();

    // --- UI ---
    this.hud = new HUD($('hud'));
    this.cockpit = new Cockpit($('cockpit'));
    this.hud.root.style.display = 'none';

    this.buildMapScreen();
    this.bindUI();
    this.bindInput();
    window.addEventListener('resize', () => this.onResize());

    // --- shot mode? ---
    const params = new URLSearchParams(location.search);
    const shot = params.get('shot');
    if (shot) {
      this.state = 'shot';
      this.hideAllScreens();
      this.hud.root.style.display = 'block';
      $('hint').classList.add('hidden');
      if (applyShot(shot, this)) {
        this.renderOnce();
        this.hud.update(0.016, this.hudState());
        if (this.cameraMode === 'cockpit') this.cockpit.draw(this.flight, this.papiState(), this.missiles.lockState(), this.missiles.targets, this.camera, this.missiles.ultraActive());
      }
      window.__ready = true;
      window.__game = this;
      this.loop();
      return;
    }

    window.__game = this;
    this.showMenu();
    this.loop();
  }

  hudState() {
    return {
      flight: this.flight, mission: this.runner.mission || MISSIONS[0],
      runner: this.runner, camera: this.camera, renderer: this.renderer,
      papiState: this.papiState(), lock: this.missiles.lockState(),
      targets: this.missiles.targets, boss: this.missiles.bossTarget(),
      ultra: this.missiles.ultraActive(),
    };
  }

  // ---------- screens ----------
  hideAllScreens() {
    for (const id of ['menu-screen', 'map-screen', 'debrief-screen', 'crash-screen', 'help-screen']) $(id).classList.add('hidden');
  }

  showMenu() {
    this.state = 'menu';
    this.hideAllScreens();
    $('menu-screen').classList.remove('hidden');
    this.hud.root.style.display = 'none';
    $('hint').classList.add('hidden');
    this.updatePilotCards();
    // attract mode: jet parked on the runway, scenic camera
    this.flight.reset();
    this.flight.pos.set(RUNWAY.x, 42, RUNWAY.z + 100);
    this.flight.speed = 0;
    this.runner.start(1, this.flight);
    this.missiles.reset();
    this.missiles.setActive(null);
    this.sky.apply('day', 'day');
    this.weather.setStorm(false);
    this.lightning.auto = false;
    this.setCameraMode('chase');
  }

  showMap(show) {
    if (show) {
      this.state = 'map';
      this.hideAllScreens();
      $('map-screen').classList.remove('hidden');
      this.drawMap();
      this.renderMissionList();
    } else {
      $('map-screen').classList.add('hidden');
    }
  }

  showDebrief(data, opts = {}) {
    this.state = 'debrief';
    $('debrief-title').textContent = data.title || 'TOUCHDOWN CONFIRMED — SORTIE COMPLETE';
    $('debrief-sub').textContent = `${data.missionName || ''} // FALCON-7`;
    $('debrief-grade').textContent = data.grade;
    $('debrief-stars').textContent = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    // v4: medal + itemized +/- breakdown + NEW SESSION BEST
    const medal = $('debrief-medal');
    const medalName = { S: 'GOLD', A: 'SILVER', B: 'BRONZE', C: 'BRONZE' }[data.grade] || 'BRONZE';
    medal.style.display = 'flex';
    $('debrief-medal-name').textContent = medalName;
    $('debrief-medal-score').textContent = `${data.score.toLocaleString('en-US')} pts`;
    const disc = $('debrief-medal-disc');
    disc.className = 'medal-disc' + (medalName === 'SILVER' ? ' silver' : medalName === 'BRONZE' ? ' bronze' : '');
    disc.textContent = medalName === 'GOLD' ? '1' : medalName === 'SILVER' ? '2' : '3';
    const isBest = data.score > (this.bestScore || 0);
    if (isBest) this.bestScore = data.score;
    $('debrief-newbest').style.display = (isBest || data.newBest) ? 'inline-block' : 'none';
    const bd = $('debrief-breakdown');
    const rows = data.breakdown || [];
    if (rows.length) {
      bd.style.display = 'block';
      const fmt = (n) => (n >= 0 ? `+${n.toLocaleString('en-US')}` : `−${Math.abs(n).toLocaleString('en-US')}`);
      bd.innerHTML = rows.map((r) => `<div class="bd-row"><div class="bd-label">${r.label}</div><div class="bd-detail">${r.detail || ''}</div><div class="bd-pts ${r.pts >= 0 ? 'pos' : 'neg'}">${fmt(r.pts)}</div></div>`).join('')
        + `<div class="bd-row total"><div class="bd-label">SORTIE SCORE</div><div class="bd-detail"></div><div class="bd-pts pos">${data.score.toLocaleString('en-US')} pts</div></div>`;
      $('debrief-stats').innerHTML = '';
    } else {
      bd.style.display = 'none';
      const srows = [];
      if (data.sink !== null && data.sink !== undefined) srows.push(['TOUCHDOWN RATE', `${data.sink} FPM`]);
      srows.push(['GATES CLEARED', data.gates]);
      if (data.kills && data.kills !== '0/0') srows.push(['TARGETS DESTROYED', data.kills]);
      srows.push(['FUEL / HULL', `${data.fuel}% / ${data.hull}%`]);
      srows.push(['FLIGHT TIME', data.time]);
      srows.push(['PEAK G', `${data.peakG} G`]);
      srows.push(['TOTAL SCORE', `${data.score.toLocaleString('en-US')} PTS`]);
      $('debrief-stats').innerHTML = srows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
    }
    const screen = $('debrief-screen');
    screen.classList.remove('hidden');
    if (opts.side) screen.classList.add('side');
    else screen.classList.remove('side');
  }

  // Shot 4: map on the left, S debrief on the right, live dusk behind.
  showShot4(data) {
    this.showMap(true);
    $('map-screen').classList.add('shift-left');
    this.showDebrief(data, { side: true });
  }

  showCrash(reason, stats) {
    this.state = 'crash';
    $('crash-reason').textContent = reason;
    $('crash-stats').innerHTML = stats.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
    this.hideAllScreens();
    $('crash-screen').classList.remove('hidden');
  }

  updatePilotCards() {
    const total = Object.values(this.stars).reduce((a, b) => a + b, 0);
    const max = MISSIONS.length * 3;
    $('menu-stars').textContent = `${total} / ${max}`;
    $('menu-flown').textContent = String(this.flown);
    const ms = $('map-stars');
    if (ms) ms.textContent = `${total} / ${max}`;
  }

  // ---------- campaign map ----------
  buildMapScreen() {
    this.mapCanvas = $('map-canvas');
  }

  renderMissionList() {
    const list = $('mission-list');
    list.innerHTML = '';
    MISSIONS.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'mission-row' + (m.id === this.selectedMission ? ' selected' : '');
      const st = this.stars[m.id] || 0;
      row.innerHTML = `<div class="num">${String(m.id).padStart(2, '0')}</div>
        <div class="nm"><div class="t">${m.name}</div><div class="d">${m.brief}</div></div>
        <div class="stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div>`;
      row.addEventListener('click', () => { this.selectedMission = m.id; this.renderMissionList(); });
      row.addEventListener('dblclick', () => this.startMission(m.id));
      list.appendChild(row);
    });
  }

  drawMap() {
    const x = this.mapCanvas.getContext('2d');
    const W = this.mapCanvas.width, H = this.mapCanvas.height;
    // land base (north 2/3), sea (south 1/3)
    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#5a6a4a'); grad.addColorStop(0.6, '#7a8a52'); grad.addColorStop(0.62, '#c8b888'); grad.addColorStop(0.66, '#1e5a6a'); grad.addColorStop(1, '#14424e');
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
    // ridges east/west
    x.fillStyle = '#6a5a48';
    x.beginPath(); x.moveTo(0, 0); x.lineTo(70, 0); x.lineTo(110, H * 0.6); x.lineTo(0, H * 0.6); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(W, 0); x.lineTo(W - 80, 0); x.lineTo(W - 120, H * 0.6); x.lineTo(W, H * 0.6); x.closePath(); x.fill();
    // snow caps north
    x.fillStyle = '#e8e8f0';
    x.beginPath(); x.moveTo(60, 0); x.lineTo(W - 70, 0); x.lineTo(W - 110, 46); x.lineTo(100, 46); x.closePath(); x.fill();
    // glitter path on the sea (sun reflection toward the north)
    x.fillStyle = 'rgba(255,178,106,0.5)';
    x.beginPath(); x.ellipse(W / 2, H * 0.86, 46, 66, 0, 0, Math.PI * 2); x.fill();
    // route line through the gates
    x.strokeStyle = '#ffb020'; x.lineWidth = 2; x.setLineDash([6, 4]);
    x.beginPath();
    const pts = [[150, 1450], [140, 1000], [120, 550], [100, 100], [60, -350], [300, -650], [550, -850]];
    pts.forEach(([wx, wz], i) => {
      const mx = ((wx + 2100) / 4200) * W;
      const my = ((wz + 2100) / 4200) * H;
      if (i === 0) x.moveTo(mx, my); else x.lineTo(mx, my);
    });
    x.stroke(); x.setLineDash([]);
    // runway
    const rx = ((RUNWAY.x + 2100) / 4200) * W;
    const rz = ((RUNWAY.z + 2100) / 4200) * H;
    x.fillStyle = '#23262c';
    x.fillRect(rx - 4, rz - 50, 8, 100);
    x.fillStyle = '#f2f2e8';
    x.fillRect(rx - 1, rz - 50, 2, 100);
    x.fillStyle = '#ffd76a'; x.font = 'bold 11px monospace'; x.textAlign = 'left';
    x.fillText('RWY 36', rx + 8, rz + 4);
    // mission markers: gate-1 positions
    const gate1 = [[150, 1450], [150, 1700], [-300, 1750], [-420, 1900], [-100, 1000], [-700, -600], [-250, 1750]];
    MISSIONS.forEach((m, i) => {
      const [wx, wz] = gate1[i];
      const mx = ((wx + 2100) / 4200) * W;
      const my = ((wz + 2100) / 4200) * H;
      x.beginPath(); x.arc(mx, my, 11, 0, Math.PI * 2);
      x.fillStyle = m.id === this.selectedMission ? '#ffb020' : '#1e3a5f';
      x.fill();
      x.lineWidth = 2; x.strokeStyle = '#ffd76a'; x.stroke();
      x.fillStyle = '#fff'; x.font = 'bold 11px monospace'; x.textAlign = 'center';
      x.fillText(String(m.id), mx, my + 4);
    });
    // strike targets: red diamonds
    for (const t of this.missiles.targets) {
      const mx = ((t.pos.x + 2100) / 4200) * W;
      const my = ((t.pos.z + 2100) / 4200) * H;
      x.strokeStyle = '#ff5040'; x.lineWidth = 2;
      x.beginPath();
      x.moveTo(mx, my - 8); x.lineTo(mx + 8, my); x.lineTo(mx, my + 8); x.lineTo(mx - 8, my);
      x.closePath(); x.stroke();
      x.fillStyle = '#ff8a7a'; x.font = 'bold 9px monospace'; x.textAlign = 'left';
      x.fillText(t.id, mx + 10, my + 3);
    }
    // storm front band (north)
    x.fillStyle = 'rgba(20,24,36,0.55)';
    x.fillRect(0, 0, W, 18);
    x.fillStyle = '#ff6a50'; x.font = 'bold 10px monospace'; x.textAlign = 'center';
    x.fillText('STORM FRONT · 17 KM', W / 2, 13);
    x.fillStyle = '#e8e4d8'; x.font = 'bold 13px monospace'; x.textAlign = 'left';
    x.fillText('COASTAL RANGE', 10, H - 10);
  }

  // ---------- mission flow ----------
  setMission(id, opts = {}) {
    const m = MISSIONS[id - 1];
    this.selectedMission = id;
    this.flight.reset();
    this.flight.fuel = m.fuel;
    this.missiles.reset();
    this.missiles.setActive(m.targets || null);
    // start positions per mission
    if (id === 2) { // Coastal Landing: on the 6° final, south of the runway, over the bay
      this.flight.pos.set(RUNWAY.x, 42 + 121, RUNWAY.z + 1600);
      this.flight.heading = 0; this.flight.speed = 132 * KT; this.flight.throttle = 0.42; this.flight.flaps = 2; this.flight.gear = true;
    } else if (id === 3 || id === 7) { // Sea Strike / KAIJU vs ULTRA: over the bay, ships ahead
      this.flight.pos.set(-300, 320, 1900);
      this.flight.heading = 0; this.flight.speed = 280 * KT; this.flight.throttle = 0.7;
    } else if (id === 4) { // Storm Strike: over the bay, picket ship ahead
      this.flight.pos.set(-420, 320, 1900);
      this.flight.heading = 0; this.flight.speed = 290 * KT; this.flight.throttle = 0.7;
    } else if (id === 5) { // Above the Clouds: below the deck, climbing north
      this.flight.pos.set(-100, 620, 1400);
      this.flight.heading = 0; this.flight.speed = 300 * KT; this.flight.throttle = 0.85;
    } else if (id === 6) { // Night Ridge Strike: over the foothills, radars ahead
      this.flight.pos.set(-700, 800, 400);
      this.flight.heading = 0; this.flight.speed = 300 * KT; this.flight.throttle = 0.7;
    } else { // Gate runs: south end, heading north
      this.flight.pos.set(0, 420, 1600);
      this.flight.heading = 0; this.flight.speed = 260 * KT; this.flight.throttle = 0.75;
    }
    this.runner.start(id, this.flight);
    this.sky.apply(m.weather, m.weather === 'night' ? 'night' : m.weather === 'storm' ? 'storm' : m.weather === 'day' ? 'day' : 'golden');
    this.clouds.setStorm(m.weather === 'storm');
    this.weather.setStorm(m.weather === 'storm', 18, 2.5);
    this.lightning.auto = m.weather === 'storm';
    this.terrain.setPapi('active');
    if (!opts.silent) this.hud.setMission(m, this.flight);
    return m;
  }

  startMission(id) {
    this.setMission(id);
    this.flown += 1;
    this.state = 'fly';
    this.hideAllScreens();
    this.hud.root.style.display = 'block';
    $('hint').classList.remove('hidden');
    this.cockpit.show(this.cameraMode === 'cockpit');
    this.hud.showToast(`${MISSIONS[id - 1].name} — ${MISSIONS[id - 1].brief}`, 3000);
    this.audio.ensure();
  }

  finishMission() {
    const data = this.runner.debrief(this.flight);
    data.missionName = this.runner.mission.name;
    const prev = this.stars[this.runner.mission.id] || 0;
    this.stars[this.runner.mission.id] = Math.max(prev, data.stars);
    this.updatePilotCards();
    this.state = 'debrief';
    this.cockpit.show(false);
    this.showDebrief(data);
    this.audio.blip(1318, 0.2, 0.2);
  }

  failMission(reason) {
    const stats = [
      ['SORTIE', this.runner.mission.name],
      ['GATES', `${this.flight.gatesCleared}/${this.runner.gates.length}`],
      ['KILLS', `${this.flight.kills}/${this.runner.killsNeeded}`],
      ['SCORE', this.flight.score.toLocaleString('en-US')],
      ['FUEL / HULL', `${Math.round(this.flight.fuel)}% / ${Math.round(this.flight.hull)}%`],
      ['FLIGHT TIME', `${Math.floor(this.flight.flightTime / 60)}:${String(Math.floor(this.flight.flightTime % 60)).padStart(2, '0')}`],
    ];
    this.state = 'crash';
    this.cockpit.show(false);
    this.showCrash(reason, stats);
  }

  papiState() {
    // PAPI only reads on the extended centreline, on final, below 800 ft
    // AGL. The Falcon-7 flies a 6-degree jet final.
    if (!this.runner.mission) return 'ACTIVE';
    const f = this.flight;
    const dx = f.pos.x - RUNWAY.threshold.x;
    const dz = f.pos.z - RUNWAY.threshold.z;
    const along = dz; // approach comes from the south (positive z): along > 0 on final
    const aglFt = (f.pos.y - 42) * 3.28084;
    if (along < 0 || along > 3200 || Math.abs(dx) > 80 || aglFt > 800 || aglFt < 25 || along < 120) return 'ACTIVE';
    const glideDeg = THREE.MathUtils.radToDeg(Math.atan2(f.pos.y - 42, along));
    if (Math.abs(glideDeg - 6) < 1.2) return 'LOCK';
    if (glideDeg < 4.5) return 'LOW';
    if (glideDeg > 7.5) return 'HIGH';
    return 'ACTIVE';
  }

  setCameraMode(mode, opts = {}) {
    this.cameraMode = mode;
    if (opts.side !== undefined) this.chaseOpts.side = opts.side;
    if (opts.dist !== undefined) this.chaseOpts.dist = opts.dist;
    if (opts.height !== undefined) this.chaseOpts.height = opts.height;
    document.body.classList.toggle('cockpit-mode', mode === 'cockpit');
    this.cockpit.show(mode === 'cockpit' && (this.state === 'fly' || this.state === 'shot'));
    this.jetGroup.visible = mode !== 'cockpit';
  }

  // ---------- input ----------
  bindUI() {
    $('btn-fly').addEventListener('click', () => this.startMission(this.selectedMission));
    $('btn-map').addEventListener('click', () => this.showMap(true));
    $('btn-help').addEventListener('click', () => { this.hideAllScreens(); $('help-screen').classList.remove('hidden'); });
    $('btn-help-close').addEventListener('click', () => { this.hideAllScreens(); this.showMenu(); });
    $('btn-map-fly').addEventListener('click', () => this.startMission(this.selectedMission));
    $('btn-map-close').addEventListener('click', () => { this.hideAllScreens(); this.showMenu(); });
    $('btn-next').addEventListener('click', () => {
      const next = (this.selectedMission % MISSIONS.length) + 1;
      this.startMission(next);
    });
    $('btn-again').addEventListener('click', () => this.startMission(this.selectedMission));
    $('btn-debrief-map').addEventListener('click', () => this.showMap(true));
    $('btn-retry').addEventListener('click', () => this.startMission(this.selectedMission));
    $('btn-crash-map').addEventListener('click', () => this.showMap(true));
  }

  bindInput() {
    this.keys = {};
    this.mouse = { down: false, dx: 0, dy: 0 };
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      this.audio.ensure();
      if (e.code === 'KeyC' && (this.state === 'fly' || this.state === 'shot')) {
        this.setCameraMode(this.cameraMode === 'chase' ? 'cockpit' : 'chase');
      }
      if (e.code === 'KeyF' && this.state === 'fly') {
        this.flight.flaps = (this.flight.flaps + 1) % 3;
        this.hud.showToast(this.flight.flaps ? `FLAPS ${this.flight.flaps * 15}°` : 'FLAPS UP');
      }
      if (e.code === 'KeyG' && this.state === 'fly') {
        this.flight.gear = !this.flight.gear;
        this.hud.showToast(this.flight.gear ? 'GEAR DOWN' : 'GEAR UP');
      }
      if (e.code === 'KeyM') { const m = this.audio.toggleMute(); this.hud.showToast(m ? 'SOUND OFF' : 'SOUND ON'); }
      if (e.code === 'KeyH') {
        if (this.state === 'fly') { this.state = 'help'; $('help-screen').classList.remove('hidden'); }
        else if (this.state === 'help') { $('help-screen').classList.add('hidden'); this.state = 'fly'; }
      }
      if (e.code === 'KeyP' && this.state === 'fly') {
        this.paused = !this.paused;
        this.hud.showToast(this.paused ? 'PAUSED' : 'RESUMED');
      }
      if (e.code === 'Space' && this.state === 'fly') {
        e.preventDefault();
        this.tryFire();
      }
      if (e.code === 'Enter' && this.state === 'menu') this.startMission(this.selectedMission);
      if (e.code === 'Escape' && (this.state === 'fly')) this.showMap(true);
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    const canvas = $('scene');
    canvas.addEventListener('pointerdown', (e) => {
      this.mouse.down = true; this.mouse.x0 = e.clientX; this.mouse.y0 = e.clientY;
      this.mouse.dx = 0; this.mouse.dy = 0;
      this.audio.ensure();
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.mouse.down) return;
      this.mouse.dx = clamp((e.clientX - this.mouse.x0) / 160, -1, 1);
      this.mouse.dy = clamp((e.clientY - this.mouse.y0) / 160, -1, 1);
    });
    window.addEventListener('pointerup', () => { this.mouse.down = false; this.mouse.dx = 0; this.mouse.dy = 0; });
  }

  tryFire() {
    const status = this.missiles.fire(this.flight);
    if (status === 'fired') {
      this.hud.showToast('MISSILE AWAY', 1500);
      this.audio.launch();
    } else if (status === 'no-lock') {
      this.hud.showToast('NO LOCK — HOLD THE TARGET IN THE DIAMOND', 1800);
    } else {
      this.hud.showToast('RELOADING…', 1200);
    }
  }

  readInput() {
    const k = this.keys;
    const roll = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0) + this.mouse.dx;
    const pitch = ((k.KeyS || k.ArrowDown) ? 1 : 0) - ((k.KeyW || k.ArrowUp) ? 1 : 0) + this.mouse.dy;
    const throttleDelta = ((k.ShiftLeft || k.ShiftRight) ? 0.55 : 0) - ((k.ControlLeft || k.ControlRight) ? 0.55 : 0);
    return { roll: clamp(roll, -1, 1), pitch: clamp(pitch, -1, 1), throttleDelta };
  }

  // ---------- per-frame ----------
  step(dt) {
    this.time += dt;
    const f = this.flight;
    if (this.state === 'fly' && !this.paused) {
      const input = this.readInput();
      f.step(dt, input, { windKt: this.weather.windKt });
      this.events.length = 0;
      this.runner.update(dt, f, this.events);
      this.missiles.update(dt, f, this.events);
      for (const ev of this.events) {
        if (ev.type === 'gate') { this.hud.showToast(`GATE ${ev.index} CLEARED  +${ev.points}`); this.audio.gate(); }
        if (ev.type === 'kill') {
          f.score += ev.points;
          f.kills += 1;
          this.hud.showToast(`TARGET DESTROYED — ${ev.target}  +${ev.points}`, 2600);
          this.audio.explosion();
        }
      }
      // lock tone: one beep the moment the diamond goes solid
      const locked = this.missiles.lock.locked;
      if (locked && !this.wasLocked) this.audio.lockTone();
      this.wasLocked = locked;
      // storm front closes the coast
      if (this.runner.mission.weather === 'storm' && this.runner.frontEtaSec <= 0 && !this.runner.isComplete(f)) {
        this.failMission('STORM FRONT CLOSED THE COAST');
      }
      if (f.crashed) this.failMission(f.crashReason);
      else if (this.runner.isComplete(f)) this.finishMission();
      else if (f.landed) this.finishMission();
      this.audio.update(f.throttle, f.speedKt, true, f.afterburner);
      this.terrain.setPapi(this.papiState());
    } else if (this.state === 'menu' || this.state === 'map' || this.state === 'shot') {
      this.audio.update(0, 0, false);
    }
    // afterburner flame follows the throttle in every state (the cover
    // shot needs it lit on a frozen frame)
    const abLevel = f.afterburner ? 1 : f.throttle > 0.75 ? 0.35 : 0.12;
    this.jet.setAfterburner(abLevel, this.time);
    this.jet.gear.visible = f.gear;
    // world always animates (frozen in shot mode)
    if (!this.shotMode) {
      this.clouds.update(dt);
      this.terrain.update(this.time, dt);
      this.weather.update(dt, f.pos.x, f.pos.y, f.pos.z);
      this.lightning.update(dt);
    }
    this.sky.follow(f.pos.x, f.pos.z);
    // bounce fill follows the palette: cool daylight fill for the day
    // look, warm for golden hour, dim for storm/night — without it the
    // chase view reads as a black silhouette against the bright sky
    const pal = this.sky.paletteName;
    if (pal === 'day') { this.fill.color.setHex(0xd8e8ff); this.fill.intensity = 1.1; }
    else if (pal === 'storm') { this.fill.color.setHex(0x8a93a8); this.fill.intensity = 0.4; }
    else if (pal === 'night') { this.fill.color.setHex(0x8fa0d8); this.fill.intensity = 0.5; }
    else { this.fill.color.setHex(0xffc890); this.fill.intensity = 0.85; }
    // bounce fill: from behind-above the camera, onto the jet
    this.fill.position.set(this.camera.position.x, this.camera.position.y + 300, this.camera.position.z + 400);
    this.fill.target.position.copy(f.pos);
    // jet transform — the model is built nose-at-+Z, so yaw by PI - heading
    // to point the nose along the flight direction (was -heading: the jet
    // flew tail-first and the chase camera stared at its dark nose).
    this.jetGroup.position.copy(f.pos);
    this.jetGroup.rotation.y = Math.PI - f.heading;
    this.jetGroup.rotation.x = -f.pitch;
    this.jetGroup.rotation.z = f.roll;
    // cameras
    this.updateCamera(dt);
    // HUD + cockpit
    if (this.state === 'fly' || this.state === 'shot') {
      this.hud.update(dt, this.hudState());
      if (this.cameraMode === 'cockpit') this.cockpit.draw(f, this.papiState(), this.missiles.lockState(), this.missiles.targets, this.camera, this.missiles.ultraActive());
    }
  }

  updateCamera(dt) {
    const f = this.flight;
    const fwd = new THREE.Vector3(Math.sin(f.heading), 0, -Math.cos(f.heading));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    if (this.cameraMode === 'cockpit') {
      const eye = f.pos.clone().addScaledVector(fwd, 3.0).add(new THREE.Vector3(0, 1.35, 0));
      const look = f.pos.clone().addScaledVector(fwd, 120);
      look.y += Math.sin(f.pitch) * 120 + 1.35;
      if (this.shotMode) { this.camera.position.copy(eye); this.camera.lookAt(look); }
      else {
        this.camera.position.lerp(eye, Math.min(1, dt * 14));
        this.camera.lookAt(look);
      }
      this.camera.rotation.z = -f.roll * 0.55;
      return;
    }
    // chase: 3/4 rear, slightly to the side, banked with the jet
    const o = this.chaseOpts;
    const back = f.pos.clone()
      .addScaledVector(fwd, -o.dist)
      .addScaledVector(right, o.side * o.dist * 0.5)
      .add(new THREE.Vector3(0, o.height, 0));
    const look = f.pos.clone().addScaledVector(fwd, 34).add(new THREE.Vector3(0, 4, 0));
    if (this.shotMode || this.state === 'menu') {
      this.camera.position.copy(back);
    } else {
      this.camera.position.lerp(back, Math.min(1, dt * 5));
    }
    this.camera.lookAt(look);
    this.camera.rotation.z += -f.roll * 0.22;
  }

  renderOnce() {
    this.step(0.016);
    this.renderer.render(this.scene, this.camera);
  }

  loop() {
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      if (!this.shotMode) {
        this.frameTimes.push(dt * 1000);
        if (this.frameTimes.length > 240) this.frameTimes.shift();
      }
      this.step(dt);
      this.renderer.render(this.scene, this.camera);
      if (this.shotMode) {
        this.framesRendered = (this.framesRendered || 0) + 1;
        if (this.framesRendered === 30) {
          console.log(`[shot:${this.shotName}] rendered ${this.framesRendered} frames`);
          window.__shotDone = true;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

new Game();
