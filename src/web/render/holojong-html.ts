import { escHtml } from '../format';

// A guide to hololive Mahjong -Holojan- (ホロライブ麻雀 -ホロじゃん-, COVER and Aiming's
// mahjong game): how to pre-register, the rules of Japanese (riichi) mahjong for a beginner,
// and the Japanese on its screens with a reading and a meaning. The game is Japanese only and
// was not out when this was written (19 November 2026): the facts are the official site's and
// COVER's press release, and the rules are standard riichi as Mahjong Soul plays them, since
// Holojan has not published its own. Nothing here reads the clock or any data.

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
  ['本場', 'honba', 'Repeat counter', 'Goes up when the dealer stays. Each one adds 300 to the next win.', '本場', '莊家連莊時增加。每一本場讓下一次和牌多 300 點。'],
  ['親', 'oya', 'Dealer', 'Wins and pays 1.5 times as much. Moves on when the dealer does not win.', '莊家', '和牌得分和支付都是 1.5 倍。莊家沒有和牌時，由下一位坐莊。'],
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

const yakuRows = (lang: Lang): string => YAKU.map(([jp, reading, en, zh, closed, open, how, zhHow, hand]) => `
  <tr>
    <th scope="row" lang="ja">${jp}</th>
    <td class="hj-read">${reading}</td>
    <td class="hj-en">${lang === 'en' ? en : zh}</td>
    <td class="hj-han">${closed}</td>
    <td class="hj-han">${open}</td>
    <td>${lang === 'en' ? how : zhHow}${hand ? `<span class="hj-yaku-hand">${handHtml(hand, lang)}</span>` : ''}</td>
  </tr>`).join('');

// ── Pre-registration ──
// From COVER's press release of 9 October 2026 and the official campaign page. The 40万 and 50万
// tiers are on the campaign page only.
const STORE = {
  ios: 'https://apps.apple.com/jp/app/id6762111285',
  android: 'https://play.google.com/store/apps/details?id=com.aiming.hololive.mahjong',
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
  ['register', 'Pre-register', '事前登錄'],
  ['tiles', 'The tiles', '麻將牌'],
  ['hand', 'A winning hand', '和牌的手牌'],
  ['turn', 'Your turn', '你的回合'],
  ['riichi', 'Riichi and furiten', '立直與振聽'],
  ['yaku', 'Yaku', '役'],
  ['score', 'Points and the game', '點數與對局'],
  ['tips', 'Tips', '小技巧'],
  ['screen', 'On screen', '畫面用語'],
];

