import bundled from '../shared/generated/holodori/characters.json';
import bundledCards from '../shared/generated/holodori/cards.json';
import bundledGachas from '../shared/generated/holodori/gachas.json';
import bundledSongs from '../shared/generated/holodori/songs.json';
import bundledUpcoming from '../shared/generated/holodori/upcoming.json';

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
  greeting: string;   // the line her profile in the game opens with; '' if it has none
  colors: string[];   // her five colours as '#RRGGBB', the first her own
  // Her bust, cut from the game site's key art, beside the page: 'holodori/figures/<id>.webp'.
  // Absent when the build could not get it.
  art?: string;
  // Her whole key art on the game site's image host, which resizes it ('?fm=webp&w=720').
  // Absent when the build could not read the site.
  figure?: string;
  icon?: string;      // the game's round icon of her, 128px: 'holodori/icons/<id>.webp'
  // Her six membership stickers, 256px: { name: 'Sign-Up Sticker No.1', art: 'holodori/stickers/…' }.
  stickers: { name: string; art: string }[];
}

/**
 * One gacha banner, recorded by hand (scripts/lib/holodori-gachas.mjs). Times are ISO, UTC;
 * a standing gacha and a beginner's have none.
 */
export interface HolodoriGacha {
  name: string;
  gachas: string[];     // its gachas' ids without 'gacha-': the usual one, and its "Take your pick!" twin
  from?: string;
  to?: string;
  standing?: boolean;   // always on
  beginner?: boolean;   // each player's own, until used
  pickup: string[];     // the card ids it features
}

// Baked in at build time, in the game's own order — no runtime fetch. Empty when the build
// could not reach GitHub and had no earlier file to keep.
const characters = bundled as unknown as HolodoriCharacter[];

export function getHolodoriCharacters(): HolodoriCharacter[] {
  return characters;
}

/** One song of the game, from its Music table, in the game's own order. */
export interface HolodoriSong {
  id: string;           // 'm0049'
  title: string;
  singers: string;      // as the game credits them: a unit's name, or names with commas
  cast: string[];       // the singers' character ids; empty for a song the whole cast sings
  kind: 'Original' | 'Cover';
  levels: number[];     // Easy, Normal, Hard and Expert, in that order
  seconds: number;
  lyricist: string;
  composer: string;
  arranger: string;
  added: string;        // 'YYYY-MM-DD', when it came to the game
  release: string;      // 'preset' (had from the start), 'shop' (bought) or 'reward' (a quest's)
  unlock: string;       // the game's own line for a reward: 'Unlock requirement: …'; or ''
  mv: string;           // its music video on YouTube, or ''
  chorus?: [number, number];  // the part of its video the page plays, start and end in milliseconds; absent where the game has none
  estimated?: true;     // that part is a guess at the chorus (the video is not the game's cut), not the game's own window
  copyright: string;    // a licence the game credits, or ''
  jacket?: string;      // 'holodori/jackets/<id>.webp'; absent where the game's site has none
}

/** One card of the game, from its Card table, in the order the game added them. */
export interface HolodoriCard {
  id: string;
  holomem: string;      // her character id
  name: string;
  rarity: number;       // 3 to 5
  type: string;         // 'Cute', 'Pure' or 'Happy'
  outfit: string;       // the outfit it gives, or ''
  art?: string;         // its portrait, 256x363: 'holodori/card-art/<id>.webp'; absent if the build could not get it
  full?: string;        // its illustration at 1024 wide: 'holodori/card-full/<id>.webp'; the same
  asset: string;        // the card's files' name on the CDN, '00006-5-uniq-0007-00'
  movie: boolean;       // a 5-star card: it has an animation and a signature
}

/** What a bloom does: raises one skill to its second level, or every stat by `up` thousandths. */
export interface HolodoriBloom {
  kind: 'active' | 'special' | 'passive' | 'connect' | 'stats' | 'other';
  up?: number;
}

/** A voice line: its label or speaker, its text, and its audio's name on HolodoriDB's CDN. */
export interface HolodoriLine {
  label?: string;       // 'Card get', 'Bloom 1'
  holomem?: string;     // who says it, in a dialogue
  text: string;
  ja?: string;          // the same line in Japanese, a card's voice lines only
  audio: string;        // 'vo_card_cmn_00006_…'; see voiceUrl()
}

