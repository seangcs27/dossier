// Generates src/web/generated/operators.json — slim operator index for the web grid.
// releaseIndex = char-id number (char_423_blemsh -> 423), which tracks release order.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HELLA_URL =
  'https://awedtan.ca/api/operator' +
  '?include=data.name&include=data.appellation&include=data.rarity' +
  '&include=data.profession&include=data.subProfessionId';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'web', 'generated');

function charNum(id) {
  const m = /^char_(\d+)_/.exec(id);
  return m ? parseInt(m[1], 10) : null;
}

const res = await fetch(HELLA_URL); // hard-fail: no operator list, no point building
if (!res.ok) throw new Error(`${res.status} ${HELLA_URL}`);
const envelopes = await res.json();

const entries = envelopes.map(e => {
  // With include=data.* the operator id is only on the envelope, as `canon`.
  const num = charNum(e.canon);
  return {
    id: e.canon,
    name: e.value.data.name,
    appellation: e.value.data.appellation,
    rarity: e.value.data.rarity,
    profession: e.value.data.profession,
    subProfessionId: e.value.data.subProfessionId,
    releaseIndex: num ?? 999999,
  };
});

entries.sort((a, b) => a.releaseIndex - b.releaseIndex);

await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, 'operators.json');
await writeFile(outFile, JSON.stringify(entries));
console.log(`wrote ${entries.length} operators -> ${path.relative(process.cwd(), outFile)}`);
