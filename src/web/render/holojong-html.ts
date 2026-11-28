import { escHtml } from '../format';

// A guide to hololive Mahjong -Holojang- (ホロライブ麻雀 -ホロじゃん-, COVER and Aiming's
// mahjong game; "Holojang" is the owner's name for it, the game having no English title): how
// to get it, the rules of Japanese (riichi) mahjong for a beginner, and the Japanese on its
// screens with a reading and a meaning. Written on 19 November 2026 before release and brought
// up to the released game (out 25 November) on 28 November: the facts are the official site's
// (holo-jong.com, its notices) and COVER's press release, the modes and the beginner assist
// Game*Spark's hands-on of 27 November, and the rules are standard riichi as Mahjong Soul plays
// them, since Holojang's official pages do not list its own. Nothing here reads the clock or any data.

// ── The tiles ──
// A tile is written as Mahjong Soul and Tenhou write it: a number and a suit letter, m (manzu,
// characters), p (pinzu, dots), s (souzu, bamboo) or z (honours, 1z to 7z East, South, West,
// North, White, Green, Red). 0 is a red five.

const NUMERALS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const HONOURS = ['', '東', '南', '西', '北', '白', '發', '中'];

// The corner index Mahjong Soul prints on every tile, for the honours (the suits print their number).
const HONOUR_INDEX = ['', 'E', 'S', 'W', 'N', 'Wh', 'G', 'R'];

// Where a dots tile's circles sit on its 30x40 face: the circles' radius, [x, y] each, and each
// one's colour in order, k (ink) or r (red). Mahjong Soul draws the suit in those two colours
// where a traditional set mixes blue, green and red; the red stands where a set's red stands.
const DOTS: [number, [number, number][], string][] = [
  [0, [], ''],
  [11, [[15, 20]], ''],
  [7, [[15, 11], [15, 29]], 'kk'],
  [5.9, [[8, 9], [15, 20], [22, 31]], 'krk'],
  [6, [[8.5, 11.5], [21.5, 11.5], [8.5, 28.5], [21.5, 28.5]], 'kkkk'],
  [5.5, [[8, 9], [22, 9], [15, 20], [8, 31], [22, 31]], 'kkrkk'],
  [5, [[9.5, 9], [20.5, 9], [9.5, 21], [20.5, 21], [9.5, 32], [20.5, 32]], 'kkrrrr'],
  [4.3, [[6.5, 5.5], [15, 9.5], [23.5, 13.5], [9.5, 24], [20.5, 24], [9.5, 33.5], [20.5, 33.5]], 'kkkrrrr'],
  [4.3, [[9.5, 6.5], [20.5, 6.5], [9.5, 15.5], [20.5, 15.5], [9.5, 24.5], [20.5, 24.5], [9.5, 33.5], [20.5, 33.5]], 'kkkkkkkk'],
  [4.1, [[6.5, 8], [15, 8], [23.5, 8], [6.5, 20], [15, 20], [23.5, 20], [6.5, 32], [15, 32], [23.5, 32]], 'kkkrrrkkk'],
];

// A bamboo tile's sticks: their length, the [x, y] of each one's middle, and each one's colour,
// g (green) or r (red): the middle of the 5, the top of the 7 and the middle column of the 9.
// The 1 (a bird) and the 8 (a W over an M) are drawn apart.
const STICKS: [number, [number, number][], string][] = [
  [0, [], ''],
  [0, [], ''],
  [15, [[15, 11.5], [15, 28.5]], 'gg'],
  [15, [[15, 11.5], [9, 28.5], [21, 28.5]], 'ggg'],
  [15, [[9, 11.5], [21, 11.5], [9, 28.5], [21, 28.5]], 'gggg'],
  [15, [[8, 11.5], [22, 11.5], [15, 20], [8, 28.5], [22, 28.5]], 'ggrgg'],
  [15, [[7, 11.5], [15, 11.5], [23, 11.5], [7, 28.5], [15, 28.5], [23, 28.5]], 'gggggg'],
  [10.5, [[15, 7], [7, 20], [15, 20], [23, 20], [7, 33], [15, 33], [23, 33]], 'rgggggg'],
  [0, [], ''],
  [10.5, [[7, 7], [15, 7], [23, 7], [7, 20], [15, 20], [23, 20], [7, 33], [15, 33], [23, 33]], 'grggrggrg'],
];

// The 8 of bamboo, each stick from one end to the other: a W over an M.
const EIGHT: [number, number, number, number][] = [
  [5, 4, 5, 17], [8.5, 16.5, 14, 5.5], [16, 5.5, 21.5, 16.5], [25, 4, 25, 17],
  [5, 23, 5, 36], [8.5, 23.5, 14, 34.5], [16, 34.5, 21.5, 23.5], [25, 23, 25, 36],
];

const fix = (v: number): number => Math.round(v * 100) / 100;

/** One circle of the dots suit: a ring, a disc, and a notched white ring in it, like a coin. */
function dotSvg(x: number, y: number, r: number, colour: string): string {
  const notch = fix(2 * Math.PI * r * 0.3 / 12);
  return `<g class="${colour}" fill="none" stroke="currentColor">`
    + `<circle cx="${x}" cy="${y}" r="${fix(r * 0.86)}" stroke-width="${fix(r * 0.24)}"/>`
    + `<circle cx="${x}" cy="${y}" r="${fix(r * 0.56)}" fill="currentColor" stroke="none"/>`
    + `<circle cx="${x}" cy="${y}" r="${fix(r * 0.3)}" stroke="#fff" stroke-width="${fix(r * 0.16)}" stroke-dasharray="${notch}"/>`
    + '</g>';
}

/** The 1 of dots: one large circle, an ink rim and a ring of petals round a red centre. */
const ONE_DOT = '<g fill="none" stroke="currentColor">'
  + '<g class="k"><circle cx="15" cy="20" r="11" stroke-width="1.3"/>'
  + '<circle cx="15" cy="20" r="8.6" stroke-width="2.2" stroke-dasharray="1.7 1.68"/>'
  + '<circle cx="15" cy="20" r="6.3" stroke-width=".5"/></g>'
  + '<g class="r"><circle cx="15" cy="20" r="5.4" fill="currentColor" stroke="none"/>'
  + '<circle cx="15" cy="20" r="3.3" stroke="#fff" stroke-width=".7" stroke-dasharray=".87 .86"/>'
  + '<circle cx="15" cy="20" r="1.3" fill="#fff" stroke="none"/></g></g>';

/** One stick of the bamboo suit from one end to the other: a stem with a joint at each end and in the middle. */
function stickSvg(x1: number, y1: number, x2: number, y2: number, colour: string): string {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const h = Math.hypot(x2 - x1, y2 - y1);
  const turn = fix(Math.atan2(x1 - x2, y2 - y1) * 180 / Math.PI);
  const top = fix(cy - h / 2);
  const joints = [top, cy, fix(cy + h / 2)].map(y => `<rect x="${fix(cx - 2.5)}" y="${fix(y - 0.9)}" width="5" height="1.8" rx=".9"/>`).join('');
  return `<g class="${colour}" fill="currentColor"${turn ? ` transform="rotate(${turn} ${fix(cx)} ${fix(cy)})"` : ''}>`
    + `<rect x="${fix(cx - 1.5)}" y="${top}" width="3" height="${fix(h)}" rx="1.2"/>${joints}`
    + `<path d="M${fix(cx)} ${fix(top + 1.5)}V${fix(cy - 1.3)}M${fix(cx)} ${fix(cy + 1.3)}V${fix(cy + h / 2 - 1.5)}" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`
    + '</g>';
}

/** The 1 of bamboo: a peacock, its green fan of feathers spread behind it. */
const BIRD = '<g class="g" fill="currentColor">'
  + [-70, -35, 0, 35, 70].map(a => `<ellipse cx="13" cy="13" rx="2.8" ry="5" transform="rotate(${a} 13 22)"/>`).join('')
  + '</g><g class="r" fill="currentColor">'
  + [-70, -35, 0, 35, 70].map(a => `<circle cx="13" cy="11" r="1.1" transform="rotate(${a} 13 22)"/>`).join('')
  + '</g><g class="k" stroke="currentColor" stroke-width=".9" stroke-linecap="round">'
  + '<path d="M9 27.5c0-3 3-5 6.5-4.6 1.6.2 2.6-1 2.8-2.6.2-1.6 1.4-2.6 2.8-2.4 1.5.2 2.3 1.6 1.8 3l1.8 1-1.9.4c-.6 1.2-1 2.6-1.3 4.2-.8 4-4.2 6-7.7 5.6C10.9 31.7 9 30 9 27.5z" fill="#fff"/>'
  + '<path d="M12.5 27.6c2.6-.2 4.6.8 5.6 2.6M14 32.6l-1.2 4M17 32.4l.6 4" fill="none"/>'
  + '<path d="M20.4 17.6l-.6-2.2M21.6 17.6l.4-2.3" fill="none"/></g>'
  + '<circle cx="21.4" cy="19.8" r=".6" class="k" fill="currentColor"/>'
  + '<path d="M24.2 21l1.8 1-1.9.4z" class="r" fill="currentColor"/>';

/** The guide's two languages: English, and Traditional Chinese. */
type Lang = 'en' | 'zh';

const SUIT_NAME: Record<string, string> = { m: 'characters', p: 'dots', s: 'bamboo' };
const HONOUR_NAME = ['', 'East wind', 'South wind', 'West wind', 'North wind', 'White dragon', 'Green dragon', 'Red dragon'];
const SUIT_NAME_ZH: Record<string, string> = { m: '萬', p: '筒', s: '索' };
const HONOUR_NAME_ZH = ['', '東風', '南風', '西風', '北風', '白板', '發財', '紅中'];

/** What a screen reader says for a tile: '5 dots (red)', 'East wind'; '赤五筒', '東風'. */
function tileName(code: string, lang: Lang): string {
  const n = Number(code[0]);
  const suit = code[1];
  if (lang === 'zh') {
    if (suit === 'z') return HONOUR_NAME_ZH[n];
    return n === 0 ? `赤五${SUIT_NAME_ZH[suit]}` : `${NUMERALS[n]}${SUIT_NAME_ZH[suit]}`;
  }
  if (suit === 'z') return HONOUR_NAME[n];
  return n === 0 ? `5 ${SUIT_NAME[suit]} (red)` : `${n} ${SUIT_NAME[suit]}`;
}

/** The face of a dots or bamboo tile, as SVG. */
function faceSvg(n: number, suit: string, red: boolean): string {
  let art: string;
  if (suit === 'p') {
    const [r, at, colours] = DOTS[n];
    art = n === 1 ? ONE_DOT : at.map(([x, y], i) => dotSvg(x, y, r, red ? 'r' : colours[i])).join('');
  } else if (n === 1) {
    art = BIRD;
  } else if (n === 8) {
    art = EIGHT.map(([x1, y1, x2, y2]) => stickSvg(x1, y1, x2, y2, 'g')).join('');
  } else {
    // A red five's sticks are all red.
    const [h, at, colours] = STICKS[n];
    art = at.map(([x, y], i) => stickSvg(x, y - h / 2, x, y + h / 2, red ? 'r' : colours[i])).join('');
  }
  return `<svg viewBox="0 0 30 40" aria-hidden="true">${art}</svg>`;
}

/** One tile, from its code ('3m', '0p', '7z'). */
export function tileHtml(code: string, lang: Lang = 'en'): string {
  const n = Number(code[0]);
  const suit = code[1];
  const red = n === 0;
  const value = red ? 5 : n;
  let face: string;
  if (suit === 'm') face = `<b class="num">${NUMERALS[value]}</b><b class="man">萬</b>`;
  // White is blank, as Mahjong Soul draws it: only its corner index marks it.
  else if (suit === 'z') face = n === 5 ? '' : `<b class="honour z${n}">${HONOURS[n]}</b>`;
  else face = faceSvg(value, suit, red);
  const index = `<i class="idx" aria-hidden="true">${suit === 'z' ? HONOUR_INDEX[n] : value}</i>`;
  return `<span class="hj-tile ${suit}${red ? ' red' : ''}" role="img" aria-label="${tileName(code, lang)}">${face}${index}</span>`;
}

