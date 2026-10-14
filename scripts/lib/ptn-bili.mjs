// Reads the game's Chinese wiki (wiki.biligame.com/wqmt) for what the English one has not:
// a Sinner's Chinese name and tags, whether they are limited or a collab's, whether they
// deal core damage, the Sinners only the CN server has with their pages (read by
// ptn-bili-page.mjs), every Sinner's page and exclusive crimebrand in Chinese, and a picture
// where the English wiki has none.
//
// It is the way that wiki builds its own Sinner list. Each Sinner's page files its facts
// as Semantic MediaWiki properties, and the list page is one {{#ask}} over
// [[分类:禁闭者]] printing them; the same question through the API is one request for
// all of them. (An earlier note in this repo had the wiki down as closed to scripts. Its
// pages are; its api.php answers one that says who it is, and robots.txt does not fence
// it off.)
//
// The Chinese words for a rank, a tendency and a libram are turned into the English
// wiki's here, which the roster's filters go by; the tables are whole, the game having
// three, six and sixteen of them.
import { wikiApi } from './fetch.mjs';

const api = wikiApi('https://wiki.biligame.com/wqmt/api.php');

const PAUSE_MS = 400;
// 567 is the wiki's answer to a client that asks too fast. A wait and then again is the
// polite reply, three times at most, the last after the wiki has had a minute; anything
// else is the caller's to deal with.
const BACKOFF_MS = [5_000, 20_000, 60_000];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Every request this file makes goes through here: one at a time, a pause before each.
async function wiki(params) {
  await sleep(PAUSE_MS);
  for (let attempt = 0; ; attempt++) {
    try {
      return await api(params);
    } catch (err) {
      if (!/^567 /.test(err.message) || attempt === BACKOFF_MS.length) throw err;
      await sleep(BACKOFF_MS[attempt]);
    }
  }
}

const RANK_OF = { 狂: 'S', 危: 'A', 普: 'B' };

const TENDENCY_OF = { 坚韧: 'Endura', 狂暴: 'Fury', 诡秘: 'Umbra', 精准: 'Reticle', 异能: 'Arcane', 启迪: 'Catalyst' };

// Worked out from the 142 Sinners both wikis name alike: each Chinese libram goes with one
// English one for all of them but a single page's slip.
const LIBRAM_OF = {
  混沌: 'LIMBO', 执迷: 'LOVE', 无厌: 'GREED', 愤怒: 'ANGER', 异质: 'HERESY', 破坏: 'VIOLENCE',
  背离: 'TREACHERY', 怠惰: 'SLOTH', 谵妄: 'FRAUD',
  暗潮: 'PESTILENCE', 荒竭: 'FAMINE', 戾刃: 'WAR', 靡音: 'DEATH', 禁域: 'SEQUESTER',
  不朽: 'IMMORTAL', 无界: 'INFINITE',
};

// What the list page prints, and a few it does not that a Sinner's own page files.
const PRINTOUTS = ['姓名', '英文名', '编号', '稀有度', '职业', '阵营', '限定', '核心伤害', '角色TAG', '体系', '实装日期', '身高'];

// A printout's values as plain strings: a page link's title, or the text itself.
const texts = values => (values ?? []).map(v => (v && typeof v === 'object' ? v.fulltext ?? v.raw ?? '' : String(v))).filter(Boolean);

