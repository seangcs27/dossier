// What each game's pages are made from, for the footer under every page (index.html's
// #site-foot): who the data, the pictures and the words came from, game by game. showShell
// (shell.ts) fills it at each change of page. A module with no document in it, so that a
// page built at build time could draw it too.

type Link = [name: string, href: string];
interface Credit { what: string; from: Link[]; }
interface GameCredits { owners: string; credits: Credit[]; }

export type FooterGame = 'arknights' | 'endfield' | 'ptn' | 'holodori' | 'fgo';

const CREDITS: Record<FooterGame, GameCredits> = {
  arknights: {
    owners: 'Hypergryph and Yostar',
    credits: [
      { what: 'Game data', from: [['ArknightsGamedata', 'https://github.com/ArknightsAssets/ArknightsGamedata']] },
      { what: 'Release dates, events, CN-only text', from: [['Arknights Terra Wiki (arknights.wiki.gg)', 'https://arknights.wiki.gg']] },
      { what: 'Release order', from: [['Sanity Gone', 'https://sanitygone.help']] },
      {
        what: 'Translations and art lists',
        from: [['AN-EN-Tags', 'https://github.com/PuppiizSunniiz/AN-EN-Tags'], ['Arknight-Images', 'https://github.com/PuppiizSunniiz/Arknight-Images']],
      },
      { what: 'Portraits', from: [['ArknightsGameResource', 'https://github.com/yuanyan3060/ArknightsGameResource']] },
      {
        what: 'Layout after',
        from: [['Sanity Gone (dossier, stat icons)', 'https://github.com/SanityGoneAK/sanity-gone'], ['Arkpedia (schedule)', 'https://arkpedia.net']],
      },
    ],
  },
  endfield: {
    owners: 'Hypergryph and GRYPHLINE',
    credits: [
      { what: 'Operators, pictures and files', from: [['Arknights: Endfield Wiki (endfield.wiki.gg)', 'https://endfield.wiki.gg']] },
    ],
  },
  ptn: {
    owners: "Path to Nowhere's developer and publishers",
    credits: [
      { what: 'Sinners, art and files', from: [['Path to Nowhere Wiki (pathtonowhere.wiki.gg)', 'https://pathtonowhere.wiki.gg']] },
      { what: 'Chinese names, text and CN-only Sinners', from: [['Path to Nowhere Wiki on Bilibili', 'https://wiki.biligame.com/wqmt']] },
      { what: 'Release record', from: [['S1N', 'https://s1n.gg']] },
    ],
  },
  holodori: {
    owners: 'COVER Corp., QualiArts and Aiming',
    credits: [
      { what: 'Data, and art, video and voices from its CDN', from: [['HolodoriDB', 'https://github.com/HolodoriDB']] },
      { what: 'Key art and jackets', from: [['hololive Dreams official site', 'https://www.hololive-dreams.com/en/']] },
      { what: 'Gachas, and card numbers checked against', from: [['holodori.best', 'https://holodori.best']] },
      {
        what: 'Announcements',
        from: [['hololive Dreams Lab', 'https://dreams.wf-calc.net/wiki/game-updates?lang=en'], ['Steam', 'https://store.steampowered.com/news/app/4282500']],
      },
      { what: 'Talent the game lacks', from: [['hololive Fan Wiki', 'https://hololive.wiki']] },
      { what: 'Chorus clips (played from the official music videos) and channel avatars', from: [['YouTube', 'https://www.youtube.com']] },
      {
        what: 'Holojan guide: facts, and the rules after',
        from: [['Holojan official site', 'https://www.holo-jong.com/'], ['COVER', 'https://hololivepro.com/news/20261009-01-309/'], ['Mahjong Soul', 'https://mahjongsoul.yo-star.com/']],
      },
    ],
  },
  fgo: {
    owners: 'TYPE-MOON, Aniplex and Delightworks',
    credits: [
      {
        what: 'Servants and art',
        from: [['Atlas Academy', 'https://atlasacademy.io'], ['ODC-BY 1.0', 'https://opendatacommons.org/licenses/by/1-0/']],
      },
    ],
  },
};

const links = (from: Link[]): string =>
  from.map(([name, href]) => `<a href="${href}" target="_blank" rel="noopener">${name}</a>`).join(', ');

/** The footer's credit list and its disclaimer for a game, as markup for #foot-credits and #foot-note. */
export function footerHtml(game: FooterGame): { credits: string; note: string } {
  const { owners, credits } = CREDITS[game];
  return {
    credits: credits.map(c => `<li><span class="foot-what">${c.what}</span> ${links(c.from)}</li>`).join(''),
    note: `Dossier is a fan-made, unofficial site and is not affiliated with ${owners}. All game art, names and trademarks belong to their owners.`,
  };
}
