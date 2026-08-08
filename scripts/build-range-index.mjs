// Generates src/shared/generated/ranges.json — every attack range referenced by any
// operator, bundled at build time so the detail view's range grid never needs a live
// HellaAPI call. There are only ~35 unique ranges across the whole roster (operators
// share them heavily — most "Melee 1-tile" operators point at the same range id), so
// this is a few KB, not per-operator data.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://awedtan.ca/api';

// Plain `fetch` has no timeout — a stalled connection on a shared CI runner would hang
// this indefinitely with no error. See build-operator-index.mjs for the same fix and
// the outage that prompted it.
const FETCH_TIMEOUT_MS = 20_000;
async function timedFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

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

  // Standalone `npm run build:index:ranges` with no baked details on disk. Phase ranges
  // only — the list endpoint can't reach into skill levels — but better than nothing.
  console.warn('no baked operator details found; falling back to phase ranges only');
  const listRes = await timedFetch(`${BASE_URL}/operator?include=data.phases.rangeId`);
  if (!listRes.ok) throw new Error(`${listRes.status} fetching operator range ids`);
  for (const e of await listRes.json()) {
    for (const phase of e.value?.data?.phases ?? []) {
      if (phase.rangeId) ids.add(phase.rangeId);
    }
  }
  return ids;
}

const rangeIds = await collectRangeIds();

const ranges = {};
let failed = 0;
await Promise.all([...rangeIds].map(async id => {
  try {
    const res = await timedFetch(`${BASE_URL}/range/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`${res.status}`);
    const envelope = await res.json();
    if (!envelope?.value) throw new Error('empty envelope');
    ranges[id] = envelope.value;
  } catch (e) {
    // Non-fatal: the runtime cache falls back to a live fetch for any range missing
    // from the bundle, so a handful of failures here degrade gracefully rather than
    // blocking the build.
    failed++;
    console.warn(`range ${id} skipped: ${e.message}`);
  }
}));

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'ranges.json');
await writeFile(outFile, JSON.stringify(ranges));
console.log(
  `wrote ${Object.keys(ranges).length} ranges (${failed} failed) -> ${path.relative(process.cwd(), outFile)}`,
);
