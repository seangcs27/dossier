// Reads one Sinner's page on the game's Chinese wiki (wiki.biligame.com/wqmt) into the same
// payload scripts/lib/ptn-page.mjs makes of an English page. Used for the Sinners only the
// CN server has, which the English wiki has no page for: their file is that wiki's, in
// Chinese.
//
// The page is one {{禁闭者图鉴}} call whose parameters spell everything out, as the English
// wiki's {{SinnerPage}} does, so nothing is worked out here either. Its texts use four
// templates of the wiki's own, which become the game markup the site's descriptionToHtml
// renders: a number ({{禁闭者数值}}) is a raised value, a kind of damage ({{伤害文本}}) a
// reminder, a keyword ({{术语查看}}) its text, and a spoiler fold ({{展开折叠}}) its text
// under the condition that unlocks it.
//
// Left on the page: a skill's range diagram, the video, the voice files, and the fields
// the English payload has no place for (the danger assessment, the dream).
//
// Pure text in, plain objects out: no fetching here, so it can be run against a saved page.
import { templateBodies, templateParams } from './wiki-text.mjs';

const TEMPLATE = '禁闭者图鉴';

// A template's body split on its top-level pipes, in order: a pipe inside a nested
// {{template}} or [[link]] is that one's. (templateParams does the same but files a part
// with an "=" in its text under a name, which would lose its place.)
function pipes(body) {
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
  return parts.slice(1).map(part => part.trim());
}

const TEMPLATES = {
  禁闭者数值: args => `<@ba.vup>${args[0] ?? ''}</>`,
  // A crimebrand's page writes its numbers with this one.
  烙印数值: args => `<@ba.vup>${args[0] ?? ''}</>`,
  伤害文本: args => `<@ba.rem>${args[0] ?? ''}</>`,
  // The second argument is the page the term links to.
  术语查看: args => args[0] ?? '',
  技能范围: () => '',
  术语技能范围: () => '',
  展开折叠: ([condition = '', ...rest]) => `【${condition.replace(/[：:]$/, '')}】${rest.join('|')}`,
};

