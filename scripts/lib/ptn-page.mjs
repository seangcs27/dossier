// Reads the head of a pathtonowhere.wiki.gg Sinner page, the one {{SinnerPage}} (or
// {{ReforgePage}}) call that is the page, for what the roster leaves out: the dossier's
// payload. The wiki spells everything out as that call's parameters, so nothing is worked
// out here: a parameter is read and its markup turned into the game markup the site's own
// descriptionToHtml renders.
//
// Left on the page: what anything costs (the template works the counts out from the rank,
// the same for every Sinner of it), the Mirage and trivia sections, a reforged Sinner's
// reforge nodes, and the interrogation and voice subpages.
//
// Pure text in, plain objects out: no fetching here, so it can be run against a saved page.
import { templateBodies, templateParams } from './wiki-text.mjs';

// The two things the wiki colours: a number, in blue, and a kind of damage or a state, in
// orange. Written as a hex in a <span>'s style or as a name in {{Color}}, with a few shades
// of each and the odd typo ('#5eb3e6433'), so the test is which of red and blue is stronger.
// The game tags they become are the two the site already paints in those colours: a raised
// value, and a reminder.
function tagFor(colour) {
  const hex = /^#?([0-9a-f]{2})[0-9a-f]{2}([0-9a-f]{2})/i.exec(colour.trim());
  const blue = hex ? parseInt(hex[2], 16) > parseInt(hex[1], 16) : /blue|cyan/i.test(colour);
  return blue ? '@ba.vup' : '@ba.rem';
}

