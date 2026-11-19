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

const SUIT_NAME: Record<string, string> = { m: 'characters', p: 'dots', s: 'bamboo' };
const HONOUR_NAME = ['', 'East wind', 'South wind', 'West wind', 'North wind', 'White dragon', 'Green dragon', 'Red dragon'];

/** What a screen reader says for a tile: '5 dots (red)', 'East wind'. */
function tileName(code: string): string {
  const n = Number(code[0]);
  const suit = code[1];
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
export function tileHtml(code: string): string {
  const n = Number(code[0]);
  const suit = code[1];
  const red = n === 0;
  const value = red ? 5 : n;
  let face: string;
  // A tile writes five as 伍, the form Mahjong Soul and most Japanese sets print.
  if (suit === 'm') face = `<b class="num">${value === 5 ? '伍' : NUMERALS[value]}</b><b class="man">萬</b>`;
  // White is blank, as Mahjong Soul draws it: only its corner index marks it.
  else if (suit === 'z') face = n === 5 ? '' : `<b class="honour z${n}">${HONOURS[n]}</b>`;
  else face = faceSvg(value, suit, red);
  const index = `<i class="idx" aria-hidden="true">${suit === 'z' ? HONOUR_INDEX[n] : value}</i>`;
  return `<span class="hj-tile ${suit}${red ? ' red' : ''}" role="img" aria-label="${tileName(code)}">${face}${index}</span>`;
}

/** A row of tiles from a hand written as Tenhou does ('234m 55p'), a gap between groups. */
function handHtml(hand: string): string {
  return `<span class="hj-hand">${hand.split(' ').map(group => {
    const suit = group[group.length - 1];
    return `<span class="hj-group">${[...group.slice(0, -1)].map(n => tileHtml(n + suit)).join('')}</span>`;
  }).join('')}</span>`;
}

// ── The words ──
// [Japanese, reading, English, what it means for you]. A `Term` list is one table.
type Term = [jp: string, reading: string, en: string, note: string];

const termRows = (terms: Term[]): string => terms.map(([jp, reading, en, note]) => `
  <tr>
    <th scope="row" lang="ja">${jp}</th>
    <td class="hj-read">${reading}</td>
    <td class="hj-en">${en}</td>
    <td>${note}</td>
  </tr>`).join('');

const termTable = (caption: string, terms: Term[]): string => `
  <div class="hj-table-wrap">
    <table class="hj-terms">
      <caption>${caption}</caption>
      <thead><tr><th scope="col">On screen</th><th scope="col">Reading</th><th scope="col">English</th><th scope="col">What it means</th></tr></thead>
      <tbody>${termRows(terms)}</tbody>
    </table>
  </div>`;

const BUTTONS: Term[] = [
  ['ポン', 'pon', 'Pon', 'Take a discard to make three of a kind. From any player.'],
  ['チー', 'chii', 'Chii', 'Take a discard to make a run. Only from the player on your left.'],
  ['カン', 'kan', 'Kan', 'Make four of a kind. You draw an extra tile and a new dora is shown.'],
  ['リーチ', 'riichi', 'Riichi', 'Declare that you are one tile from winning. Closed hands only. Costs 1,000 points.'],
  ['ロン', 'ron', 'Ron', 'Win on another player\'s discard. That player pays.'],
  ['ツモ', 'tsumo', 'Tsumo', 'Win on a tile you drew yourself. Everyone pays.'],
  ['スキップ / パス', 'sukippu / pasu', 'Skip / Pass', 'Do not call. Play goes on.'],
  ['九種九牌', 'kyuushu kyuuhai', 'Nine terminals', 'On your first draw with 9 different terminals or honours, you can stop the hand.'],
];

const TABLE: Term[] = [
  ['東場 / 南場', 'tonba / nanba', 'East / South round', 'The game has an East round and then a South round.'],
  ['東1局', 'ton ikkyoku', 'East 1', 'The round and the hand number. 南3局 is South 3.'],
  ['本場', 'honba', 'Repeat counter', 'Goes up when the dealer stays. Each one adds 300 to the next win.'],
  ['親', 'oya', 'Dealer', 'Wins and pays 1.5 times as much. Moves on when the dealer does not win.'],
  ['子', 'ko', 'Non-dealer', 'The three other players.'],
  ['自風 / 場風', 'jikaze / bakaze', 'Seat wind / round wind', 'A triplet of either wind is a yaku.'],
  ['供託', 'kyoutaku', 'Riichi sticks', 'The 1,000-point sticks on the table. The next winner takes them.'],
  ['残り', 'nokori', 'Tiles left', 'Tiles left in the wall. At 0 the hand ends in a draw.'],
  ['点 / 持ち点', 'ten / mochiten', 'Points', 'Your score. Most games start at 25,000.'],
  ['ドラ表示牌', 'dora hyoujihai', 'Dora indicator', 'The face-up tile on the wall. The tile after it is the dora.'],
];

const STATUS: Term[] = [
  ['聴牌 / テンパイ', 'tenpai', 'Ready', 'One tile from a complete hand.'],
  ['ノーテン', 'nooten', 'Not ready', 'Not one tile from winning when the hand ends in a draw. You pay.'],
  ['振聴 / フリテン', 'furiten', 'Furiten', 'A tile you wait on is in your own discards. You cannot win by Ron, only by Tsumo.'],
  ['一発', 'ippatsu', 'One shot', 'Win before your next discard after riichi, with no call between. +1 han.'],
  ['ドラ', 'dora', 'Dora', 'A bonus tile. +1 han each, but not a yaku.'],
  ['裏ドラ', 'ura dora', 'Hidden dora', 'Shown only when a riichi hand wins. More bonus han.'],
  ['赤ドラ', 'aka dora', 'Red five', 'A red 5 tile. Counts as a dora.'],
  ['流局', 'ryuukyoku', 'Draw', 'The wall ran out with no winner. Ready players are paid by the others.'],
  ['和了', 'agari', 'Win', 'A complete hand.'],
  ['放銃', 'houjuu', 'Deal-in', 'You discarded the tile another player won on.'],
];

const RESULT: Term[] = [
  ['役', 'yaku', 'Yaku', 'A scoring pattern. A hand needs at least one to win.'],
  ['翻', 'han', 'Han', 'The doubles a hand earns. The main part of the score.'],
  ['符', 'fu', 'Fu', 'Minipoints for how the hand was made. The game counts them.'],
  ['満貫', 'mangan', 'Mangan', '5 han (or less with high fu). 8,000 points, 12,000 for the dealer.'],
  ['跳満', 'haneman', 'Haneman', '6–7 han. 12,000 / 18,000.'],
  ['倍満', 'baiman', 'Baiman', '8–10 han. 16,000 / 24,000.'],
  ['三倍満', 'sanbaiman', 'Sanbaiman', '11–12 han. 24,000 / 36,000.'],
  ['役満', 'yakuman', 'Yakuman', 'The top hands. 32,000 / 48,000.'],
  ['1位 / 2位 / 3位 / 4位', 'ichi-i … yon-i', '1st – 4th place', 'Your place at the end of the game.'],
  ['半荘戦 / 東風戦', 'hanchan-sen / tonpuu-sen', 'Full game / East only', 'A full game has East and South rounds; a short one has East only.'],
];

const MENUS: Term[] = [
  ['対局', 'taikyoku', 'Play / Match', 'Start a game.'],
  ['友人戦', 'yuujin-sen', 'Friend match', 'A room for you and friends.'],
  ['大会', 'taikai', 'Tournament', 'Organised events.'],
  ['観戦', 'kansen', 'Spectate', 'Watch other players\' games.'],
  ['牌譜', 'haifu', 'Replays', 'Records of your past games.'],
  ['ガチャ', 'gacha', 'Gacha', 'Where you get talent and items.'],
  ['プレゼント', 'purezento', 'Gifts / Inbox', 'Rewards to collect, such as pre-registration rewards.'],
  ['お知らせ', 'oshirase', 'News', 'Notices from the game.'],
  ['ミッション', 'misshon', 'Missions', 'Tasks for rewards.'],
  ['設定', 'settei', 'Settings', 'Sound, display and play options.'],
  ['チュートリアル', 'chuutoriaru', 'Tutorial', 'The game\'s own lessons.'],
];

// [kanji, reading, English, han closed, han open (0: closed only), how to make it, an example hand].
type Yaku = [jp: string, reading: string, en: string, closed: string, open: string, how: string, hand?: string];

const YAKU: Yaku[] = [
  ['立直', 'riichi', 'Riichi', '1', '—', 'Declare riichi with a closed, ready hand. The easiest yaku: use it.'],
  ['門前清自摸和', 'menzen tsumo', 'Closed self-draw', '1', '—', 'Win by Tsumo with no calls.'],
  ['断么九', 'tanyao', 'All simples', '1', '1', 'Only tiles 2 to 8. No 1s, 9s or honours.', '234m 567p 345s 678s 22p'],
  ['役牌', 'yakuhai', 'Value tiles', '1', '1', 'A triplet of White, Green or Red, your seat wind or the round wind.', '777z'],
  ['平和', 'pinfu', 'Pinfu', '1', '—', 'Four runs, a pair that is not a value tile, and a wait on either end of a run.'],
  ['一盃口', 'iipeikou', 'Double run', '1', '—', 'Two identical runs in one suit.', '334455m'],
  ['三色同順', 'sanshoku', 'Three-colour run', '2', '1', 'The same run in all three suits.', '345m 345p 345s'],
  ['一気通貫', 'ittsu', 'Straight', '2', '1', '1 to 9 in one suit.', '123s 456s 789s'],
  ['対々和', 'toitoi', 'All triplets', '2', '2', 'Four triplets and a pair.', '222m 777p 999s 111z 55s'],
  ['七対子', 'chiitoitsu', 'Seven pairs', '2', '—', 'Seven different pairs. The one hand not built from sets.', '11m 44m 77p 99p 22s 66s 33z'],
  ['混一色', 'honitsu', 'Half flush', '3', '2', 'One suit plus honours.', '123p 456p 99p 222z 666z'],
  ['清一色', 'chinitsu', 'Full flush', '6', '5', 'One suit only.', '112233s 456s 789s 55s'],
];

const yakuRows = (): string => YAKU.map(([jp, reading, en, closed, open, how, hand]) => `
  <tr>
    <th scope="row" lang="ja">${jp}</th>
    <td class="hj-read">${reading}</td>
    <td class="hj-en">${en}</td>
    <td class="hj-han">${closed}</td>
    <td class="hj-han">${open}</td>
    <td>${how}${hand ? `<span class="hj-yaku-hand">${handHtml(hand)}</span>` : ''}</td>
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

const MILESTONES: [count: string, en: string, reward: string][] = [
  ['10万', '100,000', 'Social icon; table skins for Gen 0–2 and hololive GAMERS'],
  ['20万', '200,000', 'Social icon; table skins for Gen 3–5'],
  ['30万', '300,000', 'Social icon; table skins for holoX, ReGLOSS and FLOW GLOW; a draw for a mahjong-magazine-style notebook'],
  ['40万', '400,000', 'Key-visual table skin; a draw for 25 mahjong mats and life-size panels (5 of each of 4 kinds)'],
  ['50万', '500,000', 'A special ASMR voice of Hakui Koyori and Ichijou Ririka, in the in-game news after launch'],
];

const out = (href: string, text: string): string => `<a href="${escHtml(href)}" target="_blank" rel="noopener">${text}</a>`;

// The pages of the guide, each a section the contents link to.
const SECTIONS: [id: string, name: string][] = [
  ['about', 'The game'],
  ['register', 'Pre-register'],
  ['tiles', 'The tiles'],
  ['hand', 'A winning hand'],
  ['turn', 'Your turn'],
  ['riichi', 'Riichi and furiten'],
  ['yaku', 'Yaku'],
  ['score', 'Points and the game'],
  ['tips', 'Tips'],
  ['screen', 'On screen'],
];

const tileRow = (codes: string[], label: string, jp: string, reading: string): string => `
  <div class="hj-suit">
    <p class="hj-suit-name"><b lang="ja">${jp}</b> <span>${reading}</span> · ${label}</p>
    <div class="hj-row">${codes.map(tileHtml).join('')}</div>
  </div>`;

const range = (suit: string): string[] => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `${n}${suit}`);

/** The guide's page. */
export function holojongPageHtml(): string {
  return `
    <div class="roster-page hj-page">
      <header class="hd-head hj-head">
        <p class="hj-kicker" lang="ja">ホロライブ麻雀 -ホロじゃん-</p>
        <h2 class="hd-title">Holojan: a beginner's guide</h2>
        <p class="hd-sub">How to pre-register, how to play Japanese mahjong, and what the Japanese on the screen says</p>
      </header>

      <nav class="hj-toc" aria-label="Guide contents">
        ${SECTIONS.map(([id, name], i) => `<a href="#hj-${id}"><span>${i + 1}</span>${name}</a>`).join('')}
      </nav>

      <section class="hj-card" id="hj-about">
        <h3 class="hm-head">The game</h3>
        <dl class="hj-facts">
          <div><dt>Title</dt><dd><span lang="ja">ホロライブ麻雀 -ホロじゃん-</span> (hololive Mahjong -Holojan-)</dd></div>
          <div><dt>Made by</dt><dd>COVER and Aiming</dd></div>
          <div><dt>Release</dt><dd>25 November 2026</dd></div>
          <div><dt>Platforms</dt><dd>iOS, Android, Windows and web browser</dd></div>
          <div><dt>Price</dt><dd>Free to play, with in-game purchases</dd></div>
          <div><dt>Talent</dt><dd>37: Gen 0–5, hololive GAMERS, holoX, ReGLOSS and FLOW GLOW</dd></div>
          <div><dt>Language</dt><dd>Japanese. No English version is announced.</dd></div>
        </dl>
        <p>It is a mahjong game to play with your oshi: new voice lines, stamps to send during a match, a
        beginner-assist feature, single-player, friend matches, tournaments, spectating and replays.
        The official pages do not yet state the rule set. This guide teaches standard Japanese
        (riichi) mahjong, the rules Mahjong Soul uses, which is almost certainly what Holojan plays.</p>
      </section>

      <section class="hj-card" id="hj-register">
        <h3 class="hm-head">Pre-register</h3>
        <p>No close date is stated; pre-registration usually runs until launch. Every reward tier reached when it closes is given
        to everyone who registered, once each, in the game after launch.</p>
        <ol class="hj-steps">
          <li>
            <b>iPhone or iPad</b>
            <p>Open the ${out(STORE.ios, 'App Store page')} and tap <span class="hj-btn" lang="ja">入手</span> (Get).
            For a game not out yet, this is the pre-order: it downloads by itself on release day.</p>
          </li>
          <li>
            <b>Android</b>
            <p>Open the ${out(STORE.android, 'Google Play page')} and tap <span class="hj-btn" lang="ja">事前登録</span>
            (Pre-register). Turn on "Install automatically when available" if you are asked.</p>
          </li>
          <li>
            <b>X (Twitter)</b>
            <p>Follow ${out(STORE.x, '@hololivemahjong')}. The follow counts toward the campaign, and the goods draws
            are among its followers, with winners told by direct message. Goods ship in Japan only.</p>
          </li>
          <li>
            <b>Windows and browser</b>
            <p>No store or launcher is named yet. Check the ${out(STORE.site, 'official site')} on 25 November.</p>
          </li>
        </ol>
        <p class="hj-note"><b>Outside Japan:</b> the store pages are Japan's. If one says the app is not
        available in your country, the game is not on your region's store. The official pages do not
        say whether it will be released outside Japan.</p>

        <h4 class="hj-sub">Rewards by registrations</h4>
        <div class="hj-table-wrap">
          <table class="hj-terms hj-milestones">
            <thead><tr><th scope="col">Registrations</th><th scope="col">Reward</th></tr></thead>
            <tbody>${MILESTONES.map(([jp, en, reward]) => `<tr><th scope="row"><span lang="ja">${jp}</span> <small>${en}</small></th><td>${reward}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <p class="hj-note"><span lang="ja">万</span> (man) is 10,000, so <span lang="ja">10万人</span> is 100,000 people.
        The official X account reported more than 400,000 registrations. Details on the
        ${out(STORE.campaign, 'campaign page')} (Japanese).</p>
      </section>

      <section class="hj-card" id="hj-tiles">
        <h3 class="hm-head">The tiles</h3>
        <p>There are 136 tiles: three suits numbered 1 to 9, and seven honour tiles, four of each. Your hand
        is 13 tiles. The number on a characters tile is written in kanji, so learn <b>一 to 九</b> first.</p>
        ${tileRow(range('m'), 'Characters', '萬子', 'manzu')}
        <p class="hj-numerals">${NUMERALS.slice(1).map((k, i) => `<span><b lang="ja">${k}</b> ${i + 1}</span>`).join('')}</p>
        ${tileRow(range('p'), 'Dots (circles)', '筒子', 'pinzu')}
        ${tileRow(range('s'), 'Bamboo', '索子', 'souzu')}
        ${tileRow(['1z', '2z', '3z', '4z'], 'Winds: East, South, West, North', '風牌', 'kazehai')}
        ${tileRow(['5z', '6z', '7z'], 'Dragons: White, Green, Red', '三元牌', 'sangenpai')}
        ${tileRow(['0m', '0p', '0s'], 'Red fives: each one is a bonus dora', '赤ドラ', 'aka dora')}
        <p class="hj-note">The winds read <b lang="ja">東</b> ton, <b lang="ja">南</b> nan, <b lang="ja">西</b> shaa,
        <b lang="ja">北</b> pei; the dragons <b lang="ja">白</b> haku (a blank tile), <b lang="ja">發</b> hatsu,
        <b lang="ja">中</b> chun. 1s, 9s and honours are "terminals and honours" (<span lang="ja">么九牌</span>, yaochuuhai).
        Tiles drawn here in a standard style; Holojan's own tile art is not shown yet.</p>
      </section>

      <section class="hj-card" id="hj-hand">
        <h3 class="hm-head">A winning hand</h3>
        <p>You win with 14 tiles: <b>four sets and one pair</b>, and at least one <b>yaku</b> (a scoring
        pattern, below). A set is one of:</p>
        <ul class="hj-sets">
          <li>${handHtml('345p')}<span><b lang="ja">順子</b> shuntsu · <b>Run</b>: three in a row in one suit. Never honours.</span></li>
          <li>${handHtml('777s')}<span><b lang="ja">刻子</b> koutsu · <b>Triplet</b>: three of the same tile.</span></li>
          <li>${handHtml('1111z')}<span><b lang="ja">槓子</b> kantsu · <b>Quad</b>: four of the same, made with Kan.</span></li>
          <li>${handHtml('55m')}<span><b lang="ja">雀頭</b> jantou · <b>Pair</b>: the hand's one pair, its "head".</span></li>
        </ul>
        <p>A complete hand, all simples (tanyao):</p>
        <div class="hj-example">${handHtml('234m 678m 345p 456s 88s')}</div>
        <p class="hj-note">Two exceptions do not use sets: seven pairs (<span lang="ja">七対子</span>) and thirteen orphans (<span lang="ja">国士無双</span>).</p>
      </section>

      <section class="hj-card" id="hj-turn">
        <h3 class="hm-head">Your turn</h3>
        <ol class="hj-steps">
          <li><b>Draw</b><p>Take one tile from the wall (automatic in the app).</p></li>
          <li><b>Discard</b><p>Throw away one tile, face up, in front of you. Pick the tile that helps your hand least.</p></li>
          <li><b>Calls</b><p>When someone discards, buttons may appear: <span class="hj-btn" lang="ja">チー</span> to take it for a run (only
          from the player on your left), <span class="hj-btn" lang="ja">ポン</span> for a triplet, <span class="hj-btn" lang="ja">カン</span> for a quad,
          <span class="hj-btn" lang="ja">ロン</span> to win on it. Press <span class="hj-btn" lang="ja">スキップ</span> to pass.</p></li>
          <li><b>Win</b><p>When you draw the tile that completes your hand, press <span class="hj-btn" lang="ja">ツモ</span>.</p></li>
        </ol>
        <p class="hj-note"><b>Calling opens your hand</b> (<span lang="ja">鳴き</span>, naki). An open hand cannot riichi,
        loses some yaku and is worth less. A beginner does best to keep the hand closed and call Pon only on value
        tiles (White, Green, Red, or your wind), which are a yaku by themselves.</p>
      </section>

      <section class="hj-card" id="hj-riichi">
        <h3 class="hm-head">Riichi and furiten</h3>
        <p><b lang="ja">リーチ</b> (riichi): when your hand is closed and one tile from winning (tenpai), you can declare riichi
        and put down 1,000 points. From then on you cannot change your hand: the game discards every tile you draw unless
        it wins. It is a yaku, so <b>any</b> complete closed hand can win with it, and if you win you may also get
        ippatsu and hidden dora.</p>
        <p><b lang="ja">振聴</b> (furiten): if a tile that would complete your hand is in <b>your own discards</b>, you cannot win
        on another player's discard (Ron). You can still win by drawing it yourself (Tsumo). The app marks it for you.</p>
        <div class="hj-example">
          <p>Waiting on 3 or 6 dots with this hand. If you discarded a 6 dots earlier, you are furiten:</p>
          ${handHtml('123m 456m 789s 45p 77z')}
        </div>
      </section>

      <section class="hj-card" id="hj-yaku">
        <h3 class="hm-head">Yaku <small>the twelve to learn first</small></h3>
        <p>A hand with no yaku cannot win, even if it is complete. Dora are bonus han, not yaku. "Open" is the value after
        a call; "—" means the yaku needs a closed hand.</p>
        <div class="hj-table-wrap">
          <table class="hj-terms hj-yaku">
            <thead><tr><th scope="col">Kanji</th><th scope="col">Reading</th><th scope="col">English</th><th scope="col">Closed</th><th scope="col">Open</th><th scope="col">How</th></tr></thead>
            <tbody>${yakuRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="hj-card" id="hj-score">
        <h3 class="hm-head">Points and the game</h3>
        <ul class="hj-list">
          <li>Everyone starts with <b>25,000</b> points. A full game (<span lang="ja">半荘</span>, hanchan) is an East round and a South
          round, four hands or more each. Highest points at the end is 1st.</li>
          <li>A win's value is its <b>han</b> (from yaku and dora) and <b>fu</b>. The app counts both: you only need to know
          that more han is more points, and 5 han is a mangan, 8,000.</li>
          <li>The <b>dealer</b> (<span lang="ja">親</span>) wins 1.5 times as much and pays more on a Tsumo. The dealer stays
          dealer after a win or a ready draw; otherwise the next player deals.</li>
          <li>When the wall runs out, players who are <b>not</b> ready (<span lang="ja">ノーテン</span>) pay 3,000 in all to those who are.</li>
          <li>Below 0 points, the game usually ends at once.</li>
        </ul>
      </section>

      <section class="hj-card" id="hj-tips">
        <h3 class="hm-head">Tips for a first game</h3>
        <ol class="hj-list">
          <li><b>Discard lone honours and 1s and 9s first.</b> They make fewer runs. Keep a pair of value tiles.</li>
          <li><b>Aim for riichi or tanyao.</b> Keep the hand closed, get ready, declare riichi.</li>
          <li><b>Defend after a riichi.</b> When another player declares riichi and your hand is far from ready, discard tiles
          that player has already discarded (<span lang="ja">現物</span>, genbutsu). They cannot win on those.</li>
          <li><b>Do not fear 4th place.</b> Every player deals in. Use the beginner assist and the tutorial, and watch replays
          (<span lang="ja">牌譜</span>).</li>
          <li><b>Practise elsewhere if you like.</b> Mahjong Soul has the same rules in English and free bot games.</li>
        </ol>
      </section>

      <section class="hj-card" id="hj-screen">
        <h3 class="hm-head">On screen</h3>
        <p>The Japanese you will meet, with how to say it and what it means. The terms are standard Japanese mahjong words, as
        Mahjong Soul's Japanese client shows them. Holojan's menus are not public yet, so its own labels may differ.</p>
        ${termTable('Buttons during a hand', BUTTONS)}
        ${termTable('The table', TABLE)}
        ${termTable('Hand status', STATUS)}
        ${termTable('Results', RESULT)}
        ${termTable('Menus (likely)', MENUS)}
      </section>
    </div>
  `;
}
