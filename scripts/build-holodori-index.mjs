// Generates src/shared/generated/holodori/characters.json — the roster of hololive Dreams
// (ホロドリ), Cover's rhythm game, which the web target carries as a sticker sheet of its cast
// — and beside it songs.json, cards.json and gachas.json, the game's songs, cards and gachas
// (below).
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
// game's site leaves them out.
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
import { CLIP_AT, MV_FOR } from './lib/holodori-clips.mjs';
import { GACHAS } from './lib/holodori-gachas.mjs';
import { buildAnnouncements } from './lib/holodori-news.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'holodori',
);
const CHARACTERS_FILE = path.join(outDir, 'characters.json');
const FIGURE_DIR = path.join(outDir, 'figures');
// Where the page finds a bust, beside it (webpack.web.js copies the directory).
const FIGURE_PATH = 'holodori/figures';

const SONGS_FILE = path.join(outDir, 'songs.json');
const CARDS_FILE = path.join(outDir, 'cards.json');
const GACHAS_FILE = path.join(outDir, 'gachas.json');
const UPCOMING_FILE = path.join(outDir, 'upcoming.json');
const ANNOUNCEMENTS_FILE = path.join(outDir, 'announcements.json');
const JACKET_DIR = path.join(outDir, 'jackets');
const JACKET_PATH = 'holodori/jackets';
// A song's jacket, as the Songs page shows it at up to 120px, at twice that.
const JACKET_W = 240;

const DB = 'https://raw.githubusercontent.com/HolodoriDB/holodori-db-eng-diff/main';
// The same dump's Japanese edition, read for the voice lines' Japanese alone.
const DB_JA = 'https://raw.githubusercontent.com/HolodoriDB/holodori-db-jpn-diff/main';
const SITE = 'https://www.hololive-dreams.com/en/holomem';
const MUSIC_PAGE = 'https://www.hololive-dreams.com/en/music';

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
  // Her whole figure is not baked: her page asks the site's image host for it at its size.
  for (const c of roster) if (art.has(c.name)) c.figure = art.get(c.name);
  const bare = roster.filter(c => !c.art);
  if (bare.length && art.size) console.warn(`holodori: no key art on the game's site for ${bare.map(c => c.name).join(', ')}`);
}

// ── Stickers and icons ──
// Each holomem's membership stickers (two sign-up stickers and four more, from the Stamp
// table) and the game's round icon of her, both from HolodoriDB's CDN, the game's own files:
// approved by the owner on 17 October 2026 (318 stickers at 512px, baked at 256; 54 icons at
// 256px, baked at 128). A sticker's file names her by the number in her id; FUWAMOCO's
// (80001) are both twins'. The 11 common stickers ('Good', 'Thanks') are no one's and are
// left out.

const STICKER_DIR = path.join(outDir, 'stickers');
const ICON_DIR = path.join(outDir, 'icons');
const STICKER_W = 256;
const ICON_W = 128;
const TWINS = { '80001': ['04016', '04017'] };

async function addStickers(roster) {
  const [stamps, langs] = await Promise.all(['Stamp', 'LangStamp_Eng'].map(table));
  const text = new Map(langs.map(t => [t.id, t.text]));
  const mine = new Map();
  for (const s of stamps.filter(s => s.assetId.startsWith('chr-membership-')).sort((a, b) => a.order - b.order)) {
    const num = /(\d{5})-\d+$/.exec(s.assetId)?.[1];
    for (const n of TWINS[num] ?? [num]) mine.set(n, [...(mine.get(n) ?? []), s]);
  }
  const all = [...new Map([...mine.values()].flat().map(s => [s.assetId, s])).values()];
  const stickers = await bakeImages('holodori stickers', STICKER_DIR, all.map(s => ({
    name: s.assetId, url: `${CDN}/img_stamp_${s.assetId}_lang-eng/img_stamp_${s.assetId}_lang-eng.webp`, label: s.assetId,
  })), original => sharp(original).resize(STICKER_W, STICKER_W).webp({ quality: 80 }).toBuffer());
  const icons = await bakeImages('holodori icons', ICON_DIR, roster.map(c => ({
    name: c.id, url: `${CDN}/img_chr_icon_normal_${c.id.slice(4)}/img_chr_icon_normal_${c.id.slice(4)}.webp`, label: c.shortName,
  })), original => sharp(original).resize(ICON_W, ICON_W).webp({ quality: 82 }).toBuffer());
  for (const c of roster) {
    if (icons.has(c.id)) c.icon = `holodori/icons/${c.id}.webp`;
    // 'Tokino Sora Membership Sign-Up Sticker No.1' is her 'Sign-Up Sticker No.1'.
    c.stickers = (mine.get(c.id.slice(4)) ?? []).filter(s => stickers.has(s.assetId)).map(s => ({
      name: (text.get(s.nameLangId) ?? '').replace(/^.* Membership /, ''), art: `holodori/stickers/${s.assetId}.webp`,
    }));
  }
}

