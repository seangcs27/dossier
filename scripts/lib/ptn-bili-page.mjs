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
// Left on the page: the danger assessment (on every page that has one it is the rank). The
// voice lines are a page of their own (parseBiliVoices). A picture the page shows is kept as
// its file's title (`icon`, `image`), which the build turns into the file's address.
//
// Pure text in, plain objects out: no fetching here, so it can be run against a saved page.
import { RANGES } from './ptn-ranges.mjs';
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

// The kind of damage a Sinner deals, in English. "无" (none) is left out.
const DAMAGE = { 物理伤害: 'Physical', 法术伤害: 'Magic', 真实伤害: 'True' };

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

// A skill's range as the page writes it, as the shapes it names (ptn-ranges.mjs): one
// ({{技能范围|3*4}}), one becoming another ({{技能范围递进|a|b|左注释=…|右注释=…}}, the second
// marked `step`), or one to each of two forms ("露薇娅：{{技能范围|3*4}}蕾：{{技能范围|3*6}}"),
// the text before each its note.
function rangesOf(source) {
  const out = [];
  const push = (code, note) => {
    const shape = RANGES[code.trim()];
    if (!shape) { console.warn(`ptn: no shape recorded for the range ${code} (scripts/lib/ptn-ranges.mjs)`); return undefined; }
    const range = { ...shape, ...(note ? { note } : {}) };
    out.push(range);
    return range;
  };
  let from = 0;
  for (const m of (source ?? '').matchAll(/\{\{(技能范围递进|技能范围)\|([^{}]*)\}\}|\{\{([^{}|]+)攻击范围\}\}/g)) {
    const note = toGameText(source.slice(from, m.index)).replace(/[：:]$/, '');
    from = m.index + m[0].length;
    if (m[3]) { push(m[3], note); continue; }
    if (m[1] === '技能范围') { push(pipes(`x|${m[2]}`)[0], note); continue; }
    const named = {};
    const positional = [];
    for (const part of pipes(`x|${m[2]}`)) {
      const eq = part.indexOf('=');
      if (eq > 0) named[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
      else positional.push(part);
    }
    push(positional[0] ?? '', named.左注释 || note);
    const then = push(positional[1] ?? '', named.右注释);
    if (then) then.step = true;
  }
  return out;
}

// The page's phase-up tables: each raises the level cap, and the stats jump at the level the
// last cap was. What each unlocks is the same for every Sinner, the template's own: the first
// passive; the second, the crimebrand slot and Mania Intensify; the phase-up attire and the
// exclusive crimebrand's slot. Each also gives a count of 异方晶, as the template shows it.
const PHASES = [
  { cap: [20, 40], from: '0阶20级', to: '1阶20级', unlocks: ['passive1'], crystals: 40 },
  { cap: [40, 70], from: '1阶40级', to: '2阶40级', unlocks: ['passive2', 'brandSlot', 'mania'], crystals: 60 },
  { cap: [70, 90], from: '2阶70级', to: '3阶70级', unlocks: ['attire', 'exclusiveSlot'], crystals: 80 },
];
const STAT_KEYS = { hp: '生命值', atk: '攻击值', def: '防御值', res: '法抗值' };

// What each phase-up and each skill level costs, by the Sinner's rank: the template's own
// tables ({{禁闭者图鉴}}'s 培养材料 tab), which fill in the page's materials. An item is its
// count and its frame's colour; 'src' is the tendency's essence for that phase (一阶精准源素),
// 'm1' and 'm2' the page's two materials for it, 'dis' Dis coins.
const PHASE_COST = {
  普: [
    [['src', 12, '绿'], ['m1', 30, '灰'], ['m2', 15, '灰'], ['dis', 24000]],
    [['src', 12, '蓝'], ['m1', 30, '绿'], ['m2', 15, '绿'], ['dis', 80000]],
    [['src', 20, '紫'], ['m1', 54, '蓝'], ['m2', 30, '蓝'], ['dis', 350000]],
  ],
  危: [
    [['src', 15, '绿'], ['m1', 12, '绿'], ['m2', 18, '灰'], ['dis', 30000]],
    [['src', 15, '蓝'], ['m1', 12, '蓝'], ['m2', 18, '绿'], ['dis', 100000]],
    [['src', 25, '紫'], ['m1', 24, '紫'], ['m2', 36, '蓝'], ['dis', 480000]],
  ],
  狂: [
    [['src', 18, '绿'], ['m1', 16, '绿'], ['m2', 8, '绿'], ['dis', 36000]],
    [['src', 18, '蓝'], ['m1', 16, '蓝'], ['m2', 8, '蓝'], ['dis', 120000]],
    [['src', 30, '紫'], ['m1', 28, '紫'], ['m2', 15, '紫'], ['dis', 560000]],
  ],
};
// Skill levels 1→2 to 9→10: the skill module's count, the material's, the DisSea relic's
// (from 7→8), and Dis coins; 9→10 takes one consciousness core (意识晶核) as well. Which
// module and material is by the level, the same at every rank.
const SKILL_COST = {
  普: { module: [5, 10, 6, 10, 5, 6, 5, 6, 10], material: [4, 6, 4, 6, 4, 5, 2, 4, 5], relic: [1, 1, 1], dis: [2500, 4000, 5600, 8500, 12800, 20000, 57000, 120000, 170000] },
  危: { module: [6, 12, 8, 12, 6, 8, 6, 8, 12], material: [8, 8, 5, 8, 5, 6, 3, 5, 6], relic: [1, 1, 2], dis: [3000, 5000, 7000, 10500, 16000, 25000, 72000, 150000, 210000] },
  狂: { module: [8, 16, 10, 16, 8, 10, 8, 10, 15], material: [6, 10, 6, 10, 6, 8, 4, 6, 8], relic: [1, 2, 2], dis: [4000, 6000, 8500, 12800, 19200, 30000, 86000, 175000, 260000] },
};
const SKILL_TIER = [
  { module: '技能模组Ⅰ', material: '技能材料2-3', tier: '灰' },
  { module: '技能模组Ⅱ', material: '技能材料4-5', tier: '绿' },
  { module: '技能模组Ⅲ', material: '技能材料6-7', tier: '蓝' },
  { module: '技能模组Ⅳ', material: '技能材料8-10', tier: '紫' },
];
const SKILL_STEP = [0, 0, 1, 1, 2, 2, 3, 3, 3];

// An item as the page shows it: its name, its count, its frame's colour, and its icon's file
// (道具<name>.png), which the build turns into the file's address.
const item = (name, count, tier) => ({ item: name, count, tier, icon: `道具${name}.png` });

function costsOf(named) {
  const rank = named.稀有度?.trim();
  const tendency = named.职业?.trim();
  const own = key => named[key]?.trim() ?? '';
  if (!PHASE_COST[rank] || !tendency) return undefined;
  const phase = PHASE_COST[rank].map((row, i) => row.map(([key, count, tier]) => {
    if (key === 'dis') return item('狄斯币', count, '绿');
    if (key === 'src') return item(`${'一二三'[i]}阶${tendency}${['源素', '源液', '源质'][i]}`, count, tier);
    return item(own(`${'一二三'[i]}阶材料${key[1]}`), count, tier);
  }).filter(cost => cost.item));
  const table = SKILL_COST[rank];
  const skill = SKILL_STEP.map((step, i) => {
    const { module, material, tier } = SKILL_TIER[step];
    return [
      item(module, table.module[i], tier),
      item(own(material), table.material[i], tier),
      ...(i >= 6 ? [item(own('内海遗物'), table.relic[i - 6], '紫')] : []),
      ...(i === 8 ? [item('意识晶核', 1, '金')] : []),
      item('狄斯币', table.dis[i], '绿'),
    ].filter(cost => cost.item && cost.item !== '无');
  });
  return { phase, skill };
}

// A page's text, or undefined where it has no {{禁闭者图鉴}} call. `termOf` is each term's
// page text, for the terms the page names (explainTerms).
export function parseBiliDetail(wikitext, nameCn, termOf = new Map()) {
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
  const who = named.姓名?.trim() || nameCn;
  // A skill's icon is the file the template names for it, "<name> 普攻 <skill>.png"; the
  // build turns it into the file's address, or drops it where the wiki has none.
  const iconOf = prefix => `${who} ${prefix} ${named[prefix]?.trim()}.png`;
  const skill = (kind, prefix, upgrades = `${prefix}升级效果`, effect = `${prefix}效果`) => {
    const ranges = rangesOf(named[`${prefix}范围`]);
    return {
      kind,
      name: field(prefix),
      levels: levels(effect, upgrades),
      icon: iconOf(prefix),
      ...(ranges.length ? { ranges } : {}),
    };
  };
  const statsAt = key => {
    const [hp, atk, def, res] = Object.values(STAT_KEYS).map(stat => number(`${key}${stat}`));
    return [hp, atk, def, res].every(Number.isFinite) ? { hp, atk, def, res } : undefined;
  };
  const UNLOCK_ICON = {
    passive1: iconOf('被动1'), passive2: iconOf('被动2'), brandSlot: '烙印栏解锁.png', mania: '狂厄深化.png',
    attire: `${who}升阶装束.png`, exclusiveSlot: '专属烙印栏解锁.png',
  };
  const phases = PHASES.map(({ cap, from, to, unlocks, crystals }) => ({
    cap, from: statsAt(from), to: statsAt(to),
    unlocks: unlocks.map(key => ({ key, icon: UNLOCK_ICON[key] })),
    crystals: item('异方晶', crystals, '金'),
  })).filter(phase => phase.from && phase.to);
  const costs = costsOf(named);
  const passives = [];
  for (let n = 1; field(`被动${n}`); n++) passives.push(skill('Passive', `被动${n}`));
  // What the ultimate costs in energy, and how much core damage it deals.
  const energy = number('必杀能量消耗');
  const core = number('必杀核心伤害');
  const ultimate = {
    ...skill('Ultimate', '必杀'),
    ...(Number.isFinite(energy) ? { energy } : {}),
    ...(Number.isFinite(core) ? { core } : {}),
  };
  const dream = { name: field('梦境名称'), kind: field('梦境类型'), text: field('梦境描述') };
  const day = field('实装日期');
  const video = field('捕获影像');

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
    ...(DAMAGE[field('伤害类型')] ? { damageType: DAMAGE[field('伤害类型')] } : {}),
    // The day the Sinner came to the CN server, whether they have been reworked there, the
    // day of their containment (two pages), and their capture video's Bilibili id.
    ...(/^\d{4}-\d\d-\d\d$/.test(day) ? { releasedCn: day } : {}),
    ...(field('重构实装') === '是' ? { reworked: true } : {}),
    ...(field('收容日期') ? { contained: field('收容日期') } : {}),
    ...(/^BV\w+$/.test(video) ? { video } : {}),
    // The dream a few Sinners have (15).
    ...(dream.name ? { dream } : {}),
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
    skills: [skill('Basic Attack', '普攻'), ultimate, ...passives].filter(s => s.name),
    shackles: [1, 2, 3, 4, 5].filter(n => field(`同步率${n}段`))
      .map(n => ({ name: field(`同步率${n}段`), text: field(`同步率${n}段效果`), icon: `${who}${named[`同步率${n}段`].trim()}.png` })),
    // The phase-up tables, and what each phase-up and skill level costs.
    ...(phases.length ? { phases } : {}),
    ...(costs ? { costs } : {}),
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
      // What the Sinner says on being got (three pages).
      ['获得禁闭者', [field('获得禁闭者')]],
    ].map(([title, parts]) => ({ title, text: parts.filter(Boolean).join('\n\n') }))
      .filter(entry => entry.text),
    // Every term the page names, explained: what a skill's 【残锋】 is, and so on.
    ...explainTerms(termsIn(body), termOf),
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
  const quote = field('世界观');
  return {
    holder: field('专属角色'),
    brand: {
      name: field('名称'), skill: effect ? { name: '', levels: [effect] } : null,
      // The lines of the story printed under the crimebrand, and its picture's file.
      ...(quote ? { quote } : {}),
      image: `烙印${named.名称?.trim()}.png`,
      ...explainTerms(termsIn(named['专属效果']), termOf),
    },
  };
}

