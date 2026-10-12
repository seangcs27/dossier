import type { PtnSinner } from './ptn-index';

/**
 * Path to Nowhere's pages in two languages, English and Chinese: which one is on, and the
 * words that are this site's to say in each. A Sinner's names and tags are data (the
 * build has both wikis'); what is under a Sinner's tabs is the English wiki's text and
 * stays English in either.
 */
export type PtnLang = 'en' | 'zh';

const STORED = 'dossier.ptn.lang';

function stored(): PtnLang | undefined {
  // A browser that keeps nothing (a private window, storage turned off) throws here.
  try {
    const value = localStorage.getItem(STORED);
    return value === 'en' || value === 'zh' ? value : undefined;
  } catch {
    return undefined;
  }
}

// The reader's last choice, or their browser's language the first time.
let lang: PtnLang = stored() ?? (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');

export function ptnLang(): PtnLang {
  return lang;
}

export function setPtnLang(next: PtnLang): void {
  lang = next;
  try {
    localStorage.setItem(STORED, next);
  } catch {
    // Kept for this visit only, then.
  }
}

/** The switch's two choices, each in its own language. */
export const PTN_LANGS = [
  { id: 'en', label: 'EN' },
  { id: 'zh', label: '中文' },
];

const TEXT = {
  en: {
    sinners: 'sinners', Sinners: 'Sinners', prompt: 'Search sinners…',
    emptyNote: 'The last build could not reach the Path to Nowhere wiki.',
    newest: 'Newest', rank: 'Rank', mugshot: 'Mugshot', original: 'Original',
    newestTip: 'Newest first, by the day each Sinner was released on the Global server.',
    lineup: 'Line-up', arrivals: 'Arrested', newArrivals: 'Newly arrested', cnOnly: 'CN server only',
    lineups: 'Line-ups', cnShort: 'CN', newShort: 'New', scrollBack: 'Back along the wall', scrollOn: 'On along the wall',
    standing: 'standing', arrived: 'Arrested', noPhoto: 'No photograph on file', noPictures: 'No pictures',
    fRank: 'Rank', fTendency: 'Tendency', fLibram: 'Libram', fLimited: 'Limited', fCore: 'Core damage', fTags: 'Tags',
    setSin: 'Sin', setApocalypse: 'Apocalypse', setImmortal: 'Immortal', setInfinite: 'Infinite',
    standard: 'Standard', limited: 'Limited', collab: 'Collab', coreNone: 'None', coreHas: 'Yes',
    tabProfile: 'Profile', tabSkills: 'Skills', tabBrand: 'Crimebrand', tabShackles: 'Shackles', tabFile: 'File',
    number: 'Number', tendency: 'Tendency', libram: 'Libram', birthplace: 'Birthplace', ability: 'Ability',
    released: 'Released', releasedCn: 'Released on CN', attributes: 'Attributes', trait: 'Trait',
    mania: 'Mania Intensify', block: 'Block', atkSpeed: 'ATK Speed', compliance: 'Compliance', materials: 'Materials',
    shackle: 'Shackle', exclusiveBrand: 'Exclusive crimebrand', phaseUp: 'Phase-up', skillUpgrades: 'Skill upgrades',
    sticker: 'Sticker', gender: 'Gender', birthday: 'Birthday', height: 'Height', case: 'Case',
    otherNames: 'Other names', voice: 'Voice',
    noSkills: 'The wiki has not written up this Sinner\'s skills yet.',
    noBrand: 'The wiki names no exclusive crimebrand for this Sinner.',
    noBrandSkill: 'The wiki has not written up what this crimebrand grants.',
    loading: 'Loading…', loadFailed: 'This Sinner\'s file could not be loaded.',
    unknownSinner: 'Unknown Sinner', noFile: 'No file found for',
    artOriginal: 'Original', artPhase: 'Phase-up', artMugshot: 'Mugshot', openFull: 'at full size', open: 'Open',
    pictures: 'Pictures',
  },
  zh: {
    sinners: '禁闭者', Sinners: '禁闭者', prompt: '搜索禁闭者…',
    emptyNote: '上次构建未能连接到无期迷途 WIKI。',
    newest: '最新', rank: '评级', mugshot: '档案照', original: '立绘',
    newestTip: '按国际服上线日期排列，最新在前。',
    lineup: '列队', arrivals: '逮捕', newArrivals: '新逮捕', cnOnly: '仅国服',
    lineups: '列队', cnShort: '国服', newShort: '新', scrollBack: '向前', scrollOn: '向后',
    standing: '名', arrived: '逮捕于', noPhoto: '暂无档案照', noPictures: '暂无图片',
    fRank: '稀有度', fTendency: '职业', fLibram: '阵营', fLimited: '限定', fCore: '核心伤害', fTags: 'TAG筛选',
    setSin: '原罪', setApocalypse: '天启', setImmortal: '不朽', setInfinite: '无界',
    standard: '常规', limited: '限定', collab: '联动', coreNone: '无', coreHas: '有',
    tabProfile: '档案', tabSkills: '技能', tabBrand: '烙印', tabShackles: '枷锁', tabFile: '记录',
    number: '编号', tendency: '职业', libram: '阵营', birthplace: '出生地', ability: '能力',
    released: '国际服上线', releasedCn: '国服上线', attributes: '属性', trait: '特性',
    mania: '狂厄深化', block: '阻挡', atkSpeed: '攻击速度', compliance: '服从度', materials: '材料',
    shackle: '枷锁', exclusiveBrand: '专属烙印', phaseUp: '升阶', skillUpgrades: '技能升级',
    sticker: '贴纸', gender: '性别', birthday: '生日', height: '身高', case: '事件',
    otherNames: '其他名称', voice: '配音',
    noSkills: 'WIKI 尚未收录该禁闭者的技能。',
    noBrand: 'WIKI 未收录该禁闭者的专属烙印。',
    noBrandSkill: 'WIKI 尚未收录该烙印的效果。',
    loading: '加载中…', loadFailed: '该禁闭者的档案未能加载。',
    unknownSinner: '未知禁闭者', noFile: '未找到档案：',
    artOriginal: '立绘', artPhase: '升阶立绘', artMugshot: '档案照', openFull: '（查看大图）', open: '打开',
    pictures: '图片',
  },
} as const;

/** A word of this site's own, in the language that is on. */
export function t(key: keyof typeof TEXT.en): string {
  return TEXT[lang][key];
}

// The game's own Chinese for its three ranks, six tendencies and sixteen librams: the
// English wiki's words are what the roster files a Sinner under, and these are what the
// Chinese side shows for them.
const RANK_ZH: Record<string, string> = { S: '狂厄', A: '高危', B: '普管' };

const TENDENCY_ZH: Record<string, string> = {
  Endura: '坚韧', Fury: '狂暴', Umbra: '诡秘', Reticle: '精准', Arcane: '异能', Catalyst: '启迪',
};

const LIBRAM_ZH: Record<string, string> = {
  LIMBO: '混沌', LOVE: '执迷', GREED: '无厌', ANGER: '愤怒', HERESY: '异质', VIOLENCE: '破坏',
  TREACHERY: '背离', SLOTH: '怠惰', FRAUD: '谵妄',
  PESTILENCE: '暗潮', FAMINE: '荒竭', WAR: '戾刃', DEATH: '靡音', SEQUESTER: '禁域',
  IMMORTAL: '不朽', INFINITE: '无界',
};

export function rankName(rank: string): string {
  return lang === 'zh' ? RANK_ZH[rank] ?? rank : rank;
}

export function tendencyName(tendency: string): string {
  return lang === 'zh' ? TENDENCY_ZH[tendency] ?? tendency : tendency;
}

export function libramName(libram: string): string {
  return lang === 'zh' ? LIBRAM_ZH[libram] ?? libram : libram;
}

/** A Sinner's name in the language that is on, where the build has it in that one. */
export function nameOf(s: PtnSinner): string {
  return lang === 'zh' && s.nameCn ? s.nameCn : s.name;
}

/** A Sinner's tags in the language that is on: each wiki's own, since the two do not sort them alike. */
export function tagsOf(s: PtnSinner): string[] {
  return (lang === 'zh' ? s.tagsCn : s.tags) ?? [];
}

/** The number a Sinner is filed under, or a collab's own code for them. */
export function codeOf(s: PtnSinner): string {
  return s.code ?? `MBCC-S-${s.number}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-10-08' as a placard prints it: 'Oct 2026', '2026年10月'. */
export function monthOf(day: string): string {
  const [year, month] = day.split('-');
  return lang === 'zh' ? `${year}年${Number(month)}月` : `${MONTHS[Number(month) - 1]} ${year}`;
}

/** '2026-10-08' as a file prints it: '8 October 2026', '2026年10月8日'. */
export function dayOf(day: string): string {
  // In UTC, which is how the days are written, so that no reader's clock moves one.
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
