import { mountRoster, type RosterCard } from '../card';
import { getPtnSinners, type PtnSinner } from '../ptn-index';

// A rank's place among the site's rarity colours. S is the game's highest and takes 6, the
// site's red, as the highest does on every roster.
const TIER: Record<PtnSinner['rank'], number> = { S: 6, A: 5, B: 4 };

// A Sinner's own lines on the site's plate: the tendency where the class sits, the libram on
// the micro line, the birthplace up the edge as a nation is on an Arknights card, the game's
// tags on the back. It has no glyphs, since the build bakes none: the wiki has a badge for
// each tendency and each libram, to be looked at when its images are.
function toCard(s: PtnSinner): RosterCard {
  const tier = TIER[s.rank];
  return {
    // The number the game files the Sinner under, where the other rosters print an id.
    id: `MBCC-S-${s.number}`,
    name: s.name,
    tier,
    // The rank's letter at the foot of as many lines as the tier, the rest blank, so that
    // the tab's height says the rank as a column of stars does.
    marks: s.rank.padStart(tier, '\u00A0'),
    marksLabel: `Rank ${s.rank}`,
    label: s.tendency,
    serial: s.libram,
    edge: s.birthplace,
    tags: s.tags,
    art: s.art,
  };
}

export function mountPtn(container: HTMLElement): void {
  mountRoster(
    container, getPtnSinners().map(toCard), 'sinners',
    'The last build could not reach the Path to Nowhere wiki.',
  );
}
