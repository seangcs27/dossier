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
import { fetchBiliBrands, fetchBiliFiles, fetchBiliImages, fetchBiliPages, fetchBiliSinners, fetchBiliTerms } from './lib/ptn-bili.mjs';
import { parseBiliBrand, parseBiliDetail, parseBiliVoices, termsIn } from './lib/ptn-bili-page.mjs';
import { toEnglish } from './lib/ptn-cn-english.mjs';
import { bakePtnFont, placardText } from './lib/ptn-font.mjs';
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

// Whether an earlier build left a roster to keep.
const haveLast = await readFile(SINNERS_FILE, 'utf8').then(text => text.length > 2, () => false);

// What the game's Chinese wiki gave the last time it was read whole, kept in the repo
// (lib/ptn-bili-snapshot.json): its roster, each Sinner's and each exclusive crimebrand's
// page text with the terms those crimebrands name, and the addresses of the pictures asked
// of it. That wiki answers a client that asks too fast with HTTP 567, GitHub's
// runners among them for a run at a time, and without it a build would lose the CN-only
// Sinners and the Chinese text, or (keeping the last build) freeze the roster behind it.
// Written again by any build that reads it whole, so a local build keeps it fresh and its
// diff is committed with the rest.
const SNAPSHOT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', 'ptn-bili-snapshot.json');
const snapshot = await readFile(SNAPSHOT_FILE, 'utf8').then(JSON.parse, () => ({ rows: [], pages: {}, files: {} }));
const fresh = { rows: [], pages: {}, files: {}, brands: {}, terms: {}, voices: {}, images: {} };
// What a run had of the snapshot, so that it is not written back from a run that was not whole.
let fellBack = false;

// What the Chinese wiki gives: live, or failing that the snapshot, or failing that (a first
// build, with nothing to keep) nothing, which ships the English half. Where there is an
// earlier build and no snapshot of it, an error, so that the last build's files are kept
// whole (the catch at the foot) until the wiki answers.
async function fromChinese(what, ask, fromSnapshot, empty) {
  try {
    return await ask();
  } catch (err) {
    const kept = fromSnapshot();
    fellBack = true;
    if (kept) {
      console.warn(`ptn: ${what} from the snapshot of the Chinese wiki, which would not answer: ${err.message}`);
      return kept;
    }
    if (haveLast) throw new Error(`${what} could not be had from the Chinese wiki: ${err.message}`);
    console.warn(`ptn: no ${what} from the Chinese wiki, so the roster is its English half: ${err.message}`);
    return empty;
  }
}

// The snapshot's pages for these names, as a Map, or nothing where it has none of them.
function snapshotPages(names) {
  const entries = names.filter(name => snapshot.pages[name]).map(name => [name, snapshot.pages[name]]);
  return entries.length ? new Map(entries) : undefined;
}

// As many pages as the wiki gives the text of in one answer, and as many titles as it takes
// in one question. It answers a page-by-page crawl with a 429.
const BATCH = 50;

// The game's three ranks, highest first: the order the roster is dealt in.
const RANKS = ['S', 'A', 'B'];

// A Sinner's name, which is their page's title, in a form that can go in an address or name
// a file: 'mr-fox', 'necresta-hella', '000'.
// What of a CN-only Sinner's payload is translated, and a copy of a part of it with every
// text in English that has some. Pictures, ranges and kinds are not text; the Chinese texts
// left are counted for the build's summary.
const CN_ENGLISH = ['trait', 'mania', 'skills', 'shackles', 'brand', 'extras', 'terms', 'compliance'];
const NOT_TEXT = new Set(['icon', 'image', 'kind', 'ranges']);
let untranslated = 0;
const english = value => {
  if (typeof value === 'string') {
    if (!/\p{Script=Han}/u.test(value)) return value;
    const text = toEnglish(value);
    if (text === undefined) untranslated++;
    return text ?? value;
  }
  if (Array.isArray(value)) return value.map(english);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, NOT_TEXT.has(key) ? v : english(v)]));
  }
  return value;
};

