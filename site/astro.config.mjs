import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import assets from './integrations/assets.mjs';

// Written to dist/astro, beside the webpack build's dist/web, until the cut-over (Phase 7).
// DOSSIER_BASE moves it: the deploy builds it for /dossier/next/ to stand beside the SPA.
export default defineConfig({
  site: 'https://seangcs27.github.io',
  output: 'static',
  base: process.env.DOSSIER_BASE ?? '/dossier',
  trailingSlash: 'always',
  outDir: '../dist/astro',
  integrations: [assets()],
  vite: {
    resolve: {
      // The SPA's own modules, which the pages import: '@web/render/…', '@web/shell'.
      alias: { '@web': fileURLToPath(new URL('../src/web', import.meta.url)) },
    },
    // The pages are built from the repo's own sources, which sit above this folder.
    server: { fs: { allow: ['..'] } },
    build: {
      rollupOptions: {
        output: {
          // The stylesheet goes at the site's root, as webpack's does. A relative address in a
          // custom property ('--logo: url(icons/games/arknights.webp)', in the markup and in
          // the views) is read against the stylesheet, not the page, and from _astro/ it
          // would miss.
          assetFileNames: ({ names }) => (names.some(name => name.endsWith('.css'))
            ? '[name].[hash][extname]'
            : '_astro/[name].[hash][extname]'),
        },
      },
    },
  },
});
