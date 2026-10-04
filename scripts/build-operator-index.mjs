// Generates src/shared/generated/operators.json — the slim operator index used by
// BOTH targets (web grid + extension popup). Bundled at build time; nothing fetches
// this list at runtime.
//
// Three sources:
//   EN game data tables   — primary operator identity (name, rarity, class, resolved
//                           archetype, tags, isNotObtainable), read from
//                           ArknightsAssets/ArknightsGamedata and joined into full
//                           payloads by lib/build-payload.mjs. Lags the CN release
//                           frontier by roughly one patch (~10-15 operators).
//   raw CN game data      — supplements the EN tables for that lag only: operators CN
//                           already has that the EN tables don't carry yet. Names come
//                           from CN's own `appellation` field, a pre-romanized name the
//                           game data carries even before official localization (this
//                           is how Sanity Gone displays brand-new operators too — see
//                           `getLocalesForValue` in their import-operators.js).
//   arknights.wiki.gg     — CN release dates, via its Cargo API (operator -> debut event
//                           -> that event's CN start time). The game data has no release
//                           date field, and char-id numbers are banded by operator
//                           category (0xxx standard, 1xxx alters, 2xxx limiteds, 4xxx
//                           newer), so they do NOT track release order. CN-supplement
//                           operators have no dateable event yet (too new for the wiki,
//                           no gacha banner in gacha_table.json either), but by
//                           construction they ARE newer than everything the EN tables
//                           carry — that's the only reason they needed supplementing
//                           at all. RECENT_UNDATED encodes that: not a real date, but
//                           guaranteed to sort as newest, so these operators surface at
//                           the top instead of being buried in the genuinely-undated
//                           tail with old operators that just lack wiki coverage.
//   sanitygone.help        — releaseOrder, a PRTS-scraped ordinal Sanity Gone bakes into
//                           their own bundle (their build pulls a wider set of CN/EN/JP/
//                           KR/TW tables plus a PRTS scrape than we do). Near-universal
//                           coverage and verified accurate even for operators our wiki
//                           pipeline can't date at all, so it's the PREFERRED sort signal
//                           at runtime — releaseDate above is the fallback, not this. The
//                           asset URL is content-hashed and changes on every Sanity Gone
//                           deploy, so it's discovered by chasing the reference chain from
//                           their live page (page -> OperatorList.[hash].js ->
//                           operators-index.json.[hash].js) rather than hardcoded.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Plain `fetch` has no timeout, and this script now makes 400+ live requests to
// third-party hosts. Locally that's fine; on GitHub's shared runners a single stalled
// connection (rate-limiting, a slow host, a dropped packet) hung the whole build for
// 15+ minutes with no error until the job got killed — twice, in two different deploy
// runs. Every fetch in this file goes through this instead, so a hung request fails
// fast and loud (or, for the supplemental fetches that already tolerate failure, just
// gets skipped) rather than stalling the entire build silently.
const FETCH_TIMEOUT_MS = 20_000;

// MediaWiki asks clients to identify themselves and throttles anonymous ones much harder
// — downloading the branch icons without this got a wall of HTTP 429s.
const USER_AGENT = 'dossier-build/1.0 (https://github.com/seangcs27/dossier)';

