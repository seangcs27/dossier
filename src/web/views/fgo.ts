import { mountRoster, type RosterCard } from '../card';
import { getFgoServants, type FgoServant } from '../fgo-index';

// A Servant's own lines on the site's plate: the class where the class sits, its number in
// the game's Spirit Origin List as the serial, the attribute up the edge, the alignment on
// the back. The game's stars go on the site's colours from the top, so a 5★ is red here as
// every game's highest is; Aŋra Mainiiu, the one Servant with no star, gets the lowest
// colour and a 0 on the tab.
function toCard(s: FgoServant): RosterCard {
  // 'Altria Pendragon (Santa Alter)' is one Altria of several, and what is in the brackets
  // goes on the epithet's line as an Arknights alter's does. Not where it only names the
  // class, 'Altria Pendragon (Lancer)': the line below already says that. The eight with
  // a first name (fgo-index.ts) have it there instead.
  const variant = /^(.+) \((.+)\)$/.exec(s.name);
  return {
    id: String(s.id),
    name: variant ? variant[1] : s.name,
    epithet: variant && variant[2] !== s.class ? variant[2] : s.alias,
    tier: s.rarity + 1,
    marks: '★'.repeat(s.rarity) || '0',
    marksLabel: `Rarity: ${s.rarity}`,
    label: s.class,
    serial: `No. ${String(s.collectionNo).padStart(3, '0')}${s.jpOnly ? ' · JP only' : ''}`,
    edge: s.attribute,
    tags: s.alignment,
    art: s.art,
  };
}

export function mountFgo(container: HTMLElement): void {
  mountRoster(
    container, getFgoServants().map(toCard), 'servants',
    'The last build could not reach Atlas Academy.',
  );
}