const slugOf = title =>title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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

  // What the game's Chinese wiki adds (lib/ptn-bili.mjs): each Sinner's Chinese name and
  // tags, whether they are limited or a collab's and whether they deal core damage; and
  // the Sinners only the CN server has. Not worth the roster: without it the page has its
  // English half only.
  const bili = await fromChinese('the roster', fetchBiliSinners, () => snapshot.rows.length ? snapshot.rows : undefined, []);
  fresh.rows = bili;
  // The two wikis name a Sinner alike in one of three ways, tried in turn: the Chinese
  // name the English page gives (missing from a few, and garbled on one), the English name
  // the Chinese page gives, and the number, where only one Sinner has it.
  const plain = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const byCn = new Map(bili.map(row => [row.nameCn, row]));
  const byEn = new Map(bili.map(row => [plain(row.name), row]));
  const byNumber = new Map(bili.filter(row => bili.filter(other => other.number === row.number).length === 1).map(row => [row.number, row]));
  const matched = new Set();
  for (const s of sinners) {
    const row = byCn.get(details.find(d => d.id === s.id).names.cn) ?? byEn.get(plain(s.name)) ?? byNumber.get(s.number);
    if (!row) continue;
    matched.add(row);
    s.nameCn = row.nameCn;
    s.tagsCn = row.tagsCn;
    if (row.limited) s.limited = row.limited;
    if (row.core) s.core = true;
  }
  // The rest are on the CN server alone: Sinners still to come to Global, and a collab's
  // that will not. The head of their file is the Chinese wiki's row, under the English name
  // it also gives, and the rest is that wiki's page for them, in Chinese.
  const cnOnly = bili.filter(row => !matched.has(row) && row.rank && row.tendency && row.libram && row.name);
  const cnOnlyNames = cnOnly.map(row => row.nameCn);
  // Every exclusive crimebrand that wiki has, by the Chinese name of the Sinner it is theirs.
  const brandPages = await fromChinese(
    'the crimebrands', fetchBiliBrands,
    () => (snapshot.brands ? new Map(Object.entries(snapshot.brands)) : undefined), new Map(),
  );
  fresh.brands = Object.fromEntries(brandPages);
  const pageOf = await fromChinese('the CN-only Sinners\' pages', () => fetchBiliPages(cnOnlyNames), () => snapshotPages(cnOnlyNames), new Map());
  for (const [name, text] of pageOf) fresh.pages[name] = text;
  // Every other Sinner's page there too, which is their file in Chinese (below).
  const others = sinners.filter(s => !s.cnOnly && s.nameCn);
  const otherNames = others.map(s => s.nameCn);
  const zhPageOf = await fromChinese('the Sinners\' pages', () => fetchBiliPages(otherNames), () => snapshotPages(otherNames), new Map());
  for (const [name, text] of zhPageOf) fresh.pages[name] = text;
  // The terms the crimebrands' effects and the Sinners' pages name, and the terms those
  // name, three deep: the skill a crimebrand grants is one, and what that skill summons or
  // lays down, with its numbers, is the next. A term with no page is kept as '' so that it
  // is not asked for twice.
  const termOf = await fromChinese('the terms', async () => {
    const textOf = new Map();
    let wanted = [...new Set([...brandPages.values(), ...pageOf.values(), ...zhPageOf.values()].flatMap(termsIn))];
    for (let depth = 0; depth < 3 && wanted.length; depth++) {
      const got = await fetchBiliTerms(wanted);
      for (const term of wanted) textOf.set(term, got.get(term) ?? '');
      wanted = [...new Set([...got.values()].flatMap(termsIn))].filter(term => !textOf.has(term));
    }
    return textOf;
  }, () => (snapshot.terms ? new Map(Object.entries(snapshot.terms)) : undefined), new Map());
  fresh.terms = Object.fromEntries(termOf);
  const brandOf = new Map([...brandPages.values()].map(text => parseBiliBrand(text, termOf))
    .filter(parsed => parsed?.brand.name).map(({ holder, brand }) => [holder, brand]));
  for (const row of cnOnly) {
    const id = slugOf(row.name);
    // A collab's Sinner is filed under a code of its own world, not an MBCC number.
    const code = /^\d+$/.test(row.number) || row.number === '数据未知' ? {} : { code: row.number };
    // The page's birthplace is the roster entry's, as the English wiki's is; the rest is the
    // payload. Where the page is not to be had the file is the head alone.
    const { birthplace = '', ...page } = pageOf.has(row.nameCn)
      ? parseBiliDetail(pageOf.get(row.nameCn), row.nameCn, termOf) ?? {}
      : {};
    if (page.names && brandOf.has(row.nameCn)) page.brand = brandOf.get(row.nameCn);
    // Their skills, trait, shackles and the rest in English, translated by hand
    // (lib/ptn-cn-english.mjs), with the Chinese kept as `zh` for the Chinese side, as every
    // other Sinner's is. A text with no English stays Chinese on both.
    const translated = page.names && Object.fromEntries(CN_ENGLISH.filter(key => key in page).map(key => [key, english(page[key])]));
    if (translated && Object.keys(translated).length) {
      page.zh = Object.fromEntries(Object.keys(translated).map(key => [key, page[key]]));
      Object.assign(page, translated);
    }
    sinners.push({
      id, name: row.name, nameCn: row.nameCn,
      number: row.number === '数据未知' ? 'Unknown' : row.number, ...code,
      rank: row.rank, ...(row.height ? { height: row.height } : {}),
      tendency: row.tendency, libram: row.libram, birthplace, tags: [], tagsCn: row.tagsCn,
      ...(row.limited ? { limited: row.limited } : {}), ...(row.core ? { core: true } : {}),
      cnOnly: true, releasedCn: row.releasedCn, ...(page.zh ? { translated: true } : {}),
    });
    details.push({
      id,
      ...(page.names ? page : parseSinnerDetail({
        Name_CN: row.nameCn,
        ...(row.height ? { Height: `${row.height}cm` } : {}),
        Bio: 'This Sinner is on the CN server only, and the English wiki has no page for them.',
      }, row.name)),
    });
  }

  // The Chinese wiki's page for every other Sinner too, which is the same file in Chinese:
  // kept beside the English one as `zh`, for the page to lay over it when the reader is on
  // the Chinese side, with the exclusive crimebrand from that crimebrand's own page. Only
  // what the pages have text for is kept, so what they lack stays the English wiki's. Left
  // out are the numbers, which the English page has at more levels. What the English page
  // has nothing of (LIFT) is the payload's own, in either language.
  const ZH_SKIP = new Set(['names', 'stats', 'block', 'attackSpeed']);
  const LIFT = ['damageType', 'releasedCn', 'reworked', 'contained', 'video', 'dream', 'phases', 'costs'];
  const VOICE_ZH = { CN: '中', JP: '日', KR: '韩' };
  const hasText = value => (typeof value === 'string' ? value !== ''
    : Array.isArray(value) ? value.length > 0
      : value !== null && typeof value === 'object' && Object.values(value).some(hasText));
  for (const s of others) {
    const parsed = zhPageOf.has(s.nameCn) ? parseBiliDetail(zhPageOf.get(s.nameCn), s.nameCn, termOf) : undefined;
    if (!parsed) continue;
    if (brandOf.has(s.nameCn)) parsed.brand = brandOf.get(s.nameCn);
    const detail = details.find(d => d.id === s.id);
    for (const key of LIFT) {
      if (key in parsed) detail[key] = parsed[key];
      delete parsed[key];
    }
    // The ultimate's energy and core damage, on the English one as well.
    const { energy, core } = parsed.skills.find(k => k.kind === 'Ultimate') ?? {};
    const ultimate = detail.skills.find(k => k.kind === 'Ultimate');
    if (ultimate) Object.assign(ultimate, energy === undefined ? {} : { energy }, core === undefined ? {} : { core });
    // Each skill's icon and range, and each shackle's icon and the crimebrand's picture, on
    // the English ones too: the two pages list them in the same order.
    for (const kind of ['Basic Attack', 'Ultimate', 'Passive']) {
      const theirs = parsed.skills.filter(k => k.kind === kind);
      detail.skills.filter(k => k.kind === kind).forEach((k, i) => {
        if (theirs[i]?.icon) k.icon = theirs[i].icon;
        if (theirs[i]?.ranges) k.ranges = theirs[i].ranges;
      });
    }
    detail.shackles.forEach((k, i) => { if (parsed.shackles[i]?.icon) k.icon = parsed.shackles[i].icon; });
    if (parsed.brand.image && detail.brand.name) detail.brand.image = parsed.brand.image;
    const zh = Object.fromEntries(Object.entries(parsed).filter(([key, value]) => !ZH_SKIP.has(key) && hasText(value)));
    // The English page's sticker is the 100% stage, which the Chinese stages have as their last.
    if (zh.compliance) zh.sticker = '';
    // The Chinese page names the CN voice actor alone, in Chinese: in that one's place in the
    // English list of three, whose languages are said in Chinese too.
    if (zh.voice) {
      zh.voice = [`${zh.voice[0]}（中）`, ...detail.voice.filter(v => !/\(CN\)$/.test(v))]
        .map(v => v.replace(/ \((CN|JP|KR)\)$/, (_, l) => `（${VOICE_ZH[l]}）`));
    }
    detail.zh = zh;
  }

  // Every Sinner's voice lines, from their voice page there (语音:<name>), in Chinese in
  // either language, since the English wiki has none. Short of the wiki, the snapshot's, or
  // none: the lines are not worth keeping the last build whole for.
  const castNames = sinners.filter(s => s.nameCn).map(s => s.nameCn);
  const voiceOf = await fromChinese(
    'the voice lines', () => fetchBiliPages(castNames, '语音:'),
    () => new Map(Object.entries(snapshot.voices ?? {})), new Map(),
  );
  fresh.voices = Object.fromEntries(voiceOf);
  for (const s of sinners.filter(s => voiceOf.has(s.nameCn))) {
    const lines = parseBiliVoices(voiceOf.get(s.nameCn));
    if (lines.length) details.find(d => d.id === s.id).voiceLines = lines;
  }

  // Every picture the Chinese pages show beside their text (a skill's icon, a shackle's, the
  // crimebrand's, the phase-up's unlocks, a material's) is a file's title in the payload
  // (`icon`, `image`): here it becomes the file's address, or goes where the wiki has none.
  // Never downloaded: the page has the proxy resize them.
  const pictured = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      if (['icon', 'image'].some(key => typeof value[key] === 'string')) pictured.add(value);
      Object.values(value).forEach(walk);
    }
  };
  details.forEach(walk);
  const imageTitles = [...new Set([...pictured].flatMap(v => ['icon', 'image'].map(key => v[key]).filter(t => typeof t === 'string')))];
  const imageOf = await fromChinese(
    'the pictures beside the text', () => fetchBiliImages(imageTitles),
    () => new Map(Object.entries(snapshot.images ?? {})), new Map(),
  );
  fresh.images = Object.fromEntries(imageOf);
  for (const value of pictured) {
    for (const key of ['icon', 'image']) {
      if (typeof value[key] !== 'string') continue;
      if (imageOf.has(value[key])) value[key] = imageOf.get(value[key]);
      else delete value[key];
    }
  }
  console.log(`ptn: ${imageOf.size} of ${imageTitles.length} pictures beside the text found on the Chinese wiki`);

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
  }

  // A Sinner the English wiki lacks one of the three pictures every Sinner has of (Pine,
  // Pixel, Kisugi Ai, everyone on the CN server alone) has the Chinese wiki's where it has
  // one: the same artwork under that wiki's own names for it. The first and the last are
  // baked below; the phase-up art is a scene, hung and resized by the proxy as the English
  // wiki's is, so it is only listed.
  const detailOf = new Map(details.map(d => [d.id, d]));
  const KINDS = [
    { kind: 'original', suffix: '立绘', label: 'Original' },
    { kind: 'phase', suffix: '升阶', label: 'Phase-up' },
    { kind: 'mugshot', suffix: '证件照', label: 'Mugshot' },
  ];
  for (const { kind, suffix, label } of KINDS) {
    const short = sinners.filter(s => s.nameCn && !detailOf.get(s.id).arts.some(art => art.kind === kind));
    if (!short.length) continue;
    const biliUrlOf = await fromChinese(
      label.toLowerCase(),
      () => fetchBiliFiles(short.map(s => s.nameCn), suffix),
      () => (snapshot.files[suffix] ? new Map(Object.entries(snapshot.files[suffix])) : undefined),
      new Map(),
    );
    fresh.files[suffix] = Object.fromEntries(biliUrlOf);
    for (const s of short) {
      const url = biliUrlOf.get(s.nameCn);
      if (!url) continue;
      // In the game's own order: the original, the phase-up art, the mugshot, then the rest.
      const arts = detailOf.get(s.id).arts;
      const before = KINDS.slice(0, KINDS.findIndex(k => k.kind === kind)).map(k => k.kind);
      arts.splice(arts.filter(art => before.includes(art.kind)).length, 0, { kind, label, url });
    }
  }

  // Where each Sinner's mugshot and original are, for the bakes below.
  const mugshotOf = new Map();
  const originalOf = new Map();
  for (const detail of details) {
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

  // The snapshot, from a run that read the Chinese wiki whole. A page's own notes to its
  // editors are left out of it, and so is a page of a Sinner the wiki no longer lists.
  if (!fellBack && fresh.rows.length) {
    const listed = new Set(fresh.rows.map(row => row.nameCn));
    const pages = Object.fromEntries(Object.entries({ ...snapshot.pages, ...fresh.pages })
      .filter(([name]) => listed.has(name))
      .map(([name, text]) => [name, text.replace(/<!--[\s\S]*?-->/g, '')]));
    const files = Object.fromEntries([...new Set([...Object.keys(snapshot.files), ...Object.keys(fresh.files)])]
      .map(suffix => [suffix, { ...snapshot.files[suffix], ...fresh.files[suffix] }]));
    await writeFile(SNAPSHOT_FILE, JSON.stringify({ rows: fresh.rows, pages, files, brands: fresh.brands, terms: fresh.terms, voices: fresh.voices, images: fresh.images }));
  }
  return { sinners, details, unfinished, strays };
}