async function timedFetch(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: { 'User-Agent': USER_AGENT, ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Retries on 429/5xx with a widening delay, honouring Retry-After when the server sends
// one. Only used for the icon downloads, which are the one place here that hits a single
// host in a tight loop.
async function fetchWithRetry(url, attempts = 4) {
  let wait = 600;
  for (let i = 1; ; i++) {
    const res = await timedFetch(url);
    if (res.ok || i === attempts || (res.status !== 429 && res.status < 500)) return res;
    const retryAfter = Number(res.headers.get('retry-after'));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : wait);
    wait *= 2;
  }
}

const CN_CHARACTER_TABLE_URL =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/cn/gamedata/excel/character_table.json';

const WIKI_API = 'https://arknights.wiki.gg/api.php';
const SANITYGONE_BASE = 'https://sanitygone.help';
const AN_EN_TAGS_JSON_BASE = 'https://raw.githubusercontent.com/PuppiizSunniiz/AN-EN-Tags/main/json';
const AN_EN_TAGS_BASE = `${AN_EN_TAGS_JSON_BASE}/ace`;
const ARKNIGHT_IMAGES_TREE_URL =
  'https://api.github.com/repos/PuppiizSunniiz/Arknight-Images/git/trees/main?recursive=1';
const ARKNIGHT_IMAGES_BASE = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';
// Mirrors PORTRAIT_BASE in src/shared/api/hella-api.ts — the 180x360 bust crops the grid
// bakes into the bundle.
const PORTRAIT_BASE = 'https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@main/portrait';

// Every characters/<id>_<suffix>.png in the asset repo, grouped by operator id — base
// art (`1`), elite 2 art (`2`), and any alternate-outfit/promo variant (`sale#14`,
// `epoque#7`, ...). The repo's own directory-listing API truncates past 1000 entries
// (this folder alone has 1300+), so this uses the git Trees API instead, which returns
// the whole repo in one call. Supplemental only — a fetch failure here just means no
// operator gets an arts gallery, not a build failure; the plain avatar still works.
async function fetchCharacterArtIndex() {
  try {
    const res = await timedFetch(ARKNIGHT_IMAGES_TREE_URL);
    if (!res.ok) throw new Error(`tree ${res.status}`);
    const json = await res.json();
    if (json.truncated) throw new Error('tree response truncated');
    const byId = new Map();
    for (const entry of json.tree) {
      const m = /^characters\/(char_\w+)_([^/]+)\.png$/.exec(entry.path);
      if (!m) continue;
      const [, id, suffix] = m;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(suffix);
    }
    return byId;
  } catch (e) {
    console.warn(`character art index skipped: ${e.message}`);
    return new Map();
  }
}

// Class enum -> the English class name arknights.wiki.gg uses in its branch-icon
// filenames. Same eight values as PROFESSION_LABEL in src/web/format.ts; duplicated
// because this is a standalone Node script, not part of the TS build.
const PROFESSION_EN = {
  CASTER: 'Caster', MEDIC: 'Medic', PIONEER: 'Vanguard', SNIPER: 'Sniper',
  SPECIAL: 'Specialist', SUPPORT: 'Supporter', TANK: 'Defender', WARRIOR: 'Guard',
};

// Branch (archetype) icons, self-hosted rather than hotlinked.
//
// These were previously pulled live from Aceship/Arknight-Images, whose `ui/subclass`
// folder has not been touched since 2022-11-01 — it covers 57 of the 72 branches in use,
// so every archetype introduced since (Ritualist, Primal Caster, Watchman, …) rendered
// with no icon at all: 43 operators. Checked yuanyan3060, ArknightsAssets and PRTS; none
// ship branch icons under any naming.
//
// arknights.wiki.gg — already a source here for release dates and CN traits — maintains
// them as `Category:Branch icons`, currently 71 files and current with the CN release
// frontier. The whole set is ~112 KB, so it's downloaded into the bundle instead of
// hotlinked: no runtime dependency on the wiki, and no cache-busting query string in the
// asset URL to go stale.
//
// Filenames are `<branch> <class>.png`, except where the branch name already ends in the
// class ("Primal Caster.png", "Multi-target Medic.png"), so both forms are tried. Match
// is case-insensitive — our archetype text says "Mech-accord Caster", the wiki file says
// "Mech-Accord Caster".
// One badge per faction: each nation for the back of a card, and each operator's most
// specific faction (team, group or nation) for the detail page's header. Same deal as the
// branch icons and the portraits: fetched once at build time and served from our own
// origin afterwards.
//
// The upstream files are 510x510 white silhouettes on transparency, and the pages render
// them as a CSS mask so the badge can be tinted instead of being stuck white. For most the
// shape lives entirely in the alpha, but four (rainbow, sees, mujica, laios) draw opaque
// black detail inside it, which is why both badges set mask-mode: luminance. So the
// re-encode has to keep BOTH the alpha and the colour: dropping to a single greyscale
// channel would make the file fully opaque, which renders as a filled square, and
// flattening the colour to white would fill those four in solid. The resize to 256px is
// where the saving comes from.
//
// About forty-five requests, not one per operator: operators share factions heavily.
async function bakeIcons(label, dirName, names, pathFor, size = 256) {
  const logoDir = path.join(outDir, dirName);
  await mkdir(logoDir, { recursive: true });

  const have = new Set(await readdir(logoDir).catch(() => []));
  const ids = [...new Set(names.filter(Boolean))];
  const wanted = ids.filter(id => !have.has(`${id}.webp`));
  let written = 0;
  const missing = [];
  await mapConcurrent(wanted, 4, async id => {
    // jsDelivr is first because it is what the rest of the project uses, but it is also
    // the flakier of the two from a CI runner: a first run lost four of nineteen logos to
    // two timeouts, a 403 and a 404, none of which reproduced locally. GitHub's raw host
    // serves the same bytes and fails at different times, so trying both turns a lost
    // logo into a retry. Anything already on disk is left alone, so a later build fills
    // gaps rather than re-fetching what worked.
    for (const base of [ARKNIGHT_IMAGES_BASE, 'https://raw.githubusercontent.com/PuppiizSunniiz/Arknight-Images/main']) {
      try {
        const res = await fetchWithRetry(`${base}/${pathFor(id)}`);
        if (!res.ok) throw new Error(String(res.status));
        const webp = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize(size)
          .webp({ quality: 82, effort: 4, alphaQuality: 100 })
          .toBuffer();
        await writeFile(path.join(logoDir, `${id}.webp`), webp);
        written++;
        return;
      } catch (err) {
        if (base !== ARKNIGHT_IMAGES_BASE) missing.push(`${id} (${err.message})`);
      }
    }
  });

  // Of the ones asked for, not of everything in the folder: the collabs' logos share the
  // faction badges' folder and would be counted as badges.
  const total = ids.length - wanted.length + written;
  console.log(
    `${label}: ${total}/${ids.length} (${written} new)` +
    `${missing.length ? ` — missing ${missing.join(', ')}` : ''} ` +
    `-> ${path.relative(process.cwd(), logoDir)}`,
  );
  return total;
}

// The collabs' own logos, from the repo rather than a CDN (see collabLogoFiles). They go in
// beside the faction badges, which is where the pages look for a badge. A source is one
// flat colour on transparency (black, white or red, as it happens), and the badge is a
// luminance mask, where anything dark disappears: so only the alpha is kept, under plain
// white. Rewritten every build: four small files, and a replaced source should not need
// the folder clearing first.
async function bakeCollabLogos() {
  const logoDir = path.join(outDir, 'faction-logos');
  await mkdir(logoDir, { recursive: true });
  for (const [slug, file] of collabLogoFiles) {
    // The density is for the SVGs: they are drawn a few hundred pixels wide, and at the
    // default would be scaled up from that.
    const { data, info } = await sharp(path.join(collabLogoDir, file), { density: 300 })
      .resize(512, 512, { fit: 'inside' })
      .ensureAlpha()
      .extractChannel('alpha')
      .raw()
      .toBuffer({ resolveWithObject: true });
    const webp = await sharp({ create: { width: info.width, height: info.height, channels: 3, background: '#fff' } })
      .joinChannel(data, { raw: { width: info.width, height: info.height, channels: 1 } })
      .webp({ quality: 82, effort: 4, alphaQuality: 100 })
      .toBuffer();
    await writeFile(path.join(logoDir, `collab-${slug}.webp`), webp);
  }
  console.log(`collab logos: ${collabLogoFiles.size} -> ${path.relative(process.cwd(), logoDir)}`);
}

// The eight class glyphs, which every card and both filter panels show. Baking them is
// what lets the grid render without touching a CDN at all: they were the last remote
// image left on it, and a rarely-requested icon is almost always a cold edge miss —
// measured between 0.5 s and 2.7 s, against ~30 ms from our own origin.
//
// The filenames upstream are the DISPLAY names: class_vanguard, class_guard,
// class_defender, class_supporter, class_specialist. The game's own enum values
// (pioneer, warrior, tank, support, special) all 404, and a jsDelivr 404 is never cached,
// so a wrong slug here costs a full round trip on every single build.
const CLASS_SLUGS = [
  'vanguard', 'guard', 'defender', 'sniper', 'caster', 'medic', 'supporter', 'specialist',
];

async function fetchBranchIcons(entries) {
  const iconDir = path.join(outDir, 'branch-icons');
  try {
    const qs = new URLSearchParams({
      action: 'query', generator: 'categorymembers', gcmtitle: 'Category:Branch icons',
      gcmlimit: '500', gcmtype: 'file', prop: 'imageinfo', iiprop: 'url',
      format: 'json', formatversion: '2',
    });
    const res = await timedFetch(`${WIKI_API}?${qs}`);
    if (!res.ok) throw new Error(`branch icons ${res.status}`);
    const json = await res.json();
    const byName = new Map();
    for (const p of Object.values(json.query?.pages ?? {})) {
      const name = p.title.replace(/^File:/, '').replace(/\.png$/i, '');
      const url = p.imageinfo?.[0]?.url;
      if (url) byName.set(name.toLowerCase(), url);
    }
    if (byName.size < 40) throw new Error(`only ${byName.size} branch icons found — category may have moved`);

    // One icon per subProfessionId, not per operator.
    const bySub = new Map();
    for (const e of entries) if (!bySub.has(e.subProfessionId)) bySub.set(e.subProfessionId, e);

    await mkdir(iconDir, { recursive: true });
    let written = 0;
    const unmatched = [];
    // Deliberately low concurrency: this is ~70 requests to a single wiki, and it starts
    // returning 429 well before the parallelism used elsewhere in this script.
    await mapConcurrent([...bySub.values()], 3, async e => {
      const cls = PROFESSION_EN[e.profession] ?? '';
      const url = [`${e.archetype} ${cls}`, e.archetype]
        .map(c => byName.get(c.trim().toLowerCase()))
        .find(Boolean)
        // The category isn't exhaustive: "Supportive Ranger Supporter.png" is on the wiki but
        // was never filed under it. A branch the listing misses is asked for by its
        // conventional filename instead, which 404s into `unmatched` if the wiki has none.
        ?? (e.archetype && new URL(`/wiki/Special:Redirect/file/${encodeURIComponent(`${e.archetype} ${cls}.png`)}`, WIKI_API).href);
      if (!url) { unmatched.push(`${e.subProfessionId} (${e.archetype || 'no archetype name'})`); return; }
      try {
        const imgRes = await fetchWithRetry(url);
        if (!imgRes.ok) throw new Error(String(imgRes.status));
        await writeFile(path.join(iconDir, `${e.subProfessionId}.png`), Buffer.from(await imgRes.arrayBuffer()));
        written++;
      } catch (err) {
        unmatched.push(`${e.subProfessionId} (download failed: ${err.message})`);
      }
    });
    if (unmatched.length) console.warn(`branch icons unmatched: ${unmatched.join(', ')}`);
    return { written, total: bySub.size };
  } catch (e) {
    console.warn(`branch icons skipped: ${e.message}`);
    return { written: 0, total: 0 };
  }
}

// Downloads every operator's card portrait and re-encodes it to WebP in the bundle, so
// the grid serves its own images instead of hotlinking ~50 MB of PNG from a CDN.
//
// The problem this solves is latency, not bandwidth. On a quiet personal site each
// operator's portrait is requested by exactly one card, so it is almost always a cold miss
// at the CDN edge: measured ~800-1200 ms cold against ~160-180 ms warm. Same-origin files
// have no such cliff, and WebP q80 takes a 117 KB PNG to about 21 KB on top of that.
//
// Existing files are kept rather than refetched: CI restores this directory from the last
// run's cache, so a weekly build downloads only the operators it has never seen. The cost
// is that upstream re-drawing an existing portrait never reaches us — an acceptable trade
// against ~50 MB of downloads every build. Delete the directory to force a full refresh.
//
// Every failure is survivable: the card keeps the CDN chain (_1 -> _2 -> avatar -> '?') as
// its onerror fallback, so an id this misses still renders.
async function fetchPortraits(entries) {
  const portraitDir = path.join(outDir, 'portraits');
  await mkdir(portraitDir, { recursive: true });

  const existing = new Set(await readdir(portraitDir).catch(() => []));
  const missing = entries.filter(e => !existing.has(`${e.id}.webp`));
  if (missing.length === 0) {
    console.log(`portraits: all ${entries.length} already baked -> ${path.relative(process.cwd(), portraitDir)}`);
    return;
  }

  let written = 0;
  const failed = [];
  await mapConcurrent(missing, 8, async e => {
    // `_1` is the base look and `_2` the E2 one; a couple of alter forms only ship `_2`.
    for (const suffix of ['1', '2']) {
      try {
        const res = await timedFetch(`${PORTRAIT_BASE}/${e.id}_${suffix}.png`);
        if (!res.ok) continue;
        // Encode effort 4, not the maximum: effort 6 measured ~55x slower for ~2% smaller
        // files, which on 431 images is minutes of CI time for nothing anyone can see.
        const webp = await sharp(Buffer.from(await res.arrayBuffer()))
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        await writeFile(path.join(portraitDir, `${e.id}.webp`), webp);
        written++;
        return;
      } catch { /* try the next suffix, then give up on this operator */ }
    }
    failed.push(e.id);
  });

  const total = existing.size + written;
  console.log(
    `portraits: baked ${written} new (${total}/${entries.length} total` +
    `${failed.length ? `, ${failed.length} unavailable: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''}` : ''}) ` +
    `-> ${path.relative(process.cwd(), portraitDir)}`,
  );
}

// Human labels for the suffix vocabulary actually seen in the repo. '1'/'2' are the
// universal elite arts; '1+' is a separate Elite 1 piece that only exists when an
// operator's E1 look differs from E0 (Amiya is the sole case across all 427), so plain
// '1' only covers both tiers when there's no '1+' beside it. Anything else is an
// outfit/promo code tied to a specific skin, named from the skin data when possible.
function artLabel(suffix, hasElite1Variant, skinName) {
  if (suffix === '1') return hasElite1Variant ? 'Elite 0' : 'Elite 0/1';
  if (suffix === '1+') return 'Elite 1';
  if (suffix === '2') return 'Elite 2';
  return skinName || 'Outfit';
}

