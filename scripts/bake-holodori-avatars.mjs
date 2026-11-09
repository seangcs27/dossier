// Fetches each hololive talent's YouTube avatar and bakes it into icons/holodori/avatars/<id>.webp
// (256px, tracked): the face hololive Dreams' pages show for her, in place of the game's own
// round icon (the owner's ask of 10 November 2026, "keep a copy for asset"). Run by hand:
//
//   node scripts/bake-holodori-avatars.mjs          the talent with no file yet
//   node scripts/bake-holodori-avatars.mjs --force  every one again, for a channel that changed its avatar
//
// Not part of the build: a build that read YouTube would fail on a consent page and on a
// stalled request, and a copy in the repository does not change under a deploy. The channel of
// each is in scripts/lib/holodori-channels.mjs; the avatar is the og:image of the channel's page,
// asked for at 256px. A new debut is a line there and one run of this.
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHANNELS } from './lib/holodori-channels.mjs';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'icons', 'holodori', 'avatars');
const SIZE = 256;
const PAUSE_MS = 400;
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
  'accept-language': 'en',
  cookie: 'CONSENT=YES+1; SOCS=CAI',
};

const force = process.argv.includes('--force');
await mkdir(OUT_DIR, { recursive: true });
const have = new Set((await readdir(OUT_DIR)).map(file => file.replace(/\.webp$/, '')));
const pageOf = channel => (channel.startsWith('@') ? `https://www.youtube.com/${channel}` : `https://www.youtube.com/channel/${channel}`);

// The avatars of two talent who share a channel are fetched once.
const fetched = new Map();
async function avatarOf(channel) {
  if (!fetched.has(channel)) {
    const html = await (await fetch(pageOf(channel), { headers: HEADERS })).text();
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
    if (!og) throw new Error('the channel page has no og:image');
    const res = await fetch(og.replace(/=s\d+.*$/, `=s${SIZE}-c-k-c0x00ffffff-no-rj`), { headers: HEADERS });
    if (!res.ok) throw new Error(`avatar ${res.status}`);
    fetched.set(channel, Buffer.from(await res.arrayBuffer()));
    await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
  }
  return fetched.get(channel);
}

let baked = 0;
const failed = [];
for (const [id, name, channel] of CHANNELS) {
  if (!force && have.has(id)) continue;
  try {
    const webp = await sharp(await avatarOf(channel)).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    await writeFile(path.join(OUT_DIR, `${id}.webp`), webp);
    baked++;
    console.log(`${id} ${name}: ${webp.length} bytes`);
  } catch (err) {
    failed.push(`${id} ${name}: ${err.message}`);
  }
}
console.log(`${baked} baked, ${CHANNELS.length - baked - failed.length} kept, ${failed.length} failed`);
for (const line of failed) console.warn(line);
process.exitCode = failed.length ? 1 : 0;
