// Generates src/shared/generated/ptn/, what the web target has of Path to Nowhere:
// sinners.json, the roster; figures/, every Sinner whole, as a mugshot and as an original;
// and sinner-details/, a payload per Sinner for the dossier page.
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
// A Sinner has two pictures the site bakes: the mugshot, File:<page> Prisonphoto.png, the
// one the wiki's own infobox shows, and the original illustration, File:<page>.png. Both
// are standing figures cut out on transparency, PNGs of 200 KB to a few MB. The roster is
// a line-up wall, which stands every Sinner whole, on a floor line, at their stated height
// against a ruled wall, as either picture; and a Sinner's own page stands them the same
// way, larger. So each is baked whole and cut back to the figure's own edges
// (figures/mugshot/ and figures/original/; the owner approved downloading those 285 files,
// about 125 MB, on 12 October 2026, having approved the same files cut for the cards the
// roster then had the day before). An entry's `figure` and `figureOriginal` are the baked
// file and its shape, and its `height` the centimetres a wall scales it to.
//
// The rest of a Sinner's art is found, not fetched: the phase-up art, the interrogation's
// pictures and every attire, which the Sinner's Attires and Gallery subpages name
// (lib/ptn-page.mjs reads them). The wiki is asked for each file's address, and a
// dossier's payload carries those; the page loads them through the resizing proxy the
// Arknights art goes through, since the originals are 1 to 9 MB each and about 1.5 GB in
// all.
//
// Two things are not the wiki's and come from a record kept by hand, lib/ptn-record.mjs,
// which says where it was read from. The day each Sinner was released, an entry's
// `released`: nothing on the wiki dates one, so the roster's own order is rank and then
// name, and that day is what its Newest order goes by. And the head of the file of a
// Sinner the game has released and the wiki has no page for yet, so that they stand on the
// roster too; their pictures are the wiki's, which has those before it has the page.
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
import { LAUNCH, LAUNCH_DAY, RELEASES, UNFILED } from './lib/ptn-record.mjs';
import { templateBodies, templateParams } from './lib/wiki-text.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'ptn',
);
const SINNERS_FILE = path.join(outDir, 'sinners.json');
const detailDir = path.join(outDir, 'sinner-details');
// The whole figures, a directory under it to a picture, and where webpack.web.js copies
// that to beside the page, which is what a figure's `art` starts with.
const figureDir = path.join(outDir, 'figures');
const FIGURE_PATH = 'ptn/figures';

const WIKI_API = 'https://pathtonowhere.wiki.gg/api.php';
const wiki = wikiApi(WIKI_API);

// As many pages as the wiki gives the text of in one answer, and as many titles as it takes
// in one question. It answers a page-by-page crawl with a 429.
const BATCH = 50;

// The game's three ranks, highest first: the order the roster is dealt in.
const RANKS = ['S', 'A', 'B'];

// A Sinner's name, which is their page's title, in a form that can go in an address or name
// a file: 'mr-fox', 'necresta-hella', '000'.
const slugOf = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The day each Sinner in the record was released, by their name.
const RELEASED = new Map([
  ...LAUNCH.map(name => [name, LAUNCH_DAY]),
  ...RELEASES.flatMap(([day, names]) => names.map(name => [name, day])),
]);

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

// As tall as a mugshot's file is, which is taller than a wall stands anyone on a 1080 screen.
const FIGURE_HEIGHT = 1100;

// A picture whole, for the wall: cut back to the figure's own edges, so that the picture's
// foot is the Sinner's feet and stands on the floor line, and its top is the top of them,
// which is what the wall scales to their height.
function toFigure(original) {
  return sharp(original).trim()
    .resize({ height: FIGURE_HEIGHT, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 }).toBuffer();
}

