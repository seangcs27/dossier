// What nothing the Path to Nowhere build reads can tell it, recorded by hand: the day each
// Sinner was released, and the files of the Sinners the game has released and the wiki has
// not yet written a page for.
//
// Both were read off S1N (s1n.gg) on 12 October 2026, the owner's reference for this game,
// and are kept by hand from there on, as the Arknights mode-only operators' places are
// (mode-order.mjs). Recorded, not fetched each build: the site has these on its pages and
// nowhere a script is meant to read, and states no terms for one to follow.
//
// The wiki has no release dates at all: no field for one on a Sinner's page, a Patch
// History page that is a table's header, and an Arrests page that leaves the later
// banners undated. A day earlier the roster's Newest order was made from what it does
// have, the day a Sinner's pictures were first uploaded, which was right for 97% of pairs
// and had 11 Sinners more than 60 days out (Lysandra by 320) and nothing to say of anyone
// before 2024.

// The day the Global server opened, which is every launch Sinner's.
export const LAUNCH_DAY = '2022-10-27';

// The 45 who were there that day, by rank and then name, as the wiki titles them: the tail
// of S1N's Sinners page under its Release sort, below the first Sinner any banner added.
export const LAUNCH = [
  'Zoya', 'Bai Yi', 'Crache', 'Demon', 'Eirene', 'Hamel', 'Langley', 'NOX', 'Summer',
  'Anne', 'Ariel', 'Chameleon', 'Cinnabar', 'Chelsea', 'Dolly', 'Hecate', 'Horo', 'Ignis',
  'Iron', 'Luvia Ray', 'Mr. Fox', 'Ninety-Nine', 'Oliver', 'Pacassi', 'Pricilla', 'Roulecca',
  'Sumire', 'Tetra', 'Victoria', 'Wendy', 'Wolverine',
  'Che', 'Demolia', 'EMP', 'Flora', 'Gekkabijin', 'Hella', 'Joan', 'Kelvin', 'K.K.',
  'Labyrinth', 'Lisa', 'Macchiato', 'Peggy', 'Pepper',
];

