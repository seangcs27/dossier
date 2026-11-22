// Builds the seangcs27 "Tile S" logo set: SVG masters, lockups with outlined text, PNGs and an ICO.
// Usage: node brand/seangcs27/build.mjs <repo-root-with-node_modules> <out-dir> <jetbrains-mono.woff2>
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , modRoot, outDir, fontPath] = process.argv;
const require = createRequire(join(modRoot, 'node_modules', 'x.js'));
const sharp = require('sharp');
const fontverter = require('fontverter');
const hb = await import(pathToFileURL(join(modRoot, 'node_modules', 'harfbuzzjs', 'dist', 'index.mjs')).href);

mkdirSync(join(outDir, 'png'), { recursive: true });

// ---- Palette (the hub's ground and ink, one amber) ----
const INK = '#12141a';
const CREAM = '#ece9de';
const AMBER = '#f0a640';       // cursor on the ink tile
const AMBER_DEEP = '#c8780f';  // cursor on the cream tile

// ---- The mark, on a 32-unit grid ----
// A 5x5 S of 4-unit cells from (6,6); the empty last cell of the bottom row is the cursor.
const S5 = ['.####', '#....', '.###.', '....#', '####.'];
const CURSOR = [4, 4];

function cellsOf(gap) {
  const out = [];
  S5.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') out.push([c, r]); }));
  const rect = ([c, r]) => {
    const x = 6 + c * 4 + gap / 2, y = 6 + r * 4 + gap / 2, s = 4 - gap;
    return `<rect x="${x}" y="${y}" width="${s}" height="${s}"${gap ? ' rx="0.5"' : ''}/>`;
  };
  return { s: out.map(rect).join(''), cursor: rect(CURSOR) };
}

// small = solid cells (pixel-exact at 16, 32, 48); large = cells with thin gaps (64 and up).
const GAP = 0.45;
function markBody({ tile, s, cursor, small, square }) {
  const c = cellsOf(small ? 0 : GAP);
  const crisp = small ? ' shape-rendering="crispEdges"' : '';
  return `<rect width="32" height="32"${square ? '' : ' rx="7"'} fill="${tile}"/>` +
    `<g fill="${s}"${crisp}>${c.s}</g><g fill="${cursor}"${crisp}>${c.cursor}</g>`;
}
const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

const INK_MARK = { tile: INK, s: CREAM, cursor: AMBER };
const CREAM_MARK = { tile: CREAM, s: INK, cursor: AMBER_DEEP };

// Single colour: the tile in currentColor with the S and cursor cut out.
function monoBody() {
  const c = cellsOf(GAP);
  return `<defs><mask id="s-cut"><rect width="32" height="32" fill="#fff"/><g fill="#000">${c.s}${c.cursor}</g></mask></defs>` +
    `<rect width="32" height="32" rx="7" fill="currentColor" mask="url(#s-cut)"/>`;
}

// ---- The word, outlined from JetBrains Mono at weight 600 ----
const ttf = await fontverter.convert(readFileSync(fontPath), 'truetype');
const blob = new hb.Blob(ttf);
const face = new hb.Face(blob, 0);
const font = new hb.Font(face);
font.setVariations([new hb.Variation('wght', 600)]);
const buf = new hb.Buffer();
buf.addText('seangcs27');
buf.guessSegmentProperties();
hb.shape(font, buf);
const glyphs = buf.getGlyphInfosAndPositions();
const upem = face.upem;

const FONT_SIZE = 22;           // units, beside a 32-unit mark
const GAP_X = 11;               // space between mark and word
const scale = FONT_SIZE / upem;
const CAP = 730;                // JetBrains Mono cap height, font units
const baseline = 16 + (CAP * scale) / 2;

let pen = 0;
const glyphPaths = glyphs.map(g => {
  const d = font.glyphToPath(g.codepoint);
  const x = 32 + GAP_X + (pen + g.xOffset) * scale;
  pen += g.xAdvance;
  return d ? `<path transform="translate(${x.toFixed(3)} ${baseline.toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})" d="${d}"/>` : '';
}).join('');
const wordWidth = pen * scale;
const LOCK_W = Math.ceil(32 + GAP_X + wordWidth + 1);

const lockup = (mark, textColor) => markBody({ ...mark, small: false }) + `<g fill="${textColor}">${glyphPaths}</g>`;

// ---- Write SVGs ----
const files = {
  'mark.svg': svg(32, 32, markBody({ ...INK_MARK, small: false }), 'seangcs27'),
  'mark-cream.svg': svg(32, 32, markBody({ ...CREAM_MARK, small: false }), 'seangcs27'),
  'mark-mono.svg': svg(32, 32, monoBody(), 'seangcs27'),
  'favicon.svg': svg(32, 32, markBody({ ...INK_MARK, small: true }), 'seangcs27'),
  'lockup-on-light.svg': svg(LOCK_W, 32, lockup(INK_MARK, INK), 'seangcs27'),
  'lockup-on-dark.svg': svg(LOCK_W, 32, lockup(CREAM_MARK, CREAM), 'seangcs27')
};
for (const [name, text] of Object.entries(files)) writeFileSync(join(outDir, name), text);

// ---- PNGs: each size drawn at its own size, so 16/32/48 land on whole pixels ----
async function png(body, size, name) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">${body}</svg>`;
  const out = await sharp(Buffer.from(s), { density: 72 }).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(join(outDir, 'png', name), out);
  return out;
}
const ico = [];
for (const size of [16, 32, 48]) ico.push([size, await png(markBody({ ...INK_MARK, small: true }), size, `favicon-${size}.png`)]);
for (const size of [64, 128, 192, 256, 512]) {
  await png(markBody({ ...INK_MARK, small: false }), size, `mark-${size}.png`);
  await png(markBody({ ...CREAM_MARK, small: false }), size, `mark-cream-${size}.png`);
}
// iOS rounds the corners itself, so the touch icon is the full square.
await png(markBody({ ...INK_MARK, small: false, square: true }), 180, 'apple-touch-icon.png');

// Lockup PNGs at 2x for places that take no SVG.
for (const [name, body] of [['lockup-on-light', lockup(INK_MARK, INK)], ['lockup-on-dark', lockup(CREAM_MARK, CREAM)]]) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOCK_W} 32" width="${LOCK_W * 8}" height="256">${body}</svg>`;
  writeFileSync(join(outDir, 'png', `${name}-256h.png`), await sharp(Buffer.from(s), { density: 72 }).png({ compressionLevel: 9 }).toBuffer());
}

// ---- favicon.ico: 16, 32, 48 as PNG entries ----
const header = Buffer.alloc(6 + 16 * ico.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(ico.length, 4);
let offset = header.length;
ico.forEach(([size, data], i) => {
  const e = 6 + i * 16;
  header.writeUInt8(size, e); header.writeUInt8(size, e + 1);
  header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += data.length;
});
writeFileSync(join(outDir, 'favicon.ico'), Buffer.concat([header, ...ico.map(([, d]) => d)]));

console.log('lockup width', LOCK_W, 'glyphs', glyphs.length, 'upem', upem);
