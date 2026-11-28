// Checks that each Path to Nowhere animated picture's recording sits on its still: same place,
// same size. For every animated picture on a Sinner's wall it turns Live2D on, holds the
// recording on its first frame and shoots the picture's box, then hides the recording and shoots
// the still in the same box. It then searches the scale and shift that best lay the recording's
// shot over the still's; a recording that fits needs none. It also checks that turning Live2D off
// takes the recording away and shows the still.
//
//   node scripts/l2d-check.mjs <site-url> [sinner-id ...] [--spa] [--out <dir>]
//        <site-url> is the site's root, the deployed one (https://seangcs27.github.io/dossier/)
//        or a local build served over http; --spa for the webpack build's hash routes.
//        With no ids, every Sinner whose payload in src/shared/generated has a recording.
//        --out keeps each pair of shots there.
//
// Exits 1 if a picture is off by more than SCALE_TOLERANCE or SHIFT_TOLERANCE, or if the switch
// fails. Needs Chrome or Edge (CHROME_PATH names one): the recordings are H.264 MP4s. Fetches
// each recording from the wiki, 5 to 33 MB each, so a full run is about 1 GB and some minutes.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const SCALE_TOLERANCE = 0.04; // 4% larger or smaller
const SHIFT_TOLERANCE = 0.03; // 3% of the picture's width or height
// Pictures whose recording moves off the still by design, by the picture's title.
const KNOWN = new Map([['Azure Waltz in Solace', 'its only recording, the greeting, zooms its own camera']]);
const GAIN = 2; // grey levels the best fit has to gain over the picture as it is
const WIDTH = 160; // the shots are compared at this width

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const args = process.argv.slice(2);
const spa = args.includes('--spa');
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args[outAt + 1] : null;
const [site, ...named] = args.filter((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1));
if (!site) {
  console.error('usage: node scripts/l2d-check.mjs <site-url> [sinner-id ...] [--spa] [--out <dir>]');
  process.exit(2);
}

function animatedSinners() {
  const dir = 'src/shared/generated/ptn/sinner-details';
  return readdirSync(dir).filter(f => f.endsWith('.json')).filter(f => {
    try {
      return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).arts?.some(a => a.motions?.length);
    } catch {
      console.warn(`l2d-check: ${f} is not JSON, skipped`);
      return false;
    }
  }).map(f => f.slice(0, -5));
}

// Grey levels, and where the picture is: the still is shot over magenta, so its art is every
// pixel that is not. A recording on a card (white, a colour) is then compared on the art alone.
async function grey(png) {
  const { data, info } = await sharp(png).resize({ width: WIDTH }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const g = new Float32Array(n);
  const art = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [r, gr, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    g[i] = 0.3 * r + 0.59 * gr + 0.11 * b;
    art[i] = Number(255 - r + gr + 255 - b > 90);
  }
  return { g, art, w: info.width, h: info.height };
}

// Mean difference over the still's art of the still and the recording's shot scaled by s about
// its centre and moved by (dx, dy) pixels. Art the shot does not reach counts as far off.
function score(still, shot, s, dx, dy) {
  const { w, h } = still;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < h; y += 2) {
    const sy = Math.round((y - h / 2 - dy) / s + h / 2);
    for (let x = 0; x < w; x += 2) {
      if (!still.art[y * w + x]) continue;
      const sx = Math.round((x - w / 2 - dx) / s + w / 2);
      sum += sx < 0 || sx >= w || sy < 0 || sy >= h ? 128 : Math.abs(still.g[y * w + x] - shot.g[sy * w + sx]);
      n++;
    }
  }
  return n ? sum / n : Infinity;
}

// The scale and shift that best lay the shot over the still.
function bestFit(still, shot) {
  const reach = Math.round(still.w * 0.12);
  const asIs = score(still, shot, 1, 0, 0);
  let best = { mad: asIs, s: 1, dx: 0, dy: 0 };
  for (let i = -15; i <= 15; i++) {
    const s = 1 + i / 100;
    for (let dy = -reach; dy <= reach; dy += 2) {
      for (let dx = -reach; dx <= reach; dx += 2) {
        const mad = score(still, shot, s, dx, dy);
        if (mad < best.mad) best = { mad, s, dx, dy };
      }
    }
  }
  // Again by single pixels and half steps of scale about the best.
  const coarse = best;
  for (let i = -2; i <= 2; i++) {
    const s = coarse.s + i / 200;
    for (let dy = coarse.dy - 2; dy <= coarse.dy + 2; dy++) {
      for (let dx = coarse.dx - 2; dx <= coarse.dx + 2; dx++) {
        const mad = score(still, shot, s, dx, dy);
        if (mad < best.mad) best = { mad, s, dx, dy };
      }
    }
  }
  return { scale: best.s, x: best.dx / still.w, y: best.dy / still.h, mad: best.mad, asIs };
}

