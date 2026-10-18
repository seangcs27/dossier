import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { escHtml } from '../format';
import { wireTurns } from '../holodori-flip';
import { getHolodoriCharacters, getHolodoriSongs, type HolodoriCharacter, type HolodoriSong } from '../holodori-index';

// hololive Dreams' songs (#/holodori/songs): every song the game has, as its jacket over its
// title, its singers' faces and its four charts' levels. Pressed, a jacket turns over to the
// song's credits, as a sticker turns over to her back. In the album's world (_holodori.scss).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHARTS = ['Easy', 'Normal', 'Hard', 'Expert'];
// How many singers' faces a tile shows before it counts the rest.
const FACES = 4;

const songs = getHolodoriSongs();
const cast = getHolodoriCharacters();
const byId = new Map(cast.map(c => [c.id, c]));
const songById = new Map(songs.map(s => [s.id, s]));
// Where a song is in the game's own order, which breaks a tie of days under Newest.
const place = new Map(songs.map((s, i) => [s.id, i]));
const branches = [...new Set(cast.map(c => c.branch))];
const state = newRosterState();

// The holomems who sing it. A song the whole cast sings names none; a talent who has
// graduated is in the game's credit and not on the roster.
function singersOf(s: HolodoriSong): HolodoriCharacter[] {
  return (s.cast.length ? s.cast : cast.map(c => c.id)).flatMap(id => byId.get(id) ?? []);
}

const length = (s: HolodoriSong): string => `${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, '0')}`;