/** One card's payload, holodori/card-details/<id>.json, fetched by its page. */
export interface HolodoriCardDetail {
  id: string;
  permil: number[];     // Performance, Technique and Sense, the thousandths of the base each is
  levels: number[];     // the base stat at each level from 1
  limits: number[];     // the level cap with no limit break, then after each
  blooms: HolodoriBloom[];  // what blooms 1 to 5 do
  // Each skill's text at its two levels, in the game's markup; connect is empty on a 3-star.
  passive: string[];
  active: string[];
  special: string[];
  connect: string[];
  outfit: string;
  outfitSkill: string;
  voices: HolodoriLine[];   // empty below 5 stars
  dialogues: { title: string; lines: HolodoriLine[] }[];
}

// HolodoriDB's CDN, which serves the game's files unpacked. Only what is played from it,
// rather than baked, is asked of it at runtime: voices, the animations and the full-size art.
const CDN = 'https://cdn.holodori.dev/assets';

export const voiceUrl = (audio: string): string => `${CDN}/resources/${audio}.acb/${audio}.mp3`;
export const cardArtUrl = (asset: string): string =>
  `${CDN}/assetbundles/img_card_full_${asset}/img_card_full_${asset}_unsquished.webp`;
export const cardMovieUrl = (asset: string): string =>
  `${CDN}/resources/mov_card_full_0_${asset}.usm/mov_card_full_0_${asset}/mov_card_full_0_${asset}.mp4`;
export const cardSignUrl = (asset: string): string =>
  `${CDN}/resources/mov_card_sign_${asset}.usm/mov_card_sign_${asset}/mov_card_sign_${asset}.h264.mp4`;
// A holomem's motif sigil, 256x256 white on transparency (her `assetId`, the character id
// without its 'chr-'). The reveal's voice-line screen stands it behind the line in place of
// her fan mark, which the game shows there and the CDN has no file of that could be found
// (28 October 2026: the FanMark table names 04015 for Nerissa, and some 300 names were asked).
export const motifUrl = (asset: string): string =>
  `${CDN}/assetbundles/img_chr_motif_icon_default_main_${asset}/img_chr_motif_icon_default_main_${asset}.webp`;
// A gacha's logo, 205x128 on transparency; the ★4 ticket gacha has none.
export const gachaLogoUrl = (id: string): string =>
  `${CDN}/assetbundles/img_gacha_logo_${id}_lang-eng/img_gacha_logo_${id}_lang-eng_unsquished.webp`;

const asked = new Map<string, Promise<HolodoriCardDetail>>();

/** A card's payload, asked for once per visit to the site. */
export function fetchHolodoriCard(id: string): Promise<HolodoriCardDetail> {
  let detail = asked.get(id);
  if (!detail) {
    detail = fetch(`holodori/card-details/${encodeURIComponent(id)}.json`).then((res) => {
      if (!res.ok) throw new Error(`no baked payload for ${id}`);
      return res.json() as Promise<HolodoriCardDetail>;
    });
    // A failure is not kept: the next visit asks again.
    detail.catch(() => asked.delete(id));
    asked.set(id, detail);
  }
  return detail;
}

const songs = bundledSongs as unknown as HolodoriSong[];
const cards = bundledCards as unknown as HolodoriCard[];

export function getHolodoriSongs(): HolodoriSong[] {
  return songs;
}

export function getHolodoriCards(): HolodoriCard[] {
  return cards;
}

const gachas = bundledGachas as unknown as HolodoriGacha[];

/** The banners, newest first, then the standing and the beginner's gachas. */
export function getHolodoriGachas(): HolodoriGacha[] {
  return gachas;
}

/**
 * A ★5 the game has announced for a gacha, as hololive Dreams Lab collects the official
 * posts (scripts/build-holodori-index.mjs): its card's name and its holomem's, and when the
 * gacha opens, ISO in UTC. The dump has neither card nor gacha until it opens.
 */
export interface HolodoriPreview {
  card: string;      // 'Shady Hammock Days'
  holomem: string;   // 'Tokoyami Towa'
  from: string;
  source?: string;   // the official post, on X
}

const upcoming = bundledUpcoming as unknown as HolodoriPreview[];

/** The previews of the last 14 days before the build and after it, soonest first. */
export function getHolodoriPreviews(): HolodoriPreview[] {
  return upcoming;
}