// The wiki's markup as the game's. A line break is <br> or <hr>; the page uses &nbsp; to
// indent a level's number.
function toGameText(source) {
  let text = (source ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n');

  // Innermost templates first, so a template inside a template is resolved before its host.
  const innermost = /\{\{([^{}]*)\}\}/;
  for (let m = innermost.exec(text); m; m = innermost.exec(text)) {
    const args = pipes(m[1]);
    const make = TEMPLATES[m[1].split('|')[0].trim()];
    text = text.slice(0, m.index) + (make ? make(args) : args[args.length - 1] ?? '') + text.slice(m.index + m[0].length);
  }

  return text
    // What is left of the wiki's own tags; the game's (<@…> and </>) start with no letter.
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A parameter's text, where the page writes "无" (none) for nothing.
const cleaned = text => (text === '无' ? '' : text);

// The attribute table's rows on this wiki: a level 1 and a level 90, and the top of each
// promotion's range between. Each is the prefix of four parameters (HP, ATK, DEF, RES).
const STATS = [
  { level: 1, keys: ['生命初始', '攻击初始', '防御初始', '法抗初始'] },
  { level: 20, keys: ['0阶20级生命值', '0阶20级攻击值', '0阶20级防御值', '0阶20级法抗值'] },
  { level: 40, keys: ['1阶40级生命值', '1阶40级攻击值', '1阶40级防御值', '1阶40级法抗值'] },
  { level: 70, keys: ['2阶70级生命值', '2阶70级攻击值', '2阶70级防御值', '2阶70级法抗值'] },
  { level: 90, keys: ['生命满', '攻击满', '防御满', '法抗满'] },
];

// The compliance stages past 100% a few Sinners have.
const BEYOND = [125, 150, 175, 200];

// A page's text, or undefined where it has no {{禁闭者图鉴}} call.
export function parseBiliDetail(wikitext, nameCn) {
  const body = templateBodies(wikitext.replace(/<!--[\s\S]*?-->/g, ''), TEMPLATE)[0];
  if (!body) return undefined;
  const named = templateParams(body).named;

  const field = key => cleaned(toGameText(named[key]));
  const number = key => (/^\d+$/.test(named[key] ?? '') ? Number(named[key]) : NaN);
  // A numbered family, read until the first blank: 追踪记录1, 追踪记录2, …
  const run = (prefix, from = 1) => {
    const out = [];
    for (let n = from; n <= 9; n++) {
      const text = field(`${prefix}${n}`);
      if (text) out.push(text);
    }
    return out;
  };
  // A skill's effect, then what each level after changes: the page writes those as
  // "2、…<hr>3、…", the level's number first.
  const levels = (effect, upgrades) => [
    field(effect),
    ...(named[upgrades] ?? '').split(/<hr\s*\/?>/i)
      .map(part => toGameText(part).replace(/^\d+、\s*/, ''))
      .filter(Boolean),
  ].filter(Boolean);
  const skill = (kind, prefix, upgrades = `${prefix}升级效果`, effect = `${prefix}效果`) => ({
    kind,
    name: field(prefix),
    levels: levels(effect, upgrades),
  });
  const passives = [];
  for (let n = 1; field(`被动${n}`); n++) passives.push(skill('Passive', `被动${n}`));

  // The first monitoring record sums the Sinner up, as the English wiki's lead does; where
  // it is blank the past they were brought in with does.
  const record = field('监察记录1');
  const past = field('过往追溯');
  const stages = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => field(`服从度${n}%`));
  const beyond = BEYOND.map(n => [n, field(`服从度${n}%`)]).filter(([, text]) => text);

  return {
    // The roster entry's, which the caller takes out: the English wiki's is there, not in the
    // payload.
    birthplace: field('出生地'),
    names: { cn: nameCn, jp: '', kr: '' },
    title: field('头衔'),
    gender: field('性别'),
    birthday: field('生日'),
    height: field('身高'),
    ability: field('能力'),
    case: field('重案'),
    voice: field('CV') ? [field('CV')] : [],
    bio: record || past,
    trait: field('特性'),
    mania: { name: field('狂厄深化'), text: field('狂厄深化效果') },
    // The two effects this wiki gives a Sinner beyond the trait.
    extras: [
      { name: '梦魇天赋', text: field('梦魇天赋') },
      { name: '破碎防线', text: field('破碎防线buff') },
    ].filter(entry => entry.text),
    // The Sinner's page has no field for their exclusive crimebrand: the crimebrand's own
    // page names them, and the caller puts it here (parseBiliBrand).
    brand: { name: '', skill: null },
    stats: STATS.map(({ level, keys }) => {
      const [hp, atk, def, res] = keys.map(number);
      return { level, hp, atk, def, res };
    }).filter(row => [row.hp, row.atk, row.def, row.res].every(Number.isFinite)),
    block: field('阻挡'),
    attackSpeed: field('攻击速度'),
    skills: [skill('Basic Attack', '普攻'), skill('Ultimate', '必杀'), ...passives].filter(s => s.name),
    shackles: [1, 2, 3, 4, 5].filter(n => field(`同步率${n}段`))
      .map(n => ({ name: field(`同步率${n}段`), text: field(`同步率${n}段效果`) })),
    // Ten stages here, the last at 100%, where the English page has five and a sticker.
    compliance: stages,
    sticker: '',
    materials: {
      phase: ['一阶材料1', '一阶材料2', '二阶材料1', '二阶材料2', '三阶材料1', '三阶材料2'].map(field).filter(Boolean),
      skill: ['技能材料2-3', '技能材料4-5', '技能材料6-7', '技能材料8-10'].map(field).filter(Boolean).join(', '),
      disSea: field('内海遗物'),
    },
    file: [
      ['立绘描述', [field('立绘描述')]],
      ['升阶立绘描述', [field('升阶立绘描述')]],
      ['过往追溯', record ? [past] : []],
      ['能力简述', [field('能力简述')]],
      ['觉醒表征', [field('觉醒表征')]],
      ['侵蚀状态', [field('侵蚀状态')]],
      ['追踪记录', run('追踪记录')],
      ['监察记录', run('监察记录', 2)],
      ['思维修缮', run('思维修缮')],
      ['审讯阶段', run('审讯阶段')],
      ['服从度（超过100%）', beyond.map(([n, text]) => `${n}%：${text.replace(/\n/g, '，')}`)],
    ].map(([title, parts]) => ({ title, text: parts.filter(Boolean).join('\n\n') }))
      .filter(entry => entry.text),
  };
}

// The terms a text names with {{术语查看|term}} or {{术语查看|term|page}}, as the page each
// is explained on: "【惑心陷阱】-必杀", a skill, beside "【惑心陷阱】", the field it makes.
export function termsIn(wikitext) {
  return [...(wikitext ?? '').matchAll(/\{\{术语查看\|([^{}]*)\}\}/g)]
    .map(([, args]) => { const [term, page] = args.split('|').map(arg => arg.trim()); return page || term; })
    .filter(Boolean);
}

// An exclusive crimebrand's page ({{专属烙印图鉴}}): the Sinner it belongs to, by their
// Chinese name, and the crimebrand as the payload's `brand`. The page gives its effect once,
// with each number as its three levels have it ("20%/25%/30%"), so that is its one level; a
// skill it grants is named in that text, not apart from it. What that skill does, and what
// it summons or lays down, are on the pages of the terms the text names (`termOf`, each
// term's page text): every one reachable from the effect is kept, in the order met, as
// `terms`.
export function parseBiliBrand(wikitext, termOf = new Map()) {
  const body = templateBodies(wikitext.replace(/<!--[\s\S]*?-->/g, ''), '专属烙印图鉴')[0];
  if (!body) return undefined;
  const named = templateParams(body).named;
  const field = key => cleaned(toGameText(named[key]));
  const effect = field('专属效果');
  const terms = [];
  const seen = new Set();
  const queue = termsIn(named['专属效果']);
  while (queue.length) {
    const term = queue.shift();
    if (seen.has(term)) continue;
    seen.add(term);
    const termBody = templateBodies(termOf.get(term) ?? '', '术语解释')[0];
    const explained = termBody && templateParams(termBody).named['解释'];
    if (!explained) continue;
    terms.push({ name: term.replace(/-必杀$/, ' · 必杀'), text: toGameText(explained) });
    queue.push(...termsIn(explained));
  }
  return {
    holder: field('专属角色'),
    brand: { name: field('名称'), skill: effect ? { name: '', levels: [effect] } : null, ...(terms.length ? { terms } : {}) },
  };
}
