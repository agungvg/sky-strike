// Sky Strike — shared constants, palettes and mission definitions.
// One sun direction drives the sky shader, the key light, the fog colour
// and the cloud tint, so the whole frame agrees about where the sun is.
export const WORLD = {
  size: 4200,          // play area, metres, centred on 0,0
  waterY: 2,           // sea level
  snowLine: 900,       // metres: above this, snow (v4: was 700 — the mid-peaks went pale white in bright day; 900 keeps them green)
  rockSlope: 0.55,     // slope above this reads as rock
  coastZ: 1180,        // the shoreline: sea south of this, land north
};

// Sun directions are unit vectors pointing TOWARD the sun.
export const SUN = {
  golden: { x: -0.42, y: 0.32, z: -0.88 },   // low, ahead-left, over the peaks — high enough to clear the ridge (was y 0.20: the disc sat half-hidden behind the peaks)
  day:    { x: -0.35, y: 0.35, z: -0.75 },   // v4: bright-day sun, north-west — low enough that the disc sits in the cover frame (~23 deg elevation), lights the jet and the green terrain, glitter on the turquoise sea
  storm:  { x: -0.25, y: 0.12, z: -0.92 },
  night:  { x: 0.30,  y: 0.40, z: -0.55 },
};

export const PALETTES = {
  // v4 DAY: bright blue-gradient sky, thin haze, turquoise sea + white
  // sun glitter — the ref2 "lighter render" look. Golden hour is kept
  // for the storm/clouds moods, but the dossier shots are all day.
  day: {
    zenith: 0x2f7fe0, horizon: 0xbfe3f5, mid: 0x7fb8e8, sun: 0xfff2b0, sunCore: 0xffffff,
    fog: 0xaed6ea, fogDensity: 0.00028,
    key: 0xfff2d0, keyIntensity: 2.9, hemiSky: 0x9cc8ee, hemiGround: 0x6a8a5a, hemi: 0.9,
    cloudTop: 0xffffff, cloudBottom: 0xd8e4ee, cloudOpacity: 0.95,
    water: 0x1490a8, waterDeep: 0x0e6f8a, waterShallow: 0x35b8c8, waterGlitter: 0xfff2c0,
    exposure: 1.05,
  },
  golden: {
    zenith: 0x3d3678, horizon: 0xff9a4d, mid: 0xd95f7e, sun: 0xffd27a, sunCore: 0xfff3c4,
    fog: 0xf08a4a, fogDensity: 0.00042,
    key: 0xffb36b, keyIntensity: 2.7, hemiSky: 0x8a7fd6, hemiGround: 0x5a3a28, hemi: 0.85,
    cloudTop: 0xffd9b0, cloudBottom: 0xff9d7a, cloudOpacity: 0.85,
    water: 0x103e52, waterGlitter: 0xffb36b,
    exposure: 1.10,
  },
  storm: {
    zenith: 0x090c16, horizon: 0x272d3d, mid: 0x202635, sun: 0x8a93a8, sunCore: 0xb9c0d0,
    fog: 0x20242f, fogDensity: 0.0011,
    key: 0x9aa4b8, keyIntensity: 0.55, hemiSky: 0x3a4358, hemiGround: 0x1a1d24, hemi: 0.5,
    cloudTop: 0x3c4356, cloudBottom: 0x12161f, cloudOpacity: 0.95,
    water: 0x0c1820, waterGlitter: 0x5a6a7a,
    exposure: 0.95,
  },
  night: {
    zenith: 0x04050e, horizon: 0x182238, mid: 0x121a30, sun: 0xcfd8ff, sunCore: 0xffffff,
    fog: 0x101728, fogDensity: 0.0007,
    key: 0x8fa0d8, keyIntensity: 0.5, hemiSky: 0x2a3358, hemiGround: 0x0d0f16, hemi: 0.45,
    cloudTop: 0x2c3450, cloudBottom: 0x11131e, cloudOpacity: 0.9,
    water: 0x09121c, waterGlitter: 0x8fa0d8,
    exposure: 0.9,
  },
  clouds: { // sortie 05: above the deck, sun still golden
    zenith: 0x3d3678, horizon: 0xffa85e, mid: 0xd95f7e, sun: 0xffd27a, sunCore: 0xfff6cf,
    fog: 0xff9a55, fogDensity: 0.00030,
    key: 0xffb36b, keyIntensity: 2.9, hemiSky: 0x9a8ad6, hemiGround: 0x6a4a34, hemi: 0.95,
    cloudTop: 0xffe9c4, cloudBottom: 0xffab7a, cloudOpacity: 0.95,
    water: 0x103e52, waterGlitter: 0xffb36b,
    exposure: 1.14,
  },
};