// One picture of every Sinner that has it, whole, by the Sinner's id: where the baked file
// is beside the page, and its width over its height, which lets the wall hold the figure's
// place before the picture has come. `urlOf` is where each Sinner's original is.
async function bakeFigures(kind, sinners, urlOf) {
  const dir = path.join(figureDir, kind);
  const baked = await bakeImages(
    `ptn figures, ${kind}`, dir,
    sinners.filter(s => urlOf.has(s.id)).map(s => ({ name: s.id, url: urlOf.get(s.id), label: s.name })), toFigure,
  );
  const figureOf = new Map();
  await Promise.all([...baked].map(async (id) => {
    const { width, height } = await sharp(path.join(dir, `${id}.webp`)).metadata();
    figureOf.set(id, { art: `${FIGURE_PATH}/${kind}/${id}.webp`, ratio: Math.round(width / height * 1000) / 1000 });
  }));
  return figureOf;
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
    const id = slugOf(title);
    details.push({ id, ...parseSinnerDetail(named, title) });
    // '162cm', '166', 'Approx. 160cm': the centimetres, for the wall to stand them at.
    const height = Number(/\d+(\.\d+)?/.exec(named.Height ?? '')?.[0]);
    sinners.push({
      id,
      name: title,
      number: named.SinnerNo,
      rank: named.Rank,
      ...(height ? { height } : {}),
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

  // The Sinners the wiki has no page for, from the record: the head of a file and nothing
  // under it, and a first paragraph that says so. One the wiki has written up since is
  // already here, and its page is the one that counts.
  for (const { height, ...file } of UNFILED) {
    if (sinners.some(s => s.name === file.name)) continue;
    const id = slugOf(file.name);
    sinners.push({ id, ...file, height });
    details.push({
      id,
      ...parseSinnerDetail({
        Height: `${height}cm`,
        Bio: 'The wiki has not written this Sinner\'s page yet. What is here of their file (number, rank, tendency, libram, birthplace, height and tags) is as S1N has it.',
      }, file.name),
    });
  }

  // Every Sinner's art, as the files their two subpages name, and then the address of each
  // file the wiki really has: a page names a few that were never uploaded.
  const titles = sinners.map(s => s.name);
  const attires = await fetchSubpages(titles, 'Attires');
  const galleries = await fetchSubpages(titles, 'Gallery');
  const artFiles = new Map(sinners.map(s => [s.id, parseSinnerArt(s.name, attires.get(s.name), galleries.get(s.name))]));
  const urlOf = await fetchFileUrls([...new Set([...artFiles.values()].flat().map(art => art.file))]);
  // Where each Sinner's mugshot and original are on the wiki, for the bakes below.
  const mugshotOf = new Map();
  const originalOf = new Map();
  for (const detail of details) {
    detail.arts = artFiles.get(detail.id).filter(art => urlOf.has(art.file))
      .map(({ file, ...art }) => ({ ...art, url: urlOf.get(file) }));
    const addressOf = kind => detail.arts.find(art => art.kind === kind)?.url;
    if (addressOf('mugshot')) mugshotOf.set(detail.id, addressOf('mugshot'));
    if (addressOf('original')) originalOf.set(detail.id, addressOf('original'));
  }

  // One set after another, not side by side: two at once is eight fetches at a time from
  // the one wiki.
  const figureOf = await bakeFigures('mugshot', sinners, mugshotOf);
  const figureOriginalOf = await bakeFigures('original', sinners, originalOf);
  for (const s of sinners) {
    if (figureOf.has(s.id)) s.figure = figureOf.get(s.id);
    if (figureOriginalOf.has(s.id)) s.figureOriginal = figureOriginalOf.get(s.id);
    // One the record has no day for has been released since it was last added to, and goes
    // without: the page takes that to mean newer than everyone with one.
    if (RELEASED.has(s.name)) s.released = RELEASED.get(s.name);
  }
  // Nothing on a page dates the Sinner's release, so the order is rank and then name.
  sinners.sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) || a.name.localeCompare(b.name));
  // A name in the record that is nobody's is a slip of the hand, or a page the wiki has
  // renamed: either way a Sinner has lost their day, and it is said.
  const strays = [...RELEASED.keys()].filter(name => !sinners.some(s => s.name === name));
  return { sinners, details, unfinished, strays };
}

await mkdir(detailDir, { recursive: true });
try {
  const { sinners, details, unfinished, strays } = await buildRoster();
  await writeFile(SINNERS_FILE, JSON.stringify(sinners));
  // Written again every build, since a page changes with the game.
  await Promise.all(details.map(d => writeFile(path.join(detailDir, `${d.id}.json`), JSON.stringify(d))));
  console.log(`ptn details: ${details.length} -> ${path.relative(process.cwd(), detailDir)}`);
  const artless = sinners.filter(s => !s.figure).map(s => s.name);
  const undated = sinners.filter(s => !s.released).map(s => s.name);
  console.log(
    `ptn: ${sinners.length} sinners` +
    `${artless.length ? ` — no mugshot for ${artless.join(', ')}` : ''}` +
    `${unfinished.length ? ` — unfinished pages left out: ${unfinished.join(', ')}` : ''}` +
    ` -> ${path.relative(process.cwd(), SINNERS_FILE)}`,
  );
  if (undated.length) console.warn(`ptn: no release recorded for ${undated.join(', ')} — add them to scripts/lib/ptn-record.mjs`);
  if (strays.length) console.warn(`ptn: the release record names ${strays.join(', ')}, whom the roster does not have`);
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(SINNERS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(SINNERS_FILE, '[]');
  console.warn(`ptn/sinners.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
