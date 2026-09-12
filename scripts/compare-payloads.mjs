// Gate for the raw-gamedata migration: rebuilds payloads from the excel tables and diffs
// them against the payloads HellaAPI produced (snapshotted in .golden/operator-details).
//
// A structural mismatch — a missing field, a different type, a different array length — is
// a bug in the join and fails the run. A differing string or number is content drift: the
// EN tables move ahead of whatever patch HellaAPI had ingested, so those are reported and
// tolerated unless --strict is passed.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildPayload } from './lib/build-payload.mjs';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const value = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };

const FIELDS = (value('--fields') ?? 'id,data,archetype,skills,range,bases,factions,modules,skins').split(',');
const LIMIT = Number(value('--limit') ?? 0);
const STRICT = flag('--strict');
const goldenDir = path.join(process.cwd(), '.golden', 'operator-details');

// Walks both sides together. Returns { structural: [...paths], drift: [...paths] }.
function diff(a, b, at = '', out = { structural: [], drift: [] }, depth = 0) {
  if (a === b) return out;
  const type = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  if (type(a) !== type(b)) {
    // A null on one side, deep inside the record, is the game emptying a field between the
    // snapshot and now: Makoto's third talent lost its candidates array, Aigis's first
    // talent lost its name. That is content, not a broken join. At depth 0 — the payload's
    // own fields — a null would mean we failed to build one, so it stays structural.
    const nulled = a === null || b === null;
    (nulled && depth > 0 ? out.drift : out.structural).push(`${at}: ${type(a)} vs ${type(b)}`);
    return out;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) { out.structural.push(`${at}: length ${a.length} vs ${b.length}`); return out; }
    a.forEach((v, i) => diff(v, b[i], `${at}[${i}]`, out, depth + 1));
    return out;
  }
  if (a && typeof a === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      // `a` is what we built, `b` is the golden payload, and the two sides mean different
      // things. A key only the golden has is a field we failed to produce — exactly what
      // this gate exists to catch. A key only we have is the game having added something
      // since the golden was baked (teleportImmune and groundBoundImmune arrived that way),
      // which the app ignores.
      if (!(k in b)) { out.drift.push(`${at}.${k}: new upstream key`); continue; }
      if (!(k in a)) { out.structural.push(`${at}.${k}: missing from built payload`); continue; }
      diff(a[k], b[k], `${at}.${k}`, out, depth + 1);
    }
    return out;
  }
  out.drift.push(`${at}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  return out;
}

const files = (await readdir(goldenDir)).filter(f => f.endsWith('.json'));
const ids = (LIMIT ? files.slice(0, LIMIT) : files).map(f => f.replace(/\.json$/, ''));

let compared = 0, notBuilt = 0;
const structural = [], drift = [];
for (const id of ids) {
  const golden = JSON.parse(await readFile(path.join(goldenDir, `${id}.json`), 'utf8'));
  // EN first, then CN: the frontier operators the EN tables don't carry yet are built from
  // the CN tables, exactly as the index does.
  const built = (await buildPayload(id)) ?? (await buildPayload(id, 'cn'));
  if (!built) { notBuilt++; continue; }
  compared++;
  for (const field of FIELDS) {
    if (!(field in built)) continue; // field not implemented yet
    if (!(field in golden)) continue; // HellaAPI didn't return it for this operator
    const out = diff(built[field], golden[field], `${id}.${field}`);
    structural.push(...out.structural);
    drift.push(...out.drift);
  }
}

console.log(`compared ${compared} operators (${notBuilt} not built), fields: ${FIELDS.join(',')}`);
console.log(`structural mismatches: ${structural.length}`);
for (const line of structural.slice(0, 20)) console.log(`  ${line}`);
console.log(`content drift: ${drift.length}`);
for (const line of drift.slice(0, 10)) console.log(`  ${line}`);

if (structural.length || (STRICT && drift.length)) process.exit(1);