// `skins[].portraitId` is exactly `<id>_<suffix>`, so each art piece can be joined to
// its skin record for the illustrator credit (`displaySkin.drawerList`) and the outfit's
// own name — the same attribution Sanity Gone shows under its artwork viewer.
function buildArtsList(id, suffixes, skins) {
  const skinByPortrait = new Map((skins ?? []).map(s => [s.portraitId, s.displaySkin ?? {}]));
  const hasElite1Variant = suffixes.includes('1+');
  const rank = s => (s === '1' ? 0 : s === '1+' ? 1 : s === '2' ? 2 : 3);
  return [...suffixes]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(suffix => {
      const skin = skinByPortrait.get(`${id}_${suffix}`) ?? {};
      const artist = (skin.drawerList ?? []).filter(Boolean).join(', ') || null;
      return {
        suffix,
        label: artLabel(suffix, hasElite1Variant, skin.skinName),
        artist,
        // The suffix MUST be percent-encoded. Skin codes contain '#' ("epoque#4"), and a
        // raw '#' in an <img src> is a fragment delimiter — the browser requests
        // ".../char_002_amiya_epoque" and gets a 404, which silently broke every outfit
        // art: 523 of 1346 pieces across 359 operators. A handful also contain spaces
        // ("witch#5 (Old)"). The id is safe as-is; only the suffix needs it.
        url: `${ARKNIGHT_IMAGES_BASE}/characters/${id}_${encodeURIComponent(suffix)}.png`,
      };
    });
}

// Runs `fn` over `items` with at most `limit` in flight at once — 427 individual detail
// fetches at build time is enough that unbounded parallelism risks hammering a shared
// public API into rate-limiting the whole run, and fully sequential would take minutes.
async function mapConcurrent(items, limit, fn) {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// Sentinel "release date" for CN-supplement operators — see the header note. Sorts
// after every real ISO date (all real ones fall in 2019-2026), never displayed anywhere
// (releaseDate only drives sort order, checked with `grep -rn releaseDate src/`).
// Collab operators, keyed by the letter prefix of `data.displayNumber` — the only field
// that separates them. There is no isCollab flag anywhere in the source data.
//
// The prefix partitions them exactly: no operator outside each group carries its prefix,
// and for the four franchise crossovers `data.teamId` (rainbow/sees/laios/mujica) and a
// null `data.nationId` agree with it operator for operator. Prefix is used rather than
// teamId because it also catches Monster Hunter, whose operators are Terra natives in a
// collab's costume — they keep their own nation and team, so teamId can't see them.
//
// Curated because nothing in the data marks a prefix as belonging to a crossover. A new
// collab needs a line here; the build logs the tally so a missing one is visible.
const COLLAB_BY_PREFIX = {
  RS: 'Rainbow Six Siege',
  PS: 'Persona 3',
  DD: 'Delicious in Dungeon',
  AM: 'Ave Mujica',
  MH: 'Monster Hunter',
};

const collabFor = displayNumber => {
  const prefix = (String(displayNumber ?? '').match(/^[A-Za-z]+/) ?? [''])[0];
  return COLLAB_BY_PREFIX[prefix] ?? '';
};

// A collab's own logo, where the repo has one: collab-logos/<slug>.svg or .png beside this
// script, named for the collab ('Persona 3' -> persona-3). The game ships none: it files
// the Rhodes Island badge under sees, mujica and laios, and Monster Hunter's operators are
// Rhodes Island's own. The four here are the series' logos as Wikimedia Commons has them,
// each filed there as a public-domain text logo, and a trademark:
//   persona-3             File:Persona 3 Reload logo black.svg
//   monster-hunter        File:Monster Hunter logo black.svg
//   ave-mujica            File:Ave-mujica-original-logo.svg
//   delicious-in-dungeon  File:Dungeon Meshi Logo.png
// A collab with no file keeps its faction's badge, as Rainbow Six Siege does: the game has
// Team Rainbow's.
const collabLogoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'collab-logos');
const collabLogoFiles = new Map(
  (await readdir(collabLogoDir).catch(() => [])).map(file => [path.parse(file).name, file]),
);

// The id that collab's badge is baked under ('collab-persona-3'), '' where it has no logo.
const collabLogoFor = collab => {
  const slug = collab.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return collabLogoFiles.has(slug) ? `collab-${slug}` : '';
};

const RECENT_UNDATED = '9999-12-31';

// CN recruitment-tag text -> the exact English string the EN tables already use for the
// same tag (verified against AN-EN-Tags' tl-tags.json, reconciled to our spelling —
// e.g. "Crowd-Control" hyphenated, not "Crowd Control"). This vocabulary is small and
// essentially frozen (new tags ship maybe once a year), so it's a static table instead
// of a fourth live fetch.
const CN_TAG_EN = {
  '控场': 'Crowd-Control', '爆发': 'Nuker', '治疗': 'Healing', '支援': 'Support',
  '费用回复': 'DP-Recovery', '输出': 'DPS', '生存': 'Survival', '群攻': 'AoE',
  '防护': 'Defense', '减速': 'Slow', '削弱': 'Debuff', '快速复活': 'Fast-Redeploy',
  '位移': 'Shift', '召唤': 'Summon', '支援机械': 'Robot', '元素': 'Elemental',
  '高空': 'Soar', '新手': 'Starter',
};

// OperatorData.itemObtainApproach — how the operator is recruited/acquired. Same
// frozen-small-vocabulary situation as CN_TAG_EN (verified against every distinct
// value in character_table.json: 9 total).
const CN_OBTAIN_EN = {
  '招募寻访': 'Recruitment', '活动获得': 'Event', '凭证交易所': 'Certificate Exchange',
  '信用交易所': 'Credit Store', '限时礼包': 'Limited-Time Pack',
  '招募寻访、见习任务': 'Recruitment, Trainee Mission',
  '集成战略获得': 'Integrated Strategies', '主题曲剧情': 'Theme Song Story',
  '周年奖励': 'Anniversary Reward',
};

// The ways of getting an operator that make it a "welfare" one: handed out free by an event,
// an anniversary or Integrated Strategies, rather than pulled, recruited or bought. In the
// EN table's wording and in CN_OBTAIN_EN's, since a CN-only operator's payload carries that.
const WELFARE_OBTAIN = new Set([
  'Event Reward', 'Anniversary Reward', 'Obtained from Integrated Strategies',
  CN_OBTAIN_EN['活动获得'], CN_OBTAIN_EN['集成战略获得'],
]);

// Below this many resolved dates, assume the wiki is down or its schema moved —
// fail the build rather than silently deploying a broken sort order.
const MIN_DATED = 300;

// Below this many written operator details, assume one of the tables buildPayload fetches
// lazily (uniequip_table, skill_table, battle_equip_table, building_data,
// handbook_team_table, range_table, skin_table) is permanently unreachable — that failure
// lands in buildOperatorDetails' per-operator try/catch, not the fatal enChars/enPatch
// check above, so `written` can collapse to near-zero while the script still reaches this
// line and would otherwise exit 0 having overwritten a good build with an almost-empty one.
const MIN_DETAILS_WRITTEN = 400;

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated',
);

