// Generates src/shared/generated/ranges.json — every attack range referenced by any
// operator, bundled at build time so the detail view's range grid never needs a live
// HellaAPI call. There are only ~35 unique ranges across the whole roster (operators
// share them heavily — most "Melee 1-tile" operators point at the same range id), so
// this is a few KB, not per-operator data.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://awedtan.ca/api';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated',
);

const listRes = await fetch(`${BASE_URL}/operator?include=data.phases.rangeId`);
if (!listRes.ok) throw new Error(`${listRes.status} fetching operator range ids`);
const envelopes = await listRes.json();

const rangeIds = new Set();
for (const e of envelopes) {
  for (const phase of e.value?.data?.phases ?? []) {
    if (phase.rangeId) rangeIds.add(phase.rangeId);
  }
}

const ranges = {};
let failed = 0;
await Promise.all([...rangeIds].map(async id => {
  try {
    const res = await fetch(`${BASE_URL}/range/${encodeURIComponent(id)}`);
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