/** A row of tiles from a hand written as Tenhou does ('234m 55p'), a gap between groups. */
function handHtml(hand: string, lang: Lang): string {
  return `<span class="hj-hand">${hand.split(' ').map(group => {
    const suit = group[group.length - 1];
    return `<span class="hj-group">${[...group.slice(0, -1)].map(n => tileHtml(n + suit, lang)).join('')}</span>`;
  }).join('')}</span>`;
}

// ── The words ──
// [Japanese, reading, English, what it means for you, the Chinese term, what it means in Chinese].
// A `Term` list is one table.
type Term = [jp: string, reading: string, en: string, note: string, zh: string, zhNote: string];

const termRows = (terms: Term[], lang: Lang): string => terms.map(([jp, reading, en, note, zh, zhNote]) => `
  <tr>
    <th scope="row" lang="ja">${jp}</th>
    <td class="hj-read">${reading}</td>
    <td class="hj-en">${lang === 'en' ? en : zh}</td>
    <td>${lang === 'en' ? note : zhNote}</td>
  </tr>`).join('');

const termTable = (caption: string, terms: Term[], lang: Lang): string => `
  <div class="hj-table-wrap">
    <table class="hj-terms">
      <caption>${caption}</caption>
      <thead><tr>${(lang === 'en' ? ['On screen', 'Reading', 'English', 'What it means'] : ['畫面文字', '讀音', '中文', '說明']).map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${termRows(terms, lang)}</tbody>
    </table>
  </div>`;

const BUTTONS: Term[] = [
  ['ポン', 'pon', 'Pon', 'Take a discard to make three of a kind. From any player.', '碰', '用別人打出的牌組成刻子。任何玩家打的都可以。'],
  ['チー', 'chii', 'Chii', 'Take a discard to make a run. Only from the player on your left.', '吃', '用別人打出的牌組成順子。只能吃左邊玩家（上家）的牌。'],
  ['カン', 'kan', 'Kan', 'Make four of a kind. You draw an extra tile and a new dora is shown.', '槓', '組成四張相同的牌。你會多摸一張牌，並翻開一張新的寶牌指示牌。'],
  ['リーチ', 'riichi', 'Riichi', 'Declare that you are one tile from winning. Closed hands only. Costs 1,000 points.', '立直', '宣告你只差一張就能和牌。只限門清。要付 1,000 點。'],
  ['ロン', 'ron', 'Ron', 'Win on another player\'s discard. That player pays.', '榮和', '用別人打出的牌和牌。由打出那張牌的玩家支付。'],
  ['ツモ', 'tsumo', 'Tsumo', 'Win on a tile you drew yourself. Everyone pays.', '自摸', '用自己摸到的牌和牌。其他三人都要支付。'],
  ['スキップ / パス', 'sukippu / pasu', 'Skip / Pass', 'Do not call. Play goes on.', '跳過', '不鳴牌，遊戲繼續。'],
  ['九種九牌', 'kyuushu kyuuhai', 'Nine terminals', 'On your first draw with 9 different terminals or honours, you can stop the hand.', '九種九牌', '第一次摸牌時手上有 9 種不同的么九牌，可以讓這一局流局。'],
];

const TABLE: Term[] = [
  ['東場 / 南場', 'tonba / nanba', 'East / South round', 'The game has an East round and then a South round.', '東場 / 南場', '一場對局先打東場，再打南場。'],
  ['東1局', 'ton ikkyoku', 'East 1', 'The round and the hand number. 南3局 is South 3.', '東一局', '場和局數。南3局就是南三局。'],
  ['本場', 'honba', 'Repeat counter', 'Goes up by one when the dealer wins and stays dealer, and on every exhaustive draw, even when the deal moves on. Each one adds 300 to the next win. Back to 0 when a non-dealer wins.', '本場', '莊家和牌連莊時加一，每次流局也加一（就算換莊）。每一本場讓下一次和牌多 300 點。閒家和牌時歸零。'],
  ['親', 'oya', 'Dealer', 'Wins 1.5 times as much. On a Ron the dealer pays the normal value; on another player\'s Tsumo, a double share. Moves on when a non-dealer wins, or when the dealer is not ready at a draw.', '莊家', '和牌得 1.5 倍。放銃時照一般點數支付；別人自摸時付雙倍的份。閒家和牌，或流局時莊家沒有聽牌，就換莊。'],
  ['子', 'ko', 'Non-dealer', 'The three other players.', '閒家', '其他三位玩家。'],
  ['自風 / 場風', 'jikaze / bakaze', 'Seat wind / round wind', 'A triplet of either wind is a yaku.', '自風 / 場風', '這兩種風的刻子都是役。'],
  ['供託', 'kyoutaku', 'Riichi sticks', 'The 1,000-point sticks on the table. The next winner takes them.', '供託', '桌上的 1,000 點立直棒。下一位和牌的人拿走。'],
  ['残り', 'nokori', 'Tiles left', 'Tiles left in the wall. At 0 the hand ends in a draw.', '剩餘牌數', '牌山剩下的牌數。到 0 時這一局流局。'],
  ['点 / 持ち点', 'ten / mochiten', 'Points', 'Your score. Most games start at 25,000.', '點數', '你的分數。多數對局從 25,000 點開始。'],
  ['ドラ表示牌', 'dora hyoujihai', 'Dora indicator', 'The face-up tile on the wall. The tile after it is the dora.', '寶牌指示牌', '牌山上翻開的那張牌。它的下一張才是寶牌。'],
];

const STATUS: Term[] = [
  ['聴牌 / テンパイ', 'tenpai', 'Ready', 'One tile from a complete hand.', '聽牌', '只差一張就是完整的手牌。'],
  ['ノーテン', 'nooten', 'Not ready', 'Not one tile from winning when the hand ends in a draw. You pay.', '未聽牌', '流局時沒有聽牌。你要支付點數。'],
  ['振聴 / フリテン', 'furiten', 'Furiten', 'A tile you wait on is in your own discards. You cannot win by Ron, only by Tsumo.', '振聽', '你聽的牌在自己的捨牌裡。不能榮和，只能自摸。'],
  ['一発', 'ippatsu', 'One shot', 'Win before your next discard after riichi, with no call between. +1 han.', '一發', '立直後，在你下一次打牌前和牌，中間沒有人鳴牌。+1 翻。'],
  ['ドラ', 'dora', 'Dora', 'A bonus tile. +1 han each, but not a yaku.', '寶牌', '獎勵牌。每張 +1 翻，但不是役。'],
  ['裏ドラ', 'ura dora', 'Hidden dora', 'Shown only when a riichi hand wins. More bonus han.', '裏寶牌', '只有立直的手牌和牌時才翻開。更多獎勵翻數。'],
  ['赤ドラ', 'aka dora', 'Red five', 'A red 5 tile. Counts as a dora.', '赤寶牌', '紅色的 5。算作一張寶牌。'],
  ['流局', 'ryuukyoku', 'Draw', 'The wall ran out with no winner. Ready players are paid by the others.', '流局', '牌山摸完，沒有人和牌。聽牌的玩家由其他人支付。'],
  ['和了', 'agari', 'Win', 'A complete hand.', '和了', '完成的手牌，也就是和牌。'],
  ['放銃', 'houjuu', 'Deal-in', 'You discarded the tile another player won on.', '放銃', '你打出的牌讓別人和牌。'],
];

const RESULT: Term[] = [
  ['役', 'yaku', 'Yaku', 'A scoring pattern. A hand needs at least one to win.', '役', '得分牌型。手牌至少要有一個才能和牌。'],
  ['翻', 'han', 'Han', 'The doubles a hand earns. The main part of the score.', '翻', '手牌得到的翻數，是分數的主要部分。'],
  ['符', 'fu', 'Fu', 'Minipoints for how the hand was made. The game counts them.', '符', '依手牌的組成方式算的小分。遊戲會自動計算。'],
  ['満貫', 'mangan', 'Mangan', '5 han (or less with high fu). 8,000 points, 12,000 for the dealer.', '滿貫', '5 翻（符數高時翻數少一點也可以）。8,000 點，莊家 12,000 點。'],
  ['跳満', 'haneman', 'Haneman', '6–7 han. 12,000 / 18,000.', '跳滿', '6–7 翻。12,000 / 18,000。'],
  ['倍満', 'baiman', 'Baiman', '8–10 han. 16,000 / 24,000.', '倍滿', '8–10 翻。16,000 / 24,000。'],
  ['三倍満', 'sanbaiman', 'Sanbaiman', '11–12 han. 24,000 / 36,000.', '三倍滿', '11–12 翻。24,000 / 36,000。'],
  ['役満', 'yakuman', 'Yakuman', 'The top hands. 32,000 / 48,000.', '役滿', '最高的牌型。32,000 / 48,000。'],
  ['1位 / 2位 / 3位 / 4位', 'ichi-i … yon-i', '1st – 4th place', 'Your place at the end of the game.', '第一 – 第四名', '對局結束時你的名次。'],
  ['半荘戦 / 東風戦', 'hanchan-sen / tonpuu-sen', 'Full game / East only', 'A full game has East and South rounds; a short one has East only.', '半莊戰 / 東風戰', '半莊戰打東場和南場；東風戰只打東場。'],
];

const MENUS: Term[] = [
  ['対局', 'taikyoku', 'Play / Match', 'Start a game.', '對局', '開始一場對局。'],
  ['友人戦', 'yuujin-sen', 'Friend match', 'A room for you and friends.', '友人戰', '你和朋友一起打的房間。'],
  ['大会', 'taikai', 'Tournament', 'Organised events.', '大會', '有人主辦的比賽。'],
  ['観戦', 'kansen', 'Spectate', 'Watch other players\' games.', '觀戰', '觀看其他玩家的對局。'],
  ['牌譜', 'haifu', 'Replays', 'Records of your past games.', '牌譜', '你過去對局的紀錄。'],
  ['ガチャ', 'gacha', 'Gacha', 'Where you get talent and items.', '轉蛋', '取得成員和道具的地方。'],
  ['プレゼント', 'purezento', 'Gifts / Inbox', 'Rewards to collect, such as pre-registration rewards.', '禮物箱', '可以領取的獎勵，例如事前登錄獎勵。'],
  ['お知らせ', 'oshirase', 'News', 'Notices from the game.', '公告', '遊戲發出的通知。'],
  ['ミッション', 'misshon', 'Missions', 'Tasks for rewards.', '任務', '完成可得到獎勵。'],
  ['設定', 'settei', 'Settings', 'Sound, display and play options.', '設定', '音效、顯示和遊戲選項。'],
  ['チュートリアル', 'chuutoriaru', 'Tutorial', 'The game\'s own lessons.', '教學', '遊戲內建的教學。'],
];

// [kanji, reading, English, Chinese, han closed, han open (—: closed only), how to make it,
// how in Chinese, an example hand].
type Yaku = [jp: string, reading: string, en: string, zh: string, closed: string, open: string, how: string, zhHow: string, hand?: string];

const YAKU: Yaku[] = [
  ['立直', 'riichi', 'Riichi', '立直', '1', '—', 'Declare riichi with a closed, ready hand. The easiest yaku: use it.', '以門清、聽牌的手牌宣告立直。最容易的役：多用它。'],
  ['門前清自摸和', 'menzen tsumo', 'Closed self-draw', '門清自摸', '1', '—', 'Win by Tsumo with no calls.', '沒有鳴牌，以自摸和牌。'],
  ['断么九', 'tanyao', 'All simples', '斷么九', '1', '1', 'Only tiles 2 to 8. No 1s, 9s or honours.', '只用 2 到 8 的牌。沒有 1、9 和字牌。', '234m 567p 345s 678s 22p'],
  ['役牌', 'yakuhai', 'Value tiles', '役牌', '1', '1', 'A triplet of White, Green or Red, your seat wind or the round wind.', '白、發、中、自風或場風的刻子。', '777z'],
  ['平和', 'pinfu', 'Pinfu', '平和', '1', '—', 'Four runs, a pair that is not a value tile, and a wait on either end of a run.', '四組順子、不是役牌的雀頭，並且是兩面聽。'],
  ['一盃口', 'iipeikou', 'Double run', '一盃口', '1', '—', 'Two identical runs in one suit.', '同一花色裡兩組完全相同的順子。', '334455m'],
  ['三色同順', 'sanshoku', 'Three-colour run', '三色同順', '2', '1', 'The same run in all three suits.', '三種花色都有同樣數字的順子。', '345m 345p 345s'],
  ['一気通貫', 'ittsu', 'Straight', '一氣通貫', '2', '1', '1 to 9 in one suit.', '同一花色的 1 到 9。', '123s 456s 789s'],
  ['対々和', 'toitoi', 'All triplets', '對對和', '2', '2', 'Four triplets and a pair.', '四組刻子加一組雀頭。', '222m 777p 999s 111z 55s'],
  ['七対子', 'chiitoitsu', 'Seven pairs', '七對子', '2', '—', 'Seven different pairs. The one hand not built from sets.', '七組不同的對子。唯一不用面子組成的手牌。', '11m 44m 77p 99p 22s 66s 33z'],
  ['混一色', 'honitsu', 'Half flush', '混一色', '3', '2', 'One suit plus honours.', '一種花色加上字牌。', '123p 456p 99p 222z 666z'],
  ['清一色', 'chinitsu', 'Full flush', '清一色', '6', '5', 'One suit only.', '只有一種花色。', '112233s 456s 789s 55s'],
];

