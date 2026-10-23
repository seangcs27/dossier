// Runs every module under src/web/render/ in plain Node, where there is no window, no
// document and no navigator: a module that touches one when it is imported, or when it draws,
// fails here. That is the rule for a pure renderer (the Astro plan, Phase 2), and it is what
// lets the pages built at build time (site/) import them. Each draws twice, from a fixed
// clock, and the two have to match.
//
// A renderer's calls are listed in CHECKS below, so a new module has to say how it is drawn:
// a module with no entry fails.
import { build } from 'esbuild';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const NOW = Date.UTC(2026, 9, 23, 12);
const GENERATED = 'src/shared/generated';
const OUT = 'dist/render-check';

const json = async file => JSON.parse(await readFile(path.join(GENERATED, file), 'utf8'));
const [songs, cards] = await Promise.all([json('holodori/songs.json'), json('holodori/cards.json')]);

// module -> [export, ...arguments] for each way it is drawn. An empty list is a module with
// nothing to draw (it is only imported).
const CHECKS = {
  'clock-text': [],
  'holodori-dates': [],
  'holodori-format': [],
  'holodori-clip-html': [['clipButtonHtml', songs.find(s => s.mv)]],
  'holodori-songs-html': [['songTileHtml', songs[0]], ['songBackHtml', songs[0].id]],
  'holodori-cards-html': [['cardTileHtml', cards[0]], ['skillHtml', '[highlight]5%[/highlight] of [attribute=cute]Cute[/attribute]']],
  'holodori-gachas-html': [['gachasPageHtml', NOW]],
  'holodori-home-html': [['homeHtml', NOW]],
  'holodori-holomem-html': [['holomemHtml', 'chr-00001', NOW], ['holomemHtml', 'nobody', NOW]],
  'endfield-detail-html': [
    ['endfieldDetailHtml', 'chr_0032_lizhiyan'], ['endfieldDetailHtml', 'chr_0002_endminm'],
    ['endfieldDetailHtml', 'chr_0003_endminf'], ['endfieldDetailHtml', 'nobody'],
  ],
};

// Node has a navigator of its own; a page does not read it at import, and nor may a renderer.
delete globalThis.navigator;

const modules = (await readdir('src/web/render')).filter(file => file.endsWith('.ts')).map(file => file.replace(/\.ts$/, ''));
await mkdir(OUT, { recursive: true });
await build({
  entryPoints: modules.map(name => `src/web/render/${name}.ts`),
  bundle: true,
  format: 'esm',
  platform: 'node',
  outdir: OUT,
  outExtension: { '.js': '.mjs' },
  loader: { '.json': 'json' },
  logLevel: 'silent',
});

const failures = [];
let drawn = 0;
for (const name of modules) {
  if (!(name in CHECKS)) {
    failures.push(`${name}: no entry in CHECKS`);
    continue;
  }
  let module;
  try {
    module = await import(pathToFileURL(path.resolve(OUT, `${name}.mjs`)).href);
  } catch (err) {
    failures.push(`${name}: import failed: ${err.message}`);
    continue;
  }
  for (const [fn, ...args] of CHECKS[name]) {
    try {
      const first = module[fn](...args);
      const again = module[fn](...args);
      if (typeof first !== 'string') throw new Error(`returned ${typeof first}`);
      if (first !== again) throw new Error('two draws differ');
      const slip = /undefined|NaN|\[object /.exec(first);
      if (slip) throw new Error(`has "${slip[0]}" in it: …${first.slice(Math.max(0, slip.index - 40), slip.index + 40).replace(/\s+/g, ' ')}…`);
      drawn++;
    } catch (err) {
      failures.push(`${name}.${fn}: ${err.message}`);
    }
  }
}

console.log(`${modules.length} render modules, ${drawn} draws`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