await mkdir(detailDir, { recursive: true });
try {
  const { sinners, details, unfinished, strays } = await buildRoster();
  await writeFile(SINNERS_FILE, JSON.stringify(sinners));
  // Written again every build, since a page changes with the game.
  await Promise.all(details.map(d => writeFile(path.join(detailDir, `${d.id}.json`), JSON.stringify(d))));
  console.log(`ptn details: ${details.length}, ${details.filter(d => d.zh).length} with the Chinese wiki's text beside the English -> ${path.relative(process.cwd(), detailDir)}`);
  console.log(`ptn CN-only: ${sinners.filter(s => s.translated).length} translated, ${untranslated} texts still Chinese (lib/ptn-cn-english.mjs)`);
  const artless = sinners.filter(s => !s.figure).map(s => s.name);
  const undated = sinners.filter(s => !s.released && !s.cnOnly).map(s => s.name);
  console.log(
    `ptn: ${sinners.length} sinners, ${sinners.filter(s => s.nameCn).length} with a Chinese name, ${sinners.filter(s => s.cnOnly).length} on CN only` +
    `${artless.length ? ` — no mugshot for ${artless.join(', ')}` : ''}` +
    `${unfinished.length ? ` — unfinished pages left out: ${unfinished.join(', ')}` : ''}` +
    ` -> ${path.relative(process.cwd(), SINNERS_FILE)}`,
  );
  if (undated.length) console.warn(`ptn: no release recorded for ${undated.join(', ')} — add them to scripts/lib/ptn-record.mjs`);
  if (strays.length) console.warn(`ptn: the release record names ${strays.join(', ')}, whom the roster does not have`);
  await bakePtnFont(await placardText(sinners, details));
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(SINNERS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(SINNERS_FILE, '[]');
  console.warn(`ptn/sinners.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
