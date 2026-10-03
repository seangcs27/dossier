// Reads an arknights.wiki.gg operator page for its unofficial English: the names and
// descriptions of talents, skills and modules for operators the global server doesn't have
// yet. The wiki writes these as templates ({{Talent}}, {{Skill cell}}, {{Operator module}})
// with every elite, potential and skill rank spelled out, so nothing has to be computed —
// only matched to the game's own records and converted from wiki markup to the game's.
//
// Pure text in, plain objects out: no fetching here, so it can be run against a saved page.

// The parameter text of every top-level `{{name ...}}` in `text`, in page order. Braces are
// counted rather than matched with a regex, because parameters nest templates of their own.
export function templateBodies(text, name) {
  const bodies = [];
  const open = new RegExp(`\\{\\{\\s*${name}\\s*[|}\\n]`, 'gi');
  let m;
  while ((m = open.exec(text)) !== null) {
    let depth = 0;
    let i = m.index;
    for (; i < text.length; i++) {
      if (text.startsWith('{{', i)) { depth++; i++; }
      else if (text.startsWith('}}', i)) { depth--; i++; if (depth === 0) break; }
    }
    bodies.push(text.slice(m.index + 2, i - 1));
    open.lastIndex = i;
  }
  return bodies;
}

// A template body split on its top-level pipes: named parameters by name, positional ones
// in `args`. A pipe inside a nested {{template}} or [[link]] belongs to that, not to us.
export function templateParams(body) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; current += two; i++; }
    else if (two === '}}' || two === ']]') { depth--; current += two; i++; }
    else if (body[i] === '|' && depth === 0) { parts.push(current); current = ''; }
    else current += body[i];
  }
  parts.push(current);

  const named = {};
  const args = [];
  for (const part of parts.slice(1)) {
    const eq = part.indexOf('=');
    // A positional value can hold an "=" of its own; a name never holds a brace or bracket.
    if (eq > 0 && !/[{[<]/.test(part.slice(0, eq))) named[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    else args.push(part.trim());
  }
  return { named, args };
}

// {{Color|text|kind}}: the wiki's kinds are the game's own tag names.
const COLOR_TAG = { down: '@ba.vdown', kw: '@ba.kw', rem: '@ba.rem' };

// Wiki markup to the game's: {{Color|+20%}} is the game's value-up, a parenthesised
// {{Color|(+5%)}} its potential bonus, {{G|Slow}} and [[links]] their display text, and
// {{Tip|shown|hint}} the shown text with its hint in brackets. Range diagrams are dropped:
// the page draws a skill's range itself. Literal angle brackets the game itself writes
// ("<Substitute>") are left alone; descriptionToHtml escapes them. Any other template
// collapses to its last positional argument.
export function wikiToGameText(source) {
  let text = source
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');

  // Innermost templates first, so a template inside a template is resolved before its host.
  const innermost = /\{\{([^{}]*)\}\}/;
  for (let m = innermost.exec(text); m; m = innermost.exec(text)) {
    const { args } = templateParams(m[1]);
    const name = m[1].split('|')[0].trim().toLowerCase();
    let out = args[args.length - 1] ?? '';
    if (name === 'color' && args[0]) {
      const [value, kind] = args;
      out = `<${COLOR_TAG[kind] ?? (value.startsWith('(') ? '@ba.talpu' : '@ba.vup')}>${value}</>`;
    } else if (name === 'tip') {
      out = args[1] ? `${args[0]} (${args[1]})` : args[0] ?? '';
    } else if (name.startsWith('range')) {
      out = '';
    }
    text = text.slice(0, m.index) + out + text.slice(m.index + m[0].length);
  }

  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim();
}

const phaseOf = condition => Number(/elite\s*(\d)/i.exec(condition ?? '')?.[1] ?? 0);

// Talents as the game groups them: one list per talent, each entry the text at one elite
// and potential (`rank` is zero-based, as the game's requiredPotentialRank is). A template
// that names another in `rpl` is the same talent at a higher potential — how the wiki
// writes a robot's six ranks — so it joins that talent's list rather than starting one.
function parseTalents(text) {
  const talents = [];
  for (const body of templateBodies(text, 'Talent')) {
    const { named } = templateParams(body);
    const entries = [];
    for (const key of Object.keys(named)) {
      const m = /^desc(\d+)([ab]?)$/.exec(key);
      if (!m || !named[key]) continue;
      const [, n, variant] = m;
      const potential = variant === 'b' ? named.pot : named[`pot${n}`];
      entries.push({
        name: named.name ?? '',
        phase: phaseOf(named[`cond${n}`]),
        rank: potential ? Number(potential) - 1 : 0,
        description: wikiToGameText(named[key]),
      });
    }
    // The talent it names, or failing that the one just before it: the name in `rpl` is
    // typed by hand and doesn't always exist ("Felyne Wyvernblast 2" on a page that calls
    // that rank "Felyne Wyvernblast").
    const host = named.rpl
      && (talents.find(group => group.some(entry => entry.name === named.rpl)) ?? talents[talents.length - 1]);
    if (host) host.push(...entries);
    else talents.push(entries);
  }
  return talents;
}

// Skills in page order: a {{Skill head}} names the skill, the {{Skill cell}}s after it are
// its ranks, 1 to 7 then the three masteries.
function parseSkills(text) {
  const heads = [...text.matchAll(/\{\{\s*Skill head\b/gi)].map(m => m.index);
  return heads.map((start, i) => {
    const section = text.slice(start, heads[i + 1] ?? text.length);
    const levels = [];
    for (const body of templateBodies(section, 'Skill cell')) {
      const { named } = templateParams(body);
      if (named.level && named.effect) levels[Number(named.level) - 1] = wikiToGameText(named.effect);
    }
    return { name: templateParams(templateBodies(section, 'Skill head')[0]).named.name ?? '', levels };
  });
}

// Modules by their code ("PRP-X"): the name, what each stage's text is, and the unlock
// missions. `effect1` is the trait the module adds or rewrites; 2 and 3 are the talent as it
// reads at those stages. The flavour text is left out: the wiki keeps it in Chinese too.
function parseModules(text) {
  const modules = {};
  for (const body of templateBodies(text, 'Operator module')) {
    const { named } = templateParams(body);
    if (!named.title || !named.module) continue;
    // Integrated Strategies modules are typed with a Greek alpha ("SO-Α"); the game's is Latin.
    modules[named.title.toUpperCase().replace(/Α/g, 'A')] = {
      name: wikiToGameText(named.module),
      effects: [named.effect1, named.effect2, named.effect3].map(e => (e ? wikiToGameText(e) : null)),
      missions: [named.mission1, named.mission2].filter(Boolean).map(wikiToGameText),
    };
  }
  return modules;
}

// An operator's "/File" subpage: its handbook files, each an {{Archive|title|text}}. The
// titles are the game's own ("Profile", "Archive File 2"). A page nobody has translated yet
// holds the Chinese text under the same titles, which the caller tells apart by script.
export function parseFilePage(text) {
  return templateBodies(text, 'Archive')
    .map(body => templateParams(body).named)
    .filter(named => named.title && named.text)
    .map(named => ({ title: named.title, text: wikiToGameText(named.text) }));
}

// Everything a page says about one operator, keyed by the game's own id from the infobox
// (`filename = char_4235_thumpy`) — the one field that doesn't depend on how the wiki
// spells the name ("Viy" for Вий, "Kal'tsit - Esperanta" for Kal'tsit·Esperanta).
export function parseOperatorPage(text) {
  const infobox = templateParams(templateBodies(text, 'Operator infobox')[0] ?? '').named;
  const info = templateParams(templateBodies(text, 'Operator info')[0] ?? '').named;
  return {
    charId: infobox.filename ?? null,
    trait: info.trait ? wikiToGameText(info.trait) : null,
    profile: info.desc ? wikiToGameText(info.desc) : null,
    talents: parseTalents(text),
    skills: parseSkills(text),
    modules: parseModules(text),
  };
}
