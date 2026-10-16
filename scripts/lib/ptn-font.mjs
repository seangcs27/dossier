// Path to Nowhere's placard face for Chinese: Noto Sans SC (Source Han Sans under Google's
// name, the face the game's own CN site sets its interface in), cut down to the characters
// the placard face is asked to set, and written beside Barlow Condensed in
// src/web/fonts/noto-sans-sc/ at two weights, 500 and 900 (for the placard's 700).
//
// The whole font is one 17.8 MB variable TTF from the Google Fonts repository, fetched once
// and kept with the generated data (CI restores it from the cache). The cut is a few
// hundred KB and tracked, as the snapshot is: a build that cannot fetch or cut keeps the
// last one, and a character it lacks falls to the reader's own face.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import { timedFetch } from './fetch.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf';
const CACHED = path.join(ROOT, 'src', 'shared', 'generated', 'ptn', 'fonts', 'NotoSansSC[wght].ttf');
const OUT_DIR = path.join(ROOT, 'src', 'web', 'fonts', 'noto-sans-sc');
const WEIGHTS = [500, 900];

const HAN = /[　-〿㐀-鿿＀-￯]/g;

// Every character the placard face sets on the Chinese side: the names, titles and tags of
// the roster, the headings of a file (skills, shackles, the crimebrand, its terms, the
// dream, the file's own sections), and this site's own words (ptn-lang.ts). Not the
// running text, which is in the reader's own face.
export async function placardText(sinners, details) {
  const parts = sinners.flatMap(s => [s.nameCn, ...(s.tagsCn ?? [])]);
  for (const d of details) {
    for (const side of [d, d.zh ?? {}]) {
      parts.push(side.title, side.mania?.name, side.brand?.name, side.dream?.name, side.dream?.kind,
        ...(side.skills ?? []).map(k => k.name), ...(side.shackles ?? []).map(k => k.name),
        ...(side.extras ?? []).map(k => k.name), ...(side.terms ?? []).map(k => k.name),
        ...(side.brand?.terms ?? []).map(k => k.name), ...(side.file ?? []).map(k => k.title));
    }
  }
  parts.push(await readFile(path.join(ROOT, 'src', 'web', 'ptn-lang.ts'), 'utf8'));
  return [...new Set(parts.filter(Boolean).join('').match(HAN) ?? [])].sort().join('');
}

export async function bakePtnFont(text) {
  try {
    let font = await readFile(CACHED).catch(() => undefined);
    if (!font) {
      const res = await timedFetch(SOURCE);
      if (!res.ok) throw new Error(`${res.status} from ${SOURCE}`);
      font = Buffer.from(await res.arrayBuffer());
      await mkdir(path.dirname(CACHED), { recursive: true });
      await writeFile(CACHED, font);
    }
    await mkdir(OUT_DIR, { recursive: true });
    const sizes = [];
    for (const weight of WEIGHTS) {
      const cut = await subsetFont(font, text, { targetFormat: 'woff2', variationAxes: { wght: weight } });
      const file = path.join(OUT_DIR, `NotoSansSC-${weight}.woff2`);
      // Written only when it changed, so an unchanged cut leaves no diff.
      const before = await readFile(file).catch(() => undefined);
      if (!before?.equals(cut)) await writeFile(file, cut);
      sizes.push(`${weight} ${Math.round(cut.length / 1024)} KB`);
    }
    console.log(`ptn font: ${text.length} characters, ${sizes.join(', ')} -> ${path.relative(process.cwd(), OUT_DIR)}`);
  } catch (err) {
    console.warn(`ptn font: the last cut kept: ${err.message}`);
  }
}
