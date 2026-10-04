// Generates src/shared/generated/endfield/operators.json and endfield/portraits/ — the
// roster of Arknights: Endfield, the second game the web target carries.
//
// One source: endfield.wiki.gg's `Operators` Cargo table, the same kind of table the
// Arknights scripts read from arknights.wiki.gg. A row has the operator's id, rarity, class,
// element, weapon, faction and tags, and names four images; the card art is the one it calls
// the portrait, a 180x360 bust like the Arknights cards'.
//
// Nothing here is load-bearing. With the wiki unreachable the last build's file is kept, or
// an empty one written: the Endfield page then has nothing to list, and the build goes on.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'endfield',
);
const OPERATORS_FILE = path.join(outDir, 'operators.json');
const portraitDir = path.join(outDir, 'portraits');

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

// Downloads the portraits not already on disk, re-encoded to WebP: the originals are PNGs of
// about 150 KB, wanted by one card each. A portrait that cannot be had is left out, and its
// card shows the placeholder.
async function bakePortraits(rows) {
  await mkdir(portraitDir, { recursive: true });
  const onDisk = new Set(await readdir(portraitDir));
  const missing = rows.filter(r => r.Portrait && !onDisk.has(`${r.Id}.webp`));
  const failed = [];
  // One request names every file; the wiki answers a file-by-file crawl with a 429.
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    let pages = [];
    try {
      const json = await wiki({
        action: 'query', titles: batch.map(r => `File:${fileTitle(r.Portrait)}`).join('|'),
        prop: 'imageinfo', iiprop: 'url',
      });
      pages = json.query?.pages ?? [];
    } catch (err) {
      failed.push(`${batch.length} portraits (${err.message})`);
      continue;
    }
    const urlOf = new Map(pages.map(p => [p.title.replace(/^File:/, ''), p.imageinfo?.[0]?.url]));
    for (const row of batch) {
      try {
        const url = urlOf.get(fileTitle(row.Portrait));
        if (!url) throw new Error('not on the wiki');
        const res = await timedFetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const webp = await sharp(Buffer.from(await res.arrayBuffer()))
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        await writeFile(path.join(portraitDir, `${row.Id}.webp`), webp);
        onDisk.add(`${row.Id}.webp`);
      } catch (err) {
        failed.push(`${row.Operator} (${err.message})`);
      }
    }
  }
  const have = rows.filter(r => onDisk.has(`${r.Id}.webp`)).length;
  console.log(
    `endfield portraits: ${have}/${rows.length}` +
    `${failed.length ? ` — missing ${failed.join(', ')}` : ''} -> ${path.relative(process.cwd(), portraitDir)}`,
  );
}

async function buildRoster() {
  const json = await wiki({
    action: 'cargoquery', tables: 'Operators', limit: '500',
    fields: 'Operator,Id,Portrait,Gender,Rarity,Class,Element,Weapon,Faction,Tags',
    order_by: 'Rarity DESC, Operator, Id',
  });
  const rows = json.cargoquery.map(x => x.title).filter(r => r.Id && r.Operator);
  // A schema change would come back as rows with none of the fields asked for.
  if (!rows.length) throw new Error('the Operators table came back empty');

  await bakePortraits(rows);

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
