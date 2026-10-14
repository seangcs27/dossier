// Generates src/shared/generated/holodori/characters.json — the roster of hololive Dreams
// (ホロドリ), Cover's rhythm game, which the web target carries as a sticker album of its cast.
//
// One source: HolodoriDB's dump of the game's master database, which a bot on GitHub
// refreshes every three hours. It keeps a repository for each of the game's six languages,
// and each is the whole database: the tables, the same files in every one, and that
// language's text in Lang<Table>_<Lang>.json, which a table points into by id. This reads
// the English one, so nothing it bakes is in Japanese.
//
// The roster is the Character table's playable rows, 54 of its 62 today: the talents the
// game's own site lists as its holomem. The other rows have a name, a group and a costume
// and no profile, cards or songs. The game's Talent Guidelines say a talent who has
// graduated may appear in part or not at all, and those rows are left out here as the
// game's site leaves them out. The game's rarity belongs to its cards, a table of their
// own that is not read.
//
// The pictures are the game's own site's (https://www.hololive-dreams.com/en/holomem), the
// owner's choice: its holomem page has each talent's key art, the whole figure on
// transparency, on the image host the site resizes through. Each is fetched once at 560px
// wide and baked as a bust, the sticker the album shows (holodori/figures/<id>.webp). The
// owner approved the download on 15 October 2026: 54 pictures, about 1.6 MB, baked to
// about 750 KB. The site is matched by her English name, which the dump and the
// site spell alike for all 54.
//
// Nothing here is load-bearing. With GitHub unreachable the last build's file is kept, or
// an empty one written: the page then has nothing to list, and the build goes on. With the
// game's site unreachable no bust is baked that is not on disk already, and a holomem with
// none shows her initial.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { bakeImages } from './lib/bake-images.mjs';
import { fetchJson, timedFetch } from './lib/fetch.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'holodori',
);
const CHARACTERS_FILE = path.join(outDir, 'characters.json');
const FIGURE_DIR = path.join(outDir, 'figures');
// Where the page finds a bust, beside it (webpack.web.js copies the directory).
const FIGURE_PATH = 'holodori/figures';

const DB = 'https://raw.githubusercontent.com/HolodoriDB/holodori-db-eng-diff/main';
const SITE = 'https://www.hololive-dreams.com/en/holomem';

// A sticker's picture is 88x116 inside its border, baked at twice that.
const BUST_W = 176;
const BUST_H = 232;
// The key art is asked of the host at this width, which the faces below were set against.
const ART_W = 560;
// The bust is this share of her figure's height, from just over her head down.
const BUST_SHARE = 0.72;
// Her face's x in the key art, as a percent of its width, where a raised arm, ears or hair
// pull the centre of her head's band off it: set by eye from a sheet of all 54 crops.
const FACE_X = { Nene: 60, Lui: 77, Koyori: 70, Choco: 73, IRyS: 66, Calliope: 74, Fuwawa: 68 };

// One table's rows. The dump wraps each in { id, data }, and files them in no order that
// holds from one dump to the next.
async function table(name) {
  const rows = await fetchJson(`${DB}/${name}.json`);
  return rows.map(row => row.data);
}

const two = n => String(n).padStart(2, '0');

async function buildRoster() {
  const [characters, groupings, productions, ...texts] = await Promise.all([
    'Character', 'CharacterGrouping', 'CharacterProduction',
    'LangCharacter_Eng', 'LangCharacterGrouping_Eng', 'LangCharacterProduction_Eng',
  ].map(table));
  // What a table names with a `...LangId`, in English. The three text tables share no id.
  const text = new Map(texts.flat().map(t => [t.id, t.text]));
  const groupOf = new Map(groupings.map(g => [g.id, g]));
  const branchOf = new Map(productions.map(p => [p.id, text.get(p.nameLangId)]));

  // The dump leaves out every empty value: a row that is not playable has no `isPlayable`
  // at all, and a talent in no group would have no list of them.
  const roster = characters.filter(c => c.isPlayable).sort((a, b) => a.order - b.order).map(c => ({
    id: c.id,
    // The table's own romanised name stands in for a text the English table lacks. Today
    // the two agree for every talent.
    name: text.get(c.nameLangId) ?? c.nameEng,
    shortName: text.get(c.shortNameLangId) ?? c.shortNameEng,
    branch: branchOf.get(c.characterProductionId),
    // In the game's own order of groups, which puts Fubuki's generation before GAMERS, as
    // the game's own line for her does.
    groups: (c.regularCharacterGroupingIds ?? []).map(id => groupOf.get(id))
      .sort((a, b) => a.order - b.order).map(g => text.get(g.nameLangId)),
    fanName: text.get(c.fanNameLangId) ?? '',
    birthday: `${two(c.birthMonth)}-${two(c.birthDay)}`,
    debut: `${c.debutYear}-${two(c.debutMonth)}-${two(c.debutDay)}`,
    // The line she opens with on her profile in the game: "Good foxy day! I'm Shirakami
    // Fubuki!"
    greeting: text.get(c.commentLangId) ?? '',
    // Her five colours, the first her own; the game paints her profile in them.
    colors: [c.color1, c.color2, c.color3, c.color4, c.color5].filter(Boolean).map(hex => `#${hex}`),
  }));
  // The page cannot draw an entry without these four, and a field the dump has renamed or
  // emptied would come back as 'undefined' inside a date. Failing here keeps the last
  // build's roster instead.
  const broken = roster.find(c =>
    !c.name || !c.branch || !/^\d{4}-\d\d-\d\d$/.test(c.debut) || !/^\d\d-\d\d$/.test(c.birthday));
  if (broken) throw new Error(`the Character table has changed shape: ${JSON.stringify(broken)}`);
  if (!roster.length) throw new Error('the Character table has no playable rows');
  return roster;
}

