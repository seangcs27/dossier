// Generates src/shared/generated/fgo/: servants.json, the roster of Fate/Grand Order, one
// of the games the web target carries, and figures/, its card art.
//
// One source: Atlas Academy's export API, which publishes the game's data for each of its
// servers as whole files. The ones read here are its "basic" exports, the ones it trims
// down for indexing: about half a megabyte each, a row per Servant with its id, collection
// number, name, class, rarity, attribute and traits. The full exports run to tens of
// megabytes, which is not for a build to download.
//
// Two servers are joined, as the Arknights index joins Global and CN. NA is the English
// server and JP is ahead of it, so a Servant only JP has is kept and flagged `jpOnly`,
// under the English name Atlas Academy gives it.
//
// The card art is the figure the game stands in a party slot, a PNG of about 95 KB on Atlas
// Academy's file host. Each is baked once to WebP, cut to what a card shows of it (the
// owner approved the downloads on 11 October 2026). A Servant's `art` is the baked file,
// or the original's address where the bake could not get it.
//
// Nothing here is load-bearing. With the API unreachable the last build's file is kept, or
// an empty one written: the FGO page then has nothing to list, and the build goes on.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bakeImages } from './lib/bake-images.mjs';
import { fetchJson } from './lib/fetch.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'fgo',
);
const SERVANTS_FILE = path.join(outDir, 'servants.json');
const figureDir = path.join(outDir, 'figures');
// Where webpack.web.js copies that directory to beside the page, and so what an entry's
// `art` starts with.
const FIGURE_PATH = 'fgo/figures';

const API = 'https://api.atlasacademy.io';
// Atlas Academy's file host, which keeps each server's images under the server's name.
const STATIC = 'https://static.atlasacademy.io';

// An export lists everything the game numbers in its Spirit Origin List, and a few of
// those can only be fought, Goetia and Tiamat among them. Their type is
// 'enemyCollectionDetail'. A Servant that can be summoned is 'normal', and Mash, who is
// given and not summoned, is alone in being 'heroine'.
const PLAYABLE = new Set(['normal', 'heroine']);

// 'alterEgo' as 'Alter Ego': an export writes a class or an attribute as one camelCase
// word, and split at its capitals that is the name Atlas Academy's own site prints.
const words = name => name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

function toServant(row, region) {
  return {
    id: row.id,
    collectionNo: row.collectionNo,
    // Eight Servants go by another name until an ascension gives the true one: Mélusine is
    // summoned as Tam Lin Lancelot. For those an export has the first name as `name` and
    // the true one, which is the game's own name for the Servant, as `overwriteName`.
    name: row.overwriteName ?? row.name,
    ...(row.overwriteName ? { alias: row.name } : {}),
    rarity: row.rarity,
    class: words(row.className),
    attribute: words(row.attribute),
    // The traits spell an alignment out as its two halves, 'alignmentLawful' and
    // 'alignmentGood'. A few Servants have one half, three, or none.
    alignment: row.traits.map(t => /^alignment(.+)/.exec(t.name)?.[1]).filter(Boolean),
    // The figure the game stands in a party slot, at the first ascension: tall and narrow,
    // the nearest thing it has to the card's 1:2 plate.
    art: `${STATIC}/${region}/NarrowFigure/${row.id}/${row.id}@0.png`,
    ...(region === 'JP' ? { jpOnly: true } : {}),
  };
}

// How far down the figure a card starts, as a share of what the figure has beyond the
// plate's height: _fgo.scss's `object-position`, where the sum is. The two have to agree.
const LIFT = 0.18;

// A figure as a card shows it. The plate is 1:2 and the figure is 148x375, so a card shows
// two widths of it, from just under the two cut corners at its top. The rest is cut here.
async function toPlate(original) {
  const { width, height } = await sharp(original).metadata();
  const shown = Math.min(height, 2 * width);
  return sharp(original)
    .extract({ left: 0, top: Math.round(LIFT * (height - shown)), width, height: shown })
    .webp({ quality: 80, effort: 4 }).toBuffer();
}

async function buildRoster() {
  const [na, jp] = await Promise.all([
    fetchJson(`${API}/export/NA/basic_servant.json`),
    fetchJson(`${API}/export/JP/basic_servant_lang_en.json`),
  ]);
  const playable = (rows, region) =>
    rows.filter(row => PLAYABLE.has(row.type)).map(row => toServant(row, region));
  const onNa = new Set(na.map(row => row.id));
  // In the order of the collection numbers, which is the game's own. NA's newest can be
  // numbered past Servants only JP has, so the two lists interleave.
  const roster = [...playable(na, 'NA'), ...playable(jp.filter(row => !onNa.has(row.id)), 'JP')]
    .sort((a, b) => a.collectionNo - b.collectionNo);
  // A schema change would come back as rows with none of the fields read here.
  if (!roster.length) throw new Error('the exports have no playable Servant');

  const baked = await bakeImages(
    'fgo figures', figureDir,
    roster.map(s => ({ name: String(s.id), url: s.art, label: s.name })), toPlate,
  );
  for (const s of roster) if (baked.has(String(s.id))) s.art = `${FIGURE_PATH}/${s.id}.webp`;
  return roster;
}

await mkdir(outDir, { recursive: true });
try {
  const roster = await buildRoster();
  await writeFile(SERVANTS_FILE, JSON.stringify(roster));
  const jpOnly = roster.filter(servant => servant.jpOnly).length;
  console.log(
    `fgo: ${roster.length} servants, ${jpOnly} of them JP only -> ${path.relative(process.cwd(), SERVANTS_FILE)}`,
  );
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(SERVANTS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(SERVANTS_FILE, '[]');
  console.warn(`fgo/servants.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