// A Sinner's voice page (语音:<name>): one {{语音}} call to a line, its occasion (动作, "获得禁闭者")
// and its words.
export function parseBiliVoices(wikitext) {
  return templateBodies(wikitext.replace(/<!--[\s\S]*?-->/g, ''), '语音')
    .map(body => templateParams(body).named)
    .map(named => ({ name: toGameText(named.动作), text: toGameText(named.语音文字) }))
    .filter(line => line.name && line.text);
}

// Each term in `start` and every term their explanations name, in the order met, as
// { terms }, or nothing where none has a page. A term is shown by its own name in brackets,
// with " · 必杀" where its page is the ultimate's version ("【惑心陷阱】-必杀").
function explainTerms(start, termOf) {
  const terms = [];
  const seen = new Set();
  const queue = [...start];
  while (queue.length) {
    const term = queue.shift();
    if (seen.has(term)) continue;
    seen.add(term);
    const termBody = templateBodies(termOf.get(term) ?? '', '术语解释')[0];
    if (!termBody) continue;
    const { 术语: name, 解释: explained } = templateParams(termBody).named;
    if (!explained) continue;
    const ult = /-必杀$/.test(term) ? ' · 必杀' : '';
    terms.push({ name: name ? `【${name}】${ult}` : term.replace(/-必杀$/, ' · 必杀'), text: toGameText(explained) });
    queue.push(...termsIn(explained));
  }
  return terms.length ? { terms } : {};
}
