// Measures where each Live2D recording's figure sits against its still, into
// scripts/lib/l2d-fit.json, which the operator build puts on each art piece as `l2dFit`. Run by
// hand after a build that added animations, then build again:
//
//   node scripts/measure-l2d-fit.mjs          the recordings with no entry yet
//   node scripts/measure-l2d-fit.mjs --force  every one again
//
// The recordings (the wiki's screen captures, ArknightsSpines' renders) are framed by the game's
// camera, not by the illustration: on 26 November 2026 the figure in them was drawn at 0.68 to
// 1.07 of the still's size and up to 20% of the box off it, so the still behind the animation
// showed a second figure beside the moving one. An entry is [k, dx, dy]: the recording drawn at
// k times its size and moved dx, dy percent of its box puts its figure on the still's, which is
// CSS's `translate(dx%, dy%) scale(k)` about the centre.
//
// It needs a browser to decode WebM (the Chrome or Edge on the machine, or CHROME_PATH), with web
// security off so that a frame of a video from another host can be read back. The first frame of
// each recording is matched to the still at 160px, by the colour of the recording's opaque
// pixels, over a coarse grid of k, dx and dy and then a fine one round the best.
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DETAILS = path.join(ROOT, 'src', 'shared', 'generated', 'operator-details');
const OUT = path.join(ROOT, 'scripts', 'lib', 'l2d-fit.json');
const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

// A recording's key in the table: its file name, without the wiki's cache-busting query. The
// operator build keys it the same way.
const fitKey = url => decodeURIComponent(new URL(url).pathname.split('/').pop());

const force = process.argv.includes('--force');
const fits = existsSync(OUT) && !force ? JSON.parse(await readFile(OUT, 'utf8')) : {};
const todo = new Map();
for (const file of await readdir(DETAILS)) {
  const op = JSON.parse(await readFile(path.join(DETAILS, file), 'utf8'));
  for (const art of op.arts ?? []) {
    if (art.l2d && !(fitKey(art.l2d) in fits)) todo.set(fitKey(art.l2d), { still: art.url, video: art.l2d });
  }
}
console.log(`l2d fit: ${todo.size} to measure`);

const executablePath = BROWSERS.find(candidate => candidate && existsSync(candidate));
if (!executablePath) throw new Error('no Chrome or Edge found: set CHROME_PATH');
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage();

for (const [key, pair] of todo) {
  try {
    fits[key] = await page.evaluate(measure, pair);
    console.log(`  ${key}: ${fits[key].join(', ')}`);
  } catch (e) {
    console.warn(`  ${key}: ${e.message ?? e}`);
  }
}
await browser.close();

const sorted = Object.fromEntries(Object.entries(fits).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(OUT, `${JSON.stringify(sorted, null, 1)}\n`);
console.log(`l2d fit: ${Object.keys(sorted).length} in ${path.relative(ROOT, OUT)}`);

// Runs in the page. Returns [k, dx, dy].
async function measure({ still, video }) {
  const N = 160;
  const loaded = (el, event) => new Promise((ok, fail) => {
    el.addEventListener(event, ok, { once: true });
    el.addEventListener('error', () => fail(new Error(`${event}: ${el.src}`)), { once: true });
  });
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = still;
  await loaded(img, 'load');
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous';
  v.muted = true;
  v.src = video;
  await loaded(v, 'loadeddata');
  v.currentTime = 0.01;
  await loaded(v, 'seeked');

  // Each drawn into an N x N box as object-fit: contain draws it.
  const pixels = (src, w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const s = Math.min(N / w, N / h);
    g.drawImage(src, (N - w * s) / 2, (N - h * s) / 2, w * s, h * s);
    return g.getImageData(0, 0, N, N).data;
  };
  const S = pixels(img, img.naturalWidth, img.naturalHeight);
  const V = pixels(v, v.videoWidth, v.videoHeight);
  const points = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      if (V[i + 3] > 230) points.push([x, y, V[i], V[i + 1], V[i + 2]]);
    }
  }
  const c = N / 2;
  // The mean colour distance from each opaque pixel of the recording to where it lands on the
  // still; landing outside the still, or on its transparency, costs as much as a bad match.
  const cost = (k, dx, dy) => {
    let sum = 0;
    for (const [x, y, r, g, b] of points) {
      const qx = Math.round(c + k * (x - c) + dx);
      const qy = Math.round(c + k * (y - c) + dy);
      const j = (qy * N + qx) * 4;
      sum += qx < 0 || qy < 0 || qx >= N || qy >= N || S[j + 3] < 128
        ? 200
        : Math.abs(S[j] - r) + Math.abs(S[j + 1] - g) + Math.abs(S[j + 2] - b);
    }
    return sum / points.length;
  };
  let best = [Infinity, 1, 0, 0];
  const search = (k0, k1, kStep, x0, x1, y0, y1, step) => {
    for (let k = k0; k <= k1; k += kStep) {
      for (let dx = x0; dx <= x1; dx += step) {
        for (let dy = y0; dy <= y1; dy += step) {
          const e = cost(k, dx, dy);
          if (e < best[0]) best = [e, k, dx, dy];
        }
      }
    }
  };
  search(0.6, 1.45, 0.02, -36, 36, -36, 36, 2);
  const [, k, x, y] = best;
  search(k - 0.02, k + 0.02, 0.005, x - 2, x + 2, y - 2, y + 2, 0.5);
  const round = (n, places) => Number(n.toFixed(places));
  return [round(best[1], 3), round((best[2] / N) * 100, 2), round((best[3] / N) * 100, 2)];
}