// Every release since, oldest first: the day of the first Global banner a Sinner stood on,
// from the Archive tab of S1N's Banners page, and who it added. Where the wiki's Arrests
// page dates the same banner the two agree to the day (40 Sinners of the 51 it dates; the
// other 11 are ones whose first banner it left undated).
//
// A new batch is one line added here, with its Sinners as the wiki titles their pages. A
// Sinner the roster has and this has not is taken to be newer than everything in it: they
// sort first, with no date, and the build names them.
export const RELEASES = [
  ['2022-11-10', ['Stargazer', 'Kawa-kawa']],
  ['2022-12-20', ['Serpent', 'Mess']],
  ['2023-01-17', ['Enfer', 'McQueen']],
  ['2023-03-07', ['Oak Casket', 'Dudu']],
  ['2023-04-11', ['OwO', 'Lynn', 'Deren']],
  ['2023-05-16', ['Etti', 'Levy']],
  ['2023-06-20', ['Raven', 'Corso']],
  ['2023-07-18', ['Dreya', 'Uni']],
  ['2023-08-15', ['Adela', 'Letta']],
  ['2023-09-12', ['Cabernet', 'Lamia']],
  ['2023-10-13', ['Rahu', 'Garofano']],
  ['2023-10-27', ['Coquelic', 'Christina', 'Shalom']],
  ['2023-11-28', ['Mantis', 'Cassia']],
  ['2023-12-19', ['Eleven', 'Nino']],
  ['2024-01-12', ['Eve', 'Eureka']],
  ['2024-02-06', ['Donald', 'Matilda']],
  ['2024-03-12', ['Lady Pearl', 'Echo']],
  ['2024-04-08', ['Vanilla', 'Thistle']],
  ['2024-04-30', ['Du Ruo', 'Yanyan', 'Yao']],
  ['2024-06-06', ['Angell', 'Golan']],
  ['2024-07-09', ['Bianca', 'Shawn']],
  ['2024-08-06', ['Hestia', 'Jane']],
  ['2024-09-10', ['L.L.', 'Shrooma']],
  ['2024-10-22', ['Moore', 'Rise', '000']],
  ['2024-11-26', ['Korryn', 'Mira']],
  ['2024-12-31', ['Vautour Bleu', 'Dove']],
  ['2025-01-23', ['Pylgia', 'Zephyr']],
  ['2025-02-27', ['Jelena', 'Pine']],
  ['2025-04-15', ['Yugu', 'Wuhuanzi', 'Yingying']],
  ['2025-05-27', ['Graves', 'Luminita']],
  ['2025-06-24', ['Hypatia', 'Lysandra']],
  ['2025-07-22', ['Parfait', 'Thalia', 'Jasmine']],
  ['2025-08-26', ['Shin', 'Poffy']],
  ['2025-09-23', ['Milly', 'Cassian']],
  ['2025-10-21', ['Synex', 'Thani']],
  ['2025-11-04', ['Augustus', 'Siglinde', 'Necresta·Hella']],
  ['2025-12-02', ['Ceto', 'Ark']],
  ['2025-12-24', ['Hilda']],
  ['2026-01-15', ['Irrheia', 'Rumina']],
  ['2026-02-11', ['Rust', 'Helga', 'Margaret']],
  ['2026-03-13', ['Kisugi Rui', 'Kisugi Ai', 'Kisugi Hitomi']],
  ['2026-04-08', ['Lichen']],
  ['2026-05-07', ['Jichuan', 'Ayiguo', 'Xiaofeng']],
  ['2026-06-11', ['Clementine', 'Forensica']],
  ['2026-07-10', ['Murphy', 'Norma']],
  ['2026-08-07', ['Isomer', 'Pixel', 'Celine']],
  ['2026-09-10', ['Chengxiao']],
  ['2026-10-08', ['Phanuel', 'Evie']],
];

// Sinners the game has released whom the wiki has pictures of (or, for Pixel, an icon) and
// no page: the head of a file, as S1N's own page for each has it, in the wiki's words for
// the same fields. Enough to stand them on the roster's wall. Their skills, shackles and
// documents are left for the wiki to write: once it has a Sinner's page, that page is read
// and the entry here is not.
export const UNFILED = [
  {
    name: 'Norma', number: '256', rank: 'A', tendency: 'Umbra', libram: 'LOVE', birthplace: 'Eastside', height: 172,
    tags: ['Core DMG', 'Invisibility Removal', 'Slow Down', 'Skill DMG', 'Physical DMG', 'Physical DMG Support'],
  },
  {
    name: 'Isomer', number: '930', rank: 'S', tendency: 'Arcane', libram: 'DEATH', birthplace: 'Eastside', height: 174,
    tags: ['Core DMG', 'Skill DMG', 'Magic DMG'],
  },
  {
    name: 'Pixel', number: '403', rank: 'A', tendency: 'Reticle', libram: 'PESTILENCE', birthplace: 'Eastside', height: 165,
    tags: ['Skill DMG', 'Physical DMG Support', 'Physical DMG'],
  },
  {
    name: 'Phanuel', number: '502', rank: 'S', tendency: 'Umbra', libram: 'DEATH', birthplace: 'Eastside', height: 164,
    tags: ['Skill DMG Support', 'Core DMG', 'Frostbite', 'Skill DMG', 'ATK Support', 'Slow Down'],
  },
  {
    name: 'Evie', number: '996', rank: 'A', tendency: 'Arcane', libram: 'LOVE', birthplace: 'Eastside', height: 167,
    tags: ['ATK Support', 'Frostbite', 'Skill DMG', 'Magic DMG', 'Magic DMG Support'],
  },
];
