import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { clipHtml } from '../holodori-clip';
import { wireTurns } from '../holodori-flip';
import { getHolodoriCharacters, getHolodoriSongs, type HolodoriSong } from '../holodori-index';
import { singersOf, songBackHtml, songTileHtml } from '../render/holodori-songs-html';

// hololive Dreams' songs (#/holodori/songs): every song the game has, as its jacket over its
// title, its singers' faces and its four charts' levels. Pressed, a jacket turns over to the
// song's credits, as a sticker turns over to her back. In the album's world (_holodori.scss).
// The tile and the back are drawn by render/holodori-songs-html.ts.

const songs = getHolodoriSongs();
const cast = getHolodoriCharacters();
// Where a song is in the game's own order, which breaks a tie of days under Newest.
const place = new Map(songs.map((s, i) => [s.id, i]));
const branches = [...new Set(cast.map(c => c.branch))];
const state = newRosterState();

function draw(page: HTMLElement, items: HolodoriSong[]): void {
  page.innerHTML = `
    <header class="hd-head">
      <h2 class="hd-title">Songs</h2>
      <p class="hd-sub">Every song in the game, with its four charts' levels · press a jacket for its credits, or its disc for the chorus</p>
    </header>
    <ul class="song-grid">${items.map(s => songTileHtml(s, clipHtml)).join('')}</ul>
    <p class="hd-credit">Choruses play from the songs' official music videos on YouTube · Jackets:<a href="https://www.hololive-dreams.com/en/music" target="_blank" rel="noopener">hololive Dreams official site</a>, and HolodoriDB's CDN for the newer songs · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a></p>
  `;
  wireTurns(page, songBackHtml);
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