// ── Songs ──
// The Music table's every row (216 today, all of them released), with its four charts'
// levels from MusicDifficulty. The jackets are the game's site's music page, which lists
// fewer songs than the game has (157 of 216 on 16 October 2026); a song it lacks has none,
// and the page paints one in its singers' colours. The owner approved the download on 16
// October 2026: each jacket asked of the site's image host as a 240px WebP.

const KINDS = { ORIGINAL: 'Original', COVER: 'Cover' };
const CHARTS = ['EASY', 'NORMAL', 'HARD', 'EXPERT'];
const tail = s => s.split('_').pop();
const day = ms => new Date(Number(ms)).toISOString().slice(0, 10);

async function buildSongs() {
  const [music, charts, langs] = await Promise.all(['Music', 'MusicDifficulty', 'LangMusic_Eng'].map(table));
  const text = new Map(langs.map(t => [t.id, t.text]));
  const levels = new Map();
  for (const c of charts) {
    const at = CHARTS.indexOf(tail(c.difficultyType));
    if (at < 0) continue;
    if (!levels.has(c.musicId)) levels.set(c.musicId, [0, 0, 0, 0]);
    levels.get(c.musicId)[at] = c.difficultyLevel;
  }
  const songs = music.filter(m => !m.isTutorial).sort((a, b) => a.order - b.order).map(m => ({
    id: m.id,
    title: text.get(m.titleLangId) ?? m.id,
    // As the game credits them: a unit's name, or the singers' names with commas.
    singers: (text.get(m.characterGroupDisplayNameLangId) ?? '').replace(/,/g, ', '),
    cast: m.characterIds ?? [],
    kind: KINDS[tail(m.categoryType)] ?? 'Original',
    levels: levels.get(m.id) ?? [0, 0, 0, 0],
    seconds: m.playingSeconds ?? 0,
    lyricist: text.get(m.lyricistLangId) ?? '',
    composer: text.get(m.composerLangId) ?? '',
    arranger: text.get(m.arrangerLangId) ?? '',
    added: day(m.startTime),
    // PRESET is had from the start, SHOP is bought, REWARD is a quest's, and says which.
    release: tail(m.releaseType).toLowerCase(),
    unlock: text.get(m.lockDescriptionLangId) ?? '',
    mv: m.mvUrl || (MV_FOR[m.id] ? `https://www.youtube.com/watch?v=${MV_FOR[m.id]}` : ''),
    // The start and end in milliseconds of the part the page plays of its music video: the
    // chorus the game marks, or, where the video is not the game's cut, the recorded estimate.
    chorus: CLIP_AT[m.id]
      ? CLIP_AT[m.id].map(s => s * 1000)
      : Number.isFinite(m.chorusStartMillisecond) && Number.isFinite(m.chorusEndMillisecond) && m.chorusEndMillisecond > m.chorusStartMillisecond
        ? [m.chorusStartMillisecond, m.chorusEndMillisecond] : undefined,
    estimated: CLIP_AT[m.id] ? true : undefined,
    copyright: m.copyright ?? '',
    // Its jacket's name on the CDN, for addJackets; not written to the file.
    jacketAsset: m.jacketAssetId || m.id,
  }));
  if (!songs.length) throw new Error('the Music table has no rows');
  return songs;
}