// Each holomem's key art on the game's site, by her English name: the page is static HTML,
// and the <img> of a talent's art carries her slug, the picture's address (with the host's
// resize after the `?`) and her name as its alt text.
async function keyArtByName() {
  const res = await timedFetch(SITE);
  if (!res.ok) throw new Error(`${res.status} from ${SITE}`);
  const html = await res.text();
  const art = new Map();
  for (const m of html.matchAll(/<img[^>]*?data-id="[^"]+"[^>]*?data-src="([^"?]+)[^"]*"[^>]*?alt="([^"]*)"/g)) {
    if (!art.has(m[2])) art.set(m[2], m[1]);
  }
  return art;
}

// Her bust, out of key art that is her whole figure posed on a canvas wider than it. The
// figure's top and foot are read off the alpha, and her face is the centre of the opaque
// pixels in its top quarter, where her head is, unless FACE_X has it.
async function toBust(original, { faceX }) {
  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const solid = (x, y) => data[(y * w + x) * channels + 3] > 128;
  let top = -1;
  let bottom = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      if (top < 0) top = y;
      bottom = y;
      break;
    }
  }
  if (top < 0) throw new Error('no figure in the picture');
  let sum = 0;
  let n = 0;
  const band = top + Math.round((bottom - top) * 0.25);
  for (let y = top; y <= band; y++) for (let x = 0; x < w; x++) if (solid(x, y)) { sum += x; n++; }
  const cx = faceX === undefined ? sum / n : (faceX / 100) * w;
  const cropH = Math.round(BUST_SHARE * (bottom - top));
  const cropW = Math.round((cropH * BUST_W) / BUST_H);
  // A bust near the canvas's edge runs past it, so the canvas is padded with transparency
  // first and the crop taken from that.
  const pad = cropW;
  const padded = await sharp(data, { raw: info })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw().toBuffer({ resolveWithObject: true });
  return sharp(padded.data, { raw: padded.info })
    // Her head starts a twenty-fifth of the way down.
    .extract({ left: Math.round(cx - cropW / 2) + pad, top: Math.round(top - 0.04 * cropH) + pad, width: cropW, height: cropH })
    .resize(BUST_W, BUST_H)
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer();
}

// Bakes the busts not on disk yet and gives each holomem who has one its address.
async function addBusts(roster) {
  let art = new Map();
  try {
    art = await keyArtByName();
  } catch (err) {
    console.warn(`holodori: the game's site could not be read, so no bust is new: ${err.message}`);
  }
  await bakeImages('holodori busts', FIGURE_DIR, roster.filter(c => art.has(c.name)).map(c => ({
    name: c.id, url: `${art.get(c.name)}?fm=webp&w=${ART_W}`, label: c.shortName, faceX: FACE_X[c.shortName],
  })), toBust);
  const onDisk = new Set(await readdir(FIGURE_DIR));
  for (const c of roster) if (onDisk.has(`${c.id}.webp`)) c.art = `${FIGURE_PATH}/${c.id}.webp`;
  const bare = roster.filter(c => !c.art);
  if (bare.length && art.size) console.warn(`holodori: no key art on the game's site for ${bare.map(c => c.name).join(', ')}`);
}

await mkdir(outDir, { recursive: true });
try {
  const roster = await buildRoster();
  await addBusts(roster);
  await writeFile(CHARACTERS_FILE, JSON.stringify(roster));
  console.log(`holodori: ${roster.length} characters -> ${path.relative(process.cwd(), CHARACTERS_FILE)}`);
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(CHARACTERS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(CHARACTERS_FILE, '[]');
  console.warn(`holodori/characters.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
