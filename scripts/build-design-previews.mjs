// Generates design/components/*.html — one standalone preview per component for the
// Claude Design project.
//
// Each preview inlines the REAL compiled stylesheet (dist/web/styles.css) rather than a
// hand-copied approximation, so a preview can never drift from what the app renders.
// Run after `npm run build:web`.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = path.join(root, 'dist', 'web', 'styles.css');
const outDir = path.join(root, 'design', 'components');

const CDN = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';
const avatar = id => `${CDN}/avatars/${id}.png`;
const classIcon = slug => `${CDN}/classes/class_${slug}.png`;

const card = (id, name, cls, label, stars) => `
  <a class="op-card" href="#">
    <img class="op-avatar" src="${avatar(id)}" alt="${name}" loading="lazy">
    <div class="op-info">
      <div class="op-name" title="${name}">${name}</div>
      <div class="op-meta">
        <img class="op-class-icon" src="${classIcon(cls)}" alt="${label}" title="${label}">
        <span class="op-rarity r${stars}">${'★'.repeat(stars)}</span>
      </div>
    </div>
  </a>`;

const components = [
  {
    file: 'foundations-class-glyphs.html',
    name: 'Class glyphs',
    group: 'Foundations',
    subtitle: 'The eight class icons — white on transparency, no per-class colour',
    viewport: { width: 720, height: 200 },
    body: `
      <div class="ds-row">
        ${['vanguard', 'guard', 'defender', 'sniper', 'caster', 'medic', 'supporter', 'specialist']
          .map(s => `<div class="ds-swatch"><img class="op-class-icon" style="width:22px;height:22px" src="${classIcon(s)}" alt="${s}"><code>${s}</code></div>`).join('')}
      </div>
      <div class="ds-row">
        ${['vanguard', 'sniper', 'medic'].map(s =>
          `<span class="op-class" style="font-size:11px;padding:3px 8px;border-radius:4px"><img class="op-class-icon" style="width:14px;height:14px" src="${classIcon(s)}" alt="">${s[0].toUpperCase() + s.slice(1)}</span>`).join('')}
      </div>`,
  },
  {
    file: 'foundations-colour.html',
    name: 'Colour tokens',
    group: 'Foundations',
    subtitle: 'Surface ramp and the rarity scale — the only place colour encodes meaning',
    viewport: { width: 720, height: 320 },
    body: `
      <div class="ds-row">
        ${['bg', 'surface', 'chip', 'border', 'muted', 'text', 'accent']
          .map(t => `<div class="ds-swatch"><span style="background:var(--${t})"></span><code>--${t}</code></div>`).join('')}
      </div>
      <div class="ds-row">
        ${[6, 5, 4, 3, 2, 1]
          .map(r => `<div class="ds-swatch"><span style="background:var(--r${r})"></span><code>--r${r}</code></div>`).join('')}
      </div>
      <div class="ds-row">
        ${[6, 5, 4, 3, 2, 1].map(r => `<span class="op-rarity r${r}">${'★'.repeat(r)}</span>`).join('')}
      </div>`,
  },
  {
    file: 'operator-card.html',
    name: 'Operator card',
    group: 'Components',
    subtitle: 'Grid cell — avatar, name, class glyph, rarity stars',
    viewport: { width: 720, height: 420 },
    body: `<div id="grid" style="padding:0">
      ${card('char_1045_svash2', 'SilverAsh the Reignfrost', 'vanguard', 'Vanguard', 6)}
      ${card('char_423_blemsh', 'Blemishine', 'defender', 'Defender', 6)}
      ${card('char_2014_nian', 'Nian', 'defender', 'Defender', 6)}
      ${card('char_143_ghost', 'Specter', 'guard', 'Guard', 5)}
      ${card('char_181_flower', 'Perfumer', 'medic', 'Medic', 4)}
      ${card('char_281_popka', 'Popukar', 'guard', 'Guard', 3)}
    </div>`,
  },
  {
    file: 'filter-chips.html',
    name: 'Filter chips',
    group: 'Components',
    subtitle: 'Class chips carry the game glyph and select neutrally; rarity chips carry the rarity colour',
    viewport: { width: 720, height: 260 },
    body: `
      <div class="ds-row">
        ${['vanguard', 'guard', 'defender', 'sniper'].map((s, i) =>
          `<button class="chip${i === 1 ? ' active' : ''}"><img class="chip-icon" src="${classIcon(s)}" alt="">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
      </div>`,
  },
  {
    file: 'filter-rarity-chips.html',
    name: 'Rarity chips',
    group: 'Components',
    subtitle: 'The one filter row where colour encodes the value',
    viewport: { width: 720, height: 140 },
    body: `
      <div class="ds-row">
        ${[6, 5, 4, 3, 2, 1].map(r => `<button class="chip r${r}${r >= 5 ? ' active' : ''}">${r}★</button>`).join('')}
      </div>
      <div class="ds-row">
        <button class="chip chip-action">Filters</button>
        <button class="chip chip-action active">Filters · 2</button>
        <button class="chip chip-action">Clear</button>
      </div>`,
  },
  {
    file: 'segmented-control.html',
    name: 'Segmented control',
    group: 'Components',
    subtitle: 'Elite, potential, skill level and module stage pickers',
    viewport: { width: 720, height: 240 },
    body: `
      <div class="ds-row">
        <span class="ctl-label">Elite</span>
        <div class="seg">
          <button class="seg-btn">E0</button><button class="seg-btn">E1</button><button class="seg-btn on">E2</button>
        </div>
      </div>
      <div class="ds-row">
        <span class="ctl-label">Potential</span>
        <div class="seg">
          ${[1, 2, 3, 4, 5, 6].map((p, i) => `<button class="seg-btn${i === 0 ? ' on' : ''}">P${p}</button>`).join('')}
        </div>
      </div>
      <div class="ds-row">
        <span class="ctl-label">Level</span>
        <div class="seg">
          ${['Lv1', 'Lv2', 'Lv3', 'Lv4', 'Lv5', 'Lv6', 'Lv7', 'M1', 'M2', 'M3']
            .map((l, i) => `<button class="seg-btn${i === 9 ? ' on' : ''}">${l}</button>`).join('')}
        </div>
      </div>`,
  },
  {
    file: 'stat-grid.html',
    name: 'Stat grid',
    group: 'Components',
    subtitle: 'Computed attribute tiles from the detail calculator',
    viewport: { width: 720, height: 300 },
    body: `<div class="stat-grid">
      ${[['Max HP', '3512'], ['ATK', '631'], ['DEF', '651'], ['RES', '10'],
         ['DP Cost', '22'], ['Block', '3'], ['Redeploy', '70s'], ['Attack Interval', '1.20s']]
        .map(([l, v]) => `<div class="stat"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join('')}
    </div>`,
  },
  {
    file: 'tabs.html',
    name: 'Detail tabs',
    group: 'Components',
    subtitle: 'Tab bar with attached panel, as used on the operator dossier',
    viewport: { width: 720, height: 300 },
    body: `
      <div class="tabs">
        <button class="tab on">Attributes</button>
        <button class="tab">Skills</button>
        <button class="tab">Talents</button>
        <button class="tab">Modules</button>
        <button class="tab">Potential</button>
        <button class="tab">RIIC</button>
      </div>
      <div class="tab-panel">
        <div class="mod-head">
          <div class="mod-name">Echo of Craftsman's Guild</div>
          <span class="mod-code">GUA-Y</span>
          <span class="mod-unlock">E2 · Lv60</span>
        </div>
        <div class="mod-stats">
          <span class="mod-stat">Max HP +270</span>
          <span class="mod-stat">ATK +50</span>
          <span class="mod-stat">DEF +50</span>
        </div>
        <div class="mod-trait">Reduces damage taken by 15%</div>
      </div>`,
  },
  {
    file: 'topbar.html',
    name: 'Topbar',
    group: 'Components',
    subtitle: 'Sticky header: home link, search, sort, result count',
    viewport: { width: 720, height: 200 },
    body: `
      <header style="position:static">
        <h1><a href="#">DOSSIER</a></h1>
        <input type="search" id="search" placeholder="Search operators…">
        <select id="sort">
          <option>Newest</option><option>Oldest</option>
          <option>Name A–Z</option><option>Name Z–A</option>
        </select>
        <span id="count">435 operators</span>
      </header>`,
  },
];

const page = (c, css) => `<!-- @dsCard group="${c.group}" -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${c.name}</title>
<style>
${css}
/* preview chrome only — not part of the component */
body { background: var(--bg); color: var(--text); padding: 20px; min-height: 0;
       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.ds-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; }
.ds-row:last-child { margin-bottom: 0; }
.ds-swatch { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); }
.ds-swatch span { width: 26px; height: 26px; border-radius: 5px; border: 1px solid var(--border); display: block; }
#grid { grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); }
</style>
</head>
<body>
${c.body}
</body>
</html>
`;

const css = await readFile(cssPath, 'utf8').catch(() => {
  throw new Error(`missing ${path.relative(root, cssPath)} — run "npm run build:web" first`);
});

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const c of components) {
  await writeFile(path.join(outDir, c.file), page(c, css));
}
await writeFile(
  path.join(root, 'design', 'manifest.json'),
  JSON.stringify(components.map(({ file, name, group, subtitle, viewport }) =>
    ({ path: `components/${file}`, name, group, subtitle, viewport })), null, 2),
);
console.log(`wrote ${components.length} previews -> ${path.relative(root, outDir)}`);