// The music page's jackets by title: each song is a jacket <img> and then its title in an
// <h3>. The image's file is named for the Japanese title, so the English one is what joins.
async function jacketsByTitle() {
  const res = await timedFetch(MUSIC_PAGE);
  if (!res.ok) throw new Error(`${res.status} from ${MUSIC_PAGE}`);
  const html = await res.text();
  const art = new Map();
  for (const m of html.matchAll(/<img src="(https:\/\/images\.microcms-assets\.io\/[^"?]+)[^>]*class="Music__item__thumb"[\s\S]*?<h3 class="Music__item__title"[^>]*>([\s\S]*?)<\/h3>/g)) {
    const title = squash(m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
    if (!art.has(title)) art.set(title, m[1]);
  }
  return art;
}

// A title blind to case, spaces, quotes and the game's ornaments, which the site and the
// database spell differently ('Dream☆Story', 'Dream Story').
const squash = t => t.normalize('NFKC').toLowerCase().replace(/[\s'"’“”・☆★♪!?.,~〜\-–—:()]/g, '');

async function addJackets(songs) {
  let art = new Map();
  try {
    art = await jacketsByTitle();
  } catch (err) {
    console.warn(`holodori: the game's music page could not be read, so no jacket is new: ${err.message}`);
  }
  // A song the official site does not list (the newer ones, 58 on 17 October 2026) has its
  // jacket from HolodoriDB's CDN instead, the game's own file: approved by the owner that day.
  await bakeImages('holodori jackets', JACKET_DIR, songs.map(s => ({
    name: s.id,
    url: art.has(squash(s.title))
      ? `${art.get(squash(s.title))}?fm=webp&w=${JACKET_W}`
      : `${CDN}/img_music_jacket_${s.jacketAsset}/img_music_jacket_${s.jacketAsset}.webp`,
    label: s.title,
  })), original => sharp(original).resize(JACKET_W, JACKET_W).webp({ quality: 80 }).toBuffer());
  for (const s of songs) delete s.jacketAsset;
  const onDisk = new Set(await readdir(JACKET_DIR));
  for (const s of songs) if (onDisk.has(`${s.id}.webp`)) s.jacket = `${JACKET_PATH}/${s.id}.webp`;
}

// ── Cards ──
// The Card table's every row (192 today): cards.json, the list the Cards page shows, and a
// payload per card (card-details/<id>.json), which its own page fetches: its base stat at
// every level, the level cap at each limit break, what each of its five blooms does, its
// four skills at both their levels, the outfit it gives and that outfit's skill, its voice
// lines and its live dialogues. The numbers were checked against holodori.best's card page:
// a stat is the level's base times the card's share of it, rounded up, then raised by the
// blooms' stat boosts (which add up) and rounded up again.
//
// The art is HolodoriDB's CDN's (cdn.holodori.dev), which serves the game's own files
// unpacked: each card's portrait and its full illustration (1820x1024), baked once, the
// second at 1024 wide. Both are the `_unsquished` files: the plain ones are the same pictures
// stretched to the texture's shape (the portrait to 256x512, which drew every card's art
// tall and narrow; its true shape is 256x363). The owner approved the download on 17
// October 2026: 192 of each, about 74 MB. The 5-star cards' animations and signatures and
// every voice line are played from the CDN, not downloaded.

const CDN = 'https://cdn.holodori.dev/assets/assetbundles';
const CARD_THUMB_DIR = path.join(outDir, 'card-art');
const CARD_FULL_DIR = path.join(outDir, 'card-full');
const CARD_DETAIL_DIR = path.join(outDir, 'card-details');
// The full illustration as the card's page shows it, at most this wide.
const CARD_FULL_W = 1024;
// A card's voice lines, in the order holodori.best lists them, and what each is called.
const VOICES = [
  ['gachaAnimationCharacterVoiceId', 'Card get'],
  ['cardDetailCharacterVoiceId', 'Conversation'],
  ['liveSkillCharacterVoiceId', 'Live skill'],
  ...[1, 2, 3, 4, 5].map(n => [`potentialUpgrade${n}CharacterVoiceId`, `Bloom ${n}`]),
];
// What a bloom does, by the tail of its effect type.
const BLOOMS = {
  ACTIVE_SKILL_LEVEL_UP: 'active', SPECIAL_SKILL_LEVEL_UP: 'special', PASSIVE_SKILL_LEVEL_UP: 'passive',
  SKILL_TREE_CONNECT_EFFECT_LEVEL_UP: 'connect', ALL_PARAMETER_UP_PERMIL_UP: 'stats',
};
// A dialogue's name opens with the card's in lenticular brackets.
const unbracket = t => t.replace(/^【[^】]*】\s*/, '');

// Rows of a table grouped by one of their fields, each group sorted by another.
function groupBy(rows, key, order) {
  const groups = new Map();
  for (const r of rows) groups.set(r[key], [...(groups.get(r[key]) ?? []), r]);
  for (const g of groups.values()) g.sort((a, b) => a[order] - b[order]);
  return groups;
}

async function buildCards() {
  // A JP holomem's reveal shows her line in Japanese, as she says it. Without it the reveal
  // shows the English, so it is not worth failing the cards for.
  const jaVoices = fetchJson(`${DB_JA}/LangCharacterVoice_Jpn.json`).catch((err) => {
    console.warn(`holodori: no Japanese voice text: ${err.message}`);
    return [];
  });
  const [
    cards, levels, limits, potentials, passives, actives, specials, connects, costumes, leaders, targets,
    voices, dialogues, passiveEffects, activeEffects, ...texts
  ] = await Promise.all([
    'Card', 'CardLevel', 'CardLevelLimit', 'CardPotential', 'LivePassiveSkillLevel', 'LiveActiveSkillLevel',
    'LiveSpecialSkillLevel', 'SkillTreeConnectEffect', 'Costume', 'LiveLeaderSkill', 'LiveSkillEffectTarget',
    'CharacterVoice', 'LiveDialogueVoice', 'LivePassiveSkillEffect', 'LiveActiveSkillEffect',
    'LangCard_Eng', 'LangGeneratedLivePassiveSkillLevel_Eng', 'LangGeneratedLiveActiveSkillLevel_Eng',
    'LangGeneratedLiveSpecialSkillLevel_Eng', 'LangGeneratedSkillTreeConnectEffect_Eng', 'LangCostume_Eng',
    'LangGeneratedLiveLeaderSkill_Eng', 'LangGeneratedLiveSkillEffectTarget_Eng', 'LangCharacterVoice_Eng',
    'LangLiveDialogueVoice_Eng',
  ].map(table));
  // A voice table's row can have no text at all.
  const text = new Map(texts.flat().map(t => [t.id, (t.text ?? '').trim()]));
  const ja = new Map((await jaVoices).map(({ data: t }) => [t.id, (t.text ?? '').trim()]));
  // A card's type ('Cute', 'Pure', 'Happy') is named nowhere but in the skills that aim at
  // it: a target's text is '1 [attribute=cute]Cute Type[/attribute] Members'.
  const typeOf = new Map();
  for (const t of targets) {
    const name = /\[attribute=[^\]]+\](\S+) Type/.exec(text.get(t.descriptionLangId) ?? '')?.[1];
    if (t.cardAttributeType && name) typeOf.set(t.cardAttributeType, name);
  }
  const costumeOf = new Map(costumes.map(c => [c.id, c]));
  const leaderOf = new Map(leaders.map(l => [l.id, l]));
  const voiceOf = new Map(voices.map(v => [v.id, v]));
  const levelsOf = groupBy(levels, 'groupId', 'level');
  // A limit break's row carries no count of its own: each raises the cap, so they sort by it.
  const limitsOf = groupBy(limits, 'groupId', 'levelLimit');
  const bloomsOf = groupBy(potentials, 'groupId', 'upgradeCount');
  // A skill's text at each of its levels, by its id.
  const skillTexts = (rows, key) => {
    const byId = groupBy(rows, key, 'level');
    return id => (byId.get(id) ?? []).map(r => text.get(r.descriptionLangId) ?? '');
  };
  const passive = skillTexts(passives, 'livePassiveSkillId');
  const active = skillTexts(actives, 'liveActiveSkillId');
  const special = skillTexts(specials, 'liveSpecialSkillId');
  const connect = skillTexts(connects, 'id');
  // A skill's icon is named for what its first effect does, as the CDN files it
  // ('img_skill_icon_active_scoreuppermilup'); a special skill's effects are an active one's.
  const effectIcon = new Map();
  for (const [kind, rows] of [['passive', passiveEffects], ['active', activeEffects]]) {
    for (const e of rows.filter(r => r.number === 1)) {
      effectIcon.set(e.groupId, `${kind}_${e.type.replace(/.*_EFFECT_TYPE_/, '').replace(/_/g, '').toLowerCase()}`);
    }
  }
  const skillIcon = (rows, key, group) => {
    const groupOf = new Map(rows.filter(r => r.level === 1).map(r => [r[key], r[group]]));
    return id => effectIcon.get(groupOf.get(id)) ?? '';
  };
  const passiveIcon = skillIcon(passives, 'livePassiveSkillId', 'livePassiveSkillEffectGroupId');
  const activeIcon = skillIcon(actives, 'liveActiveSkillId', 'liveActiveSkillEffectGroupId');
  const specialIcon = skillIcon(specials, 'liveSpecialSkillId', 'liveActiveSkillEffectGroupId');

  const list = [];
  const details = [];
  for (const c of cards.sort((a, b) => a.order - b.order)) {
    const costume = costumeOf.get(c.rewardCostumeId);
    const leader = costume && leaderOf.get(costume.liveLeaderSkillId);
    const outfit = costume ? text.get(costume.nameLangId) ?? '' : '';
    list.push({
      id: c.id,
      holomem: c.characterId,
      name: text.get(c.nameLangId) ?? c.id,
      rarity: Number(tail(c.rarity)),
      type: typeOf.get(c.attributeType) ?? '',
      outfit,
      // What the card's page shows before its payload comes: its files' name on the CDN, and
      // whether it has an animation and a signature (the 5-star cards).
      asset: c.assetId,
      movie: c.assetType.endsWith('MOVIE'),
    });
    // Her live dialogues on this card, each her line and another holomem's answer. The one
    // that ends '_myself' is her card-get line again.
    const prefix = `live_dial_voice_card_${c.assetId}_`;
    details.push({
      id: c.id,
      // The share of her three stats the card weights each by, in thousandths.
      permil: [c.performancePermilMultiply, c.techniquePermilMultiply, c.sensePermilMultiply],
      levels: (levelsOf.get(c.cardLevelGroupId) ?? []).map(l => Number(l.parameterBaseValue)),
      limits: (limitsOf.get(c.cardLevelLimitGroupId) ?? []).map(l => l.levelLimit),
      blooms: (bloomsOf.get(c.cardPotentialGroupId) ?? []).map(p => {
        const kind = BLOOMS[p.effectType.replace(/.*_EFFECT_TYPE_/, '')] ?? 'other';
        return kind === 'stats' ? { kind, up: Number(p.value) } : { kind };
      }),
      passive: passive(c.livePassiveSkillId),
      active: active(c.liveActiveSkillId),
      special: special(c.liveSpecialSkillId),
      connect: connect(c.skillTreeConnectEffectId),
      icons: {
        passive: passiveIcon(c.livePassiveSkillId),
        active: activeIcon(c.liveActiveSkillId),
        special: specialIcon(c.liveSpecialSkillId),
      },
      outfit,
      outfitSkill: leader ? text.get(leader.descriptionLangId) ?? '' : '',
      voices: VOICES.flatMap(([key, label]) => {
        const v = voiceOf.get(c[key]);
        return v ? [{
          label, text: text.get(v.textLangId) ?? '', ...(ja.get(v.textLangId) ? { ja: ja.get(v.textLangId) } : {}),
          audio: v.voiceAssetId,
        }] : [];
      }),
      dialogues: dialogues.filter(d => d.id.startsWith(prefix) && !d.id.endsWith('_myself'))
        .sort((a, b) => a.order - b.order)
        .map(d => ({
          title: unbracket(text.get(d.nameLangId) ?? ''),
          lines: d.characterVoiceIds.flatMap(id => {
            const v = voiceOf.get(id);
            return v ? [{ holomem: v.characterId, text: text.get(v.textLangId) ?? '', audio: v.voiceAssetId }] : [];
          }),
        })),
    });
  }
  if (!list.length) throw new Error('the Card table has no rows');
  await addCardArt(list);
  await mkdir(CARD_DETAIL_DIR, { recursive: true });
  for (const d of details) await writeFile(path.join(CARD_DETAIL_DIR, `${d.id}.json`), JSON.stringify(d));
  console.log(`holodori: ${details.length} card payloads -> ${path.relative(process.cwd(), CARD_DETAIL_DIR)}`);
  return list;
}

// Bakes each card's portrait and full illustration not on disk yet, and gives the card the
// address of each that is on disk.
async function addCardArt(list) {
  const of = (kind, suffix) => list.map(c => ({
    name: c.id, url: `${CDN}/img_card_${kind}_${c.asset}/img_card_${kind}_${c.asset}${suffix}.webp`, label: c.name,
  }));
  const thumbs = await bakeImages('holodori card art', CARD_THUMB_DIR, of('vert', '_unsquished'),
    original => sharp(original).webp({ quality: 80 }).toBuffer());
  const fulls = await bakeImages('holodori card illustrations', CARD_FULL_DIR, of('full', '_unsquished'),
    original => sharp(original).resize({ width: CARD_FULL_W, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer());
  for (const c of list) if (thumbs.has(c.id)) c.art = `holodori/card-art/${c.id}.webp`;
  for (const c of list) if (fulls.has(c.id)) c.full = `holodori/card-full/${c.id}.webp`;
}

// ── Gachas ──
// The record kept by hand (lib/holodori-gachas.mjs), checked against the dump's Gacha table
// (which has ids alone) and its cards. Its logos are asked of the CDN by the page.
async function buildGachas() {
  const [rows, cards] = await Promise.all([table('Gacha'), readFile(CARDS_FILE, 'utf8').then(JSON.parse)]);
  const recorded = new Set(GACHAS.flatMap(g => g.gachas));
  const missing = rows.map(r => r.id.replace(/^gacha-/, '')).filter(id => !recorded.has(id));
  if (missing.length) console.warn(`holodori: gachas not in lib/holodori-gachas.mjs: ${missing.join(', ')}`);
  const known = new Set(cards.map(c => c.id));
  const unknown = GACHAS.flatMap(g => g.pickup).filter(id => !known.has(id));
  if (unknown.length) console.warn(`holodori: gacha cards the Card table lacks: ${unknown.join(', ')}`);
  return GACHAS;
}

// ── Upcoming ★5s ──
// The game announces a new ★5 about a day before its gacha opens, on its English X account,
// which a build cannot read; the dump learns of the gacha only once it is open. hololive
// Dreams Lab, a fan site, collects those posts by date on a server-rendered page, each as an
// <h3> whose paragraph names the card as "★5 [Card] Holomem" and the gacha's opening as "gacha
// … from Monday, October 19 at 11:00 AM (JST)" or "… start on Thursday, October 29, at 11:00
// JST", with the official posts linked under it. The headline is not read: it has been "★5
// [Card] Holomem previewed" for one card and "New ★5 Vestia Zeta and Nerissa Ravencroft
// previews" for two, and a post that reveals several cards has a link for each. Its
// robots.txt allows a crawl.
// Kept: the previews whose gacha opened no more than 14 days before the build, or has not.
const LAB_PAGE = 'https://dreams.wf-calc.net/wiki/game-updates?lang=en';
const MONTH_NO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const KEEP_MS = 14 * 86_400_000;

async function buildUpcoming() {
  const res = await timedFetch(LAB_PAGE);
  if (!res.ok) throw new Error(`hololive Dreams Lab ${res.status}`);
  const html = await res.text();
  const strip = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").trim();
  const seen = new Map();
  let year = 0;
  let month = 0;
  // The page's date headings, previews and their source lines, in the order it gives them.
  for (const m of html.matchAll(/<h2 id="([a-z]+)-\d+-(\d{4})">|<h3[^>]*>(.*?)<\/h3>(.*?)(?=<h[23]|$)/gs)) {
    if (m[1]) {
      month = MONTH_NO.findIndex(n => n.toLowerCase() === m[1]) + 1;
      year = Number(m[2]);
      continue;
    }
    const summary = strip(m[4]);
    // A holomem's name is the capitalised words after the card's: "Vestia Zeta" in "… Vestia Zeta and ★5 […".
    const cards = new Map([...summary.matchAll(/★5 \[([^\]]+)\] ([A-Z][\w'’+-]*(?: [A-Z][\w'’+-]*)*)/g)].map(c => [`${c[1]}|${c[2]}`, c]));
    const when = summary.match(/gacha[^.]*?(\w+) (\d+),? at (\d+):(\d+)(?: (AM|PM))? \(?JST\)?/);
    const mo = when ? MONTH_NO.indexOf(when[1]) + 1 : 0;
    if (!cards.size || !mo || !year) continue;
    // 24-hour ("11:00 JST") or 12-hour ("11:00 AM (JST)").
    const hour = when[5] ? (Number(when[3]) % 12) + (when[5] === 'PM' ? 12 : 0) : Number(when[3]);
    // A preview names no year: it is the heading's, or the next one's for January after December.
    const y = mo < month ? year + 1 : year;
    const from = new Date(Date.UTC(y, mo - 1, Number(when[2]), hour - 9, Number(when[4]))).toISOString();
    const links = [...m[4].matchAll(/href="(https:\/\/x\.com\/[^"]+)"[^>]*>(.*?)<\/a>/g)];
    for (const [, card, holomem] of cards.values()) {
      // Several cards in one post have a link each, labelled with her name.
      const link = cards.size === 1 ? links[0] : links.find(l => holomem.split(' ').some(word => strip(l[2]).includes(word)));
      seen.set(`${card}|${holomem}`, { card, holomem, from, ...(link && { source: link[1] }) });
    }
  }
  const list = [...seen.values()].filter(p => Date.parse(p.from) > Date.now() - KEEP_MS);
  if (!list.length && !html.includes('★5 [')) console.warn('holodori: hololive Dreams Lab names no ★5 preview; has its page changed?');
  return list.sort((a, b) => a.from.localeCompare(b.from));
}

// Writes what `build` gives back to `file`, or on a failure keeps the last build's file, or
// writes an empty list: the page imports each file, so one has to exist for the bundle to
// build at all.
async function writeOrKeep(file, what, build) {
  try {
    const list = await build();
    await writeFile(file, JSON.stringify(list));
    console.log(`holodori: ${list.length} ${what} -> ${path.relative(process.cwd(), file)}`);
  } catch (err) {
    const kept = await readFile(file, 'utf8').then(() => true, () => false);
    if (!kept) await writeFile(file, '[]');
    console.warn(`holodori/${path.basename(file)} ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
  }
}

await mkdir(outDir, { recursive: true });
await writeOrKeep(CHARACTERS_FILE, 'characters', async () => {
  const roster = await buildRoster();
  await addBusts(roster);
  await addStickers(roster);
  return roster;
});
await writeOrKeep(SONGS_FILE, 'songs', async () => {
  const songs = await buildSongs();
  await addJackets(songs);
  return songs;
});
await writeOrKeep(CARDS_FILE, 'cards', buildCards);
await writeOrKeep(GACHAS_FILE, 'gachas', buildGachas);
await writeOrKeep(UPCOMING_FILE, 'upcoming ★5 previews', buildUpcoming);
await writeOrKeep(ANNOUNCEMENTS_FILE, 'announcements', buildAnnouncements);
