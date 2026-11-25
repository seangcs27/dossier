// Backs up the videos the pages play from the two wikis: Arknights' battle sprites and
// animated illustrations (arknights.wiki.gg) and Path to Nowhere's animated outfits
// (pathtonowhere.wiki.gg), every one a payload names. Kept as fetched, under the wiki's host
// and file name, in three sets, each in backup/<set>/ and on to a release of its own as one
// tar (lib/release-backup.mjs), because a release's file may be no larger than 2 GiB and the
// two wikis' videos came to about 2.4 GiB on 24 November 2026: Arknights' 604 MiB, Path to
// Nowhere's reactions (MP4 and WebM) 1,449 MiB and its animated wallpapers (GIF) 394 MiB.
// Run by hand after a build.
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

const SETS = [
  {
    name: 'arknights-video',
    release: 'arknights-video-backup',
    title: 'Arknights video backup',
    notes: "The videos the Arknights pages play from arknights.wiki.gg (battle sprites and animated illustrations), as scripts/backup-wiki-videos.mjs last fetched them.",
    holds: key => key.startsWith('arknights.wiki.gg/'),
  },
  {
    name: 'ptn-video',
    release: 'ptn-video-backup',
    title: 'Path to Nowhere video backup',
    notes: "The videos the Path to Nowhere pages play from pathtonowhere.wiki.gg (the animated outfits' reactions, MP4 and WebM), as scripts/backup-wiki-videos.mjs last fetched them.",
    holds: key => key.startsWith('pathtonowhere.wiki.gg/') && !key.endsWith('.gif'),
  },
  {
    name: 'ptn-gif',
    release: 'ptn-gif-backup',
    title: 'Path to Nowhere GIF backup',
    notes: "The animated wallpapers (GIF) the Path to Nowhere pages play from pathtonowhere.wiki.gg, as scripts/backup-wiki-videos.mjs last fetched them.",
    holds: key => key.startsWith('pathtonowhere.wiki.gg/') && key.endsWith('.gif'),
  },
];

for (const { holds, ...set } of SETS) {
  await backupToRelease({ ...set, dir: `backup/${set.name}`, files: new Map([...files].filter(([key]) => holds(key))) });
}