// ── Every yaku ──
// The standard yaku as Mahjong Soul's ranked rules play them, by han. 'mangan' is written as the
// word; '1×' and '2×' are a yakuman and a double one. The twelve above are reused as they are.
const first = (jp: string): Yaku => YAKU.find(row => row[0] === jp)!;

const YAKU_GROUPS: [en: string, zh: string, rows: Yaku[]][] = [
  ['1 han', '1 翻', [
    first('立直'),
    ['一発', 'ippatsu', 'One shot', '一發', '1', '—', 'Win within one go-round of your riichi: by your next draw, with no call by anyone before it.', '立直後一巡內和牌：在你下一次摸牌（含）之前，而且中間沒有任何人鳴牌。'],
    first('門前清自摸和'),
    first('断么九'),
    first('平和'),
    first('一盃口'),
    ['役牌', 'yakuhai', 'Value tiles', '役牌', '1', '1', 'A triplet of White, Green or Red, your seat wind or the round wind: 1 han each. A wind that is both (East for the dealer in the East round, 連風牌) is 2.', '白、發、中、自風或場風的刻子：每組 1 翻。同時是自風和場風的風牌（連風牌，例如東場的莊家拿東）算 2 翻。', '555z'],
    ['海底摸月', 'haitei moyue', 'Last tile', '海底撈月', '1', '1', 'Win by Tsumo on the last tile of the wall.', '用牌山最後一張牌自摸和牌。'],
    ['河底撈魚', 'houtei raoyui', 'Last discard', '河底撈魚', '1', '1', 'Win by Ron on the last discard of the hand.', '用這一局最後一張捨牌榮和。'],
    ['嶺上開花', 'rinshan kaihou', 'After a kan', '嶺上開花', '1', '1', 'Win on the extra tile you draw after a kan.', '用開槓後補摸的嶺上牌和牌。'],
    ['槍槓', 'chankan', 'Robbing a kan', '搶槓', '1', '1', 'Win by Ron on the tile another player adds to their pon to make a kan.', '別人把一張牌加到碰出的刻子上開槓（加槓）時，用那張牌榮和。'],
  ]],
  ['2 han', '2 翻', [
    ['ダブル立直', 'daburu riichi', 'Double riichi', '兩立直', '2', '—', 'Riichi on your first discard, with no call before it. It takes the place of riichi\'s 1 han.', '在第一次打牌時立直，而且在那之前沒有人鳴牌。取代立直的 1 翻。'],
    first('三色同順'),
    first('一気通貫'),
    ['混全帯么九', 'chanta', 'Half outside hand', '混全帶么九', '2', '1', 'Every set and the pair has a 1, a 9 or an honour, with at least one run and one honour.', '每組面子和雀頭都含有 1、9 或字牌，至少有一組順子和一張字牌。', '123m 789p 789s 999s 33z'],
    first('七対子'),
    first('対々和'),
    ['三暗刻', 'sanankou', 'Three closed triplets', '三暗刻', '2', '2', 'Three triplets you drew yourself, not called. A triplet finished by Ron does not count as closed.', '三組自己摸進來的刻子（不是碰來的）。用榮和完成的刻子不算暗刻。', '222m 555p 888s'],
    ['三色同刻', 'sanshoku doukou', 'Three-colour triplets', '三色同刻', '2', '2', 'A triplet of the same number in all three suits.', '三種花色都有同樣數字的刻子。', '777m 777p 777s'],
    ['三槓子', 'sankantsu', 'Three quads', '三槓子', '2', '2', 'Three kans, open or closed.', '三組槓子，明槓或暗槓都可以。'],
    ['小三元', 'shousangen', 'Little three dragons', '小三元', '2', '2', 'Two dragon triplets and a pair of the third. The two triplets are value tiles too, so it is 4 han at least.', '兩組三元牌的刻子，加上第三種三元牌的雀頭。那兩組刻子也是役牌，所以至少 4 翻。', '555z 666z 77z'],
    ['混老頭', 'honroutou', 'All terminals and honours', '混老頭', '2', '2', 'Only 1s, 9s and honours. It always comes with all triplets or seven pairs, which add their own han.', '只有 1、9 和字牌。一定會同時是對對和或七對子，各自另外計翻。', '111m 999p 111z 555z 99s'],
  ]],
  ['3 han', '3 翻', [
    ['二盃口', 'ryanpeikou', 'Twice double run', '二盃口', '3', '—', 'Two double runs. It is counted in place of seven pairs.', '兩組一盃口。不和七對子重複計算，只算二盃口。', '223344m 667788p 55s'],
    first('混一色'),
    ['純全帯么九', 'junchan', 'Fully outside hand', '純全帶么九', '3', '2', 'Every set and the pair has a 1 or a 9. No honours.', '每組面子和雀頭都含有 1 或 9，沒有字牌。', '123m 789m 123p 999s 11s'],
  ]],
  ['6 han', '6 翻', [first('清一色')]],
  ['Mangan', '滿貫', [
    ['流し満貫', 'nagashi mangan', 'Terminal discards', '流局滿貫', 'mangan', 'mangan', 'When the wall runs out, every tile you discarded is a 1, a 9 or an honour, and no one called any of them. Paid as a mangan by Tsumo.', '流局時，你打出的牌全部是 1、9 或字牌，而且沒有一張被別人鳴走。照滿貫自摸支付。'],
  ]],
  ['Yakuman: 32,000 / 48,000', '役滿：32,000 / 48,000', [
    ['国士無双', 'kokushi musou', 'Thirteen orphans', '國士無雙', '1×', '—', 'One of each 1, 9 and honour (13 kinds), and one more of any of them.', '1、9 和字牌共 13 種各一張，再加其中任一張成對。', '119m 19p 19s 1234567z'],
    ['四暗刻', 'suuankou', 'Four closed triplets', '四暗刻', '1×', '—', 'Four triplets you drew yourself. Won by Ron on a wait for either of two pairs, the last triplet is open: then it is three closed triplets and all triplets.', '四組自己摸進來的刻子。如果是雙碰聽而用榮和完成，最後一組算明刻，只能算三暗刻加對對和。', '111m 444p 777s 222z 99s'],
    ['大三元', 'daisangen', 'Big three dragons', '大三元', '1×', '1×', 'Triplets of all three dragons.', '三種三元牌都是刻子。', '555z 666z 777z'],
    ['小四喜', 'shousuushii', 'Little four winds', '小四喜', '1×', '1×', 'Triplets of three winds and a pair of the fourth.', '三種風牌的刻子，加上第四種風牌的雀頭。', '111z 222z 333z 44z'],
    ['字一色', 'tsuuiisou', 'All honours', '字一色', '1×', '1×', 'Only honour tiles.', '只有字牌。', '111z 222z 555z 777z 33z'],
    ['緑一色', 'ryuuiisou', 'All green', '綠一色', '1×', '1×', 'Only 2, 3, 4, 6 and 8 bamboo and the Green dragon. Mahjong Soul does not require the Green dragon.', '只有 2、3、4、6、8 索和發。雀魂不要求一定要有發。', '223344s 666s 888s 66z'],
    ['清老頭', 'chinroutou', 'All terminals', '清老頭', '1×', '1×', 'Only 1s and 9s.', '只有 1 和 9。', '111m 999m 111p 999s 11s'],
    ['九蓮宝燈', 'chuuren poutou', 'Nine gates', '九蓮寶燈', '1×', '—', '1112345678999 in one suit, and one more tile of that suit.', '同一花色的 1112345678999，再加一張同花色的牌。', '111p 234p 55p 678p 999p'],
    ['四槓子', 'suukantsu', 'Four quads', '四槓子', '1×', '1×', 'Four kans.', '四組槓子。'],
    ['天和', 'tenhou', 'Blessing of heaven', '天和', '1×', '—', 'The dealer\'s first 14 tiles are a complete hand.', '莊家配牌的 14 張就是完整的和牌。'],
    ['地和', 'chiihou', 'Blessing of earth', '地和', '1×', '—', 'A non-dealer wins by Tsumo on their first draw, with no call before it.', '閒家第一次摸牌就自摸和牌，而且在那之前沒有人鳴牌。'],
  ]],
  ['Double yakuman: 64,000 / 96,000', '雙倍役滿：64,000 / 96,000', [
    ['国士無双十三面待ち', 'kokushi juusanmen', 'Thirteen orphans, 13-sided wait', '國士無雙十三面', '2×', '—', 'One of each of the 13 kinds, waiting on any of them.', '13 種么九牌各一張，聽其中任何一張。', '19m 19p 19s 1234567z'],
    ['四暗刻単騎', 'suuankou tanki', 'Four closed triplets, pair wait', '四暗刻單騎', '2×', '—', 'Four closed triplets, waiting on the tile for the pair.', '四組暗刻已經完成，單騎聽雀頭。', '111m 444p 777s 222z 9s'],
    ['純正九蓮宝燈', 'junsei chuuren', 'True nine gates', '純正九蓮寶燈', '2×', '—', '1112345678999 in one suit, waiting on any of its nine tiles.', '同一花色的 1112345678999，聽這個花色的九種牌。', '111m 2345m 678m 999m'],
    ['大四喜', 'daisuushii', 'Big four winds', '大四喜', '2×', '2×', 'Triplets of all four winds.', '四種風牌都是刻子。', '111z 222z 333z 444z 55m'],
  ]],
];

// ── Old yaku (古役) ──
// [kanji, reading, English, Chinese, value, in Mahjong Soul's friend rooms, how, how in Chinese,
// an example]. Mahjong Soul plays the first fourteen in friend rooms, not in ranked (Game8's
// list of its local yaku, read 22 November 2026); the rest are in none of its rules.
type OldYaku = [jp: string, reading: string, en: string, zh: string, value: string, soul: boolean, how: string, zhHow: string, hand?: string];

