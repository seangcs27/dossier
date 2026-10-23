// Every address the web target has to answer, from the generated data, checked against the
// router: each one has to parse (router.ts's own parseHash) to the view its game owns. Prints
// a count per game and writes the addresses to dist/routes.txt, one a line. The Astro plan
// (PLAN-astro-hybrid.md) holds the build to this list, so a page that goes missing, or a
// route the router no longer knows, fails here first.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const GENERATED = 'src/shared/generated';

const readJson = async (file) => JSON.parse(await readFile(path.join(GENERATED, file), 'utf8'));

/**
 * router.ts's parseHash, run as the site runs it. The module reads `window` when it loads, so
 * a stand-in goes up first; nothing else of the page is needed to parse an address.
 */
async function loadParseHash() {
  const source = await readFile('src/web/router.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  globalThis.window = { location: { href: '', hash: '' }, addEventListener() {} };
  const router = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  return router.parseHash;
}

/** Each game's routes as [address, view the router has to give it, id it has to give back]. */
async function gameRoutes() {
  const [operators, endfield, sinners, holomems, cards] = await Promise.all([
    readJson('operators.json'),
    readJson('endfield/operators.json'),
    readJson('ptn/sinners.json'),
    readJson('holodori/characters.json'),
    readJson('holodori/cards.json'),
  ]);
  const withId = (prefix, view, entries) => entries.map(({ id }) => [`${prefix}${id}`, view, id]);
  return {
    Arknights: [
      ['#/', 'grid'],
      ['#/events', 'events'],
      ['#/events/pools', 'events'],
      ['#/events/calendar', 'events'],
      ...withId('#/op/', 'detail', operators),
    ],
    Endfield: [['#/endfield', 'endfield'], ...withId('#/endfield/op/', 'endfield-detail', endfield)],
    'Path to Nowhere': [['#/ptn', 'ptn'], ...withId('#/ptn/sinner/', 'ptn-detail', sinners)],
    'hololive Dreams': [
      ['#/holodori', 'holodori-home'],
      ['#/holodori/holomems', 'holodori'],
      ['#/holodori/songs', 'holodori-songs'],
      ['#/holodori/cards', 'holodori-cards'],
      ['#/holodori/gachas', 'holodori-gachas'],
      ...withId('#/holodori/holomem/', 'holodori-holomem', holomems),
      ...withId('#/holodori/card/', 'holodori-card', cards),
    ],
    FGO: [['#/fgo', 'fgo']],
  };
}

/** The inventory, and the routes the router did not give the view (or id) its game owns. */
export async function routeInventory() {
  const [parseHash, games] = await Promise.all([loadParseHash(), gameRoutes()]);
  const misparsed = [];
  for (const routes of Object.values(games)) {
    for (const [hash, view, id] of routes) {
      const route = parseHash(hash);
      if (route.view !== view || (id !== undefined && route.id !== id)) misparsed.push(`${hash} -> ${JSON.stringify(route)}`);
    }
  }
  const hashes = Object.values(games).flatMap(routes => routes.map(([hash]) => hash));
  return { games, hashes, misparsed };
}

async function main() {
  const { games, hashes, misparsed } = await routeInventory();
  for (const [game, routes] of Object.entries(games)) console.log(`${game.padEnd(16)}${String(routes.length).padStart(5)}`);
  console.log(`${'Total'.padEnd(16)}${String(hashes.length).padStart(5)}`);
  await mkdir('dist', { recursive: true });
  await writeFile('dist/routes.txt', `${hashes.join('\n')}\n`);
  console.log('-> dist/routes.txt');

  const duplicates = hashes.filter((hash, i) => hashes.indexOf(hash) !== i);
  if (duplicates.length) console.error(`duplicate routes: ${duplicates.join(', ')}`);
  if (misparsed.length) console.error(`router disagrees on ${misparsed.length} routes:\n${misparsed.slice(0, 10).join('\n')}`);
  if (duplicates.length || misparsed.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
