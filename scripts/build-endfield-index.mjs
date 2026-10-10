// Generates everything under src/shared/generated/endfield/ — what the web target has of
// Arknights: Endfield, the second game it carries: operators.json (the roster), portraits/,
// splash/, icons/ and operator-details/.
//
// One source, endfield.wiki.gg. Its `Operators` Cargo table, the same kind of table the
// Arknights scripts read from arknights.wiki.gg, has a row per operator: id, rarity, class,
// element, weapon, faction, tags and the profile (birthday, quote, expertise, hobbies,
// gift), and the names of four images. The card art is the one it calls the portrait, a
// 180x360 bust like the Arknights cards'; the splash is the full illustration. The glyphs
// are the files the wiki keeps under each class, element and weapon type's own name. And
// each operator's page has what the table leaves out, written as templates: the rest of the
// file, attributes, potentials, skills, talents and base skills.
//
// Nothing here is load-bearing. With the wiki unreachable the last build's file is kept, or
// an empty one written: the Endfield page then has nothing to list, and the build goes on.
// The images and the per-operator payloads fail one at a time: each set's summary line names
// what could not be had, and whatever is on disk for it stays.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { known, parseOperatorPage } from './lib/endfield-page.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'endfield',
);
const OPERATORS_FILE = path.join(outDir, 'operators.json');
const portraitDir = path.join(outDir, 'portraits');
const splashDir = path.join(outDir, 'splash');
const iconDir = path.join(outDir, 'icons');
const detailDir = path.join(outDir, 'operator-details');

const WIKI_API = 'https://endfield.wiki.gg/api.php';
// MediaWiki throttles clients that don't identify themselves much harder.
const USER_AGENT = 'dossier-build/1.0 (https://github.com/seangcs27/dossier)';
const FETCH_TIMEOUT_MS = 20_000;

async function timedFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function wiki(params) {
  const qs = new URLSearchParams({ ...params, format: 'json', formatversion: '2' });
  const res = await timedFetch(`${WIKI_API}?${qs}`);
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`wiki: ${JSON.stringify(json.error).slice(0, 200)}`);
  return json;
}

// The table writes a file's name with underscores and stray spaces
// ('Endministrator_(Male)_ tooltip.png'); the wiki answers under its own spelling of it.
const fileTitle = file => file.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

const SPLASH_WIDTH = 1024;
// The glyphs are shown at 11 to 28px.
const GLYPH_SIZE = 64;

// Downloads the images of one set that are not already on disk, each re-encoded to WebP by
// `encode`, which is handed the download as a sharp pipeline. An image is { file, name,
// label }: the wiki's file, the name it is baked under, and what the summary line calls it.
// With `width`, what is fetched is the wiki's own thumbnail that wide in place of the
// original. An image that cannot be had is left out, and whatever shows it falls back.
async function bakeImages(set, dir, images, encode, width) {
  await mkdir(dir, { recursive: true });
  const onDisk = new Set(await readdir(dir));
  const missing = images.filter(img => img.file && !onDisk.has(`${img.name}.webp`));
  const failed = [];
  // One request names every file; the wiki answers a file-by-file crawl with a 429.
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    let pages = [];
    try {
      const json = await wiki({
        action: 'query', titles: batch.map(img => `File:${fileTitle(img.file)}`).join('|'),
        prop: 'imageinfo', iiprop: 'url', ...(width ? { iiurlwidth: String(width) } : {}),
      });
      pages = json.query?.pages ?? [];
    } catch (err) {
      failed.push(`${batch.length} ${set} (${err.message})`);
      continue;
    }
    const urlOf = new Map(pages.map(p => [
      p.title.replace(/^File:/, ''), p.imageinfo?.[0]?.[width ? 'thumburl' : 'url'],
    ]));
    for (const img of batch) {
      try {
        const url = urlOf.get(fileTitle(img.file));
        if (!url) throw new Error('not on the wiki');
        const res = await timedFetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const webp = await encode(sharp(Buffer.from(await res.arrayBuffer()))).toBuffer();
        await writeFile(path.join(dir, `${img.name}.webp`), webp);
        onDisk.add(`${img.name}.webp`);
      } catch (err) {
        failed.push(`${img.label} (${err.message})`);
      }
    }
  }
  const have = images.filter(img => onDisk.has(`${img.name}.webp`)).length;
  console.log(
    `endfield ${set}: ${have}/${images.length}` +
    `${failed.length ? ` — missing ${failed.join(', ')}` : ''} -> ${path.relative(process.cwd(), dir)}`,
  );
}

