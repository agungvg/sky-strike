// Seeded RNG + value noise. The whole coast is built from one seed, so
// every load — and every screenshot — shows the same mountains and sea.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 2D value noise with fBm, deterministic per (x, z).
export function makeNoise(seed) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rand() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * (3 - 2 * t);
  function lattice(ix, iz) {
    return perm[(perm[ix & 255] + iz) & 255] / 255;
  }
  function noise2(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const a = lattice(ix, iz), b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1), d = lattice(ix + 1, iz + 1);
    const u = fade(fx), v = fade(fz);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  return function fbm(x, z, octaves = 4) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise2(x * freq, z * freq) * amp;
      norm += amp; amp *= 0.5; freq *= 2.03;
    }
    return sum / norm;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
