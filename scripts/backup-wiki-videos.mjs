// Backs up the videos the pages play from the two wikis: Arknights' battle sprites and
// animated illustrations (arknights.wiki.gg) and Path to Nowhere's animated outfits
// (pathtonowhere.wiki.gg), every one a payload names. Kept as fetched, under the wiki's host
// and file name, in backup/wiki-video/ and on to the wiki-video-backup release as one tar
// (lib/release-backup.mjs). A release of its own because the source-art tar is about 1 GB
// already and a release's file may be no larger than 2 GiB. Run by hand after a build.
import { readdir, readFile } from 'node:fs/promises';
import { backupToRelease } from './lib/release-backup.mjs';

const GEN = 'src/shared/generated';

const files = new Map();
function keep(url) {
  const { host, pathname } = new URL(url);
  files.set(`${host}/${decodeURIComponent(pathname.split('/').pop())}`, { url });
}

for (const name of await readdir(`${GEN}/operator-details`)) {
  const op = JSON.parse(await readFile(`${GEN}/operator-details/${name}`, 'utf8'));
  for (const art of op.arts ?? []) [art.sprite, art.l2d].filter(Boolean).forEach(keep);
}
for (const name of await readdir(`${GEN}/ptn/sinner-details`)) {
  const sinner = JSON.parse(await readFile(`${GEN}/ptn/sinner-details/${name}`, 'utf8'));
  for (const art of sinner.arts ?? []) for (const motion of art.motions ?? []) keep(motion.url);
}

await backupToRelease({
  name: 'wiki-video',
  dir: 'backup/wiki-video',
  release: 'wiki-video-backup',
  title: 'Wiki video backup',
  notes: "The videos the pages play from arknights.wiki.gg and pathtonowhere.wiki.gg (Arknights' sprites and animated illustrations, Path to Nowhere's animated outfits), as scripts/backup-wiki-videos.mjs last fetched them.",
  files,
});
