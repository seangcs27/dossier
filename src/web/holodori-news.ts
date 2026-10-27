import bundledAnnouncements from '../shared/generated/holodori/announcements.json';

/**
 * One announcement of hololive Dreams, baked by scripts/lib/holodori-news.mjs from hololive
 * Dreams Lab's Game updates page and Steam's news for the game. Its own module, not
 * holodori-index.ts, so that the list does not ship on every page that imports the index.
 */
export interface HolodoriAnnouncement {
  date: string;           // 'YYYY-MM-DD', its day in Japan
  title: string;          // the headline: the Lab's wording, or the Steam post's own title
  url: string;            // the official post: on X, the game's site, QualiArts' or Steam's
  from: 'lab' | 'steam';
}

const announcements = bundledAnnouncements as unknown as HolodoriAnnouncement[];

/** The newest 40, newest day first. */
export function getHolodoriAnnouncements(): HolodoriAnnouncement[] {
  return announcements;
}
