// Generates src/shared/generated/ptn/: sinners.json, the roster of Path to Nowhere, a game
// the web target carries as a roster and nothing else, and mugshots/, its card art.
//
// One source, pathtonowhere.wiki.gg. It keeps no Cargo tables. A playable Sinner's page is
// one call of a page template, {{SinnerPage}}, or {{ReforgePage}} for a Sinner the game has
// reforged, and both templates file the page under Category:Playable Sinners. So that
// category is the roster, and the head of the call is the Sinner's file: number, rank,
// tendency, libram, birthplace and tags. (Category:Sinners, the likelier name, holds the
// two templates and nothing else.)
//
// The card art is the mugshot, File:<page> Prisonphoto.png, the picture the wiki's own
// infobox shows: a standing figure cut out on transparency, narrower than the card's 1:2 on
// four pages in five and never much wider. The originals are PNGs of 200 to 700 KB, about
// 440 by 1090, so each is baked once to WebP at the size a card shows it (the owner approved
// the downloads on 11 October 2026). An entry's `art` is the baked file, or the original's
// address on the wiki where the bake could not get it.
//
// Nothing here is load-bearing. With the wiki unreachable the last build's file is kept, or
// an empty one written: the page then has no Sinners to list, and the build goes on.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bakeImages } from './lib/bake-images.mjs';
import { wikiApi } from './lib/fetch.mjs';
import { templateBodies, templateParams } from './lib/wiki-text.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'ptn',
);
const SINNERS_FILE = path.join(outDir, 'sinners.json');
const mugshotDir = path.join(outDir, 'mugshots');
// Where webpack.web.js copies that directory to beside the page, and so what an entry's
// `art` starts with.
const MUGSHOT_PATH = 'ptn/mugshots';

const WIKI_API = 'https://pathtonowhere.wiki.gg/api.php';
const wiki = wikiApi(WIKI_API);

// As many pages as the wiki gives the text of in one answer, and as many titles as it takes
// in one question. It answers a page-by-page crawl with a 429.
const BATCH = 50;

// The game's three ranks, highest first: the order the roster is dealt in.
const RANKS = ['S', 'A', 'B'];

const mugshotTitle = name => `File:${name} Prisonphoto.png`;

// The text of every page in the roster's category, by title: the category's members come
// with their text, so listing them and reading them is one question.
async function fetchPages() {
  const textOf = new Map();
  let next = {};
  do {
    const json = await wiki({
      action: 'query', generator: 'categorymembers', gcmtitle: 'Category:Playable Sinners',
      // The two templates are in the category too; the articles are the Sinners.
      gcmnamespace: '0', gcmlimit: String(BATCH),
      prop: 'revisions', rvprop: 'content', rvslots: 'main', ...next,
    });
    for (const page of json.query?.pages ?? []) {
      // An answer that has grown too long names its last pages without their text, and the
      // next one brings it.
      if (page.revisions) textOf.set(page.title, page.revisions[0].slots.main.content);
    }
    next = json.continue;
  } while (next);
  return textOf;
}

// Twice the 180px a plate is drawn at, which is as sharp as a card gets on a dense screen.
const MUGSHOT_WIDTH = 360;

// A mugshot as a card shows it. The plate is 1:2 and the figure is drawn as wide as the
// plate from the top down (_ptn.scss), so whatever lies below two widths, the legs of
// nearly every one, is never seen and is cut here. A figure wider than 1:2 is shorter than
// that and keeps all of itself.
async function toPlate(original) {
  const { width, height } = await sharp(original).metadata();
  const w = Math.min(MUGSHOT_WIDTH, width);
  const h = Math.min(Math.floor(height * w / width), 2 * w);
  return sharp(original).resize({ width: w }).extract({ left: 0, top: 0, width: w, height: h })
    .webp({ quality: 80, effort: 4 }).toBuffer();
}

// Gives each Sinner the address of their mugshot on the wiki, where it has one. Only the
// address is asked for here.
async function addMugshots(sinners) {
  for (let i = 0; i < sinners.length; i += BATCH) {
    const batch = sinners.slice(i, i + BATCH);
    const json = await wiki({
      action: 'query', titles: batch.map(s => mugshotTitle(s.name)).join('|'),
      prop: 'imageinfo', iiprop: 'url',
    });
    const urlOf = new Map(json.query.pages.map(page => [page.title, page.imageinfo?.[0].url]));
    for (const sinner of batch) {
      const art = urlOf.get(mugshotTitle(sinner.name));
      if (art) sinner.art = art;
    }
  }
}

async function buildRoster() {
  const sinners = [];
  const unfinished = [];
  for (const [title, text] of await fetchPages()) {
    // {{ReforgePage}} opens with the same fields as {{SinnerPage}}.
    const [body = ''] = ['SinnerPage', 'ReforgePage'].flatMap(name => templateBodies(text, name));
    const { named } = templateParams(body);
    // What a card cannot do without: the rank colours it, and each of the others fills a
    // slot of its own. A page short of one is left out and named in the summary line.
    if (!(RANKS.includes(named.Rank) && named.SinnerNo && named.Roles && named.Alignment && named.Birthplace)) {
      unfinished.push(title);
      continue;
    }
    sinners.push({
      // The page's title, which is the Sinner's name, in a form that can go in an address
      // or name a file: 'mr-fox', 'necresta-hella', '000'.
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: title,
      number: named.SinnerNo,
      rank: named.Rank,
      // 'Core Arcane' is how the wiki picks the tendency's badge with the core mark on it.
      // The tendency is the word after it.
      tendency: named.Roles.replace(/^Core /, ''),
      libram: named.Alignment,
      birthplace: named.Birthplace,
      // Each is a {{Tags|colour|name}}, typed by hand: one with no name would be a hole in
      // the list.
      tags: templateBodies(named.Tags ?? '', 'Tags').map(tag => templateParams(tag).args[1]).filter(Boolean),
    });
  }
  // A renamed category would come back empty, a renamed template as pages with no fields.
  if (!sinners.length) throw new Error('no page in the category reads as a Sinner\'s file');

  await addMugshots(sinners);
  const baked = await bakeImages(
    'ptn mugshots', mugshotDir,
    sinners.filter(s => s.art).map(s => ({ name: s.id, url: s.art, label: s.name })), toPlate,
  );
  for (const s of sinners) if (baked.has(s.id)) s.art = `${MUGSHOT_PATH}/${s.id}.webp`;
  // Nothing on a page dates the Sinner's release, so the order is rank and then name.
  sinners.sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.localeCompare(b.name));
  return { sinners, unfinished };
}

await mkdir(outDir, { recursive: true });
try {
  const { sinners, unfinished } = await buildRoster();
  await writeFile(SINNERS_FILE, JSON.stringify(sinners));
  const artless = sinners.filter(s => !s.art).map(s => s.name);
  console.log(
    `ptn: ${sinners.length} sinners` +
    `${artless.length ? ` — no mugshot for ${artless.join(', ')}` : ''}` +
    `${unfinished.length ? ` — unfinished pages left out: ${unfinished.join(', ')}` : ''}` +
    ` -> ${path.relative(process.cwd(), SINNERS_FILE)}`,
  );
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(SINNERS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(SINNERS_FILE, '[]');
  console.warn(`ptn/sinners.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