const OLD_YAKU: OldYaku[] = [
  ['人和', 'renhou', 'Blessing of man', '人和', '1×', true, 'A non-dealer wins by Ron before their first draw, with no call before it. Some rule sets make it a mangan.', '閒家在第一次摸牌前就榮和，而且在那之前沒有人鳴牌。有些規則只算滿貫。'],
  ['大車輪', 'daisharin', 'Big wheels', '大車輪', '1×', true, 'Seven pairs of 2 to 8 dots. Closed.', '2 到 8 筒各一對的七對子。限門清。', '22p 33p 44p 55p 66p 77p 88p'],
  ['大竹林', 'daichikurin', 'Big bamboo forest', '大竹林', '1×', true, 'The same in bamboo.', '同樣的牌型，用索子。', '22s 33s 44s 55s 66s 77s 88s'],
  ['大数隣', 'daisuurin', 'Big neighbours', '大數鄰', '1×', true, 'The same in characters.', '同樣的牌型，用萬子。', '22m 33m 44m 55m 66m 77m 88m'],
  ['大七星', 'daichisei', 'Big seven stars', '大七星', '2×', true, 'Seven pairs of the seven honours. Closed.', '七種字牌各一對的七對子。限門清。', '11z 22z 33z 44z 55z 66z 77z'],
  ['石の上にも三年', 'ishi no ue ni mo sannen', 'Three years on a rock', '石上三年', '1×', true, 'Double riichi, and win on the last tile: by Tsumo on the wall\'s last tile, or by Ron on the last discard.', '兩立直，並且用最後一張牌和牌：海底摸月或河底撈魚。'],
  ['一筒摸月', 'iipin moyue', 'Moon on 1 dots', '一筒摸月', 'mangan', true, 'Win by Tsumo on the wall\'s last tile, and that tile is 1 dots.', '用牌山最後一張牌自摸，而那張牌是一筒。'],
  ['九筒撈魚', 'chuupin raoyui', 'Fish on 9 dots', '九筒撈魚', 'mangan', true, 'Win by Ron on the last discard, and that tile is 9 dots.', '用最後一張捨牌榮和，而那張牌是九筒。'],
  ['一色三順', 'isshoku sanjun', 'Pure triple run', '一色三同順', '3 / 2', true, 'The same run three times in one suit. 3 han closed, 2 open.', '同一花色三組完全相同的順子。門清 3 翻，副露 2 翻。', '345s 345s 345s'],
  ['三連刻', 'sanrenkou', 'Three step triplets', '三連刻', '2', true, 'Triplets of three numbers in a row in one suit.', '同一花色三組數字相連的刻子。', '444p 555p 666p'],
  ['五門斉', 'uumensai', 'Five gates', '五門齊', '2', true, 'Characters, dots, bamboo, winds and dragons all in the hand.', '手牌裡萬、筒、索、風牌、三元牌五種都有。', '123m 456p 789s 111z 55z'],
  ['燕返し', 'tsubame gaeshi', 'Swallow\'s return', '燕返', '1', true, 'Win by Ron on the tile another player discards to declare riichi.', '用別人宣告立直時打出的那張牌榮和。'],
  ['槓振り', 'kanburi', 'Kan discard', '槓振', '1', true, 'Win by Ron on the tile a player discards right after a kan.', '用別人開槓後打出的那張牌榮和。'],
  ['十二落抬', 'shiiaru raotai', 'Twelve fallen', '十二落抬', '1', true, 'Four calls, and win on the one tile left in your hand.', '鳴牌四次，手上只剩一張，單騎和牌。'],
  ['十三不塔', 'shiisan puutaa', 'Thirteen unconnected', '十三不搭', '1×', false, 'On your first draw, with no call before it: one pair, and no other two tiles that could make a set (no two of a suit within 2 of each other). Some rule sets make it a mangan.', '第一次摸牌時，在沒有人鳴牌的情況下：只有一組對子，其他牌都不能組成搭子（同一花色的任兩張相差 3 以上）。有些規則只算滿貫。', '147m 258p 369s 12366z'],
  ['紅孔雀', 'benikujaku', 'Red peacock', '紅孔雀', '1×', false, 'Only 1, 5, 7 and 9 bamboo and the Red dragon: the tiles drawn in red.', '只有 1、5、7、9 索和紅中：都是畫有紅色的牌。', '111s 555s 777s 999s 77z'],
  ['黒一色', 'kokuiisou', 'All black', '黑一色', '1×', false, 'Only 2, 4 and 8 dots and the four winds: the tiles with no red or green.', '只有 2、4、8 筒和四種風牌：沒有紅色和綠色的牌。', '222p 444p 888p 111z 33z'],
  ['百万石', 'hyakumangoku', 'A million koku', '百萬石', '1×', false, 'Characters only, and the numbers add up to 100 or more.', '只有萬子，而且所有數字加起來至少 100。', '666m 777m 888m 999m 99m'],
  ['金門橋', 'kinmonkyou', 'Golden Gate Bridge', '金門橋', '1×', false, '123, 345, 567 and 789 in one suit, and a pair. Some rule sets require a closed hand.', '同一花色的 123、345、567、789，加一組雀頭。有些規則要求門清。', '123p 345p 567p 789p 11z'],
  ['東北新幹線', 'touhoku shinkansen', 'Tohoku Shinkansen', '東北新幹線', '1×', false, '1 to 9 in one suit, and East and North: a triplet of one and a pair of the other. Closed.', '同一花色的 1 到 9，加上東和北：一組刻子和一組雀頭。限門清。', '123m 456m 789m 111z 44z'],
  ['四連刻', 'suurenkou', 'Four step triplets', '四連刻', '1×', false, 'Triplets of four numbers in a row in one suit.', '同一花色四組數字相連的刻子。', '333s 444s 555s 666s 99m'],
  ['一色四順', 'isshoku suujun', 'Pure quadruple run', '一色四同順', '1×', false, 'The same run four times in one suit.', '同一花色四組完全相同的順子。', '234p 234p 234p 234p 88s'],
  ['三風刻', 'sanpuukou', 'Three wind triplets', '三風刻', '2', false, 'Triplets of three winds, and the fourth wind not the pair (that is little four winds).', '三種風牌的刻子，而第四種風牌不是雀頭（否則就是小四喜）。', '111z 222z 333z'],
  ['オープン立直', 'oopun riichi', 'Open riichi', '開立直', '2', false, 'Riichi with your hand shown to everyone, 2 han in place of 1. In many rule sets, a player not in riichi who deals into it pays a yakuman.', '把手牌亮給所有人看的立直，算 2 翻，取代立直的 1 翻。在很多規則裡，沒有立直的玩家放銃給它要付役滿。'],
];

// ── Local rules ──
// [Japanese, reading, English, Chinese, in Mahjong Soul's ranked rules, what it is, in Chinese].
// Mahjong Soul's side is from community guides of its ranked rules, which match Tenhou's.
const LOCAL_RULES: [jp: string, reading: string, en: string, zh: string, soul: boolean, how: string, zhHow: string][] = [
  ['喰いタン', 'kuitan', 'Open all simples', '食斷', true, 'All simples still counts after a call. Some rule sets do not allow it.', '鳴牌後斷么九仍然成立。有些規則不允許。'],
  ['後付け', 'atozuke', 'Yaku later', '後付', true, 'You may call before your hand has a yaku, if it has one when it wins.', '還沒有確定的役也可以先鳴牌，只要和牌時有役就好。'],
  ['数え役満', 'kazoe yakuman', 'Counted yakuman', '累計役滿', true, '13 han or more of ordinary yaku and dora is paid as a yakuman.', '一般的役加寶牌累計 13 翻以上，當作役滿支付。'],
  ['複合役満', 'fukugou yakuman', 'Yakuman add up', '複合役滿', true, 'Two yakuman in one hand are paid as a double, such as big three dragons with all honours.', '一副手牌同時有兩個役滿時算雙倍役滿，例如大三元加字一色。'],
  ['ダブロン', 'daburon', 'Double Ron', '雙響', true, 'Two players win on the same discard, and both are paid.', '兩位玩家同時榮和同一張牌，兩人都得分。'],
  ['責任払い / パオ', 'sekinin barai / pao', 'Liability', '包牌', true, 'A player whose discard lets another call the last set of big three dragons or big four winds pays that yakuman: all of it by Tsumo, half if a third player deals in.', '讓別人鳴牌完成大三元或大四喜最後一組的玩家，要負責支付那個役滿：自摸時全付，別人放銃時各付一半。'],
  ['切り上げ満貫', 'kiriage mangan', 'Round up to mangan', '切上滿貫', false, '4 han 30 fu and 3 han 60 fu are paid as a mangan.', '4 翻 30 符和 3 翻 60 符當作滿貫支付。'],
  ['八連荘', 'paarenchan', 'Eight in a row', '八連莊', false, 'A dealer who wins eight hands in a row scores a yakuman for the eighth, whatever the hand.', '莊家連續和牌八次，第八次不管什麼牌型都算役滿。'],
  ['二翻縛り', 'ryanhan shibari', 'Two-han minimum', '二翻縛', false, 'From 5 repeat counters (本場) on, a win needs 2 han, not counting dora.', '從 5 本場開始，和牌至少要有 2 翻（寶牌不算）。'],
  ['ワレメ', 'wareme', 'Split wall', '割目', false, 'The player whose part of the wall the deal starts from pays and is paid double for the hand.', '發牌時從誰面前的牌山開始取牌，那位玩家這一局的支付和收入都加倍。'],
  ['焼き鳥', 'yakitori', 'Roast bird', '燒鳥', false, 'A player who wins no hand all game pays a penalty at the end. The amount varies.', '整場對局一次都沒有和牌的玩家，結束時要付罰點。金額依規則而定。'],
];

/** A han cell, with its label for a phone, where the table's head is not shown. */
function hanCell(value: string, label: string, lang: Lang): string {
  const shown = value === 'mangan' ? (lang === 'en' ? 'Mangan' : '滿貫') : value;
  return `<td class="hj-han"><span class="hj-lab">${label}</span>${shown}</td>`;
}

const yakuRows = (rows: Yaku[], lang: Lang): string => rows.map(([jp, reading, en, zh, closed, open, how, zhHow, hand]) => `
  <tr>
    <th scope="row" lang="ja">${jp}</th>
    <td class="hj-read">${reading}</td>
    <td class="hj-en">${lang === 'en' ? en : zh}</td>
    ${hanCell(closed, lang === 'en' ? 'Closed ' : '門清 ', lang)}
    ${hanCell(open, lang === 'en' ? 'Open ' : '副露 ', lang)}
    <td>${lang === 'en' ? how : zhHow}${hand ? `<span class="hj-yaku-hand">${handHtml(hand, lang)}</span>` : ''}</td>
  </tr>`).join('');

/** A table of yaku: kanji, reading, name, closed and open han, and how. */
const yakuTable = (rows: Yaku[], lang: Lang, caption = ''): string => `
  <div class="hj-table-wrap">
    <table class="hj-terms hj-yaku">
      ${caption ? `<caption>${caption}</caption>` : ''}
      <thead><tr>${(lang === 'en' ? ['Kanji', 'Reading', 'English', 'Closed', 'Open', 'How'] : ['日文', '讀音', '中文', '門清', '副露', '條件']).map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${yakuRows(rows, lang)}</tbody>
    </table>
  </div>`;

const soulMark = (soul: boolean, yes: string, lang: Lang): string => soul
  ? `<span class="hj-soul">${yes}</span>`
  : `<span class="hj-soul no">${lang === 'en' ? 'Not in Mahjong Soul\'s rules' : '雀魂規則沒有'}</span>`;

const oldYakuTable = (lang: Lang): string => `
  <div class="hj-table-wrap">
    <table class="hj-terms hj-yaku hj-old">
      <thead><tr>${(lang === 'en' ? ['Kanji', 'Reading', 'English', 'Value', 'Mahjong Soul', 'How'] : ['日文', '讀音', '中文', '翻數', '雀魂', '條件']).map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
      <tbody>${OLD_YAKU.map(([jp, reading, en, zh, value, soul, how, zhHow, hand]) => `
        <tr>
          <th scope="row" lang="ja">${jp}</th>
          <td class="hj-read">${reading}</td>
          <td class="hj-en">${lang === 'en' ? en : zh}</td>
          ${hanCell(value, lang === 'en' ? 'Value ' : '翻數 ', lang)}
          <td class="hj-han">${soulMark(soul, lang === 'en' ? 'Friend rooms' : '友人場', lang)}</td>
          <td>${lang === 'en' ? how : zhHow}${hand ? `<span class="hj-yaku-hand">${handHtml(hand, lang)}</span>` : ''}</td>
        </tr>`).join('')}</tbody>
    </table>
  </div>`;

const localRulesHtml = (lang: Lang): string => `
  <dl class="hj-rules">${LOCAL_RULES.map(([jp, reading, en, zh, soul, how, zhHow]) => `
    <div>
      <dt><b lang="ja">${jp}</b> <span class="hj-read">${reading}</span> · ${lang === 'en' ? en : zh}</dt>
      <dd>${lang === 'en' ? how : zhHow} ${soulMark(soul, lang === 'en' ? 'In Mahjong Soul' : '雀魂有', lang)}</dd>
    </div>`).join('')}
  </dl>`;

// ── The demo hand ──
// One hand played out, step by step. You sit South in East 1 (East deals), and win by Ron with
// riichi, pinfu, all simples and a red five: 4 han 30 fu, 7,700. The steps are drawn here, all
// of them; views/holodori-mahjong.ts (wireGuideDemo) shows one at a time.
const DEMO_DEAL = ['2m', '3m', '4m', '6m', '7m', '0p', '6p', '1p', '3s', '4s', '8s', '9s', '7z'];
const DEMO_DORA = '9s'; // so the dora is 1 bamboo, which nobody has
const DEMO_URA = '1p'; // so the hidden dora is 2 dots: none in the hand
const DEMO_WIN = '5s';

