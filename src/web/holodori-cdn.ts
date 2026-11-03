// HolodoriDB's CDN, which serves the game's files unpacked. Only what is played from it,
// rather than baked, is asked of it at runtime: voices, the animations and the full-size art.
// Kept apart from holodori-index.ts, whose data a page that only plays a voice line (the
// holomem pages built at build time, site/) would otherwise carry.
export const CDN = 'https://cdn.holodori.dev/assets';

export const voiceUrl = (audio: string): string => `${CDN}/resources/${audio}.acb/${audio}.mp3`;
