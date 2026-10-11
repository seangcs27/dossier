import bundled from '../shared/generated/holodori/characters.json';

/**
 * One hololive Dreams character, a hololive talent the game makes playable, baked by
 * scripts/build-holodori-index.mjs from HolodoriDB's dump of the game's Character table.
 */
export interface HolodoriCharacter {
  id: string;         // the game's own id, 'chr-00006'
  name: string;       // 'Shirakami Fubuki', the family name first where the game puts it first
  shortName: string;  // 'Fubuki'
  branch: string;     // what the game calls the production: 'hololive', 'hololive ID', 'hololive EN', 'DEV_IS'
  // The generation or unit, 'Gen 3', 'holoX', 'Myth'. One for all but Fubuki, who has
  // 'Gen 1' and 'GAMERS'.
  groups: string[];
  fanName: string;    // what the talent calls their fans, 'Sukonbu'; '' if the game has none yet
  birthday: string;   // 'MM-DD'
  debut: string;      // 'YYYY-MM-DD'
}

// Baked in at build time, in the game's own order — no runtime fetch. Empty when the build
// could not reach GitHub and had no earlier file to keep.
const characters = bundled as unknown as HolodoriCharacter[];

export function getHolodoriCharacters(): HolodoriCharacter[] {
  return characters;
}
