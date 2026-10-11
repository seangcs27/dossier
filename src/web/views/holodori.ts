import { mountRoster, type RosterCard } from '../card';
import { getHolodoriCharacters, type HolodoriCharacter } from '../holodori-index';

// Dates as the schedule writes them, 'Sep 13, 2020'. An entry's dates are calendar days
// with no hour to them, so they are read and written in UTC and no reader's zone moves one.
const debutDay = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
});
const birthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

// A talent's own lines on the site's plate: the generation or unit where the class sits,
// the debut on the micro line, the branch up the edge, the birthday on the back.
//
// The game ranks no talent above another: its rarity is its cards', and every talent's
// best card is the same five stars. So the tab is one colour on every card, and reads the
// year of the debut instead. That colour is the lowest tier's, the plainest the site has:
// colour says rarity here and nothing else, and this tab says none.
function toCard(c: HolodoriCharacter): RosterCard {
  const year = c.debut.slice(0, 4);
  return {
    id: c.id,
    name: c.name,
    tier: 1,
    marks: year,
    marksLabel: `Debuted in ${year}`,
    label: c.groups.join(' · '),
    serial: `Debut ${debutDay.format(new Date(c.debut))}`,
    edge: c.branch,
    // In 2000 because it was a leap year: Hakos Baelz's birthday is February 29.
    tags: [`Birthday ${birthDay.format(new Date(`2000-${c.birthday}`))}`],
  };
}

export function mountHolodori(container: HTMLElement): void {
  // 'holomems' is the game's own word for its cast, in its English text and on its site.
  // 'Character' is its table's name and no more.
  mountRoster(container, {
    items: getHolodoriCharacters(),
    toCard,
    noun: 'holomems',
    emptyNote: 'The last build could not reach the game data on GitHub.',
  });
}
