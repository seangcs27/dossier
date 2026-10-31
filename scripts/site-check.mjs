// The deploy's checks on a built Astro site (PLAN-astro-hybrid.md, Phase 7): it has a page for
// every route of the inventory and no more, every address in its pages' HTML is a file it has,
// and each page's first-load JavaScript is inside its budget. Run from the repo's root:
//
//   node scripts/site-check.mjs <site-dir> [base]        base as the build was given it, '/dossier'
//
// Only what is in the HTML is checked; a link a view draws in the browser is not.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { portedPath } from './lib/ported.mjs';
import { routeInventory } from './route-inventory.mjs';

const SITE = 'https://seangcs27.github.io';
const KB = 1024;

// First-load JavaScript, gzipped, by the page's view (`data-view` on its body). The plan's
// budgets: 25 KB for a page drawn at build time, 40 with an island, 120 for a roster. Two pages
// are over theirs, accepted by the owner on 25 October 2026 at 52.8 and 42 KB before Phase 6's
// router added 5.2 KB to every page: the budget is what they are now, rounded up. The card
// page's was raised to 70 on 1 November 2026, by the owner, when it reached 65.6 KB.
const BUDGET = {
  'holodori-home': 25, 'holodori-gachas': 25, 'holodori-holomem': 25, events: 25, 'endfield-detail': 25,
  detail: 40, 'ptn-detail': 50, 'holodori-card': 70,
  grid: 120, endfield: 120, ptn: 120, holodori: 120, 'holodori-songs': 120, 'holodori-cards': 120, fgo: 120,
};

const [siteDir, base = '/dossier'] = process.argv.slice(2);
if (!siteDir) {
  console.error('usage: site-check.mjs <site-dir> [base]');
  process.exit(2);
}
const root = path.resolve(siteDir);
const exists = file => stat(file).then(info => info.isFile(), () => false);
const fileOf = pathname => path.join(root, pathname.endsWith('/') ? `${pathname}index.html` : pathname);

async function pages(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await pages(full)));
    else if (entry.name === 'index.html') out.push(full);
  }
  return out;
}

const problems = [];
const files = await pages(root);

// 1. one page a route
const { hashes } = await routeInventory();
for (const hash of hashes) {
  const page = portedPath(hash);
  if (!page) problems.push(`route ${hash}: no page serves it`);
  else if (!(await exists(fileOf(`/${page}`)))) problems.push(`route ${hash}: ${page} is not built`);
}
if (files.length !== hashes.length) problems.push(`${files.length} pages for ${hashes.length} routes`);

// 2. every address in the HTML, against <base>, as the browser reads it
const pageBase = `${SITE}${base}/`;
const checked = new Map();
async function target(url) {
  if (url.origin !== SITE) return undefined;
  if (url.pathname === `${base}/` && url.hash.startsWith('#/')) {
    const page = portedPath(url.hash);
    if (!page) return `${url.hash} is no page's route`;
    url = new URL(page, pageBase);
  }
  if (!url.pathname.startsWith(`${base}/`)) return `${url.pathname} is outside ${base}/`;
  const file = fileOf(decodeURIComponent(url.pathname.slice(base.length)));
  if (!checked.has(file)) checked.set(file, await exists(file));
  return checked.get(file) ? undefined : `${url.pathname} is not there`;
}
let links = 0;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  for (const [, value] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    if (!value || /^(?:data|mailto|javascript):/.test(value)) continue;
    links++;
    const miss = await target(new URL(value.replaceAll('&amp;', '&'), pageBase));
    if (miss) problems.push(`${path.relative(root, file)}: ${value}: ${miss}`);
  }
}

// 3. first-load JavaScript: the page's module scripts and every chunk they import statically
const sources = new Map();
const gz = new Map();
const sizeOf = (rel) => {
  if (!gz.has(rel)) gz.set(rel, gzipSync(sources.get(rel)).length);
  return gz.get(rel);
};
async function closure(rel, seen) {
  if (seen.has(rel)) return;
  seen.add(rel);
  if (!sources.has(rel)) sources.set(rel, await readFile(path.join(root, rel), 'utf8'));
  for (const [, dep] of sources.get(rel).matchAll(/(?:import|from)\s*["']([^"']+\.js)["']/g)) {
    await closure(path.posix.join(path.posix.dirname(rel), dep), seen);
  }
}
const heaviest = {};
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const view = /<body[^>]*data-view="([^"]+)"/.exec(html)?.[1] ?? '?';
  const seen = new Set();
  let bytes = 0;
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const src = /src="([^"]+)"/.exec(attrs)?.[1];
    if (src) await closure(new URL(src, pageBase).pathname.slice(base.length + 1), seen);
    else if (!/application\/json/.test(attrs)) bytes += gzipSync(body).length;
  }
  for (const rel of seen) bytes += sizeOf(rel);
  const budget = BUDGET[view];
  if (budget === undefined) problems.push(`${path.relative(root, file)}: no budget for view '${view}'`);
  else if (bytes > budget * KB) problems.push(`${path.relative(root, file)}: ${(bytes / KB).toFixed(1)} KB of JavaScript, over ${view}'s ${budget}`);
  if (!heaviest[view] || bytes > heaviest[view].bytes) heaviest[view] = { bytes, page: path.relative(root, path.dirname(file)) || '.' };
}

console.log(`${files.length} pages for ${hashes.length} routes; ${links} addresses checked`);
for (const [view, { bytes, page }] of Object.entries(heaviest).sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${view.padEnd(18)}${(bytes / KB).toFixed(1).padStart(6)} KB of ${String(BUDGET[view]).padStart(3)}   ${page.replaceAll('\\', '/')}`);
}
if (problems.length) {
  console.error(`${problems.length} problems:\n${problems.slice(0, 50).join('\n')}`);
  process.exitCode = 1;
}
