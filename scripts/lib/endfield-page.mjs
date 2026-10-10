// Reads an endfield.wiki.gg operator page for what the Operators table leaves out: the
// operator's file, attributes, potentials, combat skills, talents and base skills. The wiki
// writes each as a template with every level, rank and promotion spelled out, so nothing is
// worked out here: a parameter is read and its markup taken off.
//
// Left on the page: its opening paragraph, what anything costs (promotions, skill ranks,
// talents and base skills each list items and counts, nearly all of them the same on every
// page), the weapons the game recommends, the editors' own notes under a skill or talent,
// the changelog and the voice actors.
//
// Pure text in, plain objects out: no fetching here, so it can be run against a saved page.
import { templateBodies, templateParams } from './wiki-text.mjs';

// The wiki writes '???' where it has nothing to give yet: the Endministrator's expertise and
// hobby, and their last two potentials.
export const known = text => Boolean(text) && !/^\?+$/.test(text);

// The wiki's markup as plain text: {{Color|text|kind}} is its text, {{G|term|shown}} the
// word it shows, a {{Quote}} its line in quotation marks, a [[link]] its label and <br> a
// line break. Every other tag is dropped, and so are bold and italics.
export function plainText(source) {
  let text = source
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');

  // Innermost templates first, so a template inside a template is resolved before its host.
  const innermost = /\{\{([^{}]*)\}\}/;
  for (let m = innermost.exec(text); m; m = innermost.exec(text)) {
    const [name, first = '', ...rest] = m[1].split('|');
    let shown = rest[rest.length - 1] ?? first;
    if (name.trim() === 'Color') shown = first;
    else if (name.trim() === 'Quote') shown = `"${first}"\n`;
    text = text.slice(0, m.index) + shown + text.slice(m.index + m[0].length);
  }

  return text
    .replace(/'{2,}/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

const params = (text, name) => templateBodies(text, name).map(body => templateParams(body).named);

// The attribute table's six columns: level 1, the level each of the four promotions is made
// at, and the cap.
const LEVELS = [1, 20, 40, 60, 80, 90];
const ATTRIBUTES = { hp: 'HP', atk: 'ATK', strength: 'STR', agility: 'AGL', intellect: 'INT', will: 'WIL' };

// {{SB|n}}, the badge beside a skill's name.
const SKILL_TYPES = ['Basic Attack', 'Battle Skill', 'Combo Skill', 'Ultimate'];

// A skill has twelve ranks, nine and then three of mastery, and the wiki's own table shows
// that many of a row's values: a few rows are written with twenty-four or more.
const RANKS = 12;

// A page with two sets of skills keeps each in a tab of a <tabber>, under the set's name:
// Arcane's 'Array Arcana: INT' and 'Array Arcana: WILL'. Split on the tabs, a page is its
// text, then each tab's name and text in turn, then the text after </tabber> under no name.
function skillsOf(text) {
  const parts = text.split(/(?:<tabber>|\|-\|)\s*([^=\n]*)=|<\/tabber>/);
  const skills = [];
  for (let i = 0; i < parts.length; i += 2) {
    for (const named of params(parts[i], 'Combat skill')) {
      const stats = [];
      for (let n = 1; named[`stat${n}`]; n++) {
        // As the wiki's table reads a row: its label, then a value for each rank.
        const [label, ...values] = named[`stat${n}`].split(', ');
        stats.push({ label, values: values.slice(0, RANKS) });
      }
      skills.push({
        type: SKILL_TYPES[Number(/\d/.exec(named.type)[0]) - 1],
        name: named.name,
        ...(parts[i - 1] ? { form: parts[i - 1].trim() } : {}),
        description: plainText(named.desc),
        stats,
      });
    }
  }
  return skills;
}

// The wiki lists four talents on every page and tells them apart only by icon: the one that
// raises the main attribute (the attribute's own icon), the operator's two, and Outfitting,
// which unlocks gear and reads the same for everyone.
function talentKind(icon) {
  if (icon === 'Gear icon') return 'outfitting';
  return / Talent \d+ icon$/.test(icon) ? 'combat' : 'attribute';
}

// The stages of a talent or a base skill: `condN` is the promotion one opens at ('Elite 2'),
// `descN` its text there. The numbering stops at the first one left blank.
function stagesOf(named) {
  const stages = [];
  for (let n = 1; named[`cond${n}`]; n++) {
    stages.push({
      elite: Number(named[`cond${n}`].replace(/\D/g, '')),
      description: plainText(named[`desc${n}`]),
    });
  }
  return stages;
}

// Everything a page says about one operator. The Endministrator's two forms share a page,
// and so this.
export function parseOperatorPage(text) {
  const [info] = params(text, 'Operator infobox');
  const [data] = params(text, 'Operator data');
  // An operator announced and not yet out has the page and none of the numbers.
  if (!info || !data) throw new Error('the page has no stats yet');

  const field = key => plainText(info[key] ?? '');
  // An expertise or a hobby: its heading ('Natural Lore: Geological Surveyor'), then a line
  // about it.
  const interests = (...keys) => keys.map(field).filter(Boolean).map(note => {
    const [title, ...rest] = note.split('\n');
    return { title, text: rest.join('\n') };
  });
  // The Profile section is free prose, where the wiki runs a single line break on into the
  // same paragraph: only a blank line or a <br> ends one.
  const profile = (/==\s*Profile\s*==\n([\s\S]*?)\n==/.exec(text)?.[1] ?? '')
    .trim().replace(/(?<!\n)\n(?!\n)/g, ' ');

  return {
    fullName: field('fullname'),
    race: field('race'),
    authentication: field('authentication'),
    infection: field('infection'),
    exam: {
      strength: field('strength'),
      combatSkill: field('skill'),
      tactical: field('tactical'),
      originium: field('originium'),
    },
    expertiseDetails: interests('exp1d', 'exp2d'),
    hobbyDetails: interests('hb1d', 'hb2d'),
    profile: plainText(profile),
    attributes: LEVELS.map((level, i) => ({
      level,
      ...Object.fromEntries(
        Object.entries(ATTRIBUTES).map(([key, param]) => [key, Number(data[param].split(',')[i])]),
      ),
    })),
    critRate: Number(data.CR),
    attackSpeed: Number(data.AS),
    attackRange: data.AR,
    potentials: [1, 2, 3, 4, 5].filter(rank => known(data[`pot${rank}`])).map(rank => ({
      rank,
      name: data[`pot${rank}t`],
      description: plainText(data[`pot${rank}`]),
    })),
    skills: skillsOf(text),
    talents: params(text, 'Operator talent').map(t => ({
      kind: talentKind(t.icon),
      name: t.name,
      stages: stagesOf(t),
    })),
    baseSkills: params(text, 'Operator base skill').map(b => ({
      name: b.name,
      facility: b.facility,
      stages: stagesOf(b).map((stage, i) => ({ tier: b[`postfix${i + 1}`], ...stage })),
    })),
  };
}
