// Backs up hololive Dreams' audio and video, which the card pages play from HolodoriDB's CDN
// and nothing else keeps: every voice line and live dialogue, each 5-star card's animation
// and signature, and each card's full-size illustration (about 440 MB). Run by hand after a build, not by CI, since the
// files change only with new cards. They are kept in backup/holodori-media/ under their
// paths on the CDN, and go on to the media-backup release as one tar. That tar is fetched
// back first when the folder is empty, so a run with the CDN gone never uploads less than
// the release already had.
import { execFileSync } from 'node:child_process';
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { timedFetch } from './lib/fetch.mjs';

const GEN = 'src/shared/generated/holodori';
const DIR = 'backup/holodori-media';
const TAR = 'backup/holodori-media.tar';
const RELEASE = 'media-backup';
// The paths src/web/holodori-index.ts plays them from (voiceUrl, cardArtUrl, cardMovieUrl,
// cardSignUrl).
const CDN = 'https://cdn.holodori.dev/assets';
const voice = a => `resources/${a}.acb/${a}.mp3`;
const art = a => `assetbundles/img_card_full_${a}/img_card_full_${a}_unsquished.webp`;
const movie = a => `resources/mov_card_full_0_${a}.usm/mov_card_full_0_${a}/mov_card_full_0_${a}.mp4`;
const sign = a => `resources/mov_card_sign_${a}.usm/mov_card_sign_${a}/mov_card_sign_${a}.h264.mp4`;

const gh = (...args) => execFileSync('gh', args, { stdio: ['ignore', 'ignore', 'inherit'] });
const exists = p => access(p).then(() => true, () => false);

// 1. Every file the pages play: each card's full-size illustration, the animations of the
//    cards that have one, and every `audio` anywhere in a card's payload (voice lines, both
//    sides of a live dialogue).
const cards = JSON.parse(await readFile(`${GEN}/cards.json`, 'utf8'));
const files = new Set(cards.flatMap(c => [art(c.asset), ...(c.movie ? [movie(c.asset), sign(c.asset)] : [])]));
for (const name of await readdir(`${GEN}/card-details`)) {
  JSON.parse(await readFile(`${GEN}/card-details/${name}`, 'utf8'), (key, value) => {
    if (key === 'audio' && value) files.add(voice(value));
    return value;
  });
}

// 2. With nothing on disk, start from what the release has.
await mkdir(DIR, { recursive: true });
if (!(await readdir(DIR)).length) {
  try {
    gh('release', 'download', RELEASE, '-p', path.basename(TAR), '-O', TAR, '--clobber');
    execFileSync('tar', ['-xf', TAR, '-C', DIR]);
  } catch {
    console.log('media: no backup to start from');
  }
}

// 3. Fetch what is missing, four at a time.
const missing = [];
for (const file of files) if (!(await exists(path.join(DIR, file)))) missing.push(file);
const failed = [];
let added = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let file; (file = missing.shift());) {
    try {
      const res = await timedFetch(`${CDN}/${file}`);
      if (!res.ok) throw new Error(String(res.status));
      await mkdir(path.dirname(path.join(DIR, file)), { recursive: true });
      await writeFile(path.join(DIR, file), Buffer.from(await res.arrayBuffer()));
      added++;
    } catch (err) {
      failed.push(`${file} (${err.message})`);
    }
  }
}));
console.log(`media: ${files.size} files, ${added} fetched, ${failed.length} failed`);
if (failed.length) console.warn(failed.join('\n'));

// 4. Upload, only when something was added.
if (added) {
  execFileSync('tar', ['-cf', TAR, '-C', DIR, '.']);
  try {
    gh('release', 'view', RELEASE);
  } catch {
    gh('release', 'create', RELEASE, '--latest=false', '--title', 'Media backup',
      '--notes', "hololive Dreams' voice lines and card videos, as scripts/backup-holodori-media.mjs last fetched them.");
  }
  gh('release', 'upload', RELEASE, TAR, '--clobber');
  console.log(`media: uploaded ${path.basename(TAR)} to the ${RELEASE} release`);
}