const range = (suit: string): string[] => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${suit}`);

/** The guide in one language. Each section's id carries the language, since both are on the page. */
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

  return `
      <header class="hd-head hj-head">
        <p class="hj-kicker" lang="ja">ホロライブ麻雀 -ホロじゃん-</p>
        <h2 class="hd-title">${t('Holojan: a beginner\'s guide', 'Holojan 新手指南')}</h2>
        <p class="hd-sub">${t('How to pre-register, how to play Japanese mahjong, and what the Japanese on the screen says', '怎麼事前登錄、怎麼打日本麻將，以及畫面上的日文是什麼意思')}</p>
      </header>

      <nav class="hj-toc" aria-label="${t('Guide contents', '指南目錄')}">
        ${SECTIONS.map(([section, name, zh], i) => `<a href="#${id(section)}"><span>${i + 1}</span>${t(name, zh)}</a>`).join('')}
      </nav>

      <section class="hj-card" id="${id('about')}">
        <h3 class="hm-head">${t('The game', '遊戲介紹')}</h3>
        <dl class="hj-facts">
          <div><dt>${t('Title', '名稱')}</dt><dd><span lang="ja">ホロライブ麻雀 -ホロじゃん-</span> (hololive Mahjong -Holojan-)</dd></div>
          <div><dt>${t('Made by', '開發')}</dt><dd>${t('COVER and Aiming', 'COVER 與 Aiming')}</dd></div>
          <div><dt>${t('Release', '上市')}</dt><dd>${t('25 November 2026', '2026 年 11 月 25 日')}</dd></div>
          <div><dt>${t('Platforms', '平台')}</dt><dd>${t('iOS, Android, Windows and web browser', 'iOS、Android、Windows 和網頁瀏覽器')}</dd></div>
          <div><dt>${t('Price', '價格')}</dt><dd>${t('Free to play, with in-game purchases', '免費遊玩，有遊戲內購買')}</dd></div>
          <div><dt>${t('Talent', '成員')}</dt><dd>${t('37: Gen 0–5, hololive GAMERS, holoX, ReGLOSS and FLOW GLOW', '37 位：0–5 期生、hololive GAMERS、holoX、ReGLOSS 和 FLOW GLOW')}</dd></div>
          <div><dt>${t('Language', '語言')}</dt><dd>${t('Japanese. No English version is announced.', '日文。尚未宣布英文版。')}</dd></div>
        </dl>
        <p>${t(`It is a mahjong game to play with your oshi: new voice lines, stamps to send during a match, a
        beginner-assist feature, single-player, friend matches, tournaments, spectating and replays.
        The official pages do not yet state the rule set. This guide teaches standard Japanese
        (riichi) mahjong, the rules Mahjong Soul uses, which is almost certainly what Holojan plays.`,
        `這是一款和你的推し一起打的麻將遊戲：全新語音、對局中可以傳送的貼圖、新手輔助功能、單人遊戲、
        友人戰、大會、觀戰和牌譜。官方頁面還沒有說明採用的規則。本指南教的是標準的日本（立直）麻將，
        也就是雀魂（Mahjong Soul）的規則，Holojan 幾乎可以確定也是這一套。`)}</p>
      </section>

      <section class="hj-card" id="${id('register')}">
        <h3 class="hm-head">${t('Pre-register', '事前登錄')}</h3>
        <p>${t(`No close date is stated; pre-registration usually runs until launch. Every reward tier reached when it closes is given
        to everyone who registered, once each, in the game after launch.`,
        `官方沒有公布截止日期；事前登錄通常持續到上市為止。截止時達成的每一階獎勵，上市後都會在遊戲內
        發給所有登錄的人，每人一次。`)}</p>
        <ol class="hj-steps">
          <li>
            <b>${t('iPhone or iPad', 'iPhone 或 iPad')}</b>
            <p>${t(`Open the ${out(STORE.ios, 'App Store page')} and tap <span class="hj-btn" lang="ja">入手</span> (Get).
            For a game not out yet, this is the pre-order: it downloads by itself on release day.`,
            `打開 ${out(STORE.ios, 'App Store 頁面')}，點 <span class="hj-btn" lang="ja">入手</span>（取得）。
            遊戲還沒上市時，這就是預訂：上市當天會自動下載。`)}</p>
          </li>
          <li>
            <b>Android</b>
            <p>${t(`Open the ${out(STORE.android, 'Google Play page')} and tap <span class="hj-btn" lang="ja">事前登録</span>
            (Pre-register). Turn on "Install automatically when available" if you are asked.`,
            `打開 ${out(STORE.android, 'Google Play 頁面')}，點 <span class="hj-btn" lang="ja">事前登録</span>
            （事前登錄）。如果系統詢問，請開啟「上市後自動安裝」。`)}</p>
          </li>
          <li>
            <b>X (Twitter)</b>
            <p>${t(`Follow ${out(STORE.x, '@hololivemahjong')}. The follow counts toward the campaign, and the goods draws
            are among its followers, with winners told by direct message. Goods ship in Japan only.`,
            `追蹤 ${out(STORE.x, '@hololivemahjong')}。追蹤會算進活動人數，周邊抽獎也從追蹤者中抽出，
            得獎者會收到私訊通知。周邊只寄送日本國內。`)}</p>
          </li>
          <li>
            <b>${t('Windows and browser', 'Windows 和瀏覽器')}</b>
            <p>${t(`No store or launcher is named yet. Check the ${out(STORE.site, 'official site')} on 25 November.`,
            `還沒有公布商店或啟動器。請在 11 月 25 日查看${out(STORE.site, '官方網站')}。`)}</p>
          </li>
        </ol>
        <p class="hj-note">${t(`<b>Outside Japan:</b> the store pages are Japan's. If one says the app is not
        available in your country, the game is not on your region's store. The official pages do not
        say whether it will be released outside Japan.`,
        `<b>日本以外：</b>商店頁面是日本區的。如果頁面顯示這個 App 在你的國家或地區無法使用，
        就是遊戲沒有在你所在地區的商店上架。官方頁面沒有說明會不會在日本以外推出。`)}</p>

        <h4 class="hj-sub">${t('Rewards by registrations', '登錄人數獎勵')}</h4>
        <div class="hj-table-wrap">
          <table class="hj-terms hj-milestones">
            <thead><tr><th scope="col">${t('Registrations', '登錄人數')}</th><th scope="col">${t('Reward', '獎勵')}</th></tr></thead>
            <tbody>${MILESTONES.map(([jp, en, reward, zhReward]) => `<tr><th scope="row"><span lang="ja">${jp}</span> <small>${en}</small></th><td>${t(reward, zhReward)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <p class="hj-note">${t(`<span lang="ja">万</span> (man) is 10,000, so <span lang="ja">10万人</span> is 100,000 people.
        The official X account reported more than 400,000 registrations. Details on the
        ${out(STORE.campaign, 'campaign page')} (Japanese).`,
        `日文的 <span lang="ja">万</span>（man）就是「萬」，所以 <span lang="ja">10万人</span> 是十萬人。
        官方 X 帳號公布登錄人數已超過 40 萬。詳情見${out(STORE.campaign, '活動頁面')}（日文）。`)}</p>
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
        1s, 9s and honours are "terminals and honours" (<span lang="ja">么九牌</span>, yaochuuhai).
        Tiles drawn here in a standard style; Holojan's own tile art is not shown yet.`,
        `風牌讀作 <b lang="ja">東</b> ton、<b lang="ja">南</b> nan、<b lang="ja">西</b> shaa、<b lang="ja">北</b> pei；
        三元牌是 <b lang="ja">白</b> haku（白板，空白的牌）、<b lang="ja">發</b> hatsu（發財）、<b lang="ja">中</b> chun（紅中）。
        1、9 和字牌合稱「么九牌」（yaochuuhai）。
        這裡的牌是標準樣式；Holojan 自己的牌面還沒有公開。`)}</p>
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

      <section class="hj-card" id="${id('yaku')}">
        <h3 class="hm-head">${t('Yaku <small>the twelve to learn first</small>', '役 <small>先學這十二個</small>')}</h3>
        <p>${t(`A hand with no yaku cannot win, even if it is complete. Dora are bonus han, not yaku. "Open" is the value after
        a call; "—" means the yaku needs a closed hand.`,
        `沒有役的手牌，就算完整也不能和牌。寶牌是額外的翻數，不是役。台灣麻將的「台」也不是役：
        莊家、連莊、中洞（嵌張）在日麻都不能讓你和牌。「副露」是鳴牌後的翻數；
        「—」表示這個役必須門清。`)}</p>
        <div class="hj-table-wrap">
          <table class="hj-terms hj-yaku">
            <thead><tr>${(lang === 'en' ? ['Kanji', 'Reading', 'English', 'Closed', 'Open', 'How'] : ['日文', '讀音', '中文', '門清', '副露', '條件']).map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
            <tbody>${yakuRows(lang)}</tbody>
          </table>
        </div>
      </section>

      <section class="hj-card" id="${id('score')}">
        <h3 class="hm-head">${t('Points and the game', '點數與對局')}</h3>
        <ul class="hj-list">
          <li>${t(`Everyone starts with <b>25,000</b> points. A full game (<span lang="ja">半荘</span>, hanchan) is an East round and a South
          round, four hands or more each. Highest points at the end is 1st.`,
          `每人起始 <b>25,000</b> 點。一場完整的對局（<span lang="ja">半荘</span>，半莊）有東場和南場，各四局以上。
          結束時點數最高的人是第一名。`)}</li>
          <li>${t(`A win's value is its <b>han</b> (from yaku and dora) and <b>fu</b>. The app counts both: you only need to know
          that more han is more points, and 5 han is a mangan, 8,000.`,
          `和牌的分數由<b>翻</b>（來自役和寶牌）和<b>符</b>決定。App 會自動計算：你只要知道翻越多分數越高，
          5 翻是滿貫，8,000 點。`)}</li>
          <li>${t(`The <b>dealer</b> (<span lang="ja">親</span>) wins 1.5 times as much and pays more on a Tsumo. The dealer stays
          dealer after a win or a ready draw; otherwise the next player deals.`,
          `<b>莊家</b>（<span lang="ja">親</span>）和牌得 1.5 倍，別人自摸時也付比較多。莊家和牌或流局時聽牌就連莊；
          否則由下一位玩家坐莊。`)}</li>
          <li>${t('When the wall runs out, players who are <b>not</b> ready (<span lang="ja">ノーテン</span>) pay 3,000 in all to those who are.',
          '牌山摸完時，<b>沒有</b>聽牌的玩家（<span lang="ja">ノーテン</span>）共付 3,000 點給聽牌的玩家。')}</li>
          <li>${t('Below 0 points, the game usually ends at once.', '點數低於 0 時，對局通常立刻結束。')}</li>
        </ul>
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

      <section class="hj-card" id="${id('screen')}">
        <h3 class="hm-head">${t('On screen', '畫面用語')}</h3>
        <p>${t(`The Japanese you will meet, with how to say it and what it means. The terms are standard Japanese mahjong words, as
        Mahjong Soul's Japanese client shows them. Holojan's menus are not public yet, so its own labels may differ.`,
        `你會看到的日文，附上讀音和意思。這些都是標準的日本麻將用語，以雀魂日文版的顯示為準。
        Holojan 的選單還沒有公開，所以實際的文字可能不同。`)}</p>
        ${termTable(t('Buttons during a hand', '對局中的按鈕'), BUTTONS, lang)}
        ${termTable(t('The table', '牌桌'), TABLE, lang)}
        ${termTable(t('Hand status', '手牌狀態'), STATUS, lang)}
        ${termTable(t('Results', '結算'), RESULT, lang)}
        ${termTable(t('Menus (likely)', '選單（推測）'), MENUS, lang)}
      </section>`;
}

/**
 * The guide's page: both languages, the Chinese hidden until the reader picks it
 * (views/holodori-mahjong.ts, wireGuideLang).
 */
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
    </div>
  `;
}
