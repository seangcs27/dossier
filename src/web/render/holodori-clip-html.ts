import { escHtml } from '../format';
import type { HolodoriSong } from '../holodori-index';

// A song's disc on its jacket (holodori-clip.ts plays it). What is drawn here is the button;
// which song is playing, and how far, belongs to the player and is handed in.

/** The song the player has open: whether it is playing, and how far along, 0 to 100. */
export interface ClipOn {
  id: string;
  playing: boolean;
  progress: number;
}

/** The YouTube id of a song's music video, or undefined for a song that has none. */
export function videoOf(song: HolodoriSong): string | undefined {
  return /(?:[?&]v=|youtu\.be\/)([\w-]{11})/.exec(song.mv)?.[1];
}

/** A song's disc, the button that plays its chorus; nothing for a song with no video. */
export function clipButtonHtml(song: HolodoriSong, on?: ClipOn): string {
  if (!videoOf(song)) return '';
  const mine = on?.id === song.id;
  const playing = mine && on.playing;
  return `
    <button class="song-play${mine ? ' is-on' : ''}${playing ? ' is-playing' : ''}" type="button"
            data-clip="${escHtml(song.id)}" aria-pressed="${playing}"
            aria-label="Play the chorus of ${escHtml(song.title)}" style="--p: ${mine ? on.progress : 0}">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle class="ring" cx="22" cy="22" r="19" pathLength="100"></circle>
        <circle class="ring-on" cx="22" cy="22" r="19" pathLength="100"></circle>
        <path class="ico-play" d="M18 14.5v15l12-7.5z"></path>
        <path class="ico-pause" d="M16.5 14h4v16h-4zM23.5 14h4v16h-4z"></path>
      </svg>
    </button>
  `;
}
