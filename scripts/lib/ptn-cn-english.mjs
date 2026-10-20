// English for the Sinners only the CN server has (20 October 2026, the owner's ask): the
// English wiki has no page for them, so their skills, trait, Mania Intensify, shackles,
// compliance, crimebrand, extras and terms are translated here by hand from the Chinese
// wiki's text.
// Unofficial: the site says so where it shows them. Their bio, files and voice lines stay
// Chinese.
//
// Three parts. TERMS names every 【term】 the texts use, put in as the English wiki writes
// one, [Term]. NAMES puts a Sinner's name into the English. CLAUSES are the shapes the
// level-up lines and the stock shackles come in, one clause to a line ("伤害系数提升至58%").
// Everything else is in ptn-cn-english.json beside this, the Chinese text to its English,
// written by hand. A text with a clause none of them covers stays Chinese, and the build
// counts those. A new CN-only Sinner is their terms and names here and their texts there.
import { readFileSync } from 'node:fs';

const TEXT = JSON.parse(readFileSync(new URL('./ptn-cn-english.json', import.meta.url), 'utf8'));

// The JoJo collab's Stands keep the names the series gives them in English.
export const TERMS = {
  '残锋': 'Remnant Edge', '残锋-阿兰恰': 'Remnant Edge - Arancia', '戒备': 'On Guard', '清算': 'Reckoning',
  '同谋': 'Accomplice', '黑暗秩序': 'Dark Order',
  '花蔓陶像': 'Floral Vine Figurine', '补釉藏拙': 'Glaze Over Flaws', '成色': 'Lustre', '窑变': 'Kiln Change',
  '釉色相生': 'Glazes in Harmony', '次等艺术': 'Lesser Art', '筑匣藏珍': 'Casket of Treasures', '护盾': 'Shield',
  '冻结伤害': 'Freeze Damage', '冻结': 'Freeze', '燃烧伤害': 'Burn Damage', '燃烧': 'Burn', '冰冻': 'Frozen',
  '封结牢狱': 'Sealed Prison', '绯夜王庭': 'Scarlet Night Court', '绯夜王庭·Ⅰ': 'Scarlet Night Court I',
  '绯夜王庭·Ⅱ': 'Scarlet Night Court II', '绯夜王庭·Ⅲ': 'Scarlet Night Court III', '极夜黑洞': 'Polar Night Black Hole',
  '征服之实': 'Fruit of Conquest', '封冻值': 'Frost Value',
  '丝线': 'String', '束缚': 'Bind', '自由意志': 'Free Will', '线之牵引': 'String Pull', '牵引': 'Pull',
  '石之自由': 'Stone Free', '牵引束缚': 'Pull and Bind',
  '核心击破': 'Core Break', '高速连打': 'Rapid Barrage', '白金之星·世界': 'Star Platinum: The World',
  '时间暂停': 'Time Stop', '无畏斗志': 'Fearless Spirit', '局长权能': "Chief's Authority",
  '乐章': 'Movement', '永恒安息': 'Eternal Rest', '余烬垂怜': "Embers' Mercy", '落日之泪': 'Tears of the Sunset',
  '忿怒之火': 'Fire of Wrath', '挽歌-永恒安息': 'Elegy - Eternal Rest', '挽歌-余烬垂怜': "Elegy - Embers' Mercy",
  '挽歌-落日之泪': 'Elegy - Tears of the Sunset', '挽歌-忿怒之火': 'Elegy - Fire of Wrath',
  '冰结余烬': 'Frozen Embers', '冰结余烬·复燃': 'Frozen Embers, Rekindled', '无终演奏': 'Endless Performance',
  '永恒极寒': 'Eternal Frost', '泪火': 'Tearfire', '绝响华彩': 'Final Cadenza', '绝响': 'Swan Song',
  '变奏': 'Variation', '交错共鸣': 'Interwoven Resonance', '乐段': 'Phrase', '乐段·悼亡': 'Phrase of Mourning',
  '乐段·燃烬': 'Phrase of Cinders', '燃烧-丽奎安': 'Burn - Requiem',
  '贴纸': 'Sticker', '分裂贴纸': 'Splitting Sticker', '复仇许可': 'License for Revenge', '眩晕': 'Stun',
  '寄生子弹': 'Parasitic Bullet', '水分补给': 'Rehydrate', '浮游生物聚集体': 'Plankton Colony',
  '不朽灵魂': 'Undying Soul',
  '瓷质层': 'Porcelain Layer', '瓷化卫护': 'Porcelain Guard', '裂瓷飞溅': 'Porcelain Shards',
  '再生之壳': 'Regenerating Shell', '新生渴望': 'Longing for Rebirth',
  '蓄势踢击': 'Charged Kick', '背水决意': 'Last Stand', '潜身守护': 'Hidden Guardian', '怒海潜将': 'Diver Down',
  '风压': 'Wind Pressure', '天气预报': 'Weather Forecast', '狂风骤雨': 'Raging Storm',
};