async function cargo(params) {
  const rows = [];
  for (let offset = 0; offset < 3000; offset += 500) {
    const qs = new URLSearchParams({
      ...params, action: 'cargoquery', limit: '500',
      offset: String(offset), format: 'json', formatversion: '2',
    });
    const res = await timedFetch(`${WIKI_API}?${qs}`);
    if (!res.ok) throw new Error(`wiki ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`wiki: ${JSON.stringify(json.error).slice(0, 200)}`);
    const batch = json.cargoquery.map(x => x.title);
    rows.push(...batch);
    if (batch.length < 500) break;
  }
  return rows;
}

// name -> 'YYYY-MM-DD', from the operator's debut event. CN is the canonical release
// order, but some events (April Fools, event sub-parts, Integrated Strategies debuts)
// only carry rows for other servers — fall back to the earliest date on any server so
// those operators still land near the right place instead of at the end.
async function fetchReleaseDates() {
  const [ops, events] = await Promise.all([
    cargo({ tables: 'Operators', fields: 'name,event,obtain', order_by: 'name' }),
    cargo({ tables: 'EventServerDetails', fields: 'event,server,startTime' }),
  ]);

  const cnDate = new Map();
  const anyDate = new Map();
  for (const e of events) {
    if (!e.event || !e.startTime) continue;
    const date = e.startTime.slice(0, 10);
    if (e.server === 'CN') cnDate.set(e.event, date);
    const prev = anyDate.get(e.event);
    if (!prev || date < prev) anyDate.set(e.event, date);
  }
  const eventNames = [...cnDate.keys(), ...anyDate.keys()];
  const dateFor = name => cnDate.get(name) ?? anyDate.get(name);

  const byName = new Map();
  for (const op of ops) {
    // Normal case: Operators.event names the debut event directly.
    let date = op.event ? dateFor(op.event) : undefined;
    // A few operators (Raidian confirmed) have a blank `event` even though the wiki
    // does have a dated event for them — it's just linked through `obtain`'s wikitext
    // instead, e.g. "[[Sui's Garden of Grotesqueries]] ([[Visit Memento]])". The event
    // name there isn't always the exact match ("...Mission Event" is appended in
    // EventServerDetails), so this falls back to a prefix match against known events.
    if (!date && op.obtain) {
      const linkText = /\[\[([^\]|]+)/.exec(op.obtain)?.[1]?.trim();
      if (linkText) {
        const fuzzy = eventNames.find(en => en.startsWith(linkText) || linkText.startsWith(en));
        if (fuzzy) date = dateFor(fuzzy);
      }
    }
    if (date) byName.set(op.name, date);
  }
  return byName;
}

// Sanity Gone's own PRTS-scraped release ordinal — see the header note on why this is
// the preferred sort signal. Chases the live reference chain to find the current
// content-hashed asset rather than hardcoding a URL that changes on every SG deploy.
// Supplemental only: never blocks the build.
async function fetchReleaseOrder() {
  try {
    const pageRes = await timedFetch(`${SANITYGONE_BASE}/en/operators/`);
    if (!pageRes.ok) throw new Error(`operators page ${pageRes.status}`);
    const pageHtml = await pageRes.text();
    const listRef = /"(\/_astro\/OperatorList\.[A-Za-z0-9_-]+\.js)"/.exec(pageHtml)?.[1];
    if (!listRef) throw new Error('OperatorList asset not found on page');

    const listRes = await timedFetch(SANITYGONE_BASE + listRef);
    if (!listRes.ok) throw new Error(`${listRef} ${listRes.status}`);
    const listJs = await listRes.text();
    const dataRef = /(operators-index\.json\.[A-Za-z0-9_-]+\.js)/.exec(listJs)?.[1];
    if (!dataRef) throw new Error('operators-index asset not referenced in OperatorList.js');

    const dataRes = await timedFetch(`${SANITYGONE_BASE}/_astro/${dataRef}`);
    if (!dataRes.ok) throw new Error(`${dataRef} ${dataRes.status}`);
    const dataJs = await dataRes.text();

    const byId = new Map(
      [...dataJs.matchAll(/charId:"(char_[^"]+)"[\s\S]{0,400}?releaseOrder:(\d+)/g)]
        .map(m => [m[1], parseInt(m[2], 10)]),
    );
    if (byId.size < 300) throw new Error(`only parsed ${byId.size} entries — asset shape may have changed`);
    return byId;
  } catch (e) {
    console.warn(`Sanity Gone releaseOrder skipped: ${e.message}`);
    return new Map();
  }
}

// Where each mode-only operator sorts among the released ones: a fraction past the release
// order of the operator scripts/lib/mode-order.mjs records it as coming after, which keeps
// it beside that operator under the Release sort. Several after the same operator take
// .01, .02, … in the order they are recorded. One the record does not have sorts last,
// with a warning that names it.
function modeReleaseOrders(roster) {
  const orders = new Map();
  const placed = new Map();   // the operator followed -> how many have been put after it
  for (const [id, after] of MODE_AFTER) {
    // No order to hang it on: Sanity Gone was unreachable, and nothing has one this build.
    if (!releaseOrders.has(after)) continue;
    placed.set(after, (placed.get(after) ?? 0) + 1);
    orders.set(id, releaseOrders.get(after) + placed.get(after) / 100);
  }
  const recorded = new Set(MODE_AFTER.map(([id]) => id));
  for (const r of roster) {
    if (r.mode && !recorded.has(r.id)) {
      console.warn(`${r.id} (${r.data.name}) is ${r.mode}-only and has no line in scripts/lib/mode-order.mjs: it sorts last`);
    }
  }
  return orders;
}

// Supplemental only — never blocks the build. A GitHub raw-content hiccup should not
// fail a weekly deploy over ~10 operators that are already tolerably handled by sorting
// last; the game data tables are the source that matters.
async function fetchCnSupplement(knownIds) {
  try {
    const res = await timedFetch(CN_CHARACTER_TABLE_URL);
    if (!res.ok) throw new Error(`CN table ${res.status}`);
    const table = await res.json();
    const VALID_RARITY = new Set(['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5', 'TIER_6']);
    // character_table.json is a superset of every "character" entity the game engine
    // has — real operators, but also summons, deployable traps, and RIIC assistants,
    // which use `profession` values like TOKEN/TRAP. Only these eight are operators.
    const VALID_PROFESSION = new Set([
      'CASTER', 'MEDIC', 'PIONEER', 'SNIPER', 'SPECIAL', 'SUPPORT', 'TANK', 'WARRIOR',
    ]);
    const supplement = [];
    for (const [id, c] of Object.entries(table)) {
      if (knownIds.has(id)) continue; // the EN tables already cover this one
      if (c.isNotObtainable) continue;
      // `isSpChar` looks like a "special/junk" flag but isn't one — every alter
      // (SilverAsh the Reignfrost, Ch'en the Dawnstreak, ...) carries it too. Real
      // exclusion is handled by the checks below instead.
      if (!VALID_PROFESSION.has(c.profession)) continue; // token / trap / summon, not an operator
      if (!VALID_RARITY.has(c.rarity)) continue; // datamine placeholder, not a real record yet
      if (!c.appellation?.trim()) continue; // nothing usable to display
      const tags = (c.tagList ?? []).map(t => CN_TAG_EN[t]).filter(Boolean);
      supplement.push({ id, appellation: c.appellation.trim(), rarity: c.rarity,
        profession: c.profession, subProfessionId: c.subProfessionId, tags });
    }
    return supplement;
  } catch (e) {
    console.warn(`CN supplement skipped: ${e.message}`);
    return [];
  }
}

// English fan translations for skill/talent text, sourced from Aceship's community
// translation project (the same repo CN_TAG_EN above is already verified against) —
// these operators haven't had an official EN localization pass yet, so this is the
// best available English until they release on Global. Keyed by skillId (skills) and
// by operator id (talents, as an array-of-arrays matching data.talents[j].candidates[k]
// positionally). Supplemental only: a fetch failure here just leaves these operators with
// the raw CN text buildCnOperatorPayload started from (untranslated), it doesn't block the
// index build.
async function fetchAceTranslations() {
  try {
    const [skillsRes, talentsRes] = await Promise.all([
      timedFetch(`${AN_EN_TAGS_BASE}/tl-skills.json`),
      timedFetch(`${AN_EN_TAGS_BASE}/tl-talents.json`),
    ]);
    if (!skillsRes.ok) throw new Error(`tl-skills ${skillsRes.status}`);
    if (!talentsRes.ok) throw new Error(`tl-talents ${talentsRes.status}`);
    return { skills: await skillsRes.json(), talents: await talentsRes.json() };
  } catch (e) {
    console.warn(`Ace translations skipped: ${e.message}`);
    return { skills: {}, talents: {} };
  }
}

// RIIC base-skill translations, keyed by buffId — a direct match against
// bases[].skill.buffId, our own raw CN payload's own key for the exact same skill.
// Community-maintained like the others: `description` degrades to an exact copy of the
// CN `desc` field for a buff nobody's translated yet, so an untranslated buff is
// indistinguishable from a translated one that happens to already have failed — either
// way it's a safe no-op overlay, never garbles anything.
async function fetchRiicTranslations() {
  try {
    const res = await timedFetch(`${AN_EN_TAGS_JSON_BASE}/puppiiz/riic_data.json`);
    if (!res.ok) throw new Error(`riic_data ${res.status}`);
    const json = await res.json();
    return json.buffs ?? {};
  } catch (e) {
    console.warn(`RIIC translations skipped: ${e.message}`);
    return {};
  }
}

// Potential rank descriptions are short templated strings built from a small, closed
// vocabulary ("部署费用-1", "攻击力+3", ...) rather than free prose, so a keyword
// substitution table is enough — no need for a per-operator translation. tl-potential
// pairs each CN stat phrase with its English name; trailing CJK (mostly the "秒"/
// seconds unit) gets dropped after substitution since the number+sign already carries
// the meaning without it.
async function fetchPotentialKeywords() {
  try {
    const res = await timedFetch(`${AN_EN_TAGS_JSON_BASE}/tl-potential.json`);
    if (!res.ok) throw new Error(`tl-potential ${res.status}`);
    const rows = await res.json();
    return rows.filter(r => r.skill_cn && r.skill_en).map(r => [r.skill_cn, r.skill_en]);
  } catch (e) {
    console.warn(`Potential keyword fetch skipped: ${e.message}`);
    return [];
  }
}

function translatePotentialDescription(cn, keywordPairs) {
  let s = cn;
  for (const [zh, en] of keywordPairs) s = s.split(zh).join(en);
  return s.replace(/[一-鿿]+/g, '').trim();
}

// Reduces wiki.gg markup to plain text: MediaWiki [[page|display]] link syntax down to
// its display text (its `description` embeds these, e.g. "[[Vigil|Leontuzzo]]" for a
// nickname linking to an operator's real page title), plus any rendered HTML the Cargo
// API hands back — glossary tooltips arrive as a full
// `<span class="glossary" data-desc="...">Take Off</span>`, which is wiki presentation
// chrome, not game data. That HTML has to die here rather than at render time: the web
// view's cleanText() would strip it, but the extension popup escapes description instead
// of stripping it, so leaving it in the baked JSON shows the raw span as literal text.
function stripWikiMarkup(s) {
  return s
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page, display) => display ?? page)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Lowercased, with "·" and " - " both collapsed to a single space, so "Kal'tsit·Esperanta"
// (HellaAPI's appellation) and "Kal'tsit - Esperanta" (the wiki's own page title for the
// same operator — confirmed a real mismatch, not hypothetical) land on the same key.
function normalizeWikiName(name) {
  return name.toLowerCase().replace(/\s*[-·]\s*/g, ' ').trim();
}

// wiki.gg's `trait` Cargo field is what CLAUDE.md calls "Trait:" in the detail view —
// it's actually OperatorData.description (a short tagline), not OperatorData.trait,
// which is null across the board (confirmed on official operators too, not a CN-data
// quirk). Its `description` field is the longer profile blurb, OperatorData.itemUsage
// (verified against Bellone's raw CN text — an exact translation match). Batches one
// query for every CN-supplement operator by name; matching is normalized because the
// wiki's own title casing/punctuation doesn't always match HellaAPI's appellation
// exactly (confirmed misses on "Gallus²" vs "GALLUS²" and the Kal'tsit case above).
async function fetchWikiTraits(names) {
  try {
    // The IN(...) clause is an exact string match, so a punctuation variant (the "·"
    // case above) needs its alternate form included here too, or the row never comes
    // back for the query to find in the first place — normalizing only the returned
    // rows wouldn't help if the query itself excludes them.
    const queryNames = new Set(names);
    for (const n of names) if (n.includes('·')) queryNames.add(n.replace(/·/g, ' - '));
    const rows = await cargo({ tables: 'Operators', fields: 'name,trait,description,branch', where: `name IN (${[...queryNames].map(n => `"${n.replace(/"/g, '')}"`).join(',')})` });
    return new Map(rows.map(r => [normalizeWikiName(r.name), {
      // Both fields can carry [[page|display]] wikilink syntax (confirmed on
      // Kal'tsit·Esperanta's trait, not just the bio blurb this was first written for)
      // — cleanText() at render time strips HTML tags but has no idea about wikitext,
      // so this needs to happen here or "[[Take Off|Take Off]]" shows up literally.
      trait: r.trait ? stripWikiMarkup(r.trait) : null,
      itemUsage: r.description ? stripWikiMarkup(r.description) : null,
      branch: r.branch || null,
    }]));
  } catch (e) {
    console.warn(`wiki trait fetch skipped: ${e.message}`);
    return new Map();
  }
}

// The wiki's unofficial English for the operators the global server doesn't have yet: each
// one's page, parsed (see lib/wiki-text.mjs) and keyed by the game id in its infobox. The
// Ace files above were last updated in April 2026, so for anything released since, this is
// the only English there is.
//
// Each operator also has a "/File" subpage with the handbook's prose, and a row in the
// OperatorFiles table with the facts the handbook lists (gender, birthplace, exam grades);
// both ride along as `files` and `record`.
//
// A handful of requests however many operators there are — the titles, every page's wikitext
// in batches of fifty, the table rows — because the wiki answers a page-by-page crawl with a
// 429 after about a dozen.
async function fetchWikiPages() {
  try {
    const titles = (await cargo({ tables: 'Operators', fields: '_pageName=page', where: 'isCN=1' })).map(r => r.page);
    const wanted = titles.flatMap(title => [title, `${title}/File`]);
    const textByTitle = new Map();
    for (let i = 0; i < wanted.length; i += 50) {
      const qs = new URLSearchParams({
        action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
        titles: wanted.slice(i, i + 50).join('|'), format: 'json', formatversion: '2',
      });
      const res = await fetchWithRetry(`${WIKI_API}?${qs}`);
      if (!res.ok) throw new Error(`wiki ${res.status}`);
      for (const page of (await res.json()).query?.pages ?? []) {
        textByTitle.set(page.title, page.revisions?.[0]?.slots?.main?.content ?? '');
      }
    }

    const pages = new Map();
    for (const title of titles) {
      const parsed = parseOperatorPage(textByTitle.get(title) ?? '');
      if (!parsed.charId) continue;
      pages.set(parsed.charId, { ...parsed, files: parseFilePage(textByTitle.get(`${title}/File`) ?? ''), record: null });
    }

    const records = await cargo({
      tables: 'OperatorFiles',
      fields: 'id,name,gender,experience,birthplace,birthdate,race,height,infection,strength,mobility,endurance,tactical,skill,originium',
      where: `id IN (${[...pages.keys()].map(id => `"${id}"`).join(',')})`,
    });
    for (const record of records) {
      const page = pages.get(record.id);
      if (page) page.record = record;
    }
    console.log(`wiki pages: ${pages.size} of ${titles.length} CN-only operators parsed, ${records.length} with a file record`);
    return pages;
  } catch (e) {
    console.warn(`wiki pages skipped: ${e.message}`);
    return new Map();
  }
}

const hasHan = text => typeof text === 'string' && /\p{Script=Han}/u.test(text);

// The handbook's "【key】value" lines, CN key to the EN table's label and the wiki record's
// field that holds the value.
const HANDBOOK_FIELD = {
  代号: ['Code Name', 'name'],
  姓名: ['Name', 'name'],
  性别: ['Gender', 'gender'],
  战斗经验: ['Combat Experience', 'experience'],
  出身地: ['Place of Birth', 'birthplace'],
  生日: ['Date of Birth', 'birthdate'],
  种族: ['Race', 'race'],
  身高: ['Height', 'height'],
  矿石病感染情况: ['Infection Status', 'infection'],
  物理强度: ['Physical Strength', 'strength'],
  战场机动: ['Mobility', 'mobility'],
  生理耐受: ['Physical Resilience', 'endurance'],
  战术规划: ['Tactical Acumen', 'tactical'],
  战斗技巧: ['Combat Skill', 'skill'],
  源石技艺适应性: ['Originium Arts Assimilation', 'originium'],
};

// A CN "Basic Info" or "Physical Exam" file with each line the wiki record can answer
// rewritten as the EN table would have it ("[Gender] Female"). A key the map doesn't know,
// or a field the record leaves empty, keeps its Chinese line: a robot's and a collab
// student's files use keys of their own.
function translateFileFields(text, record) {
  return text.split(/\n(?=【)/).map(block => {
    const [label, field] = HANDBOOK_FIELD[/^【([^【】]+)】/.exec(block)?.[1]] ?? [];
    return field && record[field] ? `[${label}] ${wikiToGameText(record[field])}` : block;
  }).join('\n');
}

// Fills in, from the operator's wiki page, whatever buildCnOperatorPayload left in Chinese:
// talents, skills, module names, effects and missions, and the trait. Only Chinese text is
// replaced, so anything Ace or the game already supplied in English stays as it was, and
// only an exact match is used: a talent's text is taken for the same elite and potential or
// not at all, since the nearest other rank would be English with the wrong numbers in it.
//
// The wiki's text has its values written out, where the game's has {placeholders} — which
// is fine, the page interpolates nothing it doesn't find.
function applyWikiText(op, page) {
  if (!page) return op;

  // The wiki lists what a player sees, so hidden skills and talents don't take a place.
  let skillAt = -1;
  const skills = (op.skills ?? []).map(s => {
    if (s.excel?.hidden || !s.excel?.levels?.length) return s;
    const tl = page.skills[++skillAt];
    if (!tl) return s;
    return {
      ...s,
      excel: {
        ...s.excel,
        levels: s.excel.levels.map((lv, i) => (
          hasHan(lv.name) || hasHan(lv.description)
            ? { ...lv, name: tl.name || lv.name, description: tl.levels[i] ?? lv.description }
            : lv
        )),
      },
    };
  });

  let talentAt = -1;
  const talents = (op.data.talents ?? []).map(t => {
    if (!(t.candidates ?? []).some(c => c.name && !c.isHideTalent)) return t;
    const group = page.talents[++talentAt];
    if (!group) return t;
    return {
      ...t,
      candidates: t.candidates.map(c => {
        if (!hasHan(c.name) && !hasHan(c.description)) return c;
        const phase = Number(String(c.unlockCondition?.phase).replace('PHASE_', ''));
        const tl = group.find(e => e.phase === phase && e.rank === c.requiredPotentialRank);
        return tl ? { ...c, name: tl.name || c.name, description: tl.description } : c;
      }),
    };
  });

  const mapCandidates = (bundle, fn) => (
    Array.isArray(bundle?.candidates) ? { ...bundle, candidates: bundle.candidates.map(fn) } : bundle
  );
  const modules = (op.modules ?? []).map(m => {
    const tl = page.modules[[m.info?.typeName1, m.info?.typeName2].filter(Boolean).join('-').toUpperCase()];
    if (!tl || !m.data) return m;
    const [trait, ...talentByStage] = tl.effects;
    return {
      ...m,
      info: { ...m.info, uniEquipName: hasHan(m.info.uniEquipName) ? tl.name : m.info.uniEquipName },
      missions: m.missions?.some(hasHan) && tl.missions.length === m.missions.length ? tl.missions : m.missions,
      data: {
        ...m.data,
        phases: m.data.phases.map((phase, stage) => {
          // The wiki gives one talent text per stage, so only the first talent a stage
          // rewrites takes it; a second would be given the first one's words.
          let talentText = talentByStage[stage - 1];
          return {
            ...phase,
            parts: phase.parts.map(part => ({
              ...part,
              overrideTraitDataBundle: mapCandidates(part.overrideTraitDataBundle, c => {
                if (!trait || c.requiredPotentialRank !== 0) return c;
                if (hasHan(c.additionalDescription)) return { ...c, additionalDescription: trait };
                if (hasHan(c.overrideDescripton)) return { ...c, overrideDescripton: trait };
                return c;
              }),
              addOrOverrideTalentDataBundle: mapCandidates(part.addOrOverrideTalentDataBundle, c => {
                if (!talentText || c.requiredPotentialRank !== 0 || !hasHan(c.upgradeDescription)) return c;
                const text = talentText;
                talentText = null;
                return { ...c, upgradeDescription: text };
              }),
            })),
          };
        }),
      },
    };
  });

  const data = { ...op.data, talents };
  // A trait that changes with elite is an object of candidates; the wiki has the one line.
  if (page.trait && hasHan(JSON.stringify(op.data.trait ?? ''))) data.trait = page.trait;
  if (page.trait && hasHan(op.data.description)) data.description = page.trait;
  if (page.profile && hasHan(op.data.itemUsage)) data.itemUsage = page.profile;

  // The handbook: the fact files line by line from the wiki's record, and each prose file
  // from the "/File" subpage where someone has translated it — an untranslated subpage holds
  // the same Chinese under the same title, and is no improvement.
  const handbook = (op.handbook ?? []).map(file => {
    if (!hasHan(file.text)) return file;
    const prose = page.files.find(f => f.title === file.title && !hasHan(f.text));
    if (prose) return { ...file, text: prose.text };
    return page.record ? { ...file, text: translateFileFields(file.text, page.record) } : file;
  });

  return { ...op, data, skills, modules, handbook };
}

// Builds the CN-supplement version of a full Operator object: shape-normalized skills,
// plus every translated field (skills/talents from Aceship, trait/itemUsage from the
// wiki, tags/obtain from the static CN_* tables above, base skills from RIIC data,
// potential ranks via keyword substitution). Module trait-override text has no clean
// translation source in any of these — the only module data available covers talent-
// upgrade numbers, not the trait text detail.ts actually renders — so it's left as
// raw CN rather than force a bad match.
function buildCnOperatorPayload(op, id, appellation, skillTl, talentTl, traitByName, riicBuffs, potentialKeywords) {
  // buildPayload always pairs a skill with its excel entry as { deploy, excel }, for both
  // servers — unlike HellaAPI's /cn/operator, which returned bare excel objects. Nothing
  // to reconstruct here any more.
  const skills = (op.skills ?? []).map(s => {
    const tl = skillTl[s.excel.skillId];
    if (!tl) return s;
    return {
      ...s,
      excel: {
        ...s.excel,
        levels: s.excel.levels.map((lv, i) => ({
          ...lv,
          name: tl.name ?? lv.name,
          description: tl.desc?.[i] ?? lv.description,
        })),
      },
    };
  });

  const talentTlForOp = talentTl[id];
  const talents = (op.data.talents ?? []).map((t, j) => ({
    ...t,
    candidates: (t.candidates ?? []).map((cand, k) => {
      const tl = talentTlForOp?.[j]?.[k];
      if (!tl?.desc) return cand;
      return { ...cand, name: tl.name ?? cand.name, description: tl.desc };
    }),
  }));

  const wikiText = traitByName.get(normalizeWikiName(appellation));
  // Same CN_TAG_EN table the grid index uses for these operators — the detail view's
  // own copy of tagList (from the live cn/operator payload) is CN, and baking it in
  // untranslated here would've been the one visible inconsistency between a CN-
  // supplement operator's grid card and its detail page.
  const tagList = (op.data.tagList ?? []).map(t => CN_TAG_EN[t] ?? t);
  const itemObtainApproach = op.data.itemObtainApproach != null
    ? (CN_OBTAIN_EN[op.data.itemObtainApproach] ?? op.data.itemObtainApproach)
    : op.data.itemObtainApproach;

  const bases = (op.bases ?? []).map(b => {
    const tl = riicBuffs[b.skill?.buffId];
    if (!tl?.description) return b;
    return { ...b, skill: { ...b.skill, description: tl.description } };
  });

  const potentialRanks = (op.data.potentialRanks ?? []).map(r => (
    r.description
      ? { ...r, description: translatePotentialDescription(r.description, potentialKeywords) }
      : r
  ));

  return {
    ...op,
    // buildPayload's EN uniequip_table lookup already resolves 75 of 76 branches; the one
    // it doesn't (Supportive Ranger) falls back to the wiki's own branch field, already
    // fetched into traitByName for the trait/itemUsage overlay above.
    archetype: op.archetype || wikiText?.branch || '',
    data: {
      ...op.data,
      name: appellation,
      talents,
      tagList,
      itemObtainApproach,
      potentialRanks,
      ...(wikiText?.trait ? { description: wikiText.trait } : {}),
      ...(wikiText?.itemUsage ? { itemUsage: wikiText.itemUsage } : {}),
    },
    skills,
    bases,
  };
}

// Fetches and bakes a full Operator detail object for EVERY operator (not just CN-
// supplement ones) to src/shared/generated/operator-details/<id>.json — CN-supplement
// operators get the shape-normalize + translate treatment above; regular operators are
// already complete, correctly-shaped, English data straight from the EN excel tables.
// This is what makes every detail page load from a same-origin static file — there is no
// live fallback left for an id this build doesn't know about (see hella-api.ts); it's a
// wait for the next rebuild instead. Best-effort per operator: one bad fetch shouldn't
// cost the others.
async function buildOperatorDetails(regular, cnSupplement) {
  const [{ skills: skillTl, talents: talentTl }, traitByName, riicBuffs, potentialKeywords, artIndex, limitedIds, wikiPages] = await Promise.all([
    fetchAceTranslations(),
    fetchWikiTraits(cnSupplement.map(c => c.appellation)),
    fetchRiicTranslations(),
    fetchPotentialKeywords(),
    fetchCharacterArtIndex(),
    fetchLimitedIds(),
    fetchWikiPages(),
  ]);
  const cnById = new Map(cnSupplement.map(c => [c.id, c]));

  const detailOutDir = path.join(outDir, 'operator-details');
  await mkdir(detailOutDir, { recursive: true });

  let written = 0;
  // Nation is only in the full payload, never in the slim roster read at the top of the
  // script, so it's harvested here rather than costing a second pass over 427 ids.
  const nations = new Map();
  const nationIds = new Map();
  // Each operator's most specific faction — team, else group, else nation — which is the
  // badge the detail page's header shows, and the card back's when there is no nation.
  const factions = new Map();
  const collabs = new Map();
  // Same reasoning: the raw character_table only has subProfessionId, not the resolved
  // subProfessionName buildPayload's uniequip join produces — harvested here instead of
  // re-fetching uniequip_table a second time just for the slim index.
  const archetypes = new Map();
  // The extension popup's projection, gathered in the same pass. See PopupOperator in
  // src/shared/types/operator.ts for why this exists and what defines its shape.
  const popup = {};
  // LMD is seeded: a promotion's LMD comes from gamedata_const rather than any payload, so
  // nothing else guarantees the item map knows it.
  const itemIds = new Set(['4001']);
  const all = [...regular, ...cnSupplement];
  await mapConcurrent(all, 12, async entry => {
    const cn = cnById.get(entry.id);
    try {
      const base = await buildPayload(entry.id, cn ? 'cn' : 'en');
      if (!base) throw new Error('not in the character table');
      const op = cn
        ? applyWikiText(
            buildCnOperatorPayload(base, entry.id, entry.appellation, skillTl, talentTl, traitByName, riicBuffs, potentialKeywords),
            wikiPages.get(entry.id),
          )
        : base;
      const arts = buildArtsList(entry.id, artIndex.get(entry.id) ?? [], op.skins);
      // `op`, not `base`: for a CN-supplement operator `op` is buildCnOperatorPayload's
      // translated overlay. Spreading `base` here would silently ship the raw Chinese
      // buildPayload returns instead of the fan translations, in both this file and the
      // popup projection below (`pd` reads from finalOp too).
      const collab = collabFor(base.data?.displayNumber);
      const collabLogo = collabLogoFor(collab);
      const finalOp = {
        ...op, arts, limited: limitedIds.has(entry.id) || Boolean(collab), cnOnly: Boolean(cn),
        welfare: WELFARE_OBTAIN.has(op.data?.itemObtainApproach),
        // 'IS' or 'SP' for an operator only that mode lends; absent for everyone else.
        mode: entry.mode,
        // The collab's name and its logo's id, where that collab has a logo of its own: the
        // header shows it in place of the faction's badge. Absent for everyone else.
        ...(collabLogo ? { collab, collabLogo } : {}),
      };

      // `powerName` is the localized display name ("Kjerag"); `data.nationId` is the raw
      // slug and only a fallback, title-cased, for a payload whose factions array is empty
      // but whose nationId isn't. 403 of 427 operators have one — Rhodes Island's own
      // recruits mostly, plus a long tail with no stated origin at all.
      const nation = finalOp.factions?.[0]?.nationPower?.powerName
        ?? (base.data?.nationId ? base.data.nationId[0].toUpperCase() + base.data.nationId.slice(1) : '');
      if (nation) nations.set(entry.id, nation);
      // The same faction as an id rather than prose ('rim', not 'Rim Billiton'). It is what
      // the upstream logo files are named after, and slugifying the display name does not
      // reproduce it for five of the nineteen.
      const nationId = finalOp.factions?.[0]?.nationPower?.powerId ?? base.data?.nationId ?? '';
      if (nationId) nationIds.set(entry.id, nationId);

      const mainPower = finalOp.factions?.[0];
      const faction = mainPower?.teamPower ?? mainPower?.groupPower ?? mainPower?.nationPower;
      if (faction) factions.set(entry.id, faction);

      if (collab) collabs.set(entry.id, collab);

      if (base.archetype) archetypes.set(entry.id, base.archetype);

      const pd = finalOp.data ?? {};
      popup[entry.id] = {
        id: entry.id,
        data: {
          name: pd.name, description: pd.description ?? null, rarity: pd.rarity,
          profession: pd.profession, subProfessionId: pd.subProfessionId,
          position: pd.position, tagList: pd.tagList ?? null,
          // Only maxLevel and skillId are ever read; the keyframes and skill levels behind
          // them are the bulk of what makes a full payload 220KB at its worst.
          phases: (pd.phases ?? []).map(ph => ({ maxLevel: ph.maxLevel })),
          skills: (pd.skills ?? []).map(sk => ({ skillId: sk.skillId })),
        },
      };

      for (const id of costItemIds(finalOp)) itemIds.add(id);

      await writeFile(path.join(detailOutDir, `${entry.id}.json`), JSON.stringify(finalOp));
      written++;
    } catch (e) {
      console.warn(`operator detail skipped for ${entry.id}: ${e.message}`);
    }
  });
  // Written by the caller, after the MIN_DETAILS_WRITTEN floor check: `popup` is
  // accumulated across every operator and would otherwise get flushed here even when
  // `written` collapses to near-zero, silently overwriting a good popup.json before that
  // check ever runs.
  return { written, nations, nationIds, factions, collabs, archetypes, traitByName, popup, itemIds };
}

// Operators only ever sold on limited banners, for the detail page's LIMITED tag. The CN
// banner table names each limited pool's operator in limitParam.limitedCharId: keyed by
// char id, so no name join, and it already covers the CN-only operators this build
// supplements. Collab banners are LINKAGE pools rather than LIMITED ones, so collab
// operators are absent from this set; the caller adds them from collabFor, since a
// crossover's operators can't be obtained once it ends either.
// Under 20 hits means the table changed shape, and no tags at all beats wrong ones.
async function fetchLimitedIds() {
  try {
    const gacha = await table('cn', 'gacha_table');
    const ids = new Set((gacha.gachaPoolClient ?? [])
      .filter(pool => pool.gachaRuleType === 'LIMITED')
      .map(pool => pool.limitParam?.limitedCharId)
      .filter(Boolean));
    if (ids.size < 20) throw new Error(`only ${ids.size} limited operators found`);
    console.log(`limited operators: ${ids.size}`);
    return ids;
  } catch (e) {
    console.warn(`limited flags skipped: ${e.message}`);
    return new Set();
  }
}

// Every item id a detail page can price: promotions, skill ranks 2-7, masteries, and each
// module stage. Collected while the payloads are written, so the item map ships only what
// is referenced — about ninety entries against the table's 1,425.
function costItemIds(op) {
  const d = op.data ?? {};
  return [
    ...(d.phases ?? []).flatMap(p => p.evolveCost ?? []),
    ...(d.allSkillLvlup ?? []).flatMap(r => r.lvlUpCost ?? []),
    ...(d.skills ?? []).flatMap(s => (s.levelUpCostCond ?? []).flatMap(m => m.levelUpCost ?? [])),
    ...(op.modules ?? []).flatMap(m => Object.values(m.info?.itemCost ?? {}).flat()),
  ].map(cost => cost?.id).filter(Boolean);
}

// Keeps what the last build wrote when a source is down, or writes `empty` if there is
// nothing to keep. The runtime imports these files, so one has to exist for the bundle to
// build at all; an empty one costs the page its prices or tooltips, not the deploy.
async function keepOrWrite(file, empty, reason) {
  const kept = await readFile(file, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(file, JSON.stringify(empty));
  console.warn(`${path.basename(file)} ${kept ? 'kept from the last build' : 'written empty'}: ${reason}`);
}

const ITEMS_FILE = path.join(outDir, 'items.json');
const CONSTS_FILE = path.join(outDir, 'game-consts.json');
const EMPTY_ITEMS = {};
const EMPTY_CONSTS = { terms: {}, evolveGoldCost: [] };

// For the two "keep the last build" exits below. They leave before writeItemIndex and
// writeGameConsts ever run, and data kept from a build that predates those files — CI
// restores the last cache, which may be older than this code — would then fail the bundle
// outright rather than just losing its prices and tooltips.
async function ensureCostFiles(reason) {
  await keepOrWrite(ITEMS_FILE, EMPTY_ITEMS, reason);
  await keepOrWrite(CONSTS_FILE, EMPTY_CONSTS, reason);
}

// Names and icons for the materials a detail page prices. From item_table, on the host
// the payloads already come from. EN first; the few materials only the CN client has yet
// fall back to their CN names rather than showing as bare ids.
async function writeItemIndex(itemIds) {
  const file = ITEMS_FILE;
  let en, cn;
  try {
    [en, cn] = await Promise.all([table('en', 'item_table'), table('cn', 'item_table').catch(() => ({}))]);
  } catch (e) {
    await keepOrWrite(file, EMPTY_ITEMS, e.message);
    return;
  }
  const items = {};
  for (const id of itemIds) {
    const item = en.items?.[id] ?? cn.items?.[id];
    if (item) items[id] = { name: item.name, iconId: item.iconId, rarity: item.rarity };
  }
  await writeFile(file, JSON.stringify(items));
  const unnamed = [...itemIds].filter(id => !items[id]);
  console.log(
    `wrote ${Object.keys(items).length}/${itemIds.size} priced items` +
    `${unnamed.length ? ` — unnamed ${unnamed.join(', ')}` : ''} -> ${path.relative(process.cwd(), file)}`,
  );
  // 96px: shown at 40, so this is 2x with room to spare. The upstream files are ~180px.
  await bakeIcons('item icons', 'item-icons', Object.values(items).map(i => i.iconId), iconId => `items/${iconId}.png`, 96);
}

// Two things from gamedata_const: the keyword glossary the game shows as tooltips on
// terms like "Slow" or "Bind", and the LMD a promotion costs, which the phase's own
// evolveCost leaves out. evolveGoldCost is indexed [rarity - 1][elite - 1]; -1 means the
// rarity can't reach that elite.
async function writeGameConsts() {
  const file = CONSTS_FILE;
  let consts;
  try {
    consts = await table('en', 'gamedata_const');
  } catch (e) {
    await keepOrWrite(file, EMPTY_CONSTS, e.message);
    return;
  }
  const terms = Object.fromEntries(Object.entries(consts.termDescriptionDict ?? {})
    .map(([id, t]) => [id, { name: t.termName, description: t.description }]));
  await writeFile(file, JSON.stringify({ terms, evolveGoldCost: consts.evolveGoldCost ?? [] }));
  console.log(`wrote ${Object.keys(terms).length} keyword terms -> ${path.relative(process.cwd(), file)}`);
}

// How many operators the previous build left on disk; 0 if there's nothing usable there.
async function previousOperatorCount() {
  try {
    const prev = JSON.parse(await readFile(path.join(outDir, 'operators.json'), 'utf8'));
    return Array.isArray(prev) ? prev.length : 0;
  } catch {
    return 0;
  }
}

import { table } from './lib/gamedata.mjs';
import { buildPayload } from './lib/build-payload.mjs';
import { MODE_AFTER } from './lib/mode-order.mjs';
import { parseFilePage, parseOperatorPage, wikiToGameText } from './lib/wiki-text.mjs';

const VALID_PROFESSION = new Set([
  'CASTER', 'MEDIC', 'PIONEER', 'SNIPER', 'SPECIAL', 'SUPPORT', 'TANK', 'WARRIOR',
]);
const VALID_RARITY = new Set(['TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'TIER_5', 'TIER_6']);

const [enChars, enPatch, releaseDates, releaseOrders] = await Promise.all([
  table('en', 'character_table').catch(e => e),
  table('en', 'char_patch_table').catch(e => e),
  fetchReleaseDates(),
  fetchReleaseOrder(),
]);

// GitHub raw is a steadier source than the self-hosted API this replaced, but the reason
// the fallback exists hasn't changed — only what it guards.
// The game's own elite badges and potential ranks, for the detail page's controls. The
// elite files are white on transparent, so the page paints them as masks in the text
// colour. Potential ranks are told apart by which strokes are blue, so a mask would make
// all six the same star; those stay full-colour images.
//
// Baked here, ahead of the "keep the last build" exits below, because the lists are fixed
// and need no game data. After those exits they would never run for kept data older than
// these icons — which is what CI restores on its first run — and every elite button and
// potential badge on the page would come up empty.
await bakeIcons('elite icons', 'elite-icons', ['0', '1', '2'], n => `ui/elite/${n}-s.png`, 40);
await bakeIcons('potential icons', 'potential-icons', ['1', '2', '3', '4', '5', '6'], n => `ui/potential/${n}.png`, 48);

const tableError = [enChars, enPatch].find(t => t instanceof Error);
if (tableError) {
  const kept = await previousOperatorCount();
  if (!kept) throw tableError;
  console.warn(
    `game data unreachable (${tableError.message}) — keeping the last build's ${kept} operators ` +
    `in ${path.relative(process.cwd(), outDir)}`,
  );
  await ensureCostFiles('game data unreachable');
  process.exit(0);
}

// The operators a game mode lends you and nothing can give you: the "Reserve Operator - *"
// set and the Sharp/Pith/Touch/Stormeye/Tulip trainer families. The site ships them marked
// with the mode they belong to, which goes by the id's band, the same split AN-EN-Tags
// makes: the 500s are Integrated Strategies' ('IS'), the 600s Stronghold Protocol's ('SP').
// undefined for an ordinary operator; null for an unobtainable one in neither band, which
// is dropped, since there is nothing to say about where it is from.
//
// `isNotObtainable` is the flag rather than a name match, because name matching would
// confuse the trainer "Mechanist" (char_610_acfend) with the real 6* operator of the same
// name, and likewise for "Raidian".
function modeOf(id, c) {
  if (!c.isNotObtainable) return undefined;
  if (/^char_5\d\d_/.test(id)) return 'IS';
  return /^char_6\d\d_/.test(id) ? 'SP' : null;
}

// The roster the site ships. Amiya's Guard and Medic forms come from the patch table — they
// are operators like any other here, and dropping them would lose two from the grid.
const roster = Object.entries({ ...enChars, ...(enPatch.patchChars ?? {}) })
  .filter(([, c]) => VALID_PROFESSION.has(c.profession) && VALID_RARITY.has(c.rarity))
  .map(([id, c]) => ({ id, data: c, mode: modeOf(id, c) }))
  .filter(r => r.mode !== null);

// Diagnostic only, for the summary log below: how many otherwise operator-shaped (valid
// profession/rarity) records were dropped as unobtainable and in no mode's band.
const excluded = Object.entries({ ...enChars, ...(enPatch.patchChars ?? {}) })
  .filter(([id, c]) => VALID_PROFESSION.has(c.profession) && VALID_RARITY.has(c.rarity) && modeOf(id, c) === null)
  .length;

const cnSupplement = await fetchCnSupplement(new Set(roster.map(r => r.id)));
const modeOrders = modeReleaseOrders(roster);

// The wiki lists Japanese collab operators surname-first ("Togawa Sakiko"); HellaAPI
// gives given-name-first ("Sakiko Togawa").
function releaseDateFor(name) {
  const direct = releaseDates.get(name);
  if (direct) return direct;
  const parts = name.split(' ');
  return parts.length === 2 ? releaseDates.get(`${parts[1]} ${parts[0]}`) ?? null : null;
}

const { written: detailsWritten, nations, nationIds, factions, collabs, archetypes, traitByName, popup, itemIds } = await buildOperatorDetails(
  roster.map(r => ({ id: r.id, appellation: r.data.appellation, mode: r.mode })),
  cnSupplement,
);

// Same fallback as the enChars/enPatch check above, for the failure mode that check can't
// see: a table buildPayload fetches lazily died, so every per-operator call warned and
// failed inside its own try/catch instead of throwing here.
if (detailsWritten < MIN_DETAILS_WRITTEN) {
  const kept = await previousOperatorCount();
  if (!kept) {
    throw new Error(`only ${detailsWritten} operator details written (expected >= ${MIN_DETAILS_WRITTEN}) and no previous build to fall back on`);
  }
  console.warn(
    `only ${detailsWritten} operator details written (expected >= ${MIN_DETAILS_WRITTEN}) — keeping the last build's ${kept} operators ` +
    `in ${path.relative(process.cwd(), outDir)}`,
  );
  await ensureCostFiles('too few operator details written');
  process.exit(0);
}

const popupFile = path.join(outDir, 'operator-popup.json');
await writeFile(popupFile, JSON.stringify(popup));
console.log(
  `wrote ${Object.keys(popup).length} popup projections ` +
  `(${(JSON.stringify(popup).length / 1024).toFixed(0)}KB) -> ` +
  `${path.relative(process.cwd(), popupFile)}`,
);
await writeItemIndex(itemIds);
await writeGameConsts();

const entries = roster.map(r => ({
  id: r.id,
  // Amiya's Guard/Medic patch-table forms are both named plain "Amiya" in the raw record —
  // the bracket comes from patchDetailInfoList's own infoParam. Gated on the id being
  // absent from the base table, same as build-payload.mjs's data.name: patchDetailInfoList
  // also carries an entry for the base id (Amiya's own "Caster" form), which must NOT be
  // bracketed here or the grid card would disagree with that operator's own detail page.
  name: !enChars[r.id] && enPatch.patchDetailInfoList?.[r.id]?.infoParam
    ? `${r.data.name} (${enPatch.patchDetailInfoList[r.id].infoParam})`
    : r.data.name,
  appellation: r.data.appellation,
  rarity: r.data.rarity,
  profession: r.data.profession,
  subProfessionId: r.data.subProfessionId,
  // Readable subclass name — 'splashcaster' -> 'Splash Caster'. Harvested from the full
  // payloads in buildOperatorDetails above, same as nation/collab below: the raw table only
  // has subProfessionId, not the resolved name buildPayload's uniequip join produces.
  archetype: archetypes.get(r.id) ?? '',
  // Recruitment tags. A few operators carry an empty-string tag; drop those.
  tags: (r.data.tagList ?? []).filter(t => t && t.trim()),
  // null for a few event operators whose debut event has no dated row on the wiki, and for
  // a mode's own operators, which were never released: looked up by name, the trainer
  // "Mechanist" would take the real Mechanist's date.
  releaseDate: r.mode ? null : releaseDateFor(r.data.name),
  // Sanity Gone's ordinal, or for a mode's own operator the place recorded for it.
  releaseOrder: (r.mode ? modeOrders.get(r.id) : releaseOrders.get(r.id)) ?? null,
  // Display name of the operator's home nation ("Kjerag"), '' where the payload states
  // none. Harvested from the full payloads in buildOperatorDetails above.
  nation: nations.get(r.id) ?? '',
  // The faction's own id, which names its logo file.
  nationId: nationIds.get(r.id) ?? '',
  // The most specific faction (team, else group, else nation): its display name, and its
  // id for the logo file.
  faction: factions.get(r.id)?.powerName ?? '',
  factionId: factions.get(r.id)?.powerId ?? '',
  // Display name of the crossover this operator came from, '' for the regular roster.
  collab: collabs.get(r.id) ?? '',
  // 'IS' or 'SP' on an operator only that mode lends, absent on everyone else.
  ...(r.mode ? { mode: r.mode } : {}),
}));

// CN-only entries have no English `archetype` to draw on (the CN table names branches in
// Chinese), but their subProfessionId is the same stable slug either way — if any EN operator
// already shares it, reuse that translation instead of showing the raw id.
const archetypeBySubclass = new Map(entries.map(o => [o.subProfessionId, o.archetype]).filter(([, a]) => a));

for (const c of cnSupplement) {
  entries.push({
    id: c.id,
    name: c.appellation,
    appellation: c.appellation,
    rarity: c.rarity,
    profession: c.profession,
    subProfessionId: c.subProfessionId,
    // A subclass no HellaAPI operator shares has nothing to borrow — Supportive Ranger's only
    // operators, Pedro and Yukari Takeba, are both CN-supplement — so the wiki's own branch
    // field names it instead. Without a name the branch icon can't be matched either.
    archetype: archetypeBySubclass.get(c.subProfessionId)
      ?? traitByName.get(normalizeWikiName(c.appellation))?.branch ?? '',
    tags: c.tags,
    releaseDate: RECENT_UNDATED,
    releaseOrder: releaseOrders.get(c.id) ?? null,
    nation: nations.get(c.id) ?? '',
    nationId: nationIds.get(c.id) ?? '',
    faction: factions.get(c.id)?.powerName ?? '',
    factionId: factions.get(c.id)?.powerId ?? '',
    collab: collabs.get(c.id) ?? '',
    // Not on the global server yet: its text is the wiki's unofficial English, or Chinese.
    cnOnly: true,
  });
}

// The id of the collab's own logo, where it has one: the card back shows that in place of
// the faction's badge. Absent for everyone else.
for (const entry of entries) {
  const collabLogo = collabLogoFor(entry.collab);
  if (collabLogo) entry.collabLogo = collabLogo;
}

// RECENT_UNDATED entries are placeholder-dated, not genuinely dated — don't let them
// count toward MIN_DATED, or a wiki outage that zeroed out real dates could still pass
// the check as long as enough CN-supplement operators existed.
const dated = entries.filter(o => o.releaseDate && o.releaseDate !== RECENT_UNDATED).length;
if (dated < MIN_DATED) {
  throw new Error(`only ${dated}/${entries.length} operators got a release date (expected >= ${MIN_DATED})`);
}

// Deterministic on-disk order: same priority the runtime "Oldest" sort uses —
// releaseOrder first (near-universal, most accurate), releaseDate as fallback, oldest
// first, undated last.
entries.sort((a, b) => {
  if (a.releaseOrder != null && b.releaseOrder != null) {
    return a.releaseOrder - b.releaseOrder || a.name.localeCompare(b.name);
  }
  return (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999') || a.name.localeCompare(b.name);
});

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'operators.json');
await writeFile(outFile, JSON.stringify(entries));

// Runs off the finished entry list so it sees CN-supplement operators too — several of
// the branches missing from the old icon source belong exclusively to them.
const branchIcons = await fetchBranchIcons(entries);
await fetchPortraits(entries);
await bakeIcons('faction logos', 'faction-logos', entries.flatMap(e => [e.nationId, e.factionId]), id => `factions/logo_${id}.png`);
await bakeCollabLogos();
await bakeIcons('class icons', 'class-icons', CLASS_SLUGS, slug => `classes/class_${slug}.png`);
const genuinelyUndated = entries.filter(o => !o.releaseDate).length;
// A mode's own operators carry a place borrowed from AN-EN-Tags' list, not an ordinal of
// Sanity Gone's, so they are not counted as having one.
const withOrder = entries.filter(o => o.releaseOrder != null && !o.mode).length;
console.log(
  `wrote ${entries.length} operators (${dated} dated, ${cnSupplement.length} recent-undated ` +
  `(sort first), ${genuinelyUndated} genuinely undated (sort last), ${excluded} unobtainable ` +
  `excluded, ${withOrder} with a Sanity Gone releaseOrder) -> ${path.relative(process.cwd(), outFile)}`,
);
// A collab that stops matching — a renamed prefix, a new crossover nobody added a line
// for — shows up as a missing or shrunken group here rather than as an empty filter.
const collabTally = new Map();
for (const o of entries) if (o.collab) collabTally.set(o.collab, (collabTally.get(o.collab) ?? 0) + 1);
console.log(
  `collabs: ${[...collabTally].map(([n, c]) => `${n} (${c})`).join(', ') || 'NONE MATCHED'}`,
);
console.log(
  `wrote ${detailsWritten}/${entries.length} baked operator details -> ` +
  `${path.relative(process.cwd(), path.join(outDir, 'operator-details'))}`,
);
console.log(
  `wrote ${branchIcons.written}/${branchIcons.total} branch icons -> ` +
  `${path.relative(process.cwd(), path.join(outDir, 'branch-icons'))}`,
);
