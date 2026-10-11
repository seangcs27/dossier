// Generates src/shared/generated/ptn/, what the web target has of Path to Nowhere:
// sinners.json, the roster; mugshots/, its card art; and sinner-details/, a payload per
// Sinner for the dossier page.
//
// One source, pathtonowhere.wiki.gg. It keeps no Cargo tables. A playable Sinner's page is
// one call of a page template, {{SinnerPage}}, or {{ReforgePage}} for a Sinner the game has
// reforged, and both templates file the page under Category:Playable Sinners. So that
// category is the roster, and the head of the call is the Sinner's file: number, rank,
// tendency, libram, birthplace and tags. (Category:Sinners, the likelier name, holds the
// two templates and nothing else.) The rest of the call is everything else the page shows,
// attributes, skills, shackles, the crimebrand and the documents, and lib/ptn-page.mjs reads
// that into the dossier's payload from the same text, at no further request.
//
// The card art is the mugshot, File:<page> Prisonphoto.png, the picture the wiki's own
// infobox shows: a standing figure cut out on transparency, narrower than the card's 1:2 on
// four pages in five and never much wider. The originals are PNGs of 200 to 700 KB, about
// 440 by 1090, so each is baked once to WebP at the size a card shows it (the owner approved
// the downloads on 11 October 2026). An entry's `art` is the baked file, or the original's
// address on the wiki where the bake could not get it.
//
// The rest of a Sinner's art is found, not fetched: the original, the phase-up art, the
// interrogation's pictures and every attire, which the Sinner's Attires and Gallery subpages
// name (lib/ptn-page.mjs reads them). The wiki is asked for each file's address, and a
// dossier's payload carries those; the page loads them through the resizing proxy the
// Arknights art goes through, since the originals are 1 to 9 MB each and about 1.5 GB in
// all. An entry's `portrait` is the original's address, for a card to show in its place.
//
// Nothing here is load-bearing. With the wiki unreachable the last build's file is kept, or
// an empty one written: the page then has no Sinners to list, and the build goes on.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bakeImages } from './lib/bake-images.mjs';
import { wikiApi } from './lib/fetch.mjs';
import { parseSinnerArt, parseSinnerDetail } from './lib/ptn-page.mjs';
import { templateBodies, templateParams } from './lib/wiki-text.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'ptn',
);
const SINNERS_FILE = path.join(outDir, 'sinners.json');
const detailDir = path.join(outDir, 'sinner-details');
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

// One of every Sinner's subpages ('Attires', 'Gallery'), by the Sinner's own title. A Sinner
// with no such page is not in the answer.
async function fetchSubpages(titles, kind) {
  const textOf = new Map();
  for (let i = 0; i < titles.length; i += BATCH) {
    const json = await wiki({
      action: 'query', titles: titles.slice(i, i + BATCH).map(title => `${title}/${kind}`).join('|'),
      prop: 'revisions', rvprop: 'content', rvslots: 'main',
    });
    for (const page of json.query?.pages ?? []) {
      if (page.revisions) textOf.set(page.title.slice(0, -(kind.length + 1)), page.revisions[0].slots.main.content);
    }
  }
  return textOf;
}

// The address of each of these files that the wiki has, by the file's title. Only the
// address is asked for: no file is fetched here.
async function fetchFileUrls(files) {
  const urlOf = new Map();
  for (let i = 0; i < files.length; i += BATCH) {
    const json = await wiki({
      action: 'query', titles: files.slice(i, i + BATCH).map(file => `File:${file}`).join('|'),
      prop: 'imageinfo', iiprop: 'url',
    });
    for (const page of json.query?.pages ?? []) {
      const url = page.imageinfo?.[0]?.url;
      if (url) urlOf.set(page.title.replace(/^File:/, ''), url);
    }
  }
  return urlOf;
}

async function buildRoster() {
  const sinners = [];
  const details = [];
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
    // The page's title, which is the Sinner's name, in a form that can go in an address or
    // name a file: 'mr-fox', 'necresta-hella', '000'.
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    details.push({ id, ...parseSinnerDetail(named, title) });
    sinners.push({
      id,
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

  // Every Sinner's art, as the files their two subpages name, and then the address of each
  // file the wiki really has: a page names a few that were never uploaded.
  const titles = sinners.map(s => s.name);
  const attires = await fetchSubpages(titles, 'Attires');
  const galleries = await fetchSubpages(titles, 'Gallery');
  const artFiles = new Map(sinners.map(s => [s.id, parseSinnerArt(s.name, attires.get(s.name), galleries.get(s.name))]));
  const urlOf = await fetchFileUrls([...new Set([...artFiles.values()].flat().map(art => art.file))]);
  for (const detail of details) {
    detail.arts = artFiles.get(detail.id).filter(art => urlOf.has(art.file))
      .map(({ file, ...art }) => ({ ...art, url: urlOf.get(file) }));
    const sinner = sinners.find(s => s.id === detail.id);
    const addressOf = kind => detail.arts.find(art => art.kind === kind)?.url;
    if (addressOf('mugshot')) sinner.art = addressOf('mugshot');
    if (addressOf('original')) sinner.portrait = addressOf('original');
  }

  const baked = await bakeImages(
    'ptn mugshots', mugshotDir,
    sinners.filter(s => s.art).map(s => ({ name: s.id, url: s.art, label: s.name })), toPlate,
  );
  for (const s of sinners) if (baked.has(s.id)) s.art = `${MUGSHOT_PATH}/${s.id}.webp`;
  // Nothing on a page dates the Sinner's release, so the order is rank and then name.
  sinners.sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.localeCompare(b.name));
  return { sinners, details, unfinished };
}

await mkdir(detailDir, { recursive: true });
try {
  const { sinners, details, unfinished } = await buildRoster();
  await writeFile(SINNERS_FILE, JSON.stringify(sinners));
  // Written again every build, since a page changes with the game.
  await Promise.all(details.map(d => writeFile(path.join(detailDir, `${d.id}.json`), JSON.stringify(d))));
  console.log(`ptn details: ${details.length} -> ${path.relative(process.cwd(), detailDir)}`);
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
