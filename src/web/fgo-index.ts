import bundled from '../shared/generated/fgo/servants.json';

/**
 * One Fate/Grand Order Servant, baked by scripts/build-fgo-index.mjs from Atlas Academy's
 * basic exports of the game's data.
 */
export interface FgoServant {
  id: number;             // the game's own id, 100100; it names the Servant's files, there and here
  collectionNo: number;   // its number in the game's Spirit Origin List: 2 for Altria Pendragon
  name: string;
  // Set for the eight who go by another name until an ascension gives the true one:
  // 'Tam Lin Lancelot' for Mélusine.
  alias?: string;
  rarity: number;         // 0 to 5
  class: string;          // 'Saber', 'Alter Ego', 'Moon Cancer', …
  attribute: string;      // 'Human', 'Sky', 'Earth', 'Star', 'Beast'
  alignment: string[];    // 'Lawful' and 'Good'; a few Servants have one word, three, or none
  // The figure the game stands in a party slot: the baked file beside the page
  // ('fgo/figures/100100.webp', cut to the plate), or its original's address on Atlas
  // Academy's file host where the build could not fetch it.
  art: string;
  jpOnly?: boolean;       // set where only the Japanese server has the Servant yet
}

// Baked in at build time, in the order of the collection numbers — no runtime fetch. Empty
// when the build could not reach Atlas Academy and had no earlier file to keep.
const servants = bundled as unknown as FgoServant[];

export function getFgoServants(): FgoServant[] {
  return servants;
}
