import { mountRoster, newRosterState, type RosterCard } from '../card';
import { getPtnSinners, type PtnSinner } from '../ptn-index';

// A rank's place among the site's rarity colours. S is the game's highest and takes 6, the
// site's red, as the highest does on every roster.
export const PTN_TIER: Record<PtnSinner['rank'], number> = { S: 6, A: 5, B: 4 };

// The game's six tendencies, in the order its own roster lists them.
const TENDENCIES = ['Endura', 'Fury', 'Umbra', 'Reticle', 'Arcane', 'Catalyst'];

// This page's search and picks, kept across visits.
const state = newRosterState();

// A Sinner's own lines on the site's plate: the tendency where the class sits, the libram on
// the micro line, the birthplace up the edge as a nation is on an Arknights card, the game's
// tags on the back. It has no glyphs, since the build bakes none: the wiki has a badge for
// each tendency and each libram, to be looked at when its images are.
function toCard(s: PtnSinner): RosterCard {
  const tier = PTN_TIER[s.rank];
  return {
    // The number the game files the Sinner under, where the other rosters print an id.
    id: `MBCC-S-${s.number}`,
    name: s.name,
    tier,
    // The rank's letter at the foot of as many lines as the tier, the rest blank, so that
    // the tab's height says the rank as a column of stars does.
    marks: s.rank.padStart(tier, ' '),
    marksLabel: `Rank ${s.rank}`,
    label: s.tendency,
    serial: s.libram,
    edge: s.birthplace,
    tags: s.tags,
    art: s.art,
    href: `#/ptn/sinner/${encodeURIComponent(s.id)}`,
  };
}

// A group's values as the roster has them, by name: nothing ranks a libram or a tag.
function distinct(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function mountPtn(container: HTMLElement): void {
  const sinners = getPtnSinners();
  mountRoster(container, {
    items: sinners,
    toCard,
    noun: 'sinners',
    emptyNote: 'The last build could not reach the Path to Nowhere wiki.',
    cta: 'View sinner',
    // The groups the game's Chinese wiki filters its own roster by (rank, tendency, faction,
    // tags), as far as the English one has them. A Sinner is found by name or by number.
    find: {
      state,
      text: s => `${s.name} MBCC-S-${s.number}`,
      filters: [
        { key: 'rank', label: 'Rank', values: ['S', 'A', 'B'], look: 'ranks', tier: r => PTN_TIER[r as PtnSinner['rank']], of: s => s.rank },
        { key: 'tendency', label: 'Tendency', values: TENDENCIES, look: 'tiles', across: 3, of: s => s.tendency },
        { key: 'libram', label: 'Libram', values: distinct(sinners.map(s => s.libram)), look: 'chips', of: s => s.libram },
        // 47 of them, longer than everything above it put together.
        { key: 'tag', label: 'Tags', values: distinct(sinners.flatMap(s => s.tags)), look: 'chips', of: s => s.tags, folded: true },
      ],
    },
  });
}