type DemoStep = {
  draw?: string; // the tile you draw
  discard?: string; // the tile you discard, after the draw
  riichi?: true; // the discard declares riichi
  pon?: true; // West calls Pon on your last discard
  ron?: string; // the tile you win on
  score?: true; // the result screen
  left: number; // tiles left in the wall
  jp: string; // what the game shows, or the word for the step
  reading: string;
  en: string;
  zh: string;
};

const DEMO: DemoStep[] = [
  { left: 70, jp: '配牌', reading: 'haipai',
    en: 'The deal. You sit South, so East deals: this is East 1 (<span lang="ja">東1局</span>). You have 13 tiles. The dora indicator is 9 bamboo, so the dora is 1 bamboo. You already have one run (234 characters) and a red five.',
    zh: '配牌。你坐南家，所以東家是莊家：這是東一局（<span lang="ja">東1局</span>）。你有 13 張牌。寶牌指示牌是九索，所以寶牌是一索。你已經有一組順子（234 萬）和一張赤五。' },
  { draw: '8s', left: 68, jp: '残り 68', reading: 'nokori',
    en: 'Your first draw: 8 bamboo. Now you have a pair of 8s, your head. With 14 tiles you must discard one. The counter shows the tiles left in the wall.',
    zh: '第一次摸牌：八索。現在你有一對 8 索當雀頭。手上 14 張，要打出一張。畫面上的數字是牌山剩下的牌數。' },
  { discard: '7z', left: 68, jp: '打牌', reading: 'dahai',
    en: 'Discard the lone Red dragon. One 中 alone makes no set; a pair of them would be worth keeping as a value tile.',
    zh: '打出孤張的紅中。單獨一張中組不成面子；如果是一對，就值得留著當役牌。' },
  { pon: true, left: 68, jp: 'ポン', reading: 'pon',
    en: 'West has a pair of Red dragons and calls Pon on yours. West shows the three face up, the one taken from you turned sideways, and discards. West\'s hand is open now, but a 中 triplet is a yaku.',
    zh: '西家有一對紅中，碰了你打的那張。西家把三張亮出來，從你那裡拿的那張橫放，然後打牌。西家的手牌變成副露，但中的刻子本身就是役。' },
  { draw: '4z', discard: '4z', left: 65, jp: 'ツモ切り', reading: 'tsumogiri',
    en: 'You draw North. It is neither your seat wind (South) nor the round wind (East), so it is no value tile: discard the tile you just drew.',
    zh: '你摸到北。它不是你的自風（南），也不是場風（東），所以不是役牌：直接打出剛摸到的牌（摸切）。' },
  { draw: '5m', discard: '9s', left: 61, jp: '残り 61', reading: 'nokori',
    en: 'You draw 5 characters: 567 characters is a run. Discard 9 bamboo, a terminal that fits nothing. Two runs, a pair, and two halves of runs: you are one tile from ready.',
    zh: '你摸到五萬：567 萬成為一組順子。打出九索，這張老頭牌跟什麼都搭不上。兩組順子、一組雀頭，加上兩組搭子：離聽牌只差一張。' },
  { draw: '7p', discard: '1p', riichi: true, left: 57, jp: 'リーチ', reading: 'riichi',
    en: 'You draw 7 dots: 567 dots is done, and you are ready (<span lang="ja">聴牌</span>), waiting on 2 or 5 bamboo. Press リーチ and discard the 1 dots. It is turned sideways, and you put 1,000 points on the table.',
    zh: '你摸到七筒：567 筒完成，你聽牌了（<span lang="ja">聴牌</span>），聽二索或五索。按 リーチ 並打出一筒。這張牌會橫放，你也要放 1,000 點在桌上。' },
  { draw: '9m', discard: '9m', left: 53, jp: '一発', reading: 'ippatsu',
    en: 'You draw 9 characters. It does not win, so the game discards it for you. A win before this discard would have added ippatsu, +1 han.',
    zh: '你摸到九萬。不能和牌，所以遊戲自動打出。如果在這次打牌之前和牌，就會多一個一發，+1 翻。' },
  { ron: '5s', left: 51, jp: 'ロン', reading: 'ron',
    en: 'North discards 5 bamboo: your winning tile. It is not in your own discards, so you are not furiten. Press ロン.',
    zh: '北家打出五索：正是你要的牌。你自己的捨牌裡沒有它，所以沒有振聽。按 ロン。' },
  { score: true, left: 51, jp: '和了', reading: 'agari',
    en: 'The result. Riichi, pinfu, all simples and the red five: 4 han. Pinfu by Ron is 30 fu. 4 han 30 fu is 7,700, paid by North, and you take back your riichi stick. The hidden dora indicator (1 dots: the hidden dora is 2 dots) adds nothing. A non-dealer won, so the deal moves on: next is East 2, and you deal.',
    zh: '結算。立直、平和、斷么九和赤寶牌：4 翻。平和榮和是 30 符。4 翻 30 符是 7,700 點，由北家支付，你的立直棒也拿回來。裏寶牌指示牌（一筒：裏寶牌是二筒）沒有加翻。閒家和牌，所以換莊：下一局是東二局，由你坐莊。' },
];

// What the result screen lists, as Mahjong Soul shows it.
const DEMO_YAKU: [jp: string, en: string, zh: string][] = [
  ['立直', 'Riichi', '立直'], ['平和', 'Pinfu', '平和'], ['断么九', 'All simples', '斷么九'], ['赤ドラ', 'Red five', '赤寶牌'],
];

/** Tiles in the order a hand is shown: characters, dots, bamboo, honours, a red five as a five. */
const sortTiles = (tiles: string[]): string[] => [...tiles].sort((a, b) =>
  'mpsz'.indexOf(a[1]) - 'mpsz'.indexOf(b[1]) || (Number(a[0]) || 5) - (Number(b[0]) || 5) || Number(a[0]) - Number(b[0]));

const tilesHtml = (tiles: string[], lang: Lang): string => tiles.map(code => tileHtml(code, lang)).join('');

/** A tile turned sideways: a riichi discard, or the tile a call took. */
const sideTile = (code: string, lang: Lang): string => `<span class="hj-side">${tileHtml(code, lang)}</span>`;

function demoHtml(lang: Lang, t: (en: string, zh: string) => string): string {
  let hand = [...DEMO_DEAL];
  const river: { tile: string; side: boolean }[] = [];
  let west = false;
  let points = 25000;
  const steps = DEMO.map((step, i) => {
    let drawn = '';
    if (step.draw) { hand.push(step.draw); drawn = step.draw; }
    if (step.discard) {
      hand.splice(hand.indexOf(step.discard), 1);
      river.push({ tile: step.discard, side: Boolean(step.riichi) });
      drawn = '';
      if (step.riichi) points -= 1000;
    }
    if (step.pon) west = true;
    if (step.score) points += 7700 + 1000;
    const last = step.discard ? river.length - 1 : -1;
    // The tile just drawn, or the winning tile, stands apart from the hand.
    const shown = sortTiles(drawn ? hand.filter((_, k) => k !== hand.lastIndexOf(drawn)) : hand);
    const win = step.ron || (step.score ? DEMO_WIN : '');
    const extra = drawn || win;
    const riverHtml = river.map(({ tile, side }, k) => {
      const face = side ? sideTile(tile, lang) : tileHtml(tile, lang);
      return k === last ? `<span class="hj-new">${face}</span>` : face;
    }).join('');
    const result = step.score ? `
          <div class="hj-demo-result">
            <p class="hj-demo-ind"><span>${t('Dora indicator', '寶牌指示牌')} ${tileHtml(DEMO_DORA, lang)}</span><span>${t('Hidden dora indicator', '裏寶牌指示牌')} ${tileHtml(DEMO_URA, lang)}</span></p>
            <ul class="hj-demo-yaku">${DEMO_YAKU.map(([jp, en, zh]) => `<li><b lang="ja">${jp}</b> <span>${t(en, zh)}</span> <em>1 <span lang="ja">翻</span></em></li>`).join('')}</ul>
            <p class="hj-demo-total"><span lang="ja">30符 4翻</span> <b>${ronPoints(30, 4, false)}</b> <span lang="ja">点</span></p>
            <p class="hj-demo-pay">${t('You (South)', '你（南家）')} 24,000 → 32,700 <b>+8,700</b> · ${t('North', '北家')} 25,000 → 17,300 <b class="minus">−7,700</b></p>
          </div>` : '';
    return `
        <li class="hj-demo-step"${i ? ' hidden' : ''}>
          <p class="hj-demo-table"><span lang="ja">東1局 0本場</span><span><span lang="ja">残り</span> ${step.left}</span><span>${t('Dora indicator', '寶牌指示牌')} ${tileHtml(DEMO_DORA, lang)}</span><span>${t('Your points', '你的點數')} ${points.toLocaleString('en-US')}${points < 25000 ? ` <small>${t('(1,000 on the table)', '（1,000 點在桌上）')}</small>` : ''}</span></p>
          <p class="hj-demo-row"><span class="hj-demo-who">${t('Calls', '副露')}</span>${west ? `${t('West', '西家')} ${sideTile('7z', lang)}${tileHtml('7z', lang)}${tileHtml('7z', lang)}` : `<small>${t('none yet', '還沒有')}</small>`}</p>
          <p class="hj-demo-row"><span class="hj-demo-who">${t('Your discards', '你的捨牌')}</span>${riverHtml || `<small>${t('none yet', '還沒有')}</small>`}</p>
          <div class="hj-demo-row hj-demo-hand"><span class="hj-demo-who">${t('Your hand', '你的手牌')}</span><span class="hj-row">${tilesHtml(shown, lang)}</span>${extra ? `<span class="hj-demo-extra${win ? ' win' : ''}">${tileHtml(extra, lang)}</span>` : ''}</div>
          ${result}
          <p class="hj-demo-cap"><span class="hj-btn" lang="ja">${step.jp}</span> <span class="hj-read">${step.reading}</span> ${t(step.en, step.zh)}</p>
        </li>`;
  }).join('');
  return `
        <div class="hj-demo" data-hj-demo tabindex="0" aria-label="${t('Demo hand: arrow keys step through it', '示範牌局：用方向鍵前後切換')}">
          <div class="hj-demo-nav">
            <button type="button" class="seg-btn" data-hj-step="-1" disabled>‹ ${t('Back', '上一步')}</button>
            <span class="hj-demo-count" aria-live="polite"><b>1</b> / ${DEMO.length}</span>
            <button type="button" class="seg-btn on" data-hj-step="1">${t('Next', '下一步')} ›</button>
          </div>
          <ol class="hj-demo-steps">${steps}</ol>
        </div>`;
}

// ── Getting the game, and the pre-registration rewards ──
// From COVER's press release of 9 October 2026, the official campaign page and the official
// site's notices of 24 and 25 November. The 40万 and 50万 tiers are on the campaign page only.
const STORE = {
  ios: 'https://apps.apple.com/jp/app/id6762111285',
  android: 'https://play.google.com/store/apps/details?id=com.aiming.hololive.mahjong',
  browser: 'https://www.holo-jong.com/information/important/ujjxqxwnol/',
  x: 'https://x.com/hololivemahjong',
  site: 'https://www.holo-jong.com/',
  campaign: 'https://www.holo-jong.com/pre-registration/',
  news: 'https://hololivepro.com/news/20261009-01-309/',
};

const MILESTONES: [count: string, en: string, reward: string, zhReward: string][] = [
  ['10万', '100,000', 'Social icon; table skins for Gen 0–2 and hololive GAMERS', '社群頭像；0–2 期生和 hololive GAMERS 的牌桌造型'],
  ['20万', '200,000', 'Social icon; table skins for Gen 3–5', '社群頭像；3–5 期生的牌桌造型'],
  ['30万', '300,000', 'Social icon; table skins for holoX, ReGLOSS and FLOW GLOW; a draw for a mahjong-magazine-style notebook', '社群頭像；holoX、ReGLOSS 和 FLOW GLOW 的牌桌造型；抽獎送麻將雜誌風格的筆記本'],
  ['40万', '400,000', 'Key-visual table skin; a draw for 25 mahjong mats and life-size panels (5 of each of 4 kinds)', '主視覺牌桌造型；抽獎送 25 份麻將墊和等身立牌（4 款各 5 份）'],
  ['50万', '500,000', 'A special ASMR voice of Hakui Koyori and Ichijou Ririka, in the in-game news after launch', '博衣こより和一条莉々華的特別 ASMR 語音，上市後在遊戲內公告發放'],
];

