// Backs up hololive Dreams' audio and video, which the card pages play from HolodoriDB's CDN
// and nothing else keeps: every voice line and live dialogue, each 5-star card's animation
// and signature, and each card's full-size illustration (about 440 MB). Run by hand after a
// build. They are kept in backup/holodori-media/ under their paths on the CDN, and go on to
// the media-backup release as one tar (lib/release-backup.mjs).
import { readdir, readFile } from 'node:fs/promises';
import { backupToRelease } from './lib/release-backup.mjs';

const GEN = 'src/shared/generated/holodori';
// The paths src/web/holodori-index.ts plays them from (voiceUrl, cardArtUrl, cardMovieUrl,
// cardSignUrl).
const CDN = 'https://cdn.holodori.dev/assets';
const voice = a => `resources/${a}.acb/${a}.mp3`;
const art = a => `assetbundles/img_card_full_${a}/img_card_full_${a}_unsquished.webp`;
const movie = a => `resources/mov_card_full_0_${a}.usm/mov_card_full_0_${a}/mov_card_full_0_${a}.mp4`;
const sign = a => `resources/mov_card_sign_${a}.usm/mov_card_sign_${a}/mov_card_sign_${a}.h264.mp4`;

// Every file the pages play: each card's full-size illustration, the animations of the cards
// that have one, and every `audio` anywhere in a card's payload (voice lines, both sides of
// a live dialogue).
const cards = JSON.parse(await readFile(`${GEN}/cards.json`, 'utf8'));
const paths = new Set(cards.flatMap(c => [art(c.asset), ...(c.movie ? [movie(c.asset), sign(c.asset)] : [])]));
for (const name of await readdir(`${GEN}/card-details`)) {
  JSON.parse(await readFile(`${GEN}/card-details/${name}`, 'utf8'), (key, value) => {
    if (key === 'audio' && value) paths.add(voice(value));
    return value;
  });
}

await backupToRelease({
  name: 'media',
  dir: 'backup/holodori-media',
  release: 'media-backup',
  title: 'Media backup',
  notes: "hololive Dreams' voice lines and card videos, as scripts/backup-holodori-media.mjs last fetched them.",
  files: new Map([...paths].map(p => [p, { url: `${CDN}/${p}` }])),
});
