// Wiš'adel has 7 official square crops in icons/: the in-game "game#9" avatar
// (plain, no suffix — also what manifest.json and the static fallback markup use)
// and the 6 expressions from her April Fools 2026 emoticon set (see design/source/).
// Picking one at random per page load gives the header logo and favicon some
// variety without needing a build-time choice. Hovering the header logo rolls again, and
// goes on rolling for as long as the pointer rests on it.
//
// The avatar is a cut-out with nothing behind it, where the six expressions came on a red
// patterned square, and in the rotation it was the odd one out. So the logo has its own
// copy of it (-1) on that square, rebuilt from the six: its frame from the lines along
// their edges, its field from what shows round their shared silhouette. The plain file is
// left as it was for the extension's toolbar and the fallback markup.
//
// Four games have a face of their own. hololive Dreams' logo is hololive's triangle in white
// on the game's blue (icons/logo-holodori.webp, as in its sidebar tile) until the pointer is
// on it: then Kronie, Ouro Kronii's blue clock bear (icons/holodori-kronie.webp), and now and
// then, one roll in INA_ODDS, an Ina'nis chibi that is animated (icons/holodori-ina.webp; both
// 96px tiles on the album's pale sky). It goes back to the triangle when the pointer leaves,
// and rolls more slowly than the others, since a face wants looking at. Endfield, Path to
// Nowhere and Fate/Grand Order wear their sidebar emblem in white on a square of a colour of
// ours (icons/logo-<game>.webp: charcoal, red, blue; one face each, so nothing to roll), and
// with a mouse on Path to Nowhere's, one roll in DUCK_ODDS, it is the duck of its April Fools
// 2025 (icons/ptn-duck.webp, the game's own "Ga" avatar) until the mouse leaves.

/** One face the logo can wear: where its picture is at each size the page asks for. */
interface Face {
  id: string;
  src(size: 16 | 32 | 48 | 96): string;
}

const wisadel: Face[] = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: `w${n}`, src: size => `icons/icon-${size}-${n}.png` }));
const hololive: Face = { id: 'hololive', src: () => 'icons/logo-holodori.webp' };
const kronie: Face = { id: 'kronie', src: () => 'icons/holodori-kronie.webp' };
const ina: Face = { id: 'ina', src: () => 'icons/holodori-ina.webp' };
const emblem = (name: string): Face => ({ id: name, src: () => `icons/logo-${name}.webp` });
const duck: Face = { id: 'duck', src: () => 'icons/ptn-duck.webp' };

// How often, while it rests there.
const HOVER_ROLL_MS = 1000;
const HOLODORI_ROLL_MS = 2500;
// One roll in this many is the duck, on Path to Nowhere, and the Ina chibi, on hololive Dreams.
const DUCK_ODDS = 20;
const INA_ODDS = 8;

interface Look {
  faces: Face[];                         // what a roll picks from
  rollMs: number;
  rare?: { face: Face; odds: number };   // one roll in `odds` is this instead
  home?: Face;                           // worn at rest; a roll only comes with the pointer on the logo
}

const DEFAULT_LOOK: Look = { faces: wisadel, rollMs: HOVER_ROLL_MS };
const ptnEmblem = emblem('ptn');
const LOOKS: Record<string, Look> = {
  holodori: { faces: [kronie], rollMs: HOLODORI_ROLL_MS, rare: { face: ina, odds: INA_ODDS }, home: hololive },
  endfield: { faces: [emblem('endfield')], rollMs: HOVER_ROLL_MS },
  fgo: { faces: [emblem('fgo')], rollMs: HOVER_ROLL_MS },
  ptn: { faces: [ptnEmblem], rollMs: HOVER_ROLL_MS, rare: { face: duck, odds: DUCK_ODDS }, home: ptnEmblem },
};

let game = '';
let look = DEFAULT_LOOK;
let current: Face | undefined;

function wear(face: Face): void {
  current = face;
  const logoMark = document.querySelector<HTMLImageElement>('.logo-mark');
  if (logoMark) logoMark.src = face.src(48);

  for (const size of [16, 32, 96] as const) {
    const link = document.querySelector<HTMLLinkElement>(`link[rel="icon"][sizes="${size}x${size}"]`);
    if (!link) continue;
    link.href = face.src(size);
    link.type = link.href.endsWith('.webp') ? 'image/webp' : 'image/png';
  }
}

// Never repeats the face on show, so every hover visibly changes it, where there is a
// second face to change to: a game with one face and no rare one just keeps it.
function rollLogo(): void {
  const changes = look.faces.length > 1;
  let face = current;
  do {
    face = look.rare && Math.random() < 1 / look.rare.odds
      ? look.rare.face
      : look.faces[Math.floor(Math.random() * look.faces.length)];
  } while (changes && face === current);
  wear(face);
}

/** The page belongs to `name`'s game (arknights, endfield, ptn, holodori, fgo): its logo rolls from that game's faces. */
export function setLogoGame(name: string): void {
  if (name === game) return;
  game = name;
  look = LOOKS[name] ?? DEFAULT_LOOK;
  current = undefined;
  if (look.home) wear(look.home);
  else rollLogo();
}

export function applyRandomLogo(): void {
  const logoMark = document.querySelector<HTMLImageElement>('.logo-mark');
  logoMark?.addEventListener('mouseenter', rollLogo);

  // A mouse only: a finger's tap arrives the same way and never leaves, so on a phone the
  // face would go on changing by itself until something else was touched.
  let rolling: number | undefined;
  logoMark?.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    window.clearInterval(rolling);
    rolling = window.setInterval(rollLogo, look.rollMs);
  });
  logoMark?.addEventListener('pointerleave', (e) => {
    window.clearInterval(rolling);
    if (e.pointerType === 'mouse' && look.home) wear(look.home);
  });
}
