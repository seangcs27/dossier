// Generates src/shared/generated/holodori/characters.json — the roster of hololive Dreams
// (ホロドリ), Cover's rhythm game, which the web target carries as a roster and nothing else.
//
// One source: HolodoriDB's dump of the game's master database, which a bot on GitHub
// refreshes every three hours. It keeps a repository for each of the game's six languages,
// and each is the whole database: the tables, the same files in every one, and that
// language's text in Lang<Table>_<Lang>.json, which a table points into by id. This reads
// the English one, so nothing it bakes is in Japanese.
//
// The roster is the Character table's playable rows, 54 of its 62 today: the talents the
// game's own site lists as its holomem. The other rows have a name, a group and a costume
// and no profile, cards or songs. The game's Talent Guidelines say a talent who has
// graduated may appear in part or not at all, and those rows are left out here as the
// game's site leaves them out. The game's rarity belongs to its cards, a table of their
// own that is not read.
//
// Nothing here is load-bearing. With GitHub unreachable the last build's file is kept, or
// an empty one written: the page then has nothing to list, and the build goes on.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson } from './lib/fetch.mjs';

const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shared', 'generated', 'holodori',
);
const CHARACTERS_FILE = path.join(outDir, 'characters.json');

const DB = 'https://raw.githubusercontent.com/HolodoriDB/holodori-db-eng-diff/main';

// One table's rows. The dump wraps each in { id, data }, and files them in no order that
// holds from one dump to the next.
async function table(name) {
  const rows = await fetchJson(`${DB}/${name}.json`);
  return rows.map(row => row.data);
}

const two = n => String(n).padStart(2, '0');

async function buildRoster() {
  const [characters, groupings, productions, ...texts] = await Promise.all([
    'Character', 'CharacterGrouping', 'CharacterProduction',
    'LangCharacter_Eng', 'LangCharacterGrouping_Eng', 'LangCharacterProduction_Eng',
  ].map(table));
  // What a table names with a `...LangId`, in English. The three text tables share no id.
  const text = new Map(texts.flat().map(t => [t.id, t.text]));
  const groupOf = new Map(groupings.map(g => [g.id, g]));
  const branchOf = new Map(productions.map(p => [p.id, text.get(p.nameLangId)]));

  // The dump leaves out every empty value: a row that is not playable has no `isPlayable`
  // at all, and a talent in no group would have no list of them.
  const roster = characters.filter(c => c.isPlayable).sort((a, b) => a.order - b.order).map(c => ({
    id: c.id,
    // The table's own romanised name stands in for a text the English table lacks. Today
    // the two agree for every talent.
    name: text.get(c.nameLangId) ?? c.nameEng,
    shortName: text.get(c.shortNameLangId) ?? c.shortNameEng,
    branch: branchOf.get(c.characterProductionId),
    // In the game's own order of groups, which puts Fubuki's generation before GAMERS, as
    // the game's own line for her does.
    groups: (c.regularCharacterGroupingIds ?? []).map(id => groupOf.get(id))
      .sort((a, b) => a.order - b.order).map(g => text.get(g.nameLangId)),
    fanName: text.get(c.fanNameLangId) ?? '',
    birthday: `${two(c.birthMonth)}-${two(c.birthDay)}`,
    debut: `${c.debutYear}-${two(c.debutMonth)}-${two(c.debutDay)}`,
  }));
  // The page cannot draw an entry without these four, and a field the dump has renamed or
  // emptied would come back as 'undefined' inside a date. Failing here keeps the last
  // build's roster instead.
  const broken = roster.find(c =>
    !c.name || !c.branch || !/^\d{4}-\d\d-\d\d$/.test(c.debut) || !/^\d\d-\d\d$/.test(c.birthday));
  if (broken) throw new Error(`the Character table has changed shape: ${JSON.stringify(broken)}`);
  if (!roster.length) throw new Error('the Character table has no playable rows');
  return roster;
}

await mkdir(outDir, { recursive: true });
try {
  const roster = await buildRoster();
  await writeFile(CHARACTERS_FILE, JSON.stringify(roster));
  console.log(`holodori: ${roster.length} characters -> ${path.relative(process.cwd(), CHARACTERS_FILE)}`);
} catch (err) {
  // The page imports this file, so one has to exist for the bundle to build at all.
  const kept = await readFile(CHARACTERS_FILE, 'utf8').then(() => true, () => false);
  if (!kept) await writeFile(CHARACTERS_FILE, '[]');
  console.warn(`holodori/characters.json ${kept ? 'kept from the last build' : 'written empty'}: ${err.message}`);
}
