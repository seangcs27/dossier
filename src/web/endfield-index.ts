import bundled from '../shared/generated/endfield/operators.json';

/**
 * One Arknights: Endfield operator, baked by scripts/build-endfield-index.mjs from the
 * Endfield wiki's Operators table.
 */
export interface EndfieldOperator {
  id: string;         // the game's own id, 'chr_0025_ardelia'; it names the portrait file
  name: string;
  // Set where two operators share a name: the Endministrator's 'Male' and 'Female' forms.
  variant?: string;
  rarity: number;     // 4 to 6
  class: string;      // 'Guard', 'Caster', 'Striker', …
  element: string;    // 'Physical', 'Heat', 'Cryo', 'Electric', 'Nature'
  weapon: string;     // 'Sword', 'Great Sword', 'Polearm', 'Handcannon', 'Arts Unit'
  faction: string;
  tags: string[];
}

// Baked in at build time, highest rarity first — no runtime fetch. Empty when the build
// could not reach the wiki and had no earlier file to keep.
const operators = bundled as unknown as EndfieldOperator[];

export function getEndfieldOperators(): EndfieldOperator[] {
  return operators;
}
