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
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HELLA_URL =
  'https://awedtan.ca/api/operator' +
  '?include=data.name&include=data.appellation&include=data.rarity' +
  '&include=data.profession&include=data.subProfessionId' +
  '&include=data.tagList&include=archetype&include=data.isNotObtainable';

const CN_CHARACTER_TABLE_URL =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/character_table.json';

const WIKI_API = 'https://arknights.wiki.gg/api.php';

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
    const res = await fetch(`${WIKI_API}?${qs}`);
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
    cargo({ tables: 'Operators', fields: 'name,event', order_by: 'name' }),
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

  const byName = new Map();
  for (const op of ops) {
    if (!op.event) continue;
    const date = cnDate.get(op.event) ?? anyDate.get(op.event);
    if (date) byName.set(op.name, date);
  }
  return byName;
}

// Supplemental only — never blocks the build. A GitHub raw-content hiccup should not
// fail a weekly deploy over ~10 operators that are already tolerably handled by sorting
// last; HellaAPI is the source that matters.
async function fetchCnSupplement(knownIds) {
  try {
    const res = await fetch(CN_CHARACTER_TABLE_URL);
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

const [hellaRes, releaseDates] = await Promise.all([
  fetch(HELLA_URL), // hard-fail: no operator list, no point building
  fetchReleaseDates(),
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
  });
}

// RECENT_UNDATED entries are placeholder-dated, not genuinely dated — don't let them
// count toward MIN_DATED, or a wiki outage that zeroed out real dates could still pass
// the check as long as enough CN-supplement operators existed.
const dated = entries.filter(o => o.releaseDate && o.releaseDate !== RECENT_UNDATED).length;
if (dated < MIN_DATED) {
  throw new Error(`only ${dated}/${entries.length} operators got a release date (expected >= ${MIN_DATED})`);
}

// Deterministic on-disk order: oldest first, undated last.
entries.sort((a, b) =>
  (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999') ||
  a.name.localeCompare(b.name));

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'operators.json');
await writeFile(outFile, JSON.stringify(entries));
const genuinelyUndated = entries.filter(o => !o.releaseDate).length;
console.log(
  `wrote ${entries.length} operators (${dated} dated, ${cnSupplement.length} recent-undated ` +
  `(sort first), ${genuinelyUndated} genuinely undated (sort last), ${excluded} unobtainable ` +
  `excluded) -> ${path.relative(process.cwd(), outFile)}`,
);
