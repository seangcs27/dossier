// Screenshots of the web target at three widths, and a comparison of two sets of them, so a
// change that is meant to leave the site as it was can show that it did (the Astro plan,
// PLAN-astro-hybrid.md, runs this before and after each phase).
//
//   node scripts/shots.mjs capture <site-dir> <out-dir> [name] [--astro]
//        shoot a built site (dist/web), over http; with a name, only the pages it is part of;
//        with --astro the site is the Astro build (dist/astro) and only the routes it has
//   node scripts/shots.mjs compare <dir-a> <dir-b>        pixel diff; changed ones go to <dir-b>/diff/
//
// Capture is also the smoke run: it exits 1 if a page throws, logs a console error or asks its
// own server for something that is not there. Over http and never file://, which hides a
// broken fetch. Everything else is held still so two shots of one build match: the clock stands
// at NOW, Math.random is seeded, animations jump to their last frame, and a request to any
// other host is refused (the art on other hosts falls back as it would offline). A set goes in
// a folder of its own, since shots of the same name are overwritten; keep them out of git.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { routeInventory } from './route-inventory.mjs';

// The routes the Astro site serves, hash to path under BASE; only those are shot with --astro.
// A key ending in '/' stands for every route under it ('#/holodori/holomem/' + id).
const PORTED = JSON.parse(await readFile(new URL('../site/src/ported-routes.json', import.meta.url), 'utf8'));
const BASE = '/dossier';

/** The Astro site's path for a hash route, or undefined where it does not serve it yet. */
function portedPath(hash) {
  if (PORTED[hash]) return PORTED[hash];
  const prefix = Object.keys(PORTED).find(key => key.endsWith('/') && hash.startsWith(key));
  return prefix && `${PORTED[prefix]}${hash.slice(prefix.length)}/`;
}

const WIDTHS = [1400, 800, 390];
const VIEWPORT_HEIGHT = 900;
const MAX_HEIGHT = 6000;
const NOW = Date.UTC(2026, 9, 23, 12);
const PIXEL_THRESHOLD = 0.1;
// Two shots of one build differ by up to a few dozen pixels (an image resampled differently);
// a changed line of text is in the thousands.
const NOISE = 0.0001;

// One page per view, and a dossier or two per game. Ids that go missing fail the run, below.
const PAGES = [
  { name: 'ak-grid', hash: '#/' },
  { name: 'ak-op-amiya', hash: '#/op/char_002_amiya' },
  { name: 'ak-op-silverash', hash: '#/op/char_172_svrash' },
  { name: 'ak-op-cn-only', hash: '#/op/char_1049_catap2' },
  { name: 'ak-events', hash: '#/events' },
  { name: 'ak-pools', hash: '#/events/pools' },
  { name: 'ak-calendar', hash: '#/events/calendar' },
  { name: 'ef-roster', hash: '#/endfield' },
  { name: 'ef-op-arcane', hash: '#/endfield/op/chr_0032_lizhiyan' },
  { name: 'ptn-wall', hash: '#/ptn' },
  { name: 'ptn-sinner', hash: '#/ptn/sinner/adela' },
  { name: 'ptn-sinner-cn-only', hash: '#/ptn/sinner/arancia' },
  { name: 'hd-home', hash: '#/holodori' },
  { name: 'hd-sheet', hash: '#/holodori/holomems' },
  { name: 'hd-songs', hash: '#/holodori/songs' },
  { name: 'hd-cards', hash: '#/holodori/cards' },
  { name: 'hd-gachas', hash: '#/holodori/gachas' },
  { name: 'hd-holomem', hash: '#/holodori/holomem/chr-00001' },
  { name: 'hd-card-5star', hash: '#/holodori/card/card-00001-5-uniq-0000-00' },
  { name: 'hd-card-3star', hash: '#/holodori/card/card-00001-3-nrml-0000-00' },
  { name: 'fgo-roster', hash: '#/fgo' },
];

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon',
};

/** Runs inside every page before its own scripts: the fixed clock, the seeded random, no motion. */
function holdStill(now) {
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(now);
    }
    static now() {
      return now;
    }
  };
  let seed = 1;
  Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent =
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;' +
      'animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;' +
      'scroll-behavior:auto!important}';
    document.head.append(style);
  });
}

