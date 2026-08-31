// Generates src/shared/generated/operators.json — the slim operator index used by
// BOTH targets (web grid + extension popup). Bundled at build time; nothing fetches
// this list at runtime.
//
// Three sources:
//   HellaAPI              — primary operator identity (name, rarity, class, resolved
//                           archetype, tags, isNotObtainable). Lags the CN release
//                           frontier by roughly one patch (~10-15 operators).
//   raw CN game data      — supplements HellaAPI for that lag only: operators CN
//                           already has that HellaAPI hasn't ingested yet. Names come
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
//                           construction they ARE newer than everything HellaAPI has
//                           ingested — that's the only reason they needed supplementing
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
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const HELLA_URL =
  'https://awedtan.ca/api/operator' +
  '?include=data.name&include=data.appellation&include=data.rarity' +
  '&include=data.profession&include=data.subProfessionId' +
  '&include=data.tagList&include=archetype&include=data.isNotObtainable';

const CN_CHARACTER_TABLE_URL =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json';

const WIKI_API = 'https://arknights.wiki.gg/api.php';
const SANITYGONE_BASE = 'https://sanitygone.help';
const HELLA_OPERATOR_BASE = 'https://awedtan.ca/api/operator';
const HELLA_CN_OPERATOR_BASE = 'https://awedtan.ca/api/cn/operator';
const AN_EN_TAGS_JSON_BASE = 'https://raw.githubusercontent.com/PuppiizSunniiz/AN-EN-Tags/main/json';
const AN_EN_TAGS_BASE = `${AN_EN_TAGS_JSON_BASE}/ace`;
const ARKNIGHT_IMAGES_TREE_URL =
  'https://api.github.com/repos/PuppiizSunniiz/Arknight-Images/git/trees/main?recursive=1';
const ARKNIGHT_IMAGES_BASE = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';

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
        .find(Boolean);
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
const RECENT_UNDATED = '9999-12-31';

// CN recruitment-tag text -> the exact English string HellaAPI already uses for the
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

// Below this many resolved dates, assume the wiki is down or its schema moved —
// fail the build rather than silently deploying a broken sort order.
const MIN_DATED = 300;

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

// Supplemental only — never blocks the build. A GitHub raw-content hiccup should not
// fail a weekly deploy over ~10 operators that are already tolerably handled by sorting
// last; HellaAPI is the source that matters.
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
      if (knownIds.has(id)) continue; // HellaAPI already covers this one
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

// HellaAPI's /cn/operator returns `skills` as bare excel objects (no `deploy` wrapper)
// whenever an operator actually has skills — unlike /operator, which nests each as
// `{ deploy, excel }`. Mirrors normalizeCnSkills() in src/shared/api/hella-api.ts;
// duplicated here rather than shared because this is a standalone Node script, not
// bundled through the TS build.
function normalizeCnSkills(op) {
  const raw = op.skills ?? [];
  return raw.map(entry => {
    if ('excel' in entry) return entry;
    const ref = (op.data.skills ?? []).find(r => r.skillId === entry.skillId);
    return {
      deploy: { skillId: entry.skillId, unlockCond: ref?.unlockCond ?? { phase: 'PHASE_0', level: 1 } },
      excel: entry,
    };
  });
}

// English fan translations for skill/talent text, sourced from Aceship's community
// translation project (the same repo CN_TAG_EN above is already verified against) —
// these operators haven't had an official EN localization pass yet, so this is the
// best available English until they release on Global. Keyed by skillId (skills) and
// by operator id (talents, as an array-of-arrays matching data.talents[j].candidates[k]
// positionally). Supplemental only: a fetch failure here degrades to the existing raw-
// Chinese CN fallback in hella-api.ts, it doesn't block the index build.
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
    const rows = await cargo({ tables: 'Operators', fields: 'name,trait,description', where: `name IN (${[...queryNames].map(n => `"${n.replace(/"/g, '')}"`).join(',')})` });
    return new Map(rows.map(r => [normalizeWikiName(r.name), {
      // Both fields can carry [[page|display]] wikilink syntax (confirmed on
      // Kal'tsit·Esperanta's trait, not just the bio blurb this was first written for)
      // — cleanText() at render time strips HTML tags but has no idea about wikitext,
      // so this needs to happen here or "[[Take Off|Take Off]]" shows up literally.
      trait: r.trait ? stripWikiMarkup(r.trait) : null,
      itemUsage: r.description ? stripWikiMarkup(r.description) : null,
    }]));
  } catch (e) {
    console.warn(`wiki trait fetch skipped: ${e.message}`);
    return new Map();
  }
}

