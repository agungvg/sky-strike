// Sky Strike — make.fun entry hand-in (Node 22, standard library only).
//
// What this program does, in plain terms: it takes this directory's game/
// folder (the Sky Strike fighter-jet game — plain static files a desktop
// browser loads offline: game/index.html and its ES modules, Three.js
// vendored under game/vendor/, no network request anywhere) and the
// screenshots/ folder beside it, copies both into the output directory
// the grader gives us (/output, or MAKEFUN_OUTPUT_DIR when we run it by
// hand), and writes /output/dossier.json — the summary the judge reads —
// using make.fun's own vendored library (vendor/makefun-game.ts, copied
// from the kit unchanged).
//
// Before it copies anything it runs a preflight: it walks game/ and
// screenshots/, counts files and bytes, and refuses to hand in a bundle
// the scorer would refuse (too many files, too many bytes, a screenshot
// over 256 KiB, a missing index.html). A failed preflight exits non-zero
// with the reason on stderr, so a bad bundle never looks like a good one.
//
// Run it by hand:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game locally first with `node serve.ts` (http://localhost:8080),
// and re-shoot the dossier frames with `node tools/shoot.mjs`.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (from the kit's reference/gate.json): only
// text_max_bytes shapes the dossier text; the others refuse an entry the
// scorer would refuse — more than 4 screenshots or one over 256 KiB, more
// than 993 files in game/ or 48 MiB of game files in all, or a path under
// game/ over 1000 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`sky-strike main.ts: PREFLIGHT FAILED — ${message}`);
  process.exit(1);
}

// Walk a directory tree and return [fileCount, totalBytes, longestPath].
function walk(dir, prefix = '') {
  let files = 0;
  let bytes = 0;
  let longest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const [f, b, l] = walk(full, rel);
      files += f; bytes += b; longest = Math.max(longest, l);
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(full).size;
      longest = Math.max(longest, Buffer.byteLength(rel, 'utf8'));
    } else {
      fail(`unsupported entry under game/: ${rel} (no symlinks, no devices)`);
    }
  }
  return [files, bytes, longest];
}

function preflight() {
  const gameDir = join(here, 'game');
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');
  const [gameFiles, gameBytes, longestPath] = walk(gameDir);
  if (gameFiles > CAPS.game_max_files) fail(`game/ has ${gameFiles} files (cap ${CAPS.game_max_files})`);
  if (gameBytes > CAPS.game_max_bytes) fail(`game/ is ${gameBytes} bytes (cap ${CAPS.game_max_bytes})`);
  if (longestPath > CAPS.game_path_max_bytes) fail(`a game/ path is ${longestPath} bytes (cap ${CAPS.game_path_max_bytes})`);
  const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    fail(`screenshots/ has ${shots.length} files (need 3-4)`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > CAPS.screenshots.max_bytes) fail(`screenshots/${name} is ${size} bytes (cap ${CAPS.screenshots.max_bytes})`);
  }
  return { gameFiles, gameBytes, shots };
}

const summary = preflight();
console.log(`sky-strike: preflight OK — game/ ${summary.gameFiles} files, ${(summary.gameBytes / 1048576).toFixed(2)} MiB; screenshots: ${summary.shots.join(', ')}`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
console.log(`sky-strike: wrote ${join(out, 'dossier.json')}`);
