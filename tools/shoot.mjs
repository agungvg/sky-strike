// Shoot the 4 dossier frames of Sky Strike, headless.
// Serves game/ on 127.0.0.1, opens each ?shot= URL in the Playwright
// chrome-headless-shell (SwiftShader WebGL), screenshots 1280x720, then
// converts to JPEG (<=256 KiB) for screenshots/ and keeps a PNG copy for
// preview-png/ (the phone-friendly preview).
//
// SUPERSAMPLING (Lyso 2026-11-27: the 1:1 frames looked rough): the
// renderer is antialias:true, but headless SwiftShader gives practically
// no MSAA on the default framebuffer, so low-poly edges stair-stepped.
// Chrome therefore renders at 2560x1440 and PIL downscales to 1280x720
// with LANCZOS — the downscale IS the anti-aliasing. No look/theme change.
//
//   node tools/shoot.mjs            (all 4 shots)
//   node tools/shoot.mjs cover      (one shot)
//   node tools/shoot.mjs --port 8912 --budget 20000
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = ['cover', 'cockpit', 'storm', 'map'];
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;

const args = process.argv.slice(2);
const wanted = args.filter((a) => !a.startsWith('--'));
const portIdx = args.indexOf('--port');
const port = portIdx === -1 ? 8912 : Number(args[portIdx + 1]);
const budgetIdx = args.indexOf('--budget');
const budget = budgetIdx === -1 ? 20000 : Number(args[budgetIdx + 1]);
const shots = wanted.length ? wanted.filter((s) => SHOTS.includes(s)) : SHOTS;
if (!shots.length) { console.error('unknown shot; want one of: ' + SHOTS.join(', ')); process.exit(1); }
if (!existsSync(CHROME)) { console.error('chrome-headless-shell not found at ' + CHROME); process.exit(1); }

const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: here, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(300);
  }
  throw new Error('serve.ts did not come up');
}

function downscalePng(pngPath) {
  // Chrome renders at 2560x1440 (supersampling); downscale to the 1280x720
  // dossier frame with PIL LANCZOS and overwrite in place. This downscale
  // is what smooths the edges SwiftShader's missing MSAA leaves behind.
  const py = `
import sys
from PIL import Image
src = sys.argv[1]
im = Image.open(src).convert('RGB')
if im.size != (1280, 720):
    im = im.resize((1280, 720), Image.LANCZOS)
    im.save(src)
    print(f"downscaled {src} to 1280x720 LANCZOS")
else:
    print(f"{src} already 1280x720")
`;
  execFileSync('python3', ['-c', py, pngPath], { stdio: 'inherit' });
}

function toJpeg(pngPath, jpgPath) {
  // PIL: downscale defensively (in case the PNG is still 2560), then
  // re-encode, stepping quality down until the file fits the cap.
  const py = `
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
if im.size != (1280, 720):
    im = im.resize((1280, 720), Image.LANCZOS)
for q in (90, 85, 80, 75, 70, 60):
    im.save(dst, 'JPEG', quality=q, optimize=True)
    import os
    if os.path.getsize(dst) <= 262144:
        print(f"{dst} quality={q} bytes={os.path.getsize(dst)}")
        break
else:
    print(f"STILL OVER CAP: {dst} bytes={os.path.getsize(dst)}")
    sys.exit(1)
`;
  execFileSync('python3', ['-c', py, pngPath, jpgPath], { stdio: 'inherit' });
}

let code = 0;
try {
  await waitForServer();
  mkdirSync(join(here, 'screenshots'), { recursive: true });
  mkdirSync(join(here, 'preview-png'), { recursive: true });
  for (const [i, shot] of shots.entries()) {
    const n = SHOTS.indexOf(shot) + 1; // canonical number, even for a partial shoot
    const png = join(here, 'preview-png', `${n}-${shot}.png`);
    const jpg = join(here, 'screenshots', `${n}-${shot}.jpg`);
    console.log(`--- shot ${i + 1}/${shots.length}: ${shot} (budget ${budget}ms virtual)`);
    const r = spawn(CHROME, [
      '--headless', '--no-sandbox',
      '--use-gl=angle', '--use-angle=swiftshader',
      '--window-size=2560,1440', '--hide-scrollbars',
      `--virtual-time-budget=${budget}`,
      `--screenshot=${png}`,
      `http://127.0.0.1:${port}/index.html?shot=${shot}`,
    ], { stdio: 'inherit' });
    await new Promise((resolve) => r.on('exit', resolve));
    if (!existsSync(png)) { console.error(`no PNG produced for ${shot}`); code = 1; continue; }
    downscalePng(png);
    toJpeg(png, jpg);
  }
} catch (e) {
  console.error(e.message);
  code = 1;
} finally {
  server.kill();
}
process.exit(code);
