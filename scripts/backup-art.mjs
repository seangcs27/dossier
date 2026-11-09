// Backs up the art the pages load from other hosts and no build bakes, whichever game it is
// of (the site's source art, as against dossier's own images the deploy backs up): Arknights'
// illustrations, outfit avatars, module illustrations and skill, base-skill and module-type
// icons (PuppiizSunniiz/Arknight-Images, a community mirror), Path to Nowhere's prints (its
// two wikis) and hololive Dreams' key art (its site's image host). Endfield and Fate/Grand
// Order have none: the build bakes theirs. Run by hand after a build. The illustrations and
// prints are kept as the art viewer's largest size, 2048px wide WebP, since the originals are
// about 5.5 GB; the rest are kept as they are. They go to backup/source-art/ and on to the
// source-art-backup release as one tar (lib/release-backup.mjs).
import { readdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { backupToRelease } from './lib/release-backup.mjs';

const GEN = 'src/shared/generated';
// src/shared/api/hella-api.ts's IMAGE_BASE, and the paths its helpers ask it for.
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
  const at = prefix === 'ark' ? decodeURIComponent(pathname).replace(/^.*?[@/]main\//, '') : `${host}${decodeURIComponent(pathname)}`;
  files.set(`${prefix}/${at.replace(/\.\w+$/, '')}.webp`, { url, convert: toViewerSize });
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
// A holomem's key art is a picture on the official site's image host, which her page asks for.
for (const c of JSON.parse(await readFile(`${GEN}/holodori/characters.json`, 'utf8'))) {
  if (c.figure) resized('holodori', c.figure);
}

await backupToRelease({
  name: 'source-art',
  dir: 'backup/source-art',
  release: 'source-art-backup',
  title: 'Source art backup',
  notes: "The art the pages load from other hosts (Arknights, Path to Nowhere, hololive Dreams), as scripts/backup-art.mjs last fetched it.",
  files,
});