// Every Sinner the Chinese wiki has, as the roster's own fields where it has the word for
// them. `limited` is 'limited', 'collab' or nothing; `core` is whether they deal core
// damage at all (the wiki counts how much: 0, 1 or 2).
export async function fetchBiliSinners() {
  const json = await wiki({
    action: 'ask',
    query: `[[分类:禁闭者]]|${PRINTOUTS.map(p => `?${p}`).join('|')}|limit=1000`,
  });
  return Object.values(json.query?.results ?? {}).map(({ printouts }) => {
    const one = key => texts(printouts[key])[0] ?? '';
    return {
      nameCn: one('姓名'),
      name: one('英文名'),
      // 'MBCC-S-617' as the English wiki has it, '617'; a collab's own code is kept whole.
      number: one('编号').replace(/^MBCC-S-/, ''),
      rank: RANK_OF[one('稀有度')],
      tendency: TENDENCY_OF[one('职业')],
      libram: LIBRAM_OF[one('阵营')],
      limited: { 限定: 'limited', 联动: 'collab' }[one('限定')],
      core: Number(one('核心伤害')) > 0,
      // Its tags and the systems it files beside them: the two are one list on a card.
      tagsCn: [...texts(printouts['体系']), ...texts(printouts['角色TAG'])],
      releasedCn: one('实装日期'),
      height: Number(/\d+(\.\d+)?/.exec(one('身高'))?.[0]),
    };
  }).filter(s => s.nameCn);
}

// Where the wiki keeps one kind of picture of each Sinner, by their Chinese name, for the
// ones it has: <name>立绘.png (the illustration, a standing figure on transparency),
// <name>升阶.png (the phase-up art) and <name>证件照.png (the mugshot). Only the address is
// asked.
export async function fetchBiliFiles(namesCn, suffix) {
  const urlOf = new Map();
  for (let i = 0; i < namesCn.length; i += 50) {
    const json = await wiki({
      action: 'query', titles: namesCn.slice(i, i + 50).map(name => `文件:${name}${suffix}.png`).join('|'),
      prop: 'imageinfo', iiprop: 'url',
    });
    for (const page of json.query?.pages ?? []) {
      const url = page.imageinfo?.[0]?.url;
      if (url) urlOf.set(page.title.replace(/^文件:/, '').replace(new RegExp(`${suffix}\\.png$`), ''), url);
    }
  }
  return urlOf;
}

// The text of each Sinner's page (the wiki files them as 禁闭者:<name>), by their Chinese
// name, for the ones it has.
export async function fetchBiliPages(namesCn) {
  const textOf = new Map();
  for (let i = 0; i < namesCn.length; i += 50) {
    const json = await wiki({
      action: 'query', titles: namesCn.slice(i, i + 50).map(name => `禁闭者:${name}`).join('|'),
      prop: 'revisions', rvprop: 'content', rvslots: 'main',
    });
    for (const page of json.query?.pages ?? []) {
      const text = page.revisions?.[0]?.slots?.main?.content;
      if (text) textOf.set(page.title.replace(/^禁闭者:/, ''), text);
    }
  }
  return textOf;
}

// The text of each term's page (术语解释:<term>, what the wiki's {{术语查看}} shows on
// hover), by the term, for the ones it has.
export async function fetchBiliTerms(terms) {
  const textOf = new Map();
  for (let i = 0; i < terms.length; i += 50) {
    const json = await wiki({
      action: 'query', titles: terms.slice(i, i + 50).map(term => `术语解释:${term}`).join('|'),
      prop: 'revisions', rvprop: 'content', rvslots: 'main',
    });
    for (const page of json.query?.pages ?? []) {
      const text = page.revisions?.[0]?.slots?.main?.content;
      if (text) textOf.set(page.title.replace(/^术语解释:/, ''), text);
    }
  }
  return textOf;
}

// The text of every exclusive crimebrand's page (专属烙印:<name>, filed under
// 分类:专属烙印), by its title. A Sinner's own page does not name theirs: the brand's page
// names the Sinner, which ptn-bili-page.mjs reads.
export async function fetchBiliBrands() {
  const textOf = new Map();
  let more = {};
  do {
    const json = await wiki({
      action: 'query', generator: 'categorymembers', gcmtitle: '分类:专属烙印', gcmlimit: 50,
      prop: 'revisions', rvprop: 'content', rvslots: 'main', ...more,
    });
    for (const page of json.query?.pages ?? []) {
      const text = page.revisions?.[0]?.slots?.main?.content;
      if (text) textOf.set(page.title, text);
    }
    more = json.continue;
  } while (more);
  return textOf;
}
