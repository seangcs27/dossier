// Backs up the art the dossiers load from other hosts and no build bakes: Arknights'
// illustrations, outfit avatars, module illustrations and skill, base-skill and module-type
// icons (PuppiizSunniiz/Arknight-Images, a community mirror), and Path to Nowhere's prints
// (its two wikis). Run by hand after a build. The illustrations and prints are kept as the
// art viewer's largest size, 2048px wide WebP, since the originals are about 5.5 GB; the rest
// are kept as they are. They go to backup/art/ and on to the art-backup release as one tar
// (lib/release-backup.mjs).
import { readdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { backupToRelease } from './lib/release-backup.mjs';

const GEN = 'src/shared/generated';
// The repository src/shared/api/hella-api.ts's IMAGE_BASE serves, and the paths its helpers
// ask it for, fetched from GitHub itself: jsdelivr answers 403 for files the repository has
// (new outfits, a new module), and for others now and then.
const JSDELIVR = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';
const IMAGE_BASE = 'https://raw.githubusercontent.com/PuppiizSunniiz/Arknight-Images/main';
// artUrl()'s largest use, the art viewer's.
const toViewerSize = bytes => sharp(bytes).resize({ width: 2048, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();

const files = new Map();
// A file kept as fetched, under its path on the mirror. Some modules name no type badge.
function keep(dir, stem) {
  if (stem) files.set(`ark/${dir}/${stem}.png`, { url: `${IMAGE_BASE}/${dir}/${encodeURIComponent(stem)}.png` });
}
// A file kept at the viewer's size, under its host and path, as WebP.
function resized(prefix, url) {
  const { host, pathname } = new URL(url);
  const at = prefix === 'ark' ? decodeURIComponent(pathname).replace(/^.*?@main\//, '') : `${host}${decodeURIComponent(pathname)}`;
  files.set(`${prefix}/${at.replace(/\.\w+$/, '')}.webp`, { url: url.replace(JSDELIVR, IMAGE_BASE), convert: toViewerSize });
}

for (const name of await readdir(`${GEN}/operator-details`)) {
  const op = JSON.parse(await readFile(`${GEN}/operator-details/${name}`, 'utf8'));
  keep('avatars', op.id);
  for (const art of op.arts ?? []) {
    resized('ark', art.url);
    if (art.suffix !== '1') keep('avatars', `${op.id}_${art.suffix}`);
  }
  for (const skill of op.skills ?? []) keep('skills', `skill_icon_${skill.excel.iconId ?? skill.excel.skillId}`);
  for (const mod of op.modules ?? []) {
    keep('equip/type', mod.info.typeIcon);
    keep('equip/icon', mod.info.uniEquipId);
  }
  for (const base of op.bases ?? []) keep('ui/infrastructure/skill', base.skill.skillIcon);
}
for (const name of await readdir(`${GEN}/ptn/sinner-details`)) {
  const sinner = JSON.parse(await readFile(`${GEN}/ptn/sinner-details/${name}`, 'utf8'));
  for (const art of sinner.arts ?? []) resized('ptn', art.url);
}

await backupToRelease({
  name: 'art',
  dir: 'backup/art',
  release: 'art-backup',
  title: 'Art backup',
  notes: "The art the Arknights and Path to Nowhere dossiers load from other hosts, as scripts/backup-art.mjs last fetched it.",
  files,
});
