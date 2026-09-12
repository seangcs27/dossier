// Generates src/shared/generated/ranges.json — every attack range referenced by any
// operator, bundled at build time so the detail view's range grid never needs a live
// HellaAPI call. There are only ~35 unique ranges across the whole roster (operators
// share them heavily — most "Melee 1-tile" operators point at the same range id), so
// this is a few KB, not per-operator data.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated',
);

// Every range id the detail view can ask for: an operator's per-phase range AND every
// skill level's own range (skills that change reach — Ranged Guards, most Snipers'
// S3s — carry their own rangeId, and the view draws it over the operator's).
//
// Collected from the baked per-operator details that build:index:operators has already
// written, rather than from a `?include=` list query: those files are the exact input
// the runtime reads, so nothing can be needed at runtime and absent here. Skipping this
// left 20 of 47 skill ranges unbundled, and 56 operators made a blocking live HellaAPI
// call before their page could paint.
async function collectRangeIds() {
  const detailDir = path.join(outDir, 'operator-details');
  const ids = new Set();
  let files = [];
  try {
    files = (await readdir(detailDir)).filter(f => f.endsWith('.json'));
  } catch { /* details not built yet — fall back to the list query below */ }

  if (files.length) {
    for (const file of files) {
      const op = JSON.parse(await readFile(path.join(detailDir, file), 'utf8'));
      for (const phase of op.data?.phases ?? []) {
        if (phase.rangeId) ids.add(phase.rangeId);
      }
      for (const skill of op.skills ?? []) {
        for (const level of skill.excel?.levels ?? []) {
          if (level.rangeId) ids.add(level.rangeId);
        }
      }
    }
    console.log(`collected ${ids.size} range ids from ${files.length} baked operators`);
    return ids;
  }

  // Standalone `npm run build:index:ranges` with no baked details on disk. There is no
  // longer a live list query to fall back to (see hella-api.ts) — collect nothing rather
  // than reach for a source this build no longer fetches from.
  console.warn('no baked operator details found; collecting no range ids');
  return ids;
}

// How many ranges the previous build left on disk; 0 if there's nothing usable there.
async function previousRangeCount() {
  try {
    return Object.keys(JSON.parse(await readFile(path.join(outDir, 'ranges.json'), 'utf8'))).length;
  } catch {
    return 0;
  }
}

import { table } from './lib/gamedata.mjs';

const rangeIds = await collectRangeIds();

// No detail files to collect ids from at all (operator-details/ missing or empty, e.g.
// build:index:ranges run standalone before build:index:operators has written anything) —
// collectRangeIds() returns an empty set for that case, and the table fetch below would
// still succeed, so without this it writes an empty ranges.json over a good one. Keep
// whatever the last build wrote instead, same as the unreachable-source guard below.
if (!rangeIds.size) {
  const kept = await previousRangeCount();
  if (!kept) throw new Error('no range ids collected and no previous build to fall back on');
  console.warn(`no range ids collected — keeping the last build's ${kept}`);
  process.exit(0);
}

// Unreachable source: keep the ranges the last build wrote rather than failing or, worse,
// writing an empty bundle that sends every detail page back to a live per-range fetch.
const rangeTable = await table('en', 'range_table').catch(e => e);
if (rangeTable instanceof Error) {
  const kept = await previousRangeCount();
  if (!kept) throw rangeTable;
  console.warn(`range table unreachable (${rangeTable.message}) — keeping the last build's ${kept}`);
  process.exit(0);
}

const ranges = {};
let missing = [];
for (const id of rangeIds) {
  if (rangeTable[id]) ranges[id] = rangeTable[id];
  else missing.push(id);
}

// CN-frontier operators reach for ranges the EN table doesn't carry yet — Kal'tsit·Esperanta's
// skill uses y-11, which is CN-only — so the CN table supplements it, exactly as it does for
// the operator index. Fetched only when something is actually missing.
if (missing.length) {
  const cnRanges = await table('cn', 'range_table').catch(() => ({}));
  missing = missing.filter(id => {
    if (!cnRanges[id]) return true;
    ranges[id] = cnRanges[id];
    return false;
  });
}
if (missing.length) console.warn(`ranges in neither range_table: ${missing.join(', ')}`);

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'ranges.json');
await writeFile(outFile, JSON.stringify(ranges));
console.log(
  `wrote ${Object.keys(ranges).length} ranges (${missing.length} failed) -> ${path.relative(process.cwd(), outFile)}`,
);