const out = (href: string, text: string): string => `<a href="${escHtml(href)}" target="_blank" rel="noopener">${text}</a>`;

// The pages of the guide, each a section the contents link to.
const SECTIONS: [id: string, name: string, zh: string][] = [
  ['about', 'The game', '遊戲介紹'],
  ['register', 'Get the game', '下載遊戲'],
  ['tiles', 'The tiles', '麻將牌'],
  ['hand', 'A winning hand', '和牌的手牌'],
  ['turn', 'Your turn', '你的回合'],
  ['riichi', 'Riichi and furiten', '立直與振聽'],
  ['yaku', 'Yaku', '役'],
  ['score', 'Points and the game', '點數與對局'],
  ['demo', 'A hand, step by step', '示範牌局'],
  ['all', 'Every yaku', '全部的役'],
  ['old', 'Old yaku', '古役'],
  ['local', 'Local rules', '地方規則'],
  ['tips', 'Tips', '小技巧'],
  ['screen', 'On screen', '畫面用語'],
];

const range = (suit: string): string[] => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${suit}`);

/** The guide in one language. Each section's id carries the language, since both are on the page. */
// Ron points by fu (rows) and han (columns), non-dealer then dealer: base = fu × 2^(han+2), ×4 or ×6, rounded up
// to 100, capped at mangan (base 2,000). Mahjong Soul rounds no 4-han 30-fu or 3-han 60-fu hand up to mangan.
const SCORE_FU = [25, 30, 40, 50, 60, 70];
function ronPoints(fu: number, han: number, dealer: boolean): string {
  if (fu === 25 && han === 1) return '—';
  const base = Math.min(fu * 2 ** (han + 2), 2000);
  return (Math.ceil((base * (dealer ? 6 : 4)) / 100) * 100).toLocaleString('en-US');
}

const LIMITS: [string, string, string, string, string][] = [
  ['5', '満貫', 'mangan', '滿貫', '8,000 / 12,000'],
  ['6–7', '跳満', 'haneman', '跳滿', '12,000 / 18,000'],
  ['8–10', '倍満', 'baiman', '倍滿', '16,000 / 24,000'],
  ['11–12', '三倍満', 'sanbaiman', '三倍滿', '24,000 / 36,000'],
  ['13+', '役満', 'yakuman', '役滿', '32,000 / 48,000'],
];

function scoreChartHtml(t: (en: string, zh: string) => string): string {
  const head = [1, 2, 3, 4].map(h => `<th scope="col">${h} ${t('han', '翻')}</th>`).join('');
  const rows = SCORE_FU.map(fu => `<tr><th scope="row">${fu} ${t('fu', '符')}</th>${[1, 2, 3, 4]
    .map(h => `<td>${ronPoints(fu, h, false)}<small>${ronPoints(fu, h, true)}</small></td>`).join('')}</tr>`).join('');
  const limits = LIMITS.map(([han, jp, reading, zh, pts]) =>
    `<tr><th scope="row">${han} ${t('han', '翻')}</th><td>${t(`<span lang="ja">${jp}</span> ${reading}`, zh)}</td><td>${pts}</td></tr>`).join('');
  return `<aside class="hj-score-chart">
          <p>${t(`<b>Han × fu.</b> Fu start at 20; a closed Ron adds 10, a Tsumo 2, and triplets, quads and some waits add
          more; round up to the next 10. Seven pairs is always 25. Then <b>base = fu × 2<sup>han + 2</sup></b>, and Ron
          pays base × 4 (dealer × 6), rounded up to 100.`,
          `<b>翻 × 符。</b>符從 20 起算；門清榮和加 10，自摸加 2，刻子、槓子和部分聽牌型再加；最後進位到 10。
          七對子固定 25 符。<b>基本點 = 符 × 2<sup>翻 + 2</sup></b>，榮和得基本點 × 4（莊家 × 6），進位到 100。`)}</p>
          <table class="hj-terms hj-points">
            <caption>${t('Ron points: non-dealer, <small>dealer</small>', '榮和點數：閒家，<small>莊家</small>')}</caption>
            <thead><tr><td></td>${head}</tr></thead><tbody>${rows}</tbody>
          </table>
          <p class="hj-note">${t(`Base stops at 2,000: that is mangan, 8,000. So 4 han 30 fu is 7,700 by Ron, and 2,000 / 3,900 =
          7,900 by Tsumo, not quite mangan; 4 han 40 fu reaches it. From 5 han the fu no longer count:`,
          `基本點上限是 2,000，也就是滿貫 8,000 點。所以 4 翻 30 符榮和是 7,700，自摸是 2,000 / 3,900 = 7,900，
          還不到滿貫；4 翻 40 符就到滿貫。5 翻以上不再看符：`)}</p>
          <table class="hj-terms hj-points hj-limits">
            <caption>${t('Limit hands: non-dealer / dealer', '滿貫以上：閒家 / 莊家')}</caption>
            <tbody>${limits}</tbody>
          </table>
        </aside>`;
}

function guideHtml(lang: Lang): string {
  // The page's words, English or Chinese. Chinese runs on with no spaces, so its line breaks here
  // are taken out: a browser shows each one as a space.
  const t = (en: string, zh: string): string => (lang === 'en' ? en : zh.replace(/\s*\n\s*/g, ''));
  const id = (section: string): string => (lang === 'en' ? `hj-${section}` : `hj-zh-${section}`);
  const tileRow = (codes: string[], label: string, jp: string, reading: string): string => `
    <div class="hj-suit">
      <p class="hj-suit-name"><b lang="ja">${jp}</b> <span>${reading}</span> · ${label}</p>
      <div class="hj-row">${codes.map(code => tileHtml(code, lang)).join('')}</div>
    </div>`;
  const hand = (tiles: string): string => handHtml(tiles, lang);

  return `<div class="hj-guide">
      <header class="hd-head hj-head">
        <p class="hj-kicker" lang="ja">ホロライブ麻雀 -ホロじゃん-</p>
        <h2 class="hd-title">${t('Holojang: a beginner\'s guide', 'Holojang 新手指南')}</h2>
        <p class="hd-sub">${t('How to get it, how to play Japanese mahjong, and what the Japanese on the screen says', '怎麼下載、怎麼打日本麻將，以及畫面上的日文是什麼意思')}</p>
      </header>

      <nav class="hj-toc" aria-label="${t('Guide contents', '指南目錄')}">
        ${SECTIONS.map(([section, name, zh], i) => `<a href="#${id(section)}"><span>${i + 1}</span>${t(name, zh)}</a>`).join('')}
      </nav>

      <section class="hj-card" id="${id('about')}">
        <h3 class="hm-head">${t('The game', '遊戲介紹')}</h3>
        <dl class="hj-facts">
          <div><dt>${t('Title', '名稱')}</dt><dd><span lang="ja">ホロライブ麻雀 -ホロじゃん-</span> (hololive Mahjong -Holojang-)</dd></div>
          <div><dt>${t('Made by', '開發')}</dt><dd>${t('COVER and Aiming', 'COVER 與 Aiming')}</dd></div>
          <div><dt>${t('Release', '上市')}</dt><dd>${t('Out now: 25 November 2026, 12:00 Japan time', '已上市：2026 年 11 月 25 日 12:00（日本時間）')}</dd></div>
          <div><dt>${t('Platforms', '平台')}</dt><dd>${t('iOS, Android and Windows. The browser version is delayed, with no new date.', 'iOS、Android 和 Windows。網頁版延期，尚未公布新日期。')}</dd></div>
          <div><dt>${t('Price', '價格')}</dt><dd>${t('Free to play, with in-game purchases', '免費遊玩，有遊戲內購買')}</dd></div>
          <div><dt>${t('Talent', '成員')}</dt><dd>${t('37: Gen 0–5, hololive GAMERS, holoX, ReGLOSS and FLOW GLOW', '37 位：0–5 期生、hololive GAMERS、holoX、ReGLOSS 和 FLOW GLOW')}</dd></div>
          <div><dt>${t('Language', '語言')}</dt><dd>${t('Japanese. No English version is announced.', '日文。尚未宣布英文版。')}</dd></div>
        </dl>
        <p>${t(`It is a mahjong game to play with your oshi: new voice lines, stamps to send during a match,
        an original story, single-player, friend matches, tournaments, spectating and replays. A tutorial teaches
        the controls and the basic rules; then you play the computer, then other players online, in East-only
        (<span lang="ja">東風戦</span>) or half games (<span lang="ja">半荘戦</span>), and there is three-player mahjong
        (<span lang="ja">三人麻雀</span>).`,
        `這是一款和你的推し一起打的麻將遊戲：全新語音、對局中可以傳送的貼圖、原創故事、單人遊戲、
        友人戰、大會、觀戰和牌譜。先有教學說明操作和基本規則，接著和電腦對戰，再和線上玩家對戰，
        有東風戰和半莊戰，也有三人麻將。`)}</p>
        <p>${t(`<b>Beginner assist</b> (<span lang="ja">初心者アシスト</span>) suggests a discard, marks the tiles that are
        dangerous or safe to discard, counts how many tiles you are from ready (shanten), and suggests yaku. Each part can
        be turned off on its own. The official pages still do not list the rule set. This guide teaches standard Japanese
        (riichi) mahjong, the rules Mahjong Soul uses, which is almost certainly what Holojang plays.`,
        `<b>新手輔助</b>（<span lang="ja">初心者アシスト</span>）會建議要打的牌、標出危險牌和安全牌、
        顯示向聽數，並建議可以做的役。每一項都可以分別關閉。官方頁面仍然沒有列出規則。本指南教的是
        標準的日本（立直）麻將，也就是雀魂（Mahjong Soul）的規則，Holojang 幾乎可以確定也是這一套。`)}</p>
      </section>

      <section class="hj-card" id="${id('register')}">
        <h3 class="hm-head">${t('Get the game', '下載遊戲')}</h3>
        <p>${t('It is free to download on every platform.', '每個平台都可以免費下載。')}</p>
        <ol class="hj-steps">
          <li>
            <b>${t('iPhone or iPad', 'iPhone 或 iPad')}</b>
            <p>${t(`Open the ${out(STORE.ios, 'App Store page')} and tap <span class="hj-btn" lang="ja">入手</span> (Get).`,
            `打開 ${out(STORE.ios, 'App Store 頁面')}，點 <span class="hj-btn" lang="ja">入手</span>（取得）。`)}</p>
          </li>
          <li>
            <b>Android</b>
            <p>${t(`Open the ${out(STORE.android, 'Google Play page')} and tap <span class="hj-btn" lang="ja">インストール</span>
            (Install).`,
            `打開 ${out(STORE.android, 'Google Play 頁面')}，點 <span class="hj-btn" lang="ja">インストール</span>（安裝）。`)}</p>
          </li>
          <li>
            <b>Windows</b>
            <p>${t(`On the ${out(STORE.site, 'official site')}, press <span class="hj-btn" lang="ja">Windows版をダウンロード</span>
            (Download for Windows) and run the installer it gives you.`,
            `在${out(STORE.site, '官方網站')}按 <span class="hj-btn" lang="ja">Windows版をダウンロード</span>（下載 Windows 版），
            再執行下載的安裝程式。`)}</p>
          </li>
          <li>
            <b>${t('Browser', '瀏覽器')}</b>
            <p>${t(`Not out: it was due on 25 November and was ${out(STORE.browser, 'delayed')} with no new date.`,
            `尚未推出：原定 11 月 25 日上市，已${out(STORE.browser, '延期')}，尚未公布新日期。`)}</p>
          </li>
          <li>
            <b>X (Twitter)</b>
            <p>${t(`Follow ${out(STORE.x, '@hololivemahjong')} for news and campaigns. Its goods draws are among its
            followers, with winners told by direct message. Goods ship in Japan only.`,
            `追蹤 ${out(STORE.x, '@hololivemahjong')} 取得消息和活動資訊。周邊抽獎從追蹤者中抽出，
            得獎者會收到私訊通知。周邊只寄送日本國內。`)}</p>
          </li>
        </ol>
        <p class="hj-note">${t(`<b>Outside Japan:</b> the store pages are Japan's. If one says the app is not
        available in your country, the game is not on your region's store. The official pages do not
        say whether it will be released outside Japan.`,
        `<b>日本以外：</b>商店頁面是日本區的。如果頁面顯示這個 App 在你的國家或地區無法使用，
        就是遊戲沒有在你所在地區的商店上架。官方頁面沒有說明會不會在日本以外推出。`)}</p>

        <h4 class="hj-sub">${t('Pre-registration rewards', '事前登錄獎勵')}</h4>
        <p>${t(`Pre-registration ran from 9 October to launch. Every tier it reached is given to everyone who registered,
        once each, in the game; the in-game notices (<span lang="ja">お知らせ</span>) say how to collect it.`,
        `事前登錄從 10 月 9 日開始，到上市為止。達成的每一階獎勵都會在遊戲內發給所有登錄的人，每人一次；
        領取方法見遊戲內公告（<span lang="ja">お知らせ</span>）。`)}</p>
        <div class="hj-table-wrap">
          <table class="hj-terms hj-milestones">
            <thead><tr><th scope="col">${t('Registrations', '登錄人數')}</th><th scope="col">${t('Reward', '獎勵')}</th></tr></thead>
            <tbody>${MILESTONES.map(([jp, en, reward, zhReward]) => `<tr><th scope="row"><span lang="ja">${jp}</span> <small>${en}</small></th><td>${t(reward, zhReward)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <p class="hj-note">${t(`<span lang="ja">万</span> (man) is 10,000, so <span lang="ja">10万人</span> is 100,000 people.
        The official X account reported more than 400,000 registrations before launch; the official pages do not give
        the final count. Details on the ${out(STORE.campaign, 'campaign page')} (Japanese).`,
        `日文的 <span lang="ja">万</span>（man）就是「萬」，所以 <span lang="ja">10万人</span> 是十萬人。
        官方 X 帳號在上市前公布登錄人數已超過 40 萬；官方頁面沒有公布最終人數。詳情見${out(STORE.campaign, '活動頁面')}（日文）。`)}</p>
      </section>

      <section class="hj-card" id="${id('tiles')}">
        <h3 class="hm-head">${t('The tiles', '麻將牌')}</h3>
        <p>${t(`There are 136 tiles: three suits numbered 1 to 9, and seven honour tiles, four of each. Your hand
        is 13 tiles. The number on a characters tile is written in kanji, so learn <b>一 to 九</b> first.`,
        `麻將共有 136 張牌：三種數牌各有 1 到 9，加上七種字牌，每種各 4 張。你的手牌是 13 張。
        萬子上的數字用漢字 <b>一 到 九</b> 書寫。`)}</p>
        ${tileRow(range('m'), t('Characters', '萬：一萬到九萬'), '萬子', 'manzu')}
        <p class="hj-numerals">${NUMERALS.slice(1).map((k, i) => `<span><b lang="ja">${k}</b> ${i + 1}</span>`).join('')}</p>
        ${tileRow(range('p'), t('Dots (circles)', '筒：又叫餅'), '筒子', 'pinzu')}
        ${tileRow(range('s'), t('Bamboo', '索：又叫條'), '索子', 'souzu')}
        <p>${t(`<b>Honour tiles</b> (<span lang="ja">字牌</span>, jihai, "letter tiles") are the seven tiles with no number:
        the four <b>winds</b> and the three <b>dragons</b>. "Dragon" is only the English name. Japanese and Chinese call
        the three <span lang="ja">三元牌</span> (sangenpai), "the three cardinal tiles".`,
        `<b>字牌</b>（jihai）是沒有數字的七種牌：四種<b>風牌</b>和三種<b>三元牌</b>。英文把三元牌叫作
        Dragon（龍），但中文和日文都沒有「龍」這個叫法。`)}</p>
        ${tileRow(['1z', '2z', '3z', '4z'], t('Winds: East, South, West, North', '東風、南風、西風、北風'), '風牌', 'kazehai')}
        ${tileRow(['5z', '6z', '7z'], t('Dragons: White, Green, Red', '白板、發財、紅中'), '三元牌', 'sangenpai')}
        ${tileRow(['0m', '0p', '0s'], t('Red fives: each one is a bonus dora', '赤寶牌：每張紅 5 都是一張寶牌'), '赤ドラ', 'aka dora')}
        <p class="hj-note">${t(`The winds read <b lang="ja">東</b> ton, <b lang="ja">南</b> nan, <b lang="ja">西</b> shaa,
        <b lang="ja">北</b> pei; the dragons <b lang="ja">白</b> haku (white: a blank tile), <b lang="ja">發</b> hatsu
        (from <span lang="ja">發財</span>, "get rich"), <b lang="ja">中</b> chun ("centre", or "hit the mark").
        The 1s and 9s of all three suits (characters, dots and bamboo) are the terminals; terminals and honours together are
        <span lang="ja">么九牌</span> (yaochuuhai).
        Tiles drawn here in a standard style; not Holojang's own tile art.`,
        `風牌讀作 <b lang="ja">東</b> ton、<b lang="ja">南</b> nan、<b lang="ja">西</b> shaa、<b lang="ja">北</b> pei；
        三元牌是 <b lang="ja">白</b> haku（白板，空白的牌）、<b lang="ja">發</b> hatsu（發財）、<b lang="ja">中</b> chun（紅中）。
        萬、筒、索三種數牌的 1 和 9 都是「老頭牌」；老頭牌加上字牌，合稱「么九牌」（yaochuuhai）。
        這裡的牌是標準樣式，不是 Holojang 自己的牌面。`)}</p>
      </section>

      <section class="hj-card" id="${id('hand')}">
        <h3 class="hm-head">${t('A winning hand', '和牌的手牌')}</h3>
        <p>${t(`You win with 14 tiles: <b>four sets and one pair</b>, and at least one <b>yaku</b> (a scoring
        pattern, below). A set is one of:`,
        `和牌需要 14 張：<b>四組面子加一組雀頭</b>，而且至少要有一個<b>役</b>（得分牌型，見下文）。面子有以下幾種：`)}</p>
        <ul class="hj-sets">
          <li>${hand('345p')}<span class="hj-set-name"><b lang="ja">順子</b><small>shuntsu</small></span><span>${t('<b>Run</b>: three in a row in one suit. Never honours.', '同一花色的三張連續數字。字牌不能組成順子。')}</span></li>
          <li>${hand('777s')}<span class="hj-set-name"><b lang="ja">刻子</b><small>koutsu</small></span><span>${t('<b>Triplet</b>: three of the same tile.', '三張相同的牌。')}</span></li>
          <li>${hand('1111z')}<span class="hj-set-name"><b lang="ja">槓子</b><small>kantsu</small></span><span>${t('<b>Quad</b>: four of the same, made with Kan.', '四張相同的牌，用「槓」組成。')}</span></li>
          <li>${hand('55m')}<span class="hj-set-name"><b lang="ja">雀頭</b><small>jantou</small></span><span>${t('<b>Pair</b>: the hand\'s one pair, its "head".', '手牌裡唯一的一組對子，也就是「頭」，台灣俗稱「眼睛」。')}</span></li>
        </ul>
        <p>${t('A complete hand, all simples (tanyao):', '一副完整的手牌，斷么九（tanyao）：')}</p>
        <div class="hj-example">${hand('234m 678m 345p 456s 88s')}</div>
        <p class="hj-note">${t(`Two exceptions do not use sets: seven pairs (<span lang="ja">七対子</span>) and thirteen orphans (<span lang="ja">国士無双</span>).`,
        `有兩個例外不用面子：七對子（<span lang="ja">七対子</span>）和國士無雙（<span lang="ja">国士無双</span>）。`)}</p>
      </section>

      <section class="hj-card" id="${id('turn')}">
        <h3 class="hm-head">${t('Your turn', '你的回合')}</h3>
        <ol class="hj-steps">
          <li><b>${t('Draw', '摸牌')}</b><p>${t('Take one tile from the wall (automatic in the app).', '從牌山摸一張牌（App 會自動進行）。')}</p></li>
          <li><b>${t('Discard', '打牌')}</b><p>${t('Throw away one tile, face up, in front of you. Pick the tile that helps your hand least.', '打出一張牌，正面朝上放在你面前。選對手牌幫助最小的那一張。')}</p></li>
          <li><b>${t('Calls', '鳴牌')}</b><p>${t(`When someone discards, buttons may appear: <span class="hj-btn" lang="ja">チー</span> to take it for a run (only
          from the player on your left), <span class="hj-btn" lang="ja">ポン</span> for a triplet, <span class="hj-btn" lang="ja">カン</span> for a quad,
          <span class="hj-btn" lang="ja">ロン</span> to win on it. Press <span class="hj-btn" lang="ja">スキップ</span> to pass.`,
          `有人打牌時，可能會出現按鈕：<span class="hj-btn" lang="ja">チー</span> 吃牌組成順子（只能吃左邊玩家的牌），
          <span class="hj-btn" lang="ja">ポン</span> 碰牌組成刻子，<span class="hj-btn" lang="ja">カン</span> 槓牌組成槓子，
          <span class="hj-btn" lang="ja">ロン</span> 榮和。按 <span class="hj-btn" lang="ja">スキップ</span> 跳過。`)}</p></li>
          <li><b>${t('Win', '和牌')}</b><p>${t('When you draw the tile that completes your hand, press <span class="hj-btn" lang="ja">ツモ</span>.', '摸到完成手牌的那張牌時，按 <span class="hj-btn" lang="ja">ツモ</span>（自摸）。')}</p></li>
        </ol>
        <p class="hj-note">${t(`<b>Calling opens your hand</b> (<span lang="ja">鳴き</span>, naki). An open hand cannot riichi,
        loses some yaku and is worth less. A beginner does best to keep the hand closed and call Pon only on value
        tiles (White, Green, Red, or your wind), which are a yaku by themselves.`,
        `<b>鳴牌會讓手牌變成副露</b>（<span lang="ja">鳴き</span>, naki）。副露的手牌不能立直，會失去一些役，
        分數也比較低。新手最好保持門清，只在役牌（白、發、中或你的風）上碰牌，因為它們本身就是一個役。`)}</p>
      </section>

      <section class="hj-card" id="${id('riichi')}">
        <h3 class="hm-head">${t('Riichi and furiten', '立直與振聽')}</h3>
        <p>${t(`<b lang="ja">リーチ</b> (riichi): when your hand is closed and one tile from winning (tenpai), you can declare riichi
        and put down 1,000 points (so you need at least 1,000). From then on you cannot change your hand: the game discards every tile you draw unless
        it wins. It is a yaku, so <b>any</b> complete closed hand can win with it, and if you win you may also get
        ippatsu and hidden dora.`,
        `<b lang="ja">リーチ</b>（立直）：當你的手牌門清、只差一張就能和牌（聽牌）時，可以宣告立直並放出 1,000 點（所以手上至少要有 1,000 點）。
        之後你不能再改變手牌：除非摸到的牌能和牌，否則遊戲會自動打出。立直本身是一個役，所以<b>任何</b>
        完整的門清手牌都能靠它和牌；和牌時還可能得到一發和裏寶牌。`)}</p>
        <p>${t(`<b lang="ja">振聴</b> (furiten): if a tile that would complete your hand is in <b>your own discards</b>, you cannot win
        on another player's discard (Ron). You can still win by drawing it yourself (Tsumo). The app marks it for you.
        Two more cases: if you let a winning tile pass, you cannot Ron until your next discard; after riichi, a winning
        tile you let pass makes you furiten for the rest of the hand.`,
        `<b lang="ja">振聴</b>（振聽）：如果能完成你手牌的牌在<b>你自己的捨牌</b>裡，你就不能榮和別人打出的牌。
        你仍然可以自摸。App 會替你標示。另外兩種：別人打出你能和的牌而你沒有和（同巡振聽），
        到你下一次打牌前都不能榮和；立直後沒有和能和的牌（立直振聽），這一局剩下的時間都不能榮和。`)}</p>
        <div class="hj-example">
          <p>${t('Waiting on 3 or 6 dots with this hand. If you discarded a 6 dots earlier, you are furiten:', '這副手牌聽 3 筒或 6 筒。如果你之前打過 6 筒，就是振聽：')}</p>
          ${hand('123m 456m 789s 45p 77z')}
        </div>
      </section>

      <section class="hj-card hj-wide" id="${id('yaku')}">
        <h3 class="hm-head">${t('Yaku <small>the twelve to learn first</small>', '役 <small>先學這十二個</small>')}</h3>
        <p>${t(`A hand with no yaku cannot win, even if it is complete. Dora are bonus han, not yaku. "Open" is the value after
        a call; "—" means the yaku needs a closed hand.`,
        `沒有役的手牌，就算完整也不能和牌。寶牌是額外的翻數，不是役。台灣麻將的「台」也不是役：
        莊家、連莊、中洞（嵌張）在日麻都不能讓你和牌。「副露」是鳴牌後的翻數；
        「—」表示這個役必須門清。`)}</p>
        ${yakuTable(YAKU, lang)}
      </section>

      <section class="hj-card hj-wide" id="${id('score')}">
        <h3 class="hm-head">${t('Points and the game', '點數與對局')}</h3>
        <div class="hj-score">
        <ul class="hj-list">
          <li>${t(`Everyone starts with <b>25,000</b> points. A full game (<span lang="ja">半荘</span>, hanchan) is an East round and a South
          round, four hands or more each. Highest points at the end is 1st.`,
          `每人起始 <b>25,000</b> 點。一場完整的對局（<span lang="ja">半荘</span>，半莊）有東場和南場，各四局以上。
          結束時點數最高的人是第一名。`)}</li>
          <li>${t(`A win's value is its <b>han</b> (from yaku and dora) and <b>fu</b>. The app counts both: you only need to know
          that more han is more points, and 5 han is a mangan, 8,000.`,
          `和牌的分數由<b>翻</b>（來自役和寶牌）和<b>符</b>決定。App 會自動計算：你只要知道翻越多分數越高，
          5 翻是滿貫，8,000 點。`)}</li>
          <li>${t(`The <b>dealer</b> (<span lang="ja">親</span>) wins 1.5 times as much. When another player wins by Tsumo, the dealer pays a double share; on a Ron the dealer pays the
          normal value. The dealer stays
          dealer after a win or a ready draw; otherwise the next player deals.`,
          `<b>莊家</b>（<span lang="ja">親</span>）和牌得 1.5 倍。別人自摸時，莊家付雙倍的份；放銃時照一般點數支付。莊家和牌或流局時聽牌就連莊；
          否則由下一位玩家坐莊。`)}</li>
          <li>${t('When the wall runs out, players who are <b>not</b> ready (<span lang="ja">ノーテン</span>) pay 3,000 in all to those who are.',
          '牌山摸完時，<b>沒有</b>聽牌的玩家（<span lang="ja">ノーテン</span>）共付 3,000 點給聽牌的玩家。')}</li>
          <li>${t('Below 0 points, the game usually ends at once.', '點數低於 0 時，對局通常立刻結束。')}</li>
        </ul>
        ${scoreChartHtml(t)}
        </div>
      </section>

      <section class="hj-card hj-wide" id="${id('demo')}">
        <h3 class="hm-head">${t('A hand, step by step', '示範牌局')}</h3>
        <p>${t(`One hand played out, from the deal to the result screen: a replay, not a game. Press Next and Back, or
        the arrow keys. The yellow label is what the game shows at that step, or the Japanese word for it.`,
        `從配牌到結算，完整打一局：這是重播，不是對戰。按「下一步」和「上一步」，或用方向鍵切換。
        黃色標籤是遊戲在這一步顯示的文字，或這一步的日文說法。`)}</p>
        ${demoHtml(lang, t)}
      </section>

      <section class="hj-card hj-wide" id="${id('all')}">
        <h3 class="hm-head">${t('Every yaku <small><span lang="ja">役一覧</span></small>', '全部的役 <small><span lang="ja">役一覧</span></small>')}</h3>
        <p>${t(`Every standard yaku, as Mahjong Soul's ranked rules play them. Six lose 1 han when the hand is open
        (<span lang="ja">食い下がり</span>, kuisagari): three-colour run, straight, both outside hands and both flushes.
        Yaku add up: riichi, all simples and pinfu in one hand are 3 han. Holojang's official pages do not list its
        rule set, so some of these may not apply.`,
        `所有標準的役，以雀魂段位戰的規則為準。有六個役副露時少 1 翻（<span lang="ja">食い下がり</span>，食下）：
        三色同順、一氣通貫、混全帶么九、純全帶么九、混一色和清一色。役可以疊加：一副手牌同時有立直、
        斷么九和平和就是 3 翻。Holojang 的官方頁面沒有列出規則，所以有些役可能不適用。`)}</p>
        ${YAKU_GROUPS.map(([en, zh, rows]) => yakuTable(rows, lang, t(en, zh))).join('')}
        <p class="hj-note">${t(`In Mahjong Soul two yakuman in one hand add up, as do the double ones, and 13 han or more of other yaku is
        paid as a yakuman (<span lang="ja">数え役満</span>). Other rule sets count the four double yakuman as single ones.`,
        `雀魂裡一副手牌有兩個役滿會累加，雙倍役滿也一樣；其他役累計 13 翻以上也當作役滿支付（<span lang="ja">数え役満</span>）。
        有些規則把那四個雙倍役滿只算一倍。`)}</p>
      </section>

      <section class="hj-card hj-wide" id="${id('old')}">
        <h3 class="hm-head">${t('Old yaku <small><span lang="ja">古役</span> koyaku</small>', '古役 <small><span lang="ja">古役</span> koyaku</small>')}</h3>
        <p>${t(`Yaku from older rule books and house rules. Mahjong Soul plays the first fourteen in friend rooms only, not in
        ranked; the rest are not in its rules at all. Values differ from one rule set to the next. Holojang's official pages do
        not list its rule set, so none of these may apply.`,
        `來自舊規則書和地方規則的役。雀魂只在友人場採用前十四個，段位戰沒有；其餘的雀魂規則完全沒有。
        各家規則的翻數不同。Holojang 的官方頁面沒有列出規則，所以這些役可能都不適用。`)}</p>
        ${oldYakuTable(lang)}
      </section>

      <section class="hj-card" id="${id('local')}">
        <h3 class="hm-head">${t('Local rules', '地方規則')}</h3>
        <p>${t(`Rules that differ between rule sets, and whether Mahjong Soul's ranked games use them. Holojang's official pages do
        not list its own.`,
        `各家規則不同的地方，以及雀魂段位戰有沒有採用。Holojang 的官方頁面沒有列出它的規則。`)}</p>
        ${localRulesHtml(lang)}
      </section>

      <section class="hj-card" id="${id('tips')}">
        <h3 class="hm-head">${t('Tips for a first game', '第一場對局的小技巧')}</h3>
        <ol class="hj-list">
          <li>${t('<b>Discard lone honours and 1s and 9s first.</b> They make fewer runs. Keep a pair of value tiles.',
          '<b>先打孤張的字牌和 1、9。</b>它們比較難組成順子。役牌的對子要留著。')}</li>
          <li>${t('<b>Aim for riichi or tanyao.</b> Keep the hand closed, get ready, declare riichi.',
          '<b>以立直或斷么九為目標。</b>保持門清、聽牌、宣告立直。')}</li>
          <li>${t(`<b>Defend after a riichi.</b> When another player declares riichi and your hand is far from ready, discard tiles
          that player has already discarded (<span lang="ja">現物</span>, genbutsu). They cannot win on those.`,
          `<b>有人立直後要防守。</b>當別人立直而你的手牌離聽牌還很遠時，打那位玩家已經打過的牌
          （<span lang="ja">現物</span>, genbutsu）。對方不能榮和這些牌。`)}</li>
          <li>${t(`<b>Do not fear 4th place.</b> Every player deals in. Use the beginner assist and the tutorial, and watch replays
          (<span lang="ja">牌譜</span>).`,
          `<b>不要怕第四名。</b>每個人都會放銃。善用新手輔助和教學，並看牌譜（<span lang="ja">牌譜</span>）。`)}</li>
          <li>${t('<b>Practise elsewhere if you like.</b> Mahjong Soul has the same rules in English and free bot games.',
          '<b>想先練習也可以。</b>雀魂（Mahjong Soul）規則相同，有繁體中文版和免費的電腦對戰。')}</li>
        </ol>
      </section>

      <section class="hj-card hj-wide" id="${id('screen')}">
        <h3 class="hm-head">${t('On screen', '畫面用語')}</h3>
        <p>${t(`The Japanese you will meet, with how to say it and what it means. The terms are standard Japanese mahjong words, as
        Mahjong Soul's Japanese client shows them. This guide has not been checked against Holojang's own menus, so its labels may differ.`,
        `你會看到的日文，附上讀音和意思。這些都是標準的日本麻將用語，以雀魂日文版的顯示為準。
        本指南沒有對照 Holojang 自己的選單，所以實際的文字可能不同。`)}</p>
        ${termTable(t('Buttons during a hand', '對局中的按鈕'), BUTTONS, lang)}
        ${termTable(t('The table', '牌桌'), TABLE, lang)}
        ${termTable(t('Hand status', '手牌狀態'), STATUS, lang)}
        ${termTable(t('Results', '結算'), RESULT, lang)}
        ${termTable(t('Menus (likely)', '選單（推測）'), MENUS, lang)}
      </section>
    </div>`;
}

/**
 * The guide's page: both languages, the Chinese hidden until the reader picks it
 * (views/holodori-mahjong.ts, wireGuideLang).
 */
// ── The yaku reminder ──
// Every standard yaku as a short chart (kanji, English, closed / open han), in a panel that
// opens over the corner button on hover or focus, and stays open on a press (a phone's way).
const cheatHan = (value: string, lang: Lang): string => value === 'mangan' ? (lang === 'en' ? 'Mangan' : '滿貫') : value;
const cheatHtml = (lang: Lang): string => YAKU_GROUPS.map(([en, zh, rows]) => `
  <section class="hj-cheat-group">
    <h4>${(lang === 'en' ? en : zh).split(/[:：]/)[0]}</h4>
    <dl>${rows.map(([jp, , enName, zhName, closed, open]) => `
      <div><dt lang="ja">${jp}</dt><dd>${lang === 'en' ? enName : zhName}</dd><dd class="hj-cheat-han">${cheatHan(closed, lang)}<i>${cheatHan(open, lang)}</i></dd></div>`).join('')}
    </dl>
  </section>`).join('');

const dockHtml = (): string => `
  <div class="hj-dock">
    <div class="hj-cheat">
      <button class="hj-cheat-btn" type="button" aria-expanded="false" aria-controls="hj-cheat-panel">
        <b lang="ja" aria-hidden="true">役</b><span class="hj-cheat-label"><span data-hj-lang="en">Yaku</span><span data-hj-lang="zh" lang="zh-Hant" hidden>役種</span></span>
      </button>
      <div class="hj-cheat-panel" id="hj-cheat-panel" role="region" aria-label="Yaku / 役種">
        <div data-hj-lang="en"><p class="hj-cheat-key">Han: closed <i>open</i>. — means closed only.</p>${cheatHtml('en')}</div>
        <div data-hj-lang="zh" lang="zh-Hant" hidden><p class="hj-cheat-key">翻數：門清 <i>副露</i>。— 表示只限門清。</p>${cheatHtml('zh')}</div>
      </div>
    </div>
    <button class="hj-top" type="button" aria-label="Back to top / 回到頂端">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
    </button>
  </div>`;

export function holojongPageHtml(): string {
  return `
    <div class="roster-page hj-page">
      <div class="roster-bar hj-langs">
        <span class="seg" role="group" aria-label="Language / 語言">
          <button class="seg-btn on" data-hj-pick="en" aria-pressed="true">English</button>
          <button class="seg-btn" data-hj-pick="zh" aria-pressed="false" lang="zh-Hant">繁體中文</button>
        </span>
      </div>
      <div data-hj-lang="en" lang="en">${guideHtml('en')}</div>
      <div data-hj-lang="zh" lang="zh-Hant" hidden>${guideHtml('zh')}</div>
      ${dockHtml()}
    </div>
  `;
}
