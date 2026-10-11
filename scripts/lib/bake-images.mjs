// Card art for the roster-only games, downloaded once and kept: each picture is fetched
// from its source, cut and re-encoded to WebP by the script that asks, and written beside
// the roster. The win is the Arknights portraits' (build-operator-index.mjs): a card's
// picture is wanted by that one card, so from the source's own host it is nearly always a
// cold fetch of a PNG several times the size.
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { timedFetch } from './fetch.mjs';

// How many are fetched at a time. One by one, a first build's few hundred took minutes;
// more than a handful at once is how a build gets itself throttled.
const AT_ONCE = 4;
// A summary line names what could not be had, up to this many.
const NAMED = 6;

// Bakes the images of one set that are not already on disk. An image is { name, url,
// label }: the file it is baked as, where its original is, and what the summary line calls
// it. `encode` is handed the download and gives back the WebP to write. Gives back the
// names that are on disk afterwards; an image that could not be had is not among them,
// and whatever shows it has to fall back.
//
// Files already there are kept, not fetched again, so a picture redrawn at the source
// never reaches the site: delete the directory to refresh it.
export async function bakeImages(set, dir, images, encode) {
  await mkdir(dir, { recursive: true });
  const onDisk = new Set(await readdir(dir));
  const missing = images.filter(img => !onDisk.has(`${img.name}.webp`));
  const failed = [];
  for (let i = 0; i < missing.length; i += AT_ONCE) {
    await Promise.all(missing.slice(i, i + AT_ONCE).map(async img => {
      try {
        const res = await timedFetch(img.url);
        if (!res.ok) throw new Error(String(res.status));
        const webp = await encode(Buffer.from(await res.arrayBuffer()));
        await writeFile(path.join(dir, `${img.name}.webp`), webp);
        onDisk.add(`${img.name}.webp`);
      } catch (err) {
        failed.push(`${img.label} (${err.message})`);
      }
    }));
  }
  const have = images.filter(img => onDisk.has(`${img.name}.webp`)).map(img => img.name);
  const unnamed = failed.length - NAMED;
  console.log(
    `${set}: ${have.length}/${images.length} (${missing.length - failed.length} new)` +
    `${failed.length ? ` — missing ${failed.slice(0, NAMED).join(', ')}${unnamed > 0 ? ` and ${unnamed} more` : ''}` : ''}` +
    ` -> ${path.relative(process.cwd(), dir)}`,
  );
  return new Set(have);
}