const executablePath = BROWSERS.find(candidate => candidate && existsSync(candidate));
if (!executablePath) throw new Error('no Chrome or Edge found: set CHROME_PATH');
if (out) await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 120000 });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const rows = [];
for (const id of named.length ? named : animatedSinners()) {
  const url = spa ? `${site.replace(/\/?(index\.html)?$/, '/index.html')}#/ptn/sinner/${id}` : `${site.replace(/\/?$/, '/')}ptn/sinner/${id}/`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('.exhibit.animated', { timeout: 30000 });
  } catch {
    rows.push({ name: id, error: 'no animated picture on the page' });
    continue;
  }
  const count = await page.$$eval('.exhibit.animated', list => list.length);
  for (let k = 0; k < count; k++) {
    const name = `${id}-${k}`;
    try {
      await page.evaluate(k => document.querySelectorAll('.exhibit.animated')[k].click(), k);
      await page.waitForSelector('.cell .cell-motions');
      const hasLive = await page.evaluate(() => {
        const live = document.querySelector('.cell [data-live]');
        if (live && live.getAttribute('aria-checked') !== 'true') live.click();
        if (!live) document.querySelector('.cell [data-motion]').click();
        return Boolean(live);
      });
      await page.waitForFunction(() => {
        const v = document.querySelector('.cell .cell-motion');
        const i = document.querySelector('.cell :is(.cell-print, .cell-stand) img');
        return v && v.readyState >= 2 && i?.complete && i.naturalWidth > 0;
      }, { timeout: 120000 });
      await page.evaluate(async () => {
        const v = document.querySelector('.cell .cell-motion');
        v.pause();
        v.muted = true;
        v.currentTime = 0.05;
        await new Promise(r => v.addEventListener('seeked', r, { once: true }));
      });
      await new Promise(r => setTimeout(r, 300));
      const clip = await page.evaluate(() => {
        const b = document.querySelector('.cell :is(.cell-print, .cell-stand) img').getBoundingClientRect();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      });
      const withVideo = await page.screenshot({ clip });
      // The still alone, over magenta and with nothing else of the wall's.
      await page.evaluate(() => {
        document.querySelector('.cell .cell-motion').style.visibility = 'hidden';
        document.querySelector('.cell :is(.cell-print, .cell-stand) img').classList.remove('under');
        const style = Object.assign(document.createElement('style'), { id: 'l2d-check' });
        style.textContent = `.cell { background: #f0f !important; }
          .cell-rule, .cell-mark, .cell-motions, .cell-stand::after { visibility: hidden !important; }
          .cell-print, .cell-stand, .cell-fig { filter: none !important; }`;
        document.head.append(style);
      });
      await new Promise(r => setTimeout(r, 200));
      const stillShot = await page.screenshot({ clip });
      await page.evaluate(() => document.getElementById('l2d-check').remove());
      if (out) {
        await writeFile(`${out}/${name}-video.png`, withVideo);
        await writeFile(`${out}/${name}-still.png`, stillShot);
      }
      const fit = bestFit(await grey(stillShot), await grey(withVideo));
      // Live2D off: the recording goes and the still shows.
      let switchOk = true;
      if (hasLive) {
        switchOk = await page.evaluate(() => {
          document.querySelector('.cell [data-live]').click();
          const img = document.querySelector('.cell :is(.cell-print, .cell-stand) img');
          const gone = !document.querySelector('.cell .cell-motion');
          document.querySelector('.cell [data-live]').click();
          return gone && !img.classList.contains('under');
        });
      }
      const title = await page.$eval('.cell-title', e => e.textContent.trim());
      rows.push({ name, title, ...fit, switchOk });
    } catch (e) {
      rows.push({ name, error: String(e.message || e).split('\n')[0] });
    }
  }
}
await browser.close();

let failed = 0;
const pct = n => `${(n * 100).toFixed(1)}%`;
console.log('picture\tscale\tx\ty\tdiff as is\tdiff fitted\tswitch\tresult\ttitle');
for (const r of rows) {
  if (r.error) {
    failed++;
    console.log(`${r.name}\t\t\t\t\t\t\tERROR\t${r.error}`);
    continue;
  }
  // Off when the best fit is a real move and does a real deal better than the picture as it is.
  const off = (Math.abs(r.scale - 1) > SCALE_TOLERANCE || Math.abs(r.x) > SHIFT_TOLERANCE || Math.abs(r.y) > SHIFT_TOLERANCE)
    && r.asIs - r.mad > GAIN;
  const known = off && KNOWN.get(r.title);
  const bad = (off && !known) || !r.switchOk;
  if (bad) failed++;
  console.log([r.name, r.scale.toFixed(3), pct(r.x), pct(r.y), r.asIs.toFixed(1), r.mad.toFixed(1),
    r.switchOk ? 'ok' : 'FAIL', bad ? 'OFF' : known ? 'known' : 'ok', known ? `${r.title} (${known})` : r.title].join('\t'));
}
console.log(`${rows.length - failed} of ${rows.length} pictures fit`);
process.exit(failed ? 1 : 0);
