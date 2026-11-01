// A page's script imports its chunks, which import theirs, three or four levels deep, and the
// browser learns of each level only once the one above it has come: a round trip a level. A
// `modulepreload` for every chunk the page's scripts import, written into its head after the
// build, asks for them all at once. The client router adds a page's links to the head when it
// swaps that page in, so a move to another kind of page asks for its chunks at once as well.
//
// Only on a page whose content waits on its script (a view mounted in the browser), and after
// the stylesheet: on a phone the chunks otherwise shared the bandwidth with the stylesheet, and
// a page drawn at build time, which needs only the stylesheet to paint, painted later
// (docs/astro-vs-spa.md, 2 November 2026). The calendar is a mount under the Events list's view.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MOUNTED = new Set(['grid', 'detail', 'ptn-detail', 'endfield', 'ptn', 'holodori', 'holodori-songs', 'holodori-cards', 'fgo']);
const STYLESHEET = /<link rel="stylesheet"[^>]*>/;

export default function preload() {
  let base = '/';
  return {
    name: 'dossier-preload',
    hooks: {
      'astro:config:done': ({ config }) => { base = config.base.replace(/\/?$/, '/'); },
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        const imports = new Map();
        const importsOf = async (rel) => {
          if (!imports.has(rel)) {
            const source = await readFile(path.join(root, rel), 'utf8');
            imports.set(rel, [...source.matchAll(/(?:import|from)\s*["']([^"']+\.js)["']/g)]
              .map(([, dep]) => path.posix.join(path.posix.dirname(rel), dep)));
          }
          return imports.get(rel);
        };
        const pages = (await readdir(root, { recursive: true })).filter(file => file.endsWith('.html'));
        for (const page of pages) {
          const file = path.join(root, page);
          const html = await readFile(file, 'utf8');
          const view = /<body[^>]*data-view="([^"]+)"/.exec(html)?.[1];
          const calendar = path.dirname(page).split(path.sep).join('/') === 'events/calendar';
          if (!MOUNTED.has(view) && !calendar) continue;
          const entries = [...html.matchAll(/<script type="module" src="([^"]+)"/g)]
            .map(([, src]) => src.slice(base.length));
          const seen = new Set(entries);
          for (const rel of entries) {
            for (const dep of await importsOf(rel)) {
              if (!seen.has(dep)) { seen.add(dep); entries.push(dep); }
            }
          }
          const links = [...seen].filter(rel => !html.includes(`src="${base}${rel}"`))
            .map(rel => `<link rel="modulepreload" href="${base}${rel}">`).join('');
          if (links) await writeFile(file, html.replace(STYLESHEET, sheet => `${sheet}${links}`));
        }
      },
    },
  };
}
