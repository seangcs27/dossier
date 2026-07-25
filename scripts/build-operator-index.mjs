// Generates src/shared/generated/operators.json — the slim operator index used by
// BOTH targets (web grid + extension popup). Bundled at build time; nothing fetches
// this list at runtime.
//
// Two sources:
//   HellaAPI          — operator identity (name, rarity, class, …)
//   arknights.wiki.gg — CN release dates, via its Cargo API (operator -> debut event
//                       -> that event's CN start time). The game data has no release
//                       date field, and char-id numbers are banded by operator
//                       category (0xxx standard, 1xxx alters, 2xxx limiteds, 4xxx
//                       newer), so they do NOT track release order.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HELLA_URL =
  'https://awedtan.ca/api/operator' +
  '?include=data.name&include=data.appellation&include=data.rarity' +
  '&include=data.profession&include=data.subProfessionId';

const WIKI_API = 'https://arknights.wiki.gg/api.php';

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

const [hellaRes, releaseDates] = await Promise.all([
  fetch(HELLA_URL), // hard-fail: no operator list, no point building
  fetchReleaseDates(),
]);
if (!hellaRes.ok) throw new Error(`${hellaRes.status} ${HELLA_URL}`);
const envelopes = await hellaRes.json();

// The wiki lists Japanese collab operators surname-first ("Togawa Sakiko"); HellaAPI
// gives given-name-first ("Sakiko Togawa").
function releaseDateFor(name) {
  const direct = releaseDates.get(name);
  if (direct) return direct;
  const parts = name.split(' ');
  return parts.length === 2 ? releaseDates.get(`${parts[1]} ${parts[0]}`) ?? null : null;
}

const entries = envelopes.map(e => ({
  // With include=data.* the operator id is only on the envelope, as `canon`.
  id: e.canon,
  name: e.value.data.name,
  appellation: e.value.data.appellation,
  rarity: e.value.data.rarity,
  profession: e.value.data.profession,
  subProfessionId: e.value.data.subProfessionId,
  // null for tutorial / Integrated Strategies trainer units that were never released,
  // plus a few event operators whose debut event has no dated row on the wiki.
  releaseDate: releaseDateFor(e.value.data.name),
}));

const dated = entries.filter(o => o.releaseDate).length;
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
console.log(
  `wrote ${entries.length} operators (${dated} dated, ${entries.length - dated} undated) ` +
  `-> ${path.relative(process.cwd(), outFile)}`,
);