// The wiki's markup as the game's: a coloured span or {{Color}} is one of those two tags,
// {{Links}} and [[links]] their label, <br> and a list item a line break. Every other tag is
// dropped, and so are bold and italics. `title` is what {{PAGENAME}} stands for.
export function toGameText(source, title) {
  let text = (source ?? '')
    .replace(/\{\{\s*PAGENAME\s*\}\}/g, title)
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '\n')
    // The style attribute is often left unclosed (`style="color:#5eb3e6>15%`), so the tag is
    // taken to end at the first `>` after the colour.
    .replace(/<span[^>]*?color:\s*([#\w]+)[^>]*>([\s\S]*?)<\/span>/gi,
      (_, colour, inner) => `<${tagFor(colour)}>${inner}</>`);

  // Innermost templates first, so a template inside a template is resolved before its host.
  const innermost = /\{\{([^{}]*)\}\}/;
  for (let m = innermost.exec(text); m; m = innermost.exec(text)) {
    const { args } = templateParams(m[1]);
    const name = m[1].split('|')[0].trim().toLowerCase();
    let out = args[args.length - 1] ?? '';
    if (name === 'color' && args.length > 1) out = `<${tagFor(args[0])}>${args[1]}</>`;
    text = text.slice(0, m.index) + out + text.slice(m.index + m[0].length);
  }

  return text
    // A template the loop could not close, which is a slip on the page: a stray brace inside
    // it ('{{Color|blue|15.6}%}}') or a placeholder nobody filled in ('${Data1}'). Its text
    // is kept and its wrapping dropped.
    .replace(/\{\{\s*\w+\s*\|(?:[^|{}]*\|)?/g, '')
    .replace(/[{}]/g, '')
    // What is left of the wiki's own tags; the game's (<@…> and </>) start with no letter.
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A file's name as the wiki titles it: spaces for underscores, the first letter a capital.
// Pages write the same file both ways ('Hecate_Skin3.png', 'Hecate Skin3.png').
export function fileTitle(name) {
  const title = name.replace(/^\[\[File:|\]\]$/gi, '').replace(/\|.*$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// The art the game itself shows of a Sinner, in the order its own gallery turns to it: the
// original, the phase-up art (which the wiki files as the first skin), the mugshot, the
// interrogation's pictures where there are any, then each attire, newest first as the
// Attires page lists them. `attires` and `gallery` are the texts of the Sinner's two
// subpages, either of which may be missing. Files are named, not checked: the caller asks
// the wiki which exist.
export function parseSinnerArt(title, attires = '', gallery = '') {
  // The gallery's first block is the game's own art, a file and its caption to a line.
  const shown = (/<gallery[^>]*>([\s\S]*?)<\/gallery>/.exec(gallery)?.[1] ?? '')
    .split('\n').map(line => line.split('|')).filter(([file]) => file.trim());
  const interrogations = shown.filter(([file, caption = '']) => /interrogation/i.test(`${file} ${caption}`))
    .map(([file, caption = '']) => ({ kind: 'interrogation', label: toGameText(caption, title) || 'Interrogation', file: fileTitle(file) }));
  const skins = templateBodies(attires, 'Attire').map(body => templateParams(body).named)
    .filter(named => named.Title && named.Image)
    .map(named => ({
      kind: 'attire',
      label: toGameText(named.Title, title),
      file: fileTitle(named.Image),
      collection: toGameText(named.Collection, title),
      // '★★★', as a count.
      rarity: (named.Rarity?.match(/★/g) ?? []).length,
    }));
  return [
    { kind: 'original', label: 'Original', file: fileTitle(`${title}.png`) },
    { kind: 'phase', label: 'Phase-up', file: fileTitle(`${title} Skin1.png`) },
    { kind: 'mugshot', label: 'Mugshot', file: fileTitle(`${title} Prisonphoto.png`) },
    ...interrogations,
    ...skins,
  ];
}

// The attribute table's ten columns.
const LEVELS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90];

// A cell of that table as a number, or NaN for anything that is not one written out.
const number = cell => (/^\d+$/.test(cell ?? '') ? Number(cell) : NaN);

// Everything the page says about one Sinner beyond the roster's entry. `named` is the
// template call's parameters, `title` the page's.
export function parseSinnerDetail(named, title) {
  const field = key => toGameText(named[key], title);
  // A numbered family, read until the first number left blank: Description1, Description2, …
  const run = (prefix, from = 1) => {
    const out = [];
    for (let n = from; named[`${prefix}${n}`]; n++) out.push(field(`${prefix}${n}`));
    return out;
  };
  const skill = (kind, prefix) => ({
    kind,
    name: field(`${prefix}Name`),
    // The first is the skill as it is at level 1; each one after says what that level changes.
    levels: run(`${prefix}Description`),
  });
  const passives = [];
  for (let n = 1; named[`P${n}Name`]; n++) passives.push(skill('Passive', `P${n}`));

  // 'Fatal Reflection: Core Damage dealt…' is a name and what it does. Some pages put the
  // name on a line of its own with no colon, and a few give no name at all.
  const mania = field('ManiaIntensify');
  const [, maniaName = '', maniaText = mania] =
    /^([^:\n]{1,60}):\s*([\s\S]+)$/.exec(mania) ?? /^([^\n]{1,60})\n([\s\S]+)$/.exec(mania) ?? [];

  // A file with several entries is its entries, a blank line between.
  const file = [
    ['Criminal Record', [field('CriminalRecord'), ...run('CriminalRecord', 2)]],
    ['Ability Summary', [field('AbilitySummary')]],
    ['Awakening Signs', [field('AwakeningSigns')]],
    ['Corruption State', [field('CorruptionState')]],
    ['Arrest Records', run('AR')],
    ['Performance in Serving Term', run('Performance')],
    ['Interrogation', run('Interro')],
  ].map(([heading, parts]) => ({ title: heading, text: parts.filter(Boolean).join('\n\n') }))
    .filter(entry => entry.text);

  return {
    names: { cn: field('Name_CN'), jp: field('Name_JP'), kr: field('Name_KR') },
    gender: field('Gender'),
    birthday: field('DOB'),
    height: field('Height'),
    ability: field('Ability'),
    case: field('Case'),
    voice: field('VA').split('\n').map(line => line.trim()).filter(Boolean),
    bio: field('Bio'),
    trait: field('Info'),
    mania: { name: maniaName.trim(), text: maniaText.trim() },
    // The exclusive crimebrand: its name, and the skill it grants where the wiki has it.
    brand: {
      name: field('ECB'),
      skill: named.ECBName ? { name: field('ECBName'), levels: run('ECBDescription') } : null,
    },
    // A level the page has no numbers for yet reads 'TBA', or nothing, and is left out.
    stats: LEVELS.map(level => ({
      level,
      hp: number(named[`HP${level}`]),
      atk: number(named[`ATK${level}`]),
      def: number(named[`DEF${level}`]),
      res: number(named[`RES${level}`]),
    })).filter(row => [row.hp, row.atk, row.def, row.res].every(Number.isFinite)),
    block: field('Block1'),
    attackSpeed: field('ATKSPD1'),
    skills: [skill('Basic Attack', 'BA'), skill('Ultimate', 'Ult'), ...passives].filter(s => s.name),
    shackles: [1, 2, 3, 4, 5].filter(n => named[`S${n}Name`])
      .map(n => ({ name: field(`S${n}Name`), text: field(`S${n}Definition`) })),
    // What each tenth of compliance gives, from 10% to 50%: a stage the page leaves blank
    // repeats the first, as the wiki's own table does.
    compliance: [1, 2, 3, 4, 5].map(n => field(n === 1 ? 'Compliance' : `Compliance${n}`) || field('Compliance')),
    sticker: field('Sticker'),
    materials: {
      phase: [field('Item1'), field('Item2')].filter(Boolean),
      skill: field('Skill'),
      disSea: field('DisSea'),
    },
    file,
  };
}
