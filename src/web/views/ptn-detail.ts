// A Sinner's dossier, the page a card on the Path to Nowhere roster opens.
//
// What it shows, and in what order, is the page the game's Chinese wiki gives a Sinner
// (wiki.biligame.com/wqmt, the owner's reference): basic information, the exclusive
// crimebrand, attributes, then skills, shackles, compliance and materials, and the file.
// What it is built from is this site's own: the Arknights dossier's page (detail.ts has the
// reasoning behind the layout), its panel, tabs, entries and fact lists. That wiki's long
// page of tables becomes five tabs, one for each of its sections.
//
// The header is the roster's entry, which the bundle already has; everything under the tabs
// is the Sinner's own payload, fetched when the page opens.
//
// The art column is the game's own gallery, the owner's ask for this game's design: every
// picture the game has of the Sinner down a rail (the original, the phase-up art, the
// mugshot, the interrogation's pictures, each attire), the one picked shown large, and a
// press on it opening the viewer the Arknights art opens. It starts on whichever of the
// mugshot and the original the roster's cards were showing. The pictures are the wiki's
// own files, megabytes each, asked for through the resizing proxy at the size shown.

import { artUrl } from '../../shared/api/hella-api';
import { openArtViewer } from '../art-viewer';
import { crumbsHtml, descriptionToHtml, escHtml } from '../format';
import { fetchPtnSinner, getPtnSinners, type PtnArt, type PtnSinner, type PtnSinnerDetail } from '../ptn-index';
import { PTN_TIER, ptnRoster } from './ptn';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'skills', label: 'Skills' },
  { id: 'brand', label: 'Crimebrand' },
  { id: 'shackles', label: 'Shackles' },
  { id: 'file', label: 'File' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// The tab on show, kept from one Sinner to the next: comparing two Sinners' skills is one
// press, not three.
let tab: TabId = 'profile';

const rich = (text: string): string => descriptionToHtml(text);

// The Arknights header without its faction badge: the rank where the stars are, the serif
// name with the number the game files the Sinner under where an alter's epithet goes, and
// tendency and libram in the row that holds class and branch there.
function headerHtml(s: PtnSinner): string {
  return `
    <div class="op-rarity-strip r${PTN_TIER[s.rank]}">
      <span class="visually-hidden">Rank ${s.rank}</span>
      <span class="strip-star" aria-hidden="true">${s.rank}</span>
    </div>
    <div class="op-header ptn-header">
      <h1 class="op-header-name">${escHtml(s.name)}<span class="alter"> MBCC-S-${escHtml(s.number)}</span></h1>
      <div class="op-header-classes">
        <span class="hdr-item">${escHtml(s.tendency)}</span>
        <span class="hdr-item">${escHtml(s.libram)}</span>
      </div>
    </div>
  `;
}

// The art column: the rail, the picture picked, and its caption, which for an attire leads
// with its collection (the rest are named for what they are). Until the payload is here
// there is no list to turn through, and the picture is the card's own.
function splashHtml(s: PtnSinner, arts: PtnArt[], picked: number): string {
  if (!arts.length) {
    return `<div class="splash">${s.art ? `<img class="splash-img" src="${escHtml(s.art)}" alt="${escHtml(s.name)}" fetchpriority="high">` : ''}</div>`;
  }
  const art = arts[picked];
  return `
    <div class="splash">
      ${arts.length > 1 ? `
        <div class="splash-rail" role="tablist" aria-label="Artwork">
          ${arts.map((a, i) => `
            <button class="splash-thumb${i === picked ? ' on' : ''}" data-art="${i}"
                    role="tab" aria-selected="${i === picked}" data-tip="${escHtml(a.label)}">
              <img src="${artUrl(a.url, 128)}" alt="${escHtml(a.label)}" loading="lazy" decoding="async">
            </button>
          `).join('')}
        </div>
      ` : ''}
      <img class="splash-img" src="${artUrl(art.url, 1024)}" alt="${escHtml(art.label)}"
           fetchpriority="high" decoding="async"
           data-art-open role="button" tabindex="0" aria-label="Open ${escHtml(art.label)} at full size"
           onerror="this.onerror=null;this.src='${art.url.replace(/'/g, '%27')}'">
      <div class="splash-caption">
        ${art.collection ? `<span class="section-label">${escHtml(art.collection)}</span>` : ''}
        <span class="splash-name">${escHtml(art.label)}</span>
        ${art.rarity ? `<span class="splash-artist" aria-label="${art.rarity} stars">${'★'.repeat(art.rarity)}</span>` : ''}
      </div>
    </div>
  `;
}

function factsHtml(facts: [string, string][]): string {
  return `
    <dl class="fact-list">
      ${facts.filter(([, value]) => value).map(([label, value]) =>
        `<div><dt>${escHtml(label)}</dt><dd>${escHtml(value)}</dd></div>`).join('')}
    </dl>
  `;
}

// A skill's later levels: the level, then what it changes from the one before.
function levelsHtml(levels: string[]): string {
  if (levels.length < 2) return '';
  return `
    <dl class="ptn-levels">
      ${levels.slice(1).map((text, i) => `<div><dt>Lv ${i + 2}</dt><dd class="rich">${rich(text)}</dd></div>`).join('')}
    </dl>
  `;
}

// Basic information and attributes: the first two tables of the reference's page.
function profilePanel(s: PtnSinner, d: PtnSinnerDetail): string {
  const first = d.stats[0];
  const last = d.stats[d.stats.length - 1];
  // 'First level / highest level the wiki has', as the reference prints a stat.
  const stat = (key: 'hp' | 'atk' | 'def' | 'res'): string =>
    first ? `${first[key]} / ${last[key]}` : '—';
  const rows: [string, string][] = [
    ['HP', stat('hp')], ['ATK', stat('atk')], ['DEF', stat('def')], ['RES', stat('res')],
    ['Block', d.block || '—'], ['ATK Speed', d.attackSpeed || '—'],
  ];
  const tags = s.tags.map(t => `<span class="op-tag">${escHtml(t)}</span>`).join('');
  return `
    ${d.bio ? `<p class="rich file-text">${escHtml(d.bio)}</p>` : ''}
    ${factsHtml([
      ['Number', `MBCC-S-${s.number}`],
      ['Rank', s.rank],
      ['Tendency', s.tendency],
      ['Libram', s.libram],
      ['Birthplace', s.birthplace],
      ['Ability', d.ability],
    ])}
    ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
    <section class="entry">
      <div class="entry-head">
        <h2 class="entry-name">Attributes</h2>
        ${first ? `<span class="unlock-badge">Lv ${first.level} / Lv ${last.level}</span>` : ''}
      </div>
      <dl class="stat-list">
        ${rows.map(([label, value]) => `<div class="stat-row"><dt><span>${label}</span></dt><dd>${escHtml(value)}</dd></div>`).join('')}
      </dl>
    </section>
    ${d.trait ? `<section class="entry"><h2 class="entry-name">Trait</h2><p class="rich">${rich(d.trait)}</p></section>` : ''}
    ${d.mania.text ? `
      <section class="entry">
        <div class="entry-head">
          <h2 class="entry-name">${escHtml(d.mania.name || 'Mania Intensify')}</h2>
          ${d.mania.name ? '<span class="unlock-badge">Mania Intensify</span>' : ''}
        </div>
        <p class="rich">${rich(d.mania.text)}</p>
      </section>
    ` : ''}
  `;
}

function skillsPanel(d: PtnSinnerDetail): string {
  if (!d.skills.length) return `<p class="empty-msg">The wiki has not written up this Sinner's skills yet.</p>`;
  return d.skills.map(skill => `
    <section class="entry">
      <div class="entry-head">
        <h2 class="entry-name">${escHtml(skill.name)}</h2>
        <span class="unlock-badge">${skill.kind}</span>
      </div>
      <p class="rich">${rich(skill.levels[0] ?? '')}</p>
      ${levelsHtml(skill.levels)}
    </section>
  `).join('');
}

// The exclusive crimebrand: its name, and the skill it grants with that skill's levels.
function brandPanel(d: PtnSinnerDetail): string {
  if (!d.brand.name) return `<p class="empty-msg">The wiki names no exclusive crimebrand for this Sinner.</p>`;
  const skill = d.brand.skill;
  return `
    <section class="entry">
      <div class="entry-head">
        <h2 class="entry-name">${escHtml(d.brand.name)}</h2>
        <span class="unlock-badge">Exclusive crimebrand</span>
      </div>
      ${skill ? `
        <span class="section-label">${escHtml(skill.name)}</span>
        <p class="rich">${rich(skill.levels[0] ?? '')}</p>
        ${levelsHtml(skill.levels)}
      ` : `<p class="empty-msg">The wiki has not written up what this crimebrand grants.</p>`}
    </section>
  `;
}

// Shackles, then what the reference keeps beside them: compliance and materials.
function shacklesPanel(d: PtnSinnerDetail): string {
  const materials: [string, string][] = [
    ['Phase-up', d.materials.phase.join(', ')],
    ['Skill upgrades', d.materials.skill],
    ['DisSea', d.materials.disSea],
  ];
  return `
    ${d.shackles.map((shackle, i) => `
      <section class="entry">
        <div class="entry-head">
          <h2 class="entry-name">${escHtml(shackle.name)}</h2>
          <span class="unlock-badge">Shackle ${i + 1}</span>
        </div>
        <p class="rich">${rich(shackle.text)}</p>
      </section>
    `).join('')}
    <section class="entry">
      <h2 class="entry-name">Compliance</h2>
      ${factsHtml([
        ...d.compliance.map((text, i): [string, string] => [`${(i + 1) * 10}%`, text]),
        ['100%', d.sticker && `Sticker: ${d.sticker}`],
      ])}
    </section>
    <section class="entry">
      <h2 class="entry-name">Materials</h2>
      ${factsHtml(materials)}
    </section>
  `;
}

// The file: who the Sinner is, then each document under the wiki's own heading for it,
// folded away as the Arknights archive files are, since they tell the story.
function filePanel(s: PtnSinner, d: PtnSinnerDetail): string {
  const names = [d.names.cn, d.names.jp, d.names.kr].filter(Boolean).join(' · ');
  return `
    ${factsHtml([
      ['Gender', d.gender],
      ['Birthday', d.birthday],
      ['Height', d.height],
      ['Birthplace', s.birthplace],
      ['Ability', d.ability],
      ['Case', d.case],
      ['Other names', names],
      ['Voice', d.voice.join(', ')],
    ])}
    ${d.file.map(entry => `
      <details class="file-entry">
        <summary>${escHtml(entry.title)}</summary>
        <p class="rich file-text">${rich(entry.text)}</p>
      </details>
    `).join('')}
  `;
}

function panelHtml(s: PtnSinner, d: PtnSinnerDetail): string {
  switch (tab) {
    case 'profile': return profilePanel(s, d);
    case 'skills': return skillsPanel(d);
    case 'brand': return brandPanel(d);
    case 'shackles': return shacklesPanel(d);
    case 'file': return filePanel(s, d);
  }
}

// `detail` is undefined while the payload is on its way and null when it could not be had.
// `picked` is the picture on show, among the payload's.
function shellHtml(s: PtnSinner, detail: PtnSinnerDetail | null | undefined, picked: number): string {
  const panel = detail
    ? panelHtml(s, detail)
    : `<p class="empty-msg">${detail === null ? 'This Sinner\'s file could not be loaded.' : 'Loading…'}</p>`;
  return `
    <div class="detail">
      ${s.art ? `<div class="detail-bg" style="background-image:url('${escHtml(s.art)}')"></div>` : ''}
      <div class="detail-body">
        <div class="detail-art-col">
          ${crumbsHtml(s.name, '#/ptn', 'Sinners')}
          ${splashHtml(s, detail?.arts ?? [], picked)}
        </div>
        <div class="detail-data-col">
          <section class="op-panel">
            ${headerHtml(s)}
            <div class="op-tabs" role="tablist">
              ${TABS.map(t => `
                <button class="op-tab${t.id === tab ? ' on' : ''}" role="tab"
                        aria-selected="${t.id === tab}" data-tab="${t.id}">${t.label}</button>
              `).join('')}
            </div>
            <div class="op-tabpanel">${panel}</div>
          </section>
        </div>
      </div>
    </div>
  `;
}

export function mountPtnDetail(container: HTMLElement, id: string): void {
  // The search box, its filters and the count are a roster's: put away here as they are on
  // the Arknights dossier.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  const sinner = getPtnSinners().find(s => s.id === id);
  if (!sinner) {
    container.innerHTML = `
      <div class="detail">
        <div class="detail-body detail-body-error">
          ${crumbsHtml(undefined, '#/ptn', 'Sinners')}
          <div class="state-msg"><div class="label">Unknown Sinner</div>No file found for <code>${escHtml(id)}</code>.</div>
        </div>
      </div>
    `;
    return;
  }

  let detail: PtnSinnerDetail | null | undefined;
  let picked = 0;
  let root: Element | null = null;
  const render = (): void => {
    container.innerHTML = shellHtml(sinner, detail, picked);
    root = container.firstElementChild;
    // Bound to this render's own page, not to the container every view shares: a handler
    // left there would answer a press on the Arknights dossier's tabs too.
    root?.addEventListener('click', (ev) => {
      const target = ev.target as Element;
      const tabButton = target.closest<HTMLElement>('[data-tab]');
      if (tabButton) {
        tab = tabButton.dataset.tab as TabId;
        render();
        container.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus();
        return;
      }
      const thumb = target.closest<HTMLElement>('[data-art]');
      if (thumb) {
        picked = Number(thumb.dataset.art);
        render();
        container.querySelector<HTMLElement>(`[data-art="${picked}"]`)?.focus();
        return;
      }
      if (target.closest('[data-art-open]')) openViewer();
    });
    // The picture is a button to the keyboard too.
    root?.querySelector<HTMLElement>('[data-art-open]')?.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      openViewer();
    });
  };
  // The Arknights viewer, on this game's pictures: its pieces are that game's type, which
  // wants an outfit's code and an illustrator this one has none of, and its thumbnails are
  // asked of the proxy since there are no outfit avatars to show. The page follows the
  // viewer to whichever picture it closed on.
  const openViewer = (): void => {
    const arts = detail?.arts ?? [];
    if (!arts.length) return;
    openArtViewer(
      sinner.id, arts.map(a => ({ suffix: a.kind, label: a.label, artist: null, url: a.url })), picked,
      (index) => { picked = index; render(); },
      art => artUrl(art.url, 128),
    );
  };
  render();
  // A card is pressed from anywhere down the roster, and the window would stay that far down.
  window.scrollTo(0, 0);

  // If the page has been left by the time the file arrives, it is not this one's to draw.
  const arrived = (file: PtnSinnerDetail | null): void => {
    if (!root?.isConnected) return;
    detail = file;
    // On the picture the roster's cards were showing, where the Sinner has it.
    picked = Math.max(0, (file?.arts ?? []).findIndex(a => a.kind === (ptnRoster.look || 'mugshot')));
    render();
  };
  fetchPtnSinner(id).then(arrived, () => arrived(null));
}