function serve(root) {
  const base = path.resolve(root);
  const server = http.createServer(async (req, res) => {
    // The Astro site is built for BASE, and its folders have an index.html each.
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith(`${BASE}/`)) pathname = pathname.slice(BASE.length);
    const file = path.join(base, pathname.endsWith('/') ? `${pathname}index.html` : pathname);
    if (!file.startsWith(base)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** One page at one width: shot to outDir, and what the page did wrong on the way. */
async function shoot(browser, origin, outDir, { name, url }, width) {
  const problems = [];
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height: VIEWPORT_HEIGHT });
    await page.evaluateOnNewDocument(holdStill, NOW);
    await page.setRequestInterception(true);
    page.on('request', req => (req.url().startsWith(origin) ? req.continue() : req.abort()));
    page.on('pageerror', err => problems.push(`exception: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) problems.push(`console: ${msg.text()}`);
    });
    page.on('response', res => {
      if (res.url().startsWith(origin) && res.status() >= 400) problems.push(`${res.status()} ${res.url()}`);
    });
    page.on('requestfailed', req => {
      if (req.url().startsWith(origin)) problems.push(`request failed ${req.url()}`);
    });

    await page.goto(`${origin}${url}`, { waitUntil: 'load' });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 });
    // Whether a lazy image has loaded by the time of the shot is a matter of timing (and one
    // off the screen would never load, so decode() would wait on it for ever): load them all.
    await page.evaluate(() => {
      for (const img of document.images) img.loading = 'eager';
    });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 20000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({
      path: path.join(outDir, `${name}-${width}.png`),
      clip: { x: 0, y: 0, width, height: Math.min(height, MAX_HEIGHT) },
      captureBeyondViewport: true,
    });
  } finally {
    await page.close();
  }
  return problems.map(problem => `${name} @${width}: ${problem}`);
}

async function capture(siteDir, outDir, only, astro) {
  if (!existsSync(siteDir)) throw new Error(`${siteDir} is not there: build it first`);
  const executablePath = BROWSERS.find(candidate => candidate && existsSync(candidate));
  if (!executablePath) throw new Error('no Chrome or Edge found: set CHROME_PATH');
  const { hashes } = await routeInventory();
  const unknown = PAGES.filter(({ hash }) => !hashes.includes(hash));
  if (unknown.length) throw new Error(`pages the site no longer has: ${unknown.map(({ hash }) => hash).join(', ')}`);

  await mkdir(outDir, { recursive: true });
  const server = await serve(siteDir);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 60000 });
  const pages = PAGES
    .filter(({ name, hash }) => (!only || name.includes(only)) && (!astro || portedPath(hash)))
    .map(page => ({ ...page, url: astro ? `${BASE}/${portedPath(page.hash)}` : `/index.html${page.hash}` }));
  const jobs = pages.flatMap(page => WIDTHS.map(width => [page, width]));
  const problems = [];
  const started = Date.now();
  try {
    // One at a time: with three tabs open the others sit in the background, and Chrome starved
    // them (screenshots and evaluate calls timed out); alone, a page takes about a second.
    for (const [page, width] of jobs) {
      try {
        problems.push(...(await shoot(browser, origin, outDir, page, width)));
      } catch (err) {
        problems.push(`${page.name} @${width}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`${jobs.length} shots in ${((Date.now() - started) / 1000).toFixed(1)} s -> ${outDir}`);
  if (problems.length) {
    console.error(`${problems.length} problems:\n${problems.sort().join('\n')}`);
    process.exitCode = 1;
  }
}

async function readRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function compare(dirA, dirB) {
  const pngs = async dir => (await readdir(dir)).filter(file => file.endsWith('.png')).sort();
  const [filesA, filesB] = await Promise.all([pngs(dirA), pngs(dirB)]);
  const differences = filesB.filter(file => !filesA.includes(file)).map(file => `${file}: only in ${dirB}`);
  await mkdir(path.join(dirB, 'diff'), { recursive: true });
  let identical = 0;

  for (const file of filesA) {
    if (!filesB.includes(file)) {
      differences.push(`${file}: only in ${dirA}`);
      continue;
    }
    const [a, b] = await Promise.all([readRaw(path.join(dirA, file)), readRaw(path.join(dirB, file))]);
    if (a.width !== b.width || a.height !== b.height) {
      differences.push(`${file}: ${a.width}x${a.height} became ${b.width}x${b.height}`);
      continue;
    }
    const diff = Buffer.alloc(a.width * a.height * 4);
    const pixels = pixelmatch(a.data, b.data, diff, a.width, a.height, { threshold: PIXEL_THRESHOLD });
    if (pixels <= a.width * a.height * NOISE) {
      identical++;
      continue;
    }
    await sharp(diff, { raw: { width: a.width, height: a.height, channels: 4 } }).png().toFile(path.join(dirB, 'diff', file));
    differences.push(`${file}: ${pixels} pixels (${((pixels / (a.width * a.height)) * 100).toFixed(2)}%)`);
  }
  console.log(`${identical} of ${filesA.length} identical`);
  if (differences.length) {
    console.error(differences.join('\n'));
    process.exitCode = 1;
  }
}

const args = process.argv.slice(2);
const astro = args.includes('--astro');
const [command, first, second, third] = args.filter(arg => arg !== '--astro');
if (command === 'capture' && first && second) await capture(first, second, third, astro);
else if (command === 'compare' && first && second) await compare(first, second);
else {
  console.error('usage: shots.mjs capture <site-dir> <out-dir> [name] [--astro] | shots.mjs compare <dir-a> <dir-b>');
  process.exitCode = 1;
}