export const JET = {
  name: 'FALCON-7',
  callsign: 'SKY STRIKE',
  stallKt: 78,       // clean stall; flaps lower it
  stallKtFlaps: 62,
  maxG: 6.0,         // jets pull harder; over-G still damages the airframe
  cruiseKt: 300,
  maxKt: 420,
  maxKtAB: 520,      // afterburner
  climbFpm: 2600,
  fuelBurnPerMin: 0.5, // % per minute at full throttle (x2 in afterburner)
};

export const MISSIONS = [
  {
    id: 1, name: 'COASTAL GATE RUN', code: 'GATE RUN', type: 'gates',
    brief: 'Thread 7 gold gates from the sea to the peaks. Smooth wins — hard banks cost G.',
    par: '7:00', gates: 7, fuel: 74, weather: 'day', reward: 1200,
  },
  {
    id: 2, name: 'COASTAL LANDING', code: 'LANDING', type: 'landing',
    brief: 'Final approach RWY 36 over the bay. Touch down soft, on the centreline, flaps set.',
    par: '6:00', gates: 2, fuel: 61, weather: 'day', reward: 1400,
  },
  {
    id: 3, name: 'SEA STRIKE', code: 'STRIKE', type: 'strike',
    brief: 'Lock the warships off the coast and sink both. Lock tone, then SHOOT — one missile each.',
    par: '8:00', gates: 2, fuel: 69, weather: 'day', reward: 2200, targets: ['WARSHIP-1', 'WARSHIP-2', 'KAIJU-1'],
  },
  {
    id: 4, name: 'STORM STRIKE', code: 'STORM', type: 'strike',
    brief: 'Sink the picket ship before the front closes the coast. Rain, gusts, lightning — and a hard deck.',
    par: '8:00', gates: 1, fuel: 57, weather: 'storm', frontEtaSec: 151, reward: 2600, targets: ['WARSHIP-1'],
  },
  {
    id: 5, name: 'ABOVE THE CLOUDS', code: 'CLOUDS', type: 'gates',
    brief: 'Climb through the deck and run the high gates in the bright sun, afterburner lit.',
    par: '7:30', gates: 5, fuel: 71, weather: 'day', reward: 1700,
  },
  {
    id: 6, name: 'NIGHT RIDGE STRIKE', code: 'NIGHT', type: 'strike',
    brief: 'Night run on the mountain radar towers. Landing lights on, watch the ridges — two locks, two kills.',
    par: '8:00', gates: 1, fuel: 63, weather: 'night', reward: 2800, targets: ['RADAR-1', 'RADAR-2'],
  },
  {
    id: 7, name: 'KAIJU vs ULTRA', code: 'ULTRA', type: 'strike',
    brief: 'ULTRA-1, the Guardian of Light, is fighting KAIJU-1 on the beach. Cover him — sink WARSHIP-1, then put missiles into the kaiju while the beam holds it.',
    par: '8:00', gates: 2, fuel: 69, weather: 'day', reward: 3000, targets: ['WARSHIP-1', 'KAIJU-1'],
  },
];

export const RUNWAY = {
  x: 150, z: 350, headingDeg: 0, length: 900, width: 30,
  // threshold (south end, RWY 36 approach from the south, over the bay)
  threshold: { x: 150, z: 800 },
};

// Strike targets: two warships at sea, two radar towers in the peaks.
// Positions are world-fixed so the lock-on, the radar and the selftest agree.
export const TARGETS = [
  { id: 'WARSHIP-1', name: 'WARSHIP-1', kind: 'ship', x: -420, z: 1620, y: 6 },
  { id: 'WARSHIP-2', name: 'WARSHIP-2', kind: 'ship', x: 520, z: 1760, y: 6 },
  { id: 'RADAR-1', name: 'RADAR-1', kind: 'radar', x: -760, z: -980 },
  { id: 'RADAR-2', name: 'RADAR-2', kind: 'radar', x: 680, z: -1250 },
  // KAIJU-1: the sea boss off the coast. x/z is the body anchor at sea
  // level; the lock / hit point is computed from the chest in missiles.js
  // (the 3x-scaled model puts it ~86 m up, on the south face).
  { id: 'KAIJU-1', name: 'KAIJU-1', kind: 'kaiju', x: -350, z: 1450, y: 2 },
];

// Seeded world constants so every load builds the same coast.
export const SEED = 20261127;
