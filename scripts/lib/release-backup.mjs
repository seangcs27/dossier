// Backs files the site loads from other hosts up to a GitHub release, as one tar. Run by
// hand, not by CI: the files change only when a game adds something. Each file is kept in
// `dir` under the path it is given, and fetched only when it is missing there; with `dir`
// empty, the release's tar is unpacked into it first, so a run with a source gone never
// uploads less than the release already had. It uploads only when something was fetched.
// `gh` has to be signed in to the repository.
import { execFileSync } from 'node:child_process';
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { timedFetch } from './fetch.mjs';

const gh = (...args) => execFileSync('gh', args, { stdio: ['ignore', 'ignore', 'inherit'] });
const exists = p => access(p).then(() => true, () => false);

// `files` maps each path under `dir` to the address it is fetched from and, where the file
// is kept in another form, the function that makes that form of the fetched bytes.
export async function backupToRelease({ name, dir, release, title, notes, files }) {
  const tar = `${dir}.tar`;

  // 1. With nothing on disk, start from what the release has.
  await mkdir(dir, { recursive: true });
  if (!(await readdir(dir)).length) {
    try {
      gh('release', 'download', release, '-p', path.basename(tar), '-O', tar, '--clobber');
      execFileSync('tar', ['-xf', tar, '-C', dir]);
    } catch {
      console.log(`${name}: no backup to start from`);
    }
  }

  // 2. Fetch what is missing, four at a time.
  const missing = [];
  for (const file of files.keys()) if (!(await exists(path.join(dir, file)))) missing.push(file);
  const failed = [];
  let added = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let file; (file = missing.shift());) {
      const { url, convert } = files.get(file);
      try {
        const res = await timedFetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const bytes = Buffer.from(await res.arrayBuffer());
        await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
        await writeFile(path.join(dir, file), convert ? await convert(bytes) : bytes);
        added++;
      } catch (err) {
        failed.push(`${url} (${err.message})`);
      }
    }
  }));
  console.log(`${name}: ${files.size} files, ${added} fetched, ${failed.length} failed`);
  if (failed.length) console.warn(failed.join('\n'));

  // 3. Upload, only when something was added.
  if (!added) return;
  execFileSync('tar', ['-cf', tar, '-C', dir, '.']);
  try {
    gh('release', 'view', release);
  } catch {
    gh('release', 'create', release, '--latest=false', '--title', title, '--notes', notes);
  }
  gh('release', 'upload', release, tar, '--clobber');
  console.log(`${name}: uploaded ${path.basename(tar)} to the ${release} release`);
}
