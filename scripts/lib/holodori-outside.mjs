// hololive talent who are not in hololive Dreams yet, recorded by hand from hololive.wiki's
// infobox of each (read 9 November 2026, the owner's pick of "hololive.wiki, by hand"): the five
// of DEV_IS FLOW GLOW and the four of ASOBI★MAWARI-TAI!. HolodoriDB's dump has the game's
// Character table and nothing past it, so a talent debuts months before the game has her; the
// sheet and the calendar list them anyway, and they open the official profile instead of a page.
//
// Active talent only: every other talent missing from the game has graduated or is a Holostars
// or UPROAR!! member, a brand the game does not carry. A new debut is one line here.
//
// Koganei Niko's birthday is 25 July as the wiki and the Japanese site give it; the English
// site printed 29 May, Isaki Riona's, by mistake.

const FLOW_GLOW = 'FLOW GLOW';
const ASOBI = 'ASOBI★MAWARI-TAI!';

// [name, short name, branch, group, birthday MM-DD, debut, fan name]
const RECORD = [
  ['Isaki Riona', 'Riona', 'DEV_IS', FLOW_GLOW, '05-29', '2024-11-09', ''],
  ['Koganei Niko', 'Niko', 'DEV_IS', FLOW_GLOW, '07-25', '2024-11-09', '25P'],
  ['Mizumiya Su', 'Su', 'DEV_IS', FLOW_GLOW, '06-16', '2024-11-09', 'SuuLis'],
  ['Rindo Chihaya', 'Chihaya', 'DEV_IS', FLOW_GLOW, '07-08', '2024-11-09', 'Nikku'],
  ['Kikirara Vivi', 'Vivi', 'DEV_IS', FLOW_GLOW, '08-27', '2024-11-09', 'Vivid'],
  ['Achichi Mela', 'Mela', 'hololive', ASOBI, '04-16', '2026-09-24', 'Mela-gumi'],
  ['Sorashina Sopia', 'Sopia', 'hololive', ASOBI, '06-13', '2026-09-24', 'SopiCrew'],
  ['Suzuna Tsuzuri', 'Tsuzuri', 'hololive', ASOBI, '06-28', '2026-09-25', 'Haitatsuin'],
  ['Hyakuto Kyoko', 'Kyoko', 'hololive', ASOBI, '05-08', '2026-09-25', 'Hyakuto Ikka'],
];

const slug = name => name.toLowerCase().replace(/ /g, '-');

/** The talent the game lacks, in the shape of a Character row, after the game's own. */
export const OUTSIDE = RECORD.map(([name, shortName, branch, group, birthday, debut, fanName]) => ({
  id: `outside-${slug(name)}`,
  name,
  shortName,
  branch,
  groups: [group],
  fanName,
  birthday,
  debut,
  greeting: '',
  colors: [],
  stickers: [],
  outside: true,
  profile: `https://hololive.hololivepro.com/en/talents/${slug(name)}/`,
}));
