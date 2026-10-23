// The files a page reads beside itself (icons, art, payloads) are copied from the same places
// webpack.web.js copies them from, read out of its CopyPlugin, so the two targets cannot
// disagree about what is there. Written into the build at the end, and served from where
// they are while `astro dev` runs.
import { cp, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TYPES = { '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function copyPatterns() {
  const webpackWeb = createRequire(import.meta.url)(path.join(root, 'webpack.web.js'));
  const copy = webpackWeb.plugins.find(plugin => plugin.patterns);
  // The page itself is Astro's now.
  return copy.patterns.filter(({ from }) => from !== 'src/web/index.html');
}

export default function assets() {
  const patterns = copyPatterns();
  return {
    name: 'dossier-assets',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        for (const { from, to, noErrorOnMissing } of patterns) {
          try {
            await cp(path.join(root, from), path.join(fileURLToPath(dir), to), { recursive: true });
          } catch (err) {
            if (!(noErrorOnMissing && err.code === 'ENOENT')) throw err;
          }
        }
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          // Vite has taken the base off the address by the time it gets here.
          const rest = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1);
          const pattern = patterns.find(({ to }) => rest.startsWith(`${to}/`));
          if (!pattern) return next();
          const file = path.join(root, pattern.from, rest.slice(pattern.to.length + 1));
          if (!(await stat(file).then(info => info.isFile(), () => false))) return next();
          res.setHeader('content-type', TYPES[path.extname(file)] ?? 'application/octet-stream');
          createReadStream(file).pipe(res);
        });
      },
    },
  };
}