// Builds the CN-supplement version of a full Operator object: shape-normalized skills,
// plus every translated field (skills/talents from Aceship, trait/itemUsage from the
// wiki, tags/obtain from the static CN_* tables above, base skills from RIIC data,
// potential ranks via keyword substitution). Module trait-override text has no clean
// translation source in any of these — the only module data available covers talent-
// upgrade numbers, not the trait text detail.ts actually renders — so it's left as
// raw CN rather than force a bad match.
function buildCnOperatorPayload(op, id, appellation, skillTl, talentTl, traitByName, riicBuffs, potentialKeywords) {
  const skills = normalizeCnSkills(op).map(s => {
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
// already complete, correctly-shaped, English data straight from HellaAPI's global
// endpoint. This is what makes every detail page load from a same-origin static file
// instead of a live third-party API call (see hella-api.ts's static-first lookup),
// with the live fetch kept only as a fallback for an id this build doesn't know about
// yet. Best-effort per operator: one bad fetch shouldn't cost the others.
async function buildOperatorDetails(regular, cnSupplement) {
  const [{ skills: skillTl, talents: talentTl }, traitByName, riicBuffs, potentialKeywords, artIndex] = await Promise.all([
    fetchAceTranslations(),
    fetchWikiTraits(cnSupplement.map(c => c.appellation)),
    fetchRiicTranslations(),
    fetchPotentialKeywords(),
    fetchCharacterArtIndex(),
  ]);
  const cnById = new Map(cnSupplement.map(c => [c.id, c]));

  const detailOutDir = path.join(outDir, 'operator-details');
  await mkdir(detailOutDir, { recursive: true });

  let written = 0;
  // Nation is only in the full payload, never in the slim `?include=` query the index is
  // built from, so it's harvested here rather than costing a second pass over 427 ids.
  const nations = new Map();
  const all = [...regular, ...cnSupplement];
  await mapConcurrent(all, 12, async entry => {
    const cn = cnById.get(entry.id);
    try {
      const url = cn
        ? `${HELLA_CN_OPERATOR_BASE}/${encodeURIComponent(entry.id)}`
        : `${HELLA_OPERATOR_BASE}/${encodeURIComponent(entry.id)}`;
      const res = await timedFetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const envelope = await res.json();
      if (!envelope?.value) throw new Error('empty response');
      const op = envelope.value;

      const base = cn
        ? buildCnOperatorPayload(op, entry.id, entry.appellation, skillTl, talentTl, traitByName, riicBuffs, potentialKeywords)
        : op;
      const arts = buildArtsList(entry.id, artIndex.get(entry.id) ?? [], op.skins);
      const finalOp = { ...base, arts };

      // `powerName` is the localized display name ("Kjerag"); `data.nationId` is the raw
      // slug and only a fallback, title-cased, for a payload whose factions array is empty
      // but whose nationId isn't. 403 of 427 operators have one — Rhodes Island's own
      // recruits mostly, plus a long tail with no stated origin at all.
      const nation = finalOp.factions?.[0]?.nationPower?.powerName
        ?? (base.data?.nationId ? base.data.nationId[0].toUpperCase() + base.data.nationId.slice(1) : '');
      if (nation) nations.set(entry.id, nation);

      await writeFile(path.join(detailOutDir, `${entry.id}.json`), JSON.stringify(finalOp));
      written++;
    } catch (e) {
      console.warn(`operator detail skipped for ${entry.id}: ${e.message}`);
    }
  });
  return { written, nations };
}

const [hellaRes, releaseDates, releaseOrders] = await Promise.all([
  timedFetch(HELLA_URL), // hard-fail: no operator list, no point building
  fetchReleaseDates(),
  fetchReleaseOrder(),
]);
if (!hellaRes.ok) throw new Error(`${hellaRes.status} ${HELLA_URL}`);
const envelopes = await hellaRes.json();

const cnSupplement = await fetchCnSupplement(new Set(envelopes.map(e => e.canon)));

// The wiki lists Japanese collab operators surname-first ("Togawa Sakiko"); HellaAPI
// gives given-name-first ("Sakiko Togawa").
function releaseDateFor(name) {
  const direct = releaseDates.get(name);
  if (direct) return direct;
  const parts = name.split(' ');
  return parts.length === 2 ? releaseDates.get(`${parts[1]} ${parts[0]}`) ?? null : null;
}

// Tutorial and Integrated Strategies trainer units — the "Reserve Operator - *" set plus
// the Sharp/Pith/Touch/Stormeye/Tulip families. They were never released, so they have no
// release date and only pad the end of the grid. Both reference sites omit them too.
//
// `isNotObtainable` is the flag rather than a name match, because name matching would
// confuse the IS trainer "Mechanist" (char_610_acfend) with the real 6* operator of the
// same name, and likewise for "Raidian".
const obtainable = envelopes.filter(e => !e.value.data.isNotObtainable);
const excluded = envelopes.length - obtainable.length;

const { written: detailsWritten, nations } = await buildOperatorDetails(
  obtainable.map(e => ({ id: e.canon, appellation: e.value.data.appellation })),
  cnSupplement,
);

const entries = obtainable.map(e => ({
  // With include=data.* the operator id is only on the envelope, as `canon`.
  id: e.canon,
  name: e.value.data.name,
  appellation: e.value.data.appellation,
  rarity: e.value.data.rarity,
  profession: e.value.data.profession,
  subProfessionId: e.value.data.subProfessionId,
  // Readable subclass name — 'splashcaster' -> 'Splash Caster'.
  archetype: e.value.archetype ?? '',
  // Recruitment tags. A few operators carry an empty-string tag; drop those.
  tags: (e.value.data.tagList ?? []).filter(t => t && t.trim()),
  // null for tutorial / Integrated Strategies trainer units that were never released,
  // plus a few event operators whose debut event has no dated row on the wiki.
  releaseDate: releaseDateFor(e.value.data.name),
  releaseOrder: releaseOrders.get(e.canon) ?? null,
  // Display name of the operator's home nation ("Kjerag"), '' where the payload states
  // none. Harvested from the full payloads in buildOperatorDetails above.
  nation: nations.get(e.canon) ?? '',
}));

// CN-only entries have no `archetype` field to draw on (that comes from HellaAPI), but
// their subProfessionId is the same stable slug either way — if any HellaAPI operator
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
    archetype: archetypeBySubclass.get(c.subProfessionId) ?? '',
    tags: c.tags,
    releaseDate: RECENT_UNDATED,
    releaseOrder: releaseOrders.get(c.id) ?? null,
    nation: nations.get(c.id) ?? '',
  });
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
const genuinelyUndated = entries.filter(o => !o.releaseDate).length;
const withOrder = entries.filter(o => o.releaseOrder != null).length;
console.log(
  `wrote ${entries.length} operators (${dated} dated, ${cnSupplement.length} recent-undated ` +
  `(sort first), ${genuinelyUndated} genuinely undated (sort last), ${excluded} unobtainable ` +
  `excluded, ${withOrder} with a Sanity Gone releaseOrder) -> ${path.relative(process.cwd(), outFile)}`,
);
console.log(
  `wrote ${detailsWritten}/${entries.length} baked operator details -> ` +
  `${path.relative(process.cwd(), path.join(outDir, 'operator-details'))}`,
);
console.log(
  `wrote ${branchIcons.written}/${branchIcons.total} branch icons -> ` +
  `${path.relative(process.cwd(), path.join(outDir, 'branch-icons'))}`,
);