function addedText(s: HolodoriSong): string {
  const [y, m, d] = s.added.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// Her round face: the game's icon of her, or her bust (on transparency, so her colour is
// behind it) where the build has no icon.
export function faceHtml(c: HolodoriCharacter): string {
  const src = c.icon ?? c.art;
  return `<i class="song-face${c.icon ? ' icon' : ''}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">${src ? `<img src="${escHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</i>`;
}

function levelsHtml(s: HolodoriSong): string {
  return `
    <ol class="levels" aria-label="${escHtml(CHARTS.map((name, i) => `${name} ${s.levels[i]}`).join(', '))}">
      ${s.levels.map((lv, i) => `<li class="lv-${CHARTS[i].toLowerCase()}" aria-hidden="true">${lv}</li>`).join('')}
    </ol>
  `;
}

// A song the game's site has no jacket for stands its singers' busts on their colours, up
// to three; one the whole cast sings, its first letter.
function noJacketHtml(s: HolodoriSong, who: HolodoriCharacter[]): string {
  const busts = s.cast.length ? who.filter(c => c.art).slice(0, 3) : [];
  if (!busts.length) return `<span class="jacket-none" aria-hidden="true">${escHtml([...s.title][0] ?? '')}</span>`;
  return `<span class="jacket-none jacket-busts" aria-hidden="true">${busts.map(c => `<img src="${escHtml(c.art!)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`).join('')}</span>`;
}

export function tileHtml(s: HolodoriSong): string {
  const who = singersOf(s);
  const colours = (s.cast.length ? who : []).map(c => c.colors[0]).filter(Boolean).slice(0, 3);
  // A song the game's site has no jacket for is painted in its singers' colours, or in the
  // cover's blue for one the whole cast sings.
  const paint = colours.length > 1 ? `linear-gradient(135deg, ${colours.join(', ')})` : colours[0] ?? '#2e7be6';
  const faces = s.cast.length ? who.slice(0, FACES).map(faceHtml).join('') : '';
  const more = s.cast.length && who.length > FACES ? `<b class="song-more">+${who.length - FACES}</b>` : '';
  return `
    <li class="song">
      <button class="jacket" type="button" data-back="${escHtml(s.id)}" aria-haspopup="dialog" aria-expanded="false"
              aria-label="${escHtml(`${s.title}, sung by ${s.singers || 'the whole cast'}`)}" style="--paint: ${escHtml(paint)}">
        ${s.jacket
          ? `<img src="${escHtml(s.jacket)}" alt="" width="240" height="240" loading="lazy" decoding="async" onerror="this.remove()">`
          : noJacketHtml(s, who)}
        ${s.kind === 'Cover' ? '<em class="jacket-kind">Cover</em>' : ''}
      </button>
      <p class="song-title">${escHtml(s.title)}</p>
      <p class="song-by">${faces}${more}<span>${escHtml(s.singers || 'Everyone')}</span></p>
      ${levelsHtml(s)}
    </li>
  `;
}

export function backHtml(id: string): string | undefined {
  const s = songById.get(id);
  if (!s) return undefined;
  const who = singersOf(s);
  const stripes = (s.cast.length ? who.map(c => c.colors[0]) : ['#18c9f0', '#2e7be6', '#ffc93c']).filter(Boolean);
  const got = s.release === 'preset' ? 'Had from the start' : s.release === 'shop' ? 'Bought in the shop' : s.unlock;
  const facts: [string, string][] = [
    ['Lyrics', s.lyricist], ['Music', s.composer], ['Arrangement', s.arranger], ['Unlock', got],
  ];
  return `
    <div class="sticker-back song-back" role="dialog" aria-labelledby="back-name">
      <div class="back-stripes" aria-hidden="true">${stripes.map(x => `<i style="background: ${escHtml(x)}"></i>`).join('')}</div>
      <button class="back-close" type="button" aria-label="Turn the jacket back over">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>
      </button>
      <p class="back-no">${s.kind} · ${length(s)} · added ${addedText(s)}</p>
      <h3 class="back-name" id="back-name">${escHtml(s.title)}</h3>
      <p class="back-branch">${escHtml(s.singers || 'The whole cast')}</p>
      <dl class="back-levels">${s.levels.map((lv, i) => `<div class="lv-${CHARTS[i].toLowerCase()}"><dt>${CHARTS[i]}</dt><dd>${lv}</dd></div>`).join('')}</dl>
      <dl class="back-facts">
        ${facts.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${escHtml(v.replace(/^Unlock requirement: /, ''))}</dd>`).join('')}
      </dl>
      ${s.mv ? `<a class="back-link" href="${escHtml(s.mv)}" target="_blank" rel="noopener">Watch the music video</a>` : ''}
      ${s.copyright ? `<p class="back-small">${escHtml(s.copyright)}</p>` : ''}
    </div>
  `;
}

function draw(page: HTMLElement, items: HolodoriSong[]): void {
  page.innerHTML = `
    <header class="hd-head">
      <h2 class="hd-title">Songs</h2>
      <p class="hd-sub">Every song in the game, with its four charts' levels · press a jacket for its credits</p>
    </header>
    <ul class="song-grid">${items.map(tileHtml).join('')}</ul>
    <p class="hd-credit">Jackets: <a href="https://www.hololive-dreams.com/en/music" target="_blank" rel="noopener">hololive Dreams official site</a>, and HolodoriDB's CDN for the newer songs · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a></p>
  `;
  wireTurns(page, backHtml);
}

export function mountHolodoriSongs(container: HTMLElement): void {
  const filters: RosterFilter<HolodoriSong>[] = [
    { key: 'kind', label: 'Song', values: ['Original', 'Cover'], look: 'chips', of: s => s.kind },
    { key: 'branch', label: 'Branch', values: branches, look: 'chips', of: s => [...new Set(singersOf(s).map(c => c.branch))] },
    {
      key: 'holomem', label: 'Sung by', values: cast.map(c => c.shortName), look: 'chips', folded: true,
      of: s => singersOf(s).map(c => c.shortName),
      sets: branches.map(b => ({ label: b, values: cast.filter(c => c.branch === b).map(c => c.shortName) })),
    },
  ];
  mountRoster(container, {
    items: songs,
    draw,
    orders: {
      state,
      options: [
        { id: 'new', label: 'Newest', compare: (a, b) => b.added.localeCompare(a.added) || place.get(b.id)! - place.get(a.id)! },
        { id: 'game', label: 'Game order' },
        { id: 'title', label: 'Title', compare: (a, b) => a.title.localeCompare(b.title) },
        { id: 'expert', label: 'Expert', tip: 'Hardest Expert chart first', compare: (a, b) => b.levels[3] - a.levels[3] },
      ],
    },
    noun: 'songs',
    emptyNote: 'The last build could not reach the game data on GitHub.',
    find: { state, text: s => `${s.title} ${s.singers} ${s.lyricist} ${s.composer} ${s.arranger}`, filters },
  });
}