// Each operator's own page, for what the table leaves out (lib/endfield-page.mjs says what).
// Written again every build, since a page changes with the game; one that cannot be had or
// read keeps the last build's payload, where there is one.
async function bakeDetails(rows) {
  await mkdir(detailDir, { recursive: true });
  const titles = [...new Set(rows.map(r => r.Operator))];
  const failed = [];
  let written = 0;
  // One request names every page, as one names every file.
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    let pages = [];
    try {
      const json = await wiki({
        action: 'query', titles: batch.join('|'),
        prop: 'revisions', rvprop: 'content', rvslots: 'main',
      });
      pages = json.query?.pages ?? [];
    } catch (err) {
      failed.push(`${batch.length} pages (${err.message})`);
      continue;
    }
    const textOf = new Map(pages.map(p => [p.title, p.revisions?.[0]?.slots.main.content]));
    // The Endministrator's two forms share a page, and each gets its payload from it.
    for (const row of rows.filter(r => batch.includes(r.Operator))) {
      try {
        const text = textOf.get(row.Operator);
        if (!text) throw new Error('no page on the wiki');
        const detail = { id: row.Id, ...parseOperatorPage(text) };
        await writeFile(path.join(detailDir, `${row.Id}.json`), JSON.stringify(detail));
        written++;
      } catch (err) {
        failed.push(`${row.Operator} (${err.message})`);
      }
    }
  }
  console.log(
    `endfield details: ${written}/${rows.length}` +
    `${failed.length ? ` — skipped ${failed.join(', ')}` : ''} -> ${path.relative(process.cwd(), detailDir)}`,
  );
}

async function buildRoster() {
  const json = await wiki({
    action: 'cargoquery', tables: 'Operators', limit: '500',
    fields: 'Operator,Id,Portrait,Splash,Gender,Rarity,Class,Element,Weapon,Faction,Tags,BirthDate,Quote,' +
      'Expertise1,Expertise2,Hobby1,Hobby2,Prefer,MainAttr,SubAttr,Headhunting',
    order_by: 'Rarity DESC, Operator, Id',
  });
  const rows = json.cargoquery.map(x => x.title).filter(r => r.Id && r.Operator);
  // A schema change would come back as rows with none of the fields asked for.
  if (!rows.length) throw new Error('the Operators table came back empty');

  await bakeDetails(rows);

  const art = field => rows.map(r => ({ file: r[field], name: r.Id, label: r.Operator }));
  // The originals are PNGs of about 150 KB, wanted by one card each.
  await bakeImages(
    'portraits', portraitDir, art('Portrait'), pipeline => pipeline.webp({ quality: 80, effort: 4 }),
  );
  // The originals are 2048px PNGs of 2 to 7 MB, wanted by one page each.
  await bakeImages(
    'splash art', splashDir, art('Splash'), pipeline => pipeline.webp({ quality: 82, effort: 4 }), SPLASH_WIDTH,
  );
  // A glyph for each class, element and weapon type the roster has, named as
  // endfieldIconUrl() asks for it. The wiki files one under the value's own name
  // ('Guard.png', 'Great Sword.png') and draws it beside the word on its own pages: white on
  // transparency, as the Arknights class glyphs are. Its other sets are not glyphs:
  // 'Weapon-Sword.png' is a white tile with the weapon cut out, 'Guard tip.png' a coloured
  // plate. The elements and weapons are only 48px there, and are scaled up to the same square.
  const glyphs = ['Class', 'Element', 'Weapon'].flatMap(kind =>
    [...new Set(rows.map(r => r[kind]))].map(value => ({
      file: `${value}.png`,
      name: `${kind.toLowerCase()}-${value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      label: value,
    })));
  await bakeImages('glyphs', iconDir, glyphs, pipeline => pipeline
    .resize(GLYPH_SIZE, GLYPH_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, effort: 4, alphaQuality: 100 }));

  const named = new Map();
  for (const r of rows) named.set(r.Operator, (named.get(r.Operator) ?? 0) + 1);
  return rows.map(r => ({
    id: r.Id,
    name: r.Operator,
    // Two rows share a name where one operator has two forms, the Endministrator's male and
    // female; this is what tells their cards apart.
    ...(named.get(r.Operator) > 1 ? { variant: r.Gender } : {}),
    rarity: Number(r.Rarity),
    class: r.Class,
    element: r.Element,
    weapon: r.Weapon,
    faction: r.Faction,
    tags: (r.Tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
    gender: r.Gender,
    birthday: r.BirthDate,
    quote: r.Quote,
    expertise: [r.Expertise1, r.Expertise2].filter(known),
    hobbies: [r.Hobby1, r.Hobby2].filter(known),
    gift: r.Prefer,
    mainAttr: r.MainAttr,
    subAttr: r.SubAttr,
    headhunting: r.Headhunting,
  }));
}

await mkdir(outDir, { recursive: true });
try {
  const roster = await buildRoster();
  await writeFile(OPERATORS_FILE, JSON.stringify(roster));
  console.log(`endfield: ${roster.length} operators -> ${path.relative(process.cwd(), OPERATORS_FILE)}`);
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(OPERATORS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(OPERATORS_FILE, '[]');
  console.warn(`endfield/operators.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