// Longest first, so that 空条承太郎 is not taken for a part of another name.
const NAMES = [
  ['荒噬·伊琳娜', 'Famorene·Eirene'], ['空条承太郎', 'Jotaro'], ['空条徐伦', 'Jolyne'], ['达芙蒂尔', 'Daffodil'],
  ['阿兰恰', 'Arancia'], ['丽奎安', 'Requiem'], ['艾梅斯', 'Ermes'], ['安那苏', 'Anasui'], ['天气预报', 'Weather Forecast'],
  ['海莉', 'Helix'],
];

// The title each one's full compliance gives.
const TITLES = {
  '暗烬归铳': 'Embers Return to the Gun', '完美淬相': 'Perfect Glaze', '不败者史诗': 'Epic of the Undefeated',
  '无羁的自由': 'Unbound Freedom', '停止时间之人': 'The One Who Stops Time', '血弦独奏': 'Blood-String Solo',
  '致命的亲吻': 'A Deadly Kiss', '记忆与灵魂': 'Memory and Soul', '壳中囚徒': 'Prisoner in the Shell',
  '分解与重塑': 'Take Apart, Rebuild', '遗失过去之人': 'The One Who Lost the Past',
};

// V is a value as the game marks it up, <@ba.vup>58%</>, kept whole; N a bare number.
const V = '(<@ba\\.vup>[^<]*</>)';
const N = '(\\d+(?:\\.\\d+)?)';
const T = '(\\[[^\\]]+\\])';
const S = '([A-Z][\\w.·]*(?: [A-Z][\\w.·]*)?)';
const CLAUSES = [
  [`伤害系数提升至${V}`, 'Damage Coefficient increases to $1'],
  [`${T}伤害系数提升至${V}`, '$1 Damage Coefficient increases to $2'],
  [`额外伤害系数提升至${V}`, 'Extra Damage Coefficient increases to $1'],
  [`伤害系数提高至${V}倍`, 'Damage Coefficient is multiplied by $1'],
  [`普攻伤害提升${V}`, 'Basic Attack damage increases by $1'],
  [`普攻造成的伤害提升${V}`, 'Basic Attack damage dealt increases by $1'],
  [`必杀造成的伤害提升${V}`, 'Ultimate damage increases by $1'],
  [`技能伤害提升至${V}`, 'Skill damage bonus increases to $1'],
  [`造成的伤害额外提升${V}`, 'Extra damage bonus increases to $1'],
  [`造成的(燃烧|冻结)伤害提升至${V}`, (_, k, v) => `${k === '燃烧' ? 'Burn' : 'Freeze'} Damage bonus increases to ${v}`],
  [`受到的冻结伤害提升${V}`, 'Freeze Damage taken increases by $1'],
  [`受到的冻结伤害额外提升${V}`, 'Freeze Damage taken additionally increases by $1'],
  [`受到${T}伤害提升${V}`, '$1 damage taken increases by $2'],
  [`受到物理伤害提升${V}`, 'Physical Damage taken increases by $1'],
  [`受到伤害降低${V}`, 'Damage taken decreases by $1'],
  [`每${V}秒额外获得${N}层${T}`, 'Gains $2 extra stacks of $3 every $1 seconds'],
  [`${T}继承生命比例提升至${V}`, '$1 inherits $2 of HP'],
  [`触发间隔(?:缩短|降低)至${V}秒`, 'Trigger interval is reduced to $1 seconds'],
  [`触发概率提升至${V}`, 'Trigger chance increases to $1'],
  [`伤害比例提升至${V}`, 'Damage ratio increases to $1'],
  [`额外伤害比例提升至${V}`, 'Extra damage ratio increases to $1'],
  [`转化比例提升至${V}`, 'Conversion rate increases to $1'],
  [`治疗系数提升至${V}`, 'Healing Coefficient increases to $1'],
  [`治疗效果提升${V}`, 'Healing effect increases by $1'],
  [`护盾系数提升至${V}`, 'Shield Coefficient increases to $1'],
  [`效果提升${V}`, 'Effect increases by $1'],
  [`法抗降低${V}`, 'Magic Resistance decreases by $1'],
  [`防御降低${V}`, 'Defense decreases by $1'],
  [`移动速度降低${V}`, 'Movement Speed decreases by $1'],
  [`法抗提升${V}`, 'Magic Resistance increases by $1'],
  [`暴击率提升${V}`, 'Critical Rate increases by $1'],
  [`攻击提升${V}`, 'Attack increases by $1'],
  // The stock shackles, each a sentence of its own.
  [`攻击速度提升${V}。`, 'Attack Speed +$1'],
  [`生命提升${V}。`, 'HP +$1'],
  [`攻击提升${V}。`, 'Attack +$1'],
  [`暴击率提升${V}。`, 'Critical Rate +$1'],
  [`法抗提升${V}。`, 'Magic Resistance +$1'],
  [`进入战斗时，${S}获得${V}点能量。`, 'When the battle starts, $1 gains $2 Energy.'],
  [`必杀能耗降低${V}点。`, 'Ultimate Energy cost is reduced by $1.'],
  ['枷锁同步Ⅰ', 'Shackles Sync I'], ['枷锁同步Ⅱ', 'Shackles Sync II'], ['枷锁同步Ⅲ', 'Shackles Sync III'],
  ['能量充盈', 'Energy Surge'], ['情绪共鸣', 'Emotional Resonance'],
  ['梦魇天赋', 'Nightmare Talent'], ['破碎防线', 'Broken Defenses'],
  // Compliance, in the English wiki's own short form ("MRes+3, ATK+4"), and the title its
  // last stage gives.
  [`攻击\\+${N}`, 'ATK+$1'], [`生命\\+${N}`, 'HP+$1'], [`法抗\\+${N}`, 'MRes+$1'],
  ['解锁资料：监察记录', 'Unlocks file: Surveillance Record'], [`解锁语音：特殊交谈${N}`, 'Unlocks voice: Special Talk $1'],
  ['解锁表情包', 'Unlocks sticker pack'], ['解锁语音：服从度升满', 'Unlocks voice: Full Compliance'],
  [`称号：(.+)`, (_, title) => `Title: ${TITLES[title] ?? title}`],
].map(([pattern, english]) => [new RegExp(`^${pattern}$`), english]);

const termed = line => {
  let missing = false;
  let out = line.replace(/【([^】]+)】/g, (_, name) => {
    if (!TERMS[name]) missing = true;
    return `[${TERMS[name]}]`;
  });
  for (const [cn, en] of NAMES) out = out.replaceAll(cn, en);
  return missing ? undefined : out;
};

/** A CN-only Sinner's text in English, or undefined where some of it has none. */
export function toEnglish(text) {
  if (TEXT[text]) return TEXT[text];
  const lines = text.split('\n').map(line => {
    const t = termed(line);
    if (t === undefined) return undefined;
    // A term's own name, "【同谋】" or "【黑暗秩序】 · 必杀", is the term put into English.
    if (/^\[[^\]]+\](?: · 必杀)?$/.test(t)) return t.replace(' · 必杀', ' · Ultimate');
    for (const [re, english] of CLAUSES) if (re.test(t)) return t.replace(re, english);
    return undefined;
  });
  return lines.includes(undefined) ? undefined : lines.join('\n');
}
