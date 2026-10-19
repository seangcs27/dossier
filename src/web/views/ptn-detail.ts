// A Sinner's dossier, the page a figure on the Path to Nowhere roster's wall opens.
//
// What its file shows, and in what order, is the page the game's Chinese wiki gives a
// Sinner (wiki.biligame.com/wqmt, the owner's reference): basic information, the exclusive
// crimebrand, attributes, then skills, shackles, compliance and materials, and the file.
// That wiki's long page of tables becomes six tabs, one for each of its sections, built
// from the Arknights dossier's panel, tabs, entries and fact lists (detail.ts has the
// reasoning behind those).
//
// The page is in the roster's world (_ptn.scss): down its left the wall goes on, with this
// one Sinner standing against it at nearly the window's height, their height marked on it.
// The owner's ask for this game's design was every picture the game has of a Sinner, and
// they are a row of small frames on the wall's floor: the original, the phase-up art, the
// mugshot, the interrogation's pictures, each attire. The mugshot and the original stand
// on the floor, as they do on the roster; every other is a scene, and hangs on the wall as
// a print. A press on either opens the viewer the Arknights art opens. It starts on
// whichever of the mugshot and the original the roster was showing.
//
// The header and the first figure are the roster's entry, which the bundle already has;
// everything under the tabs, and the list of pictures, is the Sinner's own payload, fetched
// when the page opens. The two pictures that stand are baked; the rest are the wiki's own
// files, megabytes each, asked for through the resizing proxy.

import { artUrl } from '../../shared/api/hella-api';
import { openArtViewer } from '../art-viewer';
import { crumbsHtml, descriptionToHtml, escHtml } from '../format';
import {
  fetchPtnSinner, getPtnSinners, type PtnArt, type PtnCost, type PtnFigure, type PtnPhase, type PtnRange, type PtnSinner,
  type PtnSinnerDetail,
} from '../ptn-index';
import {
  codeOf, dayOf, libramName, nameOf, PTN_LANGS, ptnLang, rankName, setPtnLang, t, tagsOf, tendencyName,
  type PtnLang,
} from '../ptn-lang';
import { ptnRoster } from './ptn';

// Each tab and the word for it (ptn-lang.ts has it in both languages).
const TABS = [
  { id: 'profile', label: 'tabProfile' },
  { id: 'skills', label: 'tabSkills' },
  { id: 'phase', label: 'tabPhase' },
  { id: 'brand', label: 'tabBrand' },
  { id: 'shackles', label: 'tabShackles' },
  { id: 'file', label: 'tabFile' },
] as const;
type TabId = (typeof TABS)[number]['id'];

// The tab on show, kept from one Sinner to the next: comparing two Sinners' skills is one
// press, not three.
let tab: TabId = 'profile';

const rich = (text: string): string => descriptionToHtml(text);

// The file's head, set as the placard the Sinner stood over on the roster's wall, at a
// page's size: the number, the name, the rank beside both, the tendency and the libram.
function headerHtml(s: PtnSinner): string {
  return `
    <header class="file-head">
      <span class="file-no">${escHtml(codeOf(s))}</span>
      <h1 class="file-name">${escHtml(nameOf(s))}</h1>
      <span class="file-rank" aria-hidden="true">${s.rank}</span>
      <span class="file-kind">${escHtml(tendencyName(s.tendency))} · ${escHtml(libramName(s.libram))}<span class="visually-hidden">, ${escHtml(rankName(s.rank))}</span></span>
    </header>
  `;
}

// ── The wall ──

// What the wall stands a Sinner at when their file gives no height, which none lacks today:
// the roster's median.
const USUAL_CM = 166;

// How much taller than the Sinner this page's wall is: a hand of wall over the head, for
// the mark at their height to stand clear of the top. The roster's wall is one scale for
// everybody, 210 cm to a row, so that they can be told apart by height; here there is one
// of them, and the scale is theirs, so that they fill the wall whoever they are.
const HEADROOM = 1.08;

/** A picture as the wall shows it: standing on the floor, or hung on the wall as a print. */
interface Shown {
  label: string;
  collection?: string;
  rarity?: number;
  // One of the two the build has baked whole and cut to the figure.
  stand?: PtnFigure;
  // Any other, through the proxy, with the wiki's own file for when the proxy fails.
  print?: { src: string; raw: string };
}

// A picture's name in the language that is on: this site's word for the three every Sinner
// has, and the wiki's own for an attire or an interrogation, which it gives in English only.
function labelOf(art: PtnArt): string {
  if (art.kind === 'original') return t('artOriginal');
  if (art.kind === 'phase') return t('artPhase');
  if (art.kind === 'mugshot') return t('artMugshot');
  return art.label;
}

// The roster's own two pictures of a Sinner, which the build has baked whole.
function bakedOf(s: PtnSinner, kind: PtnArt['kind']): PtnFigure | undefined {
  if (kind === 'mugshot') return s.figure;
  if (kind === 'original') return s.figureOriginal;
  return undefined;
}

// Only the two baked pictures stand. The rest hang, the attires and the phase-up art with
// the interrogation's: they were to stand too, and turned out to be scenes as wide as they
// are tall, the Sinner among effects and scenery with no floor to put their feet on. The
// proxy is asked to cut away any empty margin, so that the frame holds the picture.
function shownOf(s: PtnSinner, art: PtnArt): Shown {
  const { collection, rarity } = art;
  const label = labelOf(art);
  const stand = bakedOf(s, art.kind);
  return stand
    ? { label, stand }
    : { label, collection, rarity, print: { src: `${artUrl(art.url, 1024)}&trim=10`, raw: art.url } };
}

// Before the payload is here there is no list of pictures: the wall stands the one the
// roster was showing, from the roster's own entry, or the other where a Sinner has only one.
function firstShown(s: PtnSinner): Shown | undefined {
  const original = ptnRoster.look === 'original' ? s.figureOriginal ?? s.figure : s.figure ?? s.figureOriginal;
  return original && { label: t(original === s.figure ? 'artMugshot' : 'artOriginal'), stand: original };
}

// A rule every 10 cm from the floor to the top of the wall, each with its numeral, the
// fifties heavier. Real elements, where the roster's are a background: there is one row
// here, and they can be set in the placard's own face.
function rulesHtml(top: number): string {
  let rules = '';
  for (let cm = 10; cm < top; cm += 10) {
    rules += `<span class="cell-rule${cm % 50 ? '' : ' strong'}" style="--at: ${cm}"><b>${cm}</b></span>`;
  }
  return rules;
}

// The thumbnail in a frame on the floor: the baked figure where there is one, which the
// page has by then, and otherwise the proxy's smallest.
function thumbOf(s: PtnSinner, art: PtnArt): string {
  return bakedOf(s, art.kind)?.art ?? artUrl(art.url, 128);
}

// The wall with the Sinner on it, and on its floor the name of the picture on show (an
// attire's led by its collection) over a frame for each picture there is.
function wallHtml(s: PtnSinner, arts: PtnArt[], picked: number): string {
  const cm = s.height ?? USUAL_CM;
  const top = Math.round(cm * HEADROOM);
  const shown = arts.length ? shownOf(s, arts[picked]) : firstShown(s);
  // The viewer wants the list, so a picture is not pressed until the list is here.
  const press = arts.length ? `data-art-open aria-label="${escHtml(`${t('open')} ${shown?.label ?? ''} ${t('openFull')}`)}"` : 'disabled';
  let picture = `<span class="cell-stand none"><span class="cell-fig">${t('noPhoto')}</span></span>`;
  if (shown?.stand) {
    picture = `
      <button class="cell-stand" ${press}>
        <img class="cell-fig" src="${escHtml(shown.stand.art)}" alt="${escHtml(`${nameOf(s)}, ${shown.label}`)}"
             style="aspect-ratio: ${shown.stand.ratio}" fetchpriority="high" decoding="async">
      </button>
    `;
  } else if (shown?.print) {
    picture = `
      <button class="cell-print" ${press}>
        <img src="${escHtml(shown.print.src)}" alt="${escHtml(`${nameOf(s)}, ${shown.label}`)}" fetchpriority="high" decoding="async"
             onerror="this.onerror=null;this.src='${shown.print.raw.replace(/'/g, '%27')}'">
      </button>
    `;
  }
  return `
    <div class="cell" style="--cm: ${cm}; --top-cm: ${top}">
      <div class="cell-rules" aria-hidden="true">${rulesHtml(top)}</div>
      <span class="cell-mark"><b>${cm} cm</b></span>
      ${picture}
      <div class="cell-floor">
        <p class="cell-caption">
          ${shown?.collection ? `<span class="cell-collection">${escHtml(shown.collection)}</span>` : ''}
          <span class="cell-title">${escHtml(shown?.label ?? t('noPictures'))}</span>
          ${shown?.rarity ? `<span class="cell-stars" aria-label="${shown.rarity} stars">${'★'.repeat(shown.rarity)}</span>` : ''}
        </p>
        ${arts.length > 1 ? `
          <div class="exhibits" role="tablist" aria-label="${t('pictures')}">
            ${arts.map((a, i) => `
              <button class="exhibit${i === picked ? ' on' : ''}" data-art="${i}"
                      role="tab" aria-selected="${i === picked}" data-tip="${escHtml(labelOf(a))}">
                <img src="${escHtml(thumbOf(s, a))}" alt="${escHtml(labelOf(a))}" loading="lazy" decoding="async">
              </button>
            `).join('')}
          </div>
        ` : ''}
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
    [t('hp'), stat('hp')], [t('atk'), stat('atk')], [t('def'), stat('def')], [t('res'), stat('res')],
    [t('block'), d.block || '—'], [t('atkSpeed'), d.attackSpeed || '—'],
  ];
  const tags = tagsOf(s).map(tag => `<span class="op-tag">${escHtml(tag)}</span>`).join('');
  return `
    ${d.bio ? `<p class="rich file-text">${escHtml(d.bio)}</p>` : ''}
    ${factsHtml([
      [t('number'), codeOf(s)],
      [t('rank'), rankName(s.rank)],
      [t('tendency'), tendencyName(s.tendency)],
      [t('libram'), libramName(s.libram)],
      [t('birthplace'), d.birthplace || s.birthplace],
      [t('title'), d.title ?? ''],
      [t('ability'), d.ability],
      [t('damageType'), d.damageType ? t(`dmg${d.damageType}`) : ''],
      [t('released'), s.released ? dayOf(s.released) : ''],
      [t('releasedCn'), s.cnOnly && s.releasedCn ? dayOf(s.releasedCn) : d.releasedCn ? dayOf(d.releasedCn) : ''],
      [t('reworked'), d.reworked ? t('yes') : ''],
    ])}
    ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
    <section class="entry">
      <div class="entry-head">
        <h2 class="entry-name">${t('attributes')}</h2>
        ${first ? `<span class="unlock-badge">Lv ${first.level} / Lv ${last.level}</span>` : ''}
      </div>
      <dl class="stat-list">
        ${rows.map(([label, value]) => `<div class="stat-row"><dt><span>${label}</span></dt><dd>${escHtml(value)}</dd></div>`).join('')}
      </dl>
      <p class="ptn-note">${t('overflow')}</p>
    </section>
    ${d.trait ? `<section class="entry"><h2 class="entry-name">${t('trait')}</h2><p class="rich">${rich(d.trait)}</p></section>` : ''}
    ${d.mania.text ? `
      <section class="entry">
        <div class="entry-head">
          <h2 class="entry-name">${escHtml(d.mania.name || t('mania'))}</h2>
          ${d.mania.name ? `<span class="unlock-badge">${t('mania')}</span>` : ''}
        </div>
        <p class="rich">${rich(d.mania.text)}</p>
      </section>
    ` : ''}
    ${(d.extras ?? []).map(extra => `
      <section class="entry"><h2 class="entry-name">${escHtml(extra.name)}</h2><p class="rich">${rich(extra.text)}</p></section>
    `).join('')}
    ${d.dream ? `
      <section class="entry">
        <div class="entry-head">
          <h2 class="entry-name">${escHtml(d.dream.name)}</h2>
          <span class="unlock-badge">${t('dream')}${d.dream.kind ? ` · ${escHtml(d.dream.kind)}` : ''}</span>
        </div>
        <p class="rich">${rich(d.dream.text)}</p>
      </section>
    ` : ''}
  `;
}

// Each term a text names, explained, under a heading of its own name.
function termsHtml(terms: PtnSinnerDetail['terms']): string {
  return (terms ?? []).map(term => `
    <span class="section-label">${escHtml(term.name)}</span>
    <p class="rich">${rich(term.text)}</p>
  `).join('');
}

const KIND_KEY = { 'Basic Attack': 'kindBasic', Ultimate: 'kindUltimate', Passive: 'kindPassive' } as const;

// A picture the Chinese wiki shows beside its text (a skill's icon, a shackle's, the
// crimebrand's, a material's): its own file, asked of the proxy at twice the size shown.
function iconHtml(url: string | undefined, cls: string, size: number): string {
  return url
    ? `<img class="${cls}" src="${escHtml(artUrl(url, size * 2))}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
    : '';
}

const CELL: Record<string, string> = { '#': 'active', o: 'op', t: 'target' };

// A skill's range as the wiki draws it, a grid to each shape, an arrow before one the last
// becomes. Its rows are set from the left, as the wiki's are.
function rangesHtml(ranges: PtnRange[] | undefined): string {
  if (!ranges?.length) return '';
  return `
    <div class="ptn-ranges">
      <span class="section-label">${t('range')}</span>
      <div class="ptn-range-row">
        ${ranges.map((range) => {
          const width = Math.max(...range.rows.map(row => row.length));
          const cells = range.rows.map(row => row.padEnd(width, '.')).join('').split('')
            .map(cell => `<span class="range-cell range-${CELL[cell] ?? 'empty'}"></span>`).join('');
          return `
            ${range.step ? '<span class="ptn-range-arrow" aria-hidden="true">→</span>' : ''}
            <figure class="ptn-range">
              ${range.note ? `<figcaption>${escHtml(range.note)}</figcaption>` : ''}
              <div class="range-grid" style="grid-template-columns: repeat(${width}, 14px)">${cells}</div>
              ${range.times ? `<span class="ptn-range-times">×${range.times}</span>` : ''}
            </figure>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// The wiki's frame colours, as this site's rarity tiers: grey to gold.
const TIER: Record<PtnCost['tier'], number> = { 灰: 1, 绿: 2, 蓝: 3, 紫: 4, 金: 5 };
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact' });

// Items as the Arknights dossier's material discs (styles.scss), squared off in this world.
function costsHtml(costs: PtnCost[]): string {
  return `<ul class="cost-list">${costs.map(c => `
    <li class="cost cost-r${TIER[c.tier]}" data-tip="${escHtml(`${c.item} ×${c.count.toLocaleString('en-US')}`)}">
      ${iconHtml(c.icon, 'cost-icon', 52)}
      <span class="cost-count">${COMPACT.format(c.count)}</span>
      <span class="visually-hidden">${escHtml(c.item)}</span>
    </li>
  `).join('')}</ul>`;
}

function skillsPanel(d: PtnSinnerDetail): string {
  if (!d.skills.length) return `<p class="empty-msg">${t('noSkills')}</p>`;
  return d.skills.map(skill => `
    <section class="entry">
      <div class="entry-head">
        ${iconHtml(skill.icon, 'ptn-icon', 40)}
        <h2 class="entry-name">${escHtml(skill.name)}</h2>
        <span class="unlock-badge">${t(KIND_KEY[skill.kind])}</span>
        ${skill.energy !== undefined ? `<span class="unlock-badge">${t('energy')} ${skill.energy}</span>` : ''}
        ${skill.core ? `<span class="unlock-badge">${t('coreDmg')} ${skill.core}</span>` : ''}
      </div>
      <p class="rich">${rich(skill.levels[0] ?? '')}</p>
      ${rangesHtml(skill.ranges)}
      ${levelsHtml(skill.levels)}
    </section>
  `).join('') + (d.terms?.length ? `<section class="entry"><h2 class="entry-name">${t('terms')}</h2>${termsHtml(d.terms)}</section>` : '');
}

// The exclusive crimebrand: its name, and the skill it grants with that skill's levels. The
// Chinese wiki's is its effect alone, unnamed, a grant named inside the text, and then each
// term that text names, explained: the skill, and what it summons or lays down.
function brandPanel(d: PtnSinnerDetail): string {
  if (!d.brand.name) return `<p class="empty-msg">${t('noBrand')}</p>`;
  const skill = d.brand.skill;
  return `
    <section class="entry">
      ${iconHtml(d.brand.image, 'ptn-brand-art', 160)}
      <div class="entry-head">
        <h2 class="entry-name">${escHtml(d.brand.name)}</h2>
        <span class="unlock-badge">${t('exclusiveBrand')}</span>
      </div>
      ${d.brand.quote ? `<blockquote class="ptn-quote rich">${rich(d.brand.quote)}</blockquote>` : ''}
      ${skill ? `
        ${skill.name ? `<span class="section-label">${escHtml(skill.name)}</span>` : ''}
        <p class="rich">${rich(skill.levels[0] ?? '')}</p>
        ${levelsHtml(skill.levels)}
      ` : `<p class="empty-msg">${t('noBrandSkill')}</p>`}
      ${termsHtml(d.brand.terms)}
    </section>
  `;
}

// Shackles, then what the reference keeps beside them: compliance and materials.
function shacklesPanel(d: PtnSinnerDetail): string {
  const materials: [string, string][] = [
    [t('phaseUp'), d.materials.phase.join(', ')],
    [t('skillUpgrades'), d.materials.skill],
    [t('disSea'), d.materials.disSea],
  ];
  return `
    ${d.shackles.map((shackle, i) => `
      <section class="entry">
        <div class="entry-head">
          ${iconHtml(shackle.icon, 'ptn-icon', 40)}
          <h2 class="entry-name">${escHtml(shackle.name)}</h2>
          <span class="unlock-badge">${t('shackle')} ${i + 1}</span>
        </div>
        <p class="rich">${rich(shackle.text)}</p>
      </section>
    `).join('')}
    <section class="entry">
      <h2 class="entry-name">${t('compliance')}</h2>
      ${factsHtml([
        ...d.compliance.map((text, i): [string, string] => [`${(i + 1) * 10}%`, text]),
        ['100%', d.sticker && `${t('sticker')}: ${d.sticker}`],
      ])}
    </section>
    ${d.costs ? '' : `
      <section class="entry">
        <h2 class="entry-name">${t('materials')}</h2>
        ${factsHtml(materials)}
      </section>
    `}
  `;
}

// The phase-ups, as the wiki's 升阶 tab has them: the level cap each raises, the stats' jump
// at the old cap, what it unlocks and gives, then what it costs (the 培养材料 tab, whose
// skill levels' costs follow). A Sinner with costs has their materials here, not under
// Shackles.
function phasePanel(d: PtnSinnerDetail): string {
  if (!d.phases?.length) return `<p class="empty-msg">${t('noPhases')}</p>`;
  const passives = d.skills.filter(k => k.kind === 'Passive');
  const unlockName = (key: PtnPhase['unlocks'][number]['key']): string => {
    if (key === 'passive1') return passives[0]?.name ?? t('kindPassive');
    if (key === 'passive2') return passives[1]?.name ?? t('kindPassive');
    if (key === 'mania') return d.mania.name || t('mania');
    return t(key);
  };
  const stats = ['hp', 'atk', 'def', 'res'] as const;
  return `
    <p class="ptn-note">${t('noBonus')}</p>
    ${d.phases.map((phase, i) => `
      <section class="entry">
        <div class="entry-head">
          <h2 class="entry-name">${t('phaseUp')} ${i + 1}</h2>
          <span class="unlock-badge">${t('levelCap')} ${phase.cap[0]} → ${phase.cap[1]}</span>
        </div>
        <dl class="stat-list">
          ${stats.map(key => `
            <div class="stat-row"><dt><span>${t(key)}</span></dt><dd>${phase.from[key]} → <b>${phase.to[key]}</b></dd></div>
          `).join('')}
        </dl>
        <span class="section-label">${t('unlocks')}</span>
        <ul class="ptn-unlocks">
          ${phase.unlocks.map(unlock => `
            <li>${iconHtml(unlock.icon, 'ptn-icon', 40)}<span>${escHtml(unlockName(unlock.key))}</span></li>
          `).join('')}
          <li>${costsHtml([phase.crystals])}</li>
        </ul>
        ${d.costs?.phase[i] ? `<span class="section-label">${t('cost')}</span>${costsHtml(d.costs.phase[i])}` : ''}
      </section>
    `).join('')}
    ${d.costs ? `
      <section class="entry">
        <h2 class="entry-name">${t('skillCosts')}</h2>
        <dl class="ptn-cost-rows">
          ${d.costs.skill.map((row, i) => `<div><dt>Lv ${i + 1} → ${i + 2}</dt><dd>${costsHtml(row)}</dd></div>`).join('')}
        </dl>
      </section>
    ` : ''}
  `;
}

// The file: who the Sinner is, then each document under the wiki's own heading for it,
// folded away as the Arknights archive files are, since they tell the story.
function filePanel(s: PtnSinner, d: PtnSinnerDetail): string {
  const names = [d.names.cn, d.names.jp, d.names.kr].filter(Boolean).join(' · ');
  return `
    ${factsHtml([
      [t('gender'), d.gender],
      [t('birthday'), d.birthday],
      [t('height'), d.height],
      [t('birthplace'), d.birthplace || s.birthplace],
      [t('ability'), d.ability],
      [t('case'), d.case],
      [t('contained'), d.contained ?? ''],
      [t('otherNames'), names],
      [t('voice'), d.voice.join(', ')],
    ])}
    ${d.video ? `<p><a class="file-link" href="https://www.bilibili.com/video/${encodeURIComponent(d.video)}" target="_blank" rel="noopener">${t('video')} ↗</a></p>` : ''}
    ${d.file.map(entry => `
      <details class="file-entry">
        <summary>${escHtml(entry.title)}</summary>
        <p class="rich file-text">${rich(entry.text)}</p>
      </details>
    `).join('')}
    ${d.voiceLines?.length ? `
      <details class="file-entry">
        <summary>${t('voiceLines')}</summary>
        ${factsHtml(d.voiceLines.map((line): [string, string] => [line.name, line.text]))}
      </details>
    ` : ''}
  `;
}

// The payload as the language that is on has it: on the Chinese side the Chinese wiki's text
// over the English wiki's, where the build had a page for the Sinner.
function localised(d: PtnSinnerDetail): PtnSinnerDetail {
  return ptnLang() === 'zh' && d.zh ? { ...d, ...d.zh } : d;
}

function panelHtml(s: PtnSinner, d: PtnSinnerDetail): string {
  switch (tab) {
    case 'profile': return profilePanel(s, d);
    case 'skills': return skillsPanel(d);
    case 'phase': return phasePanel(d);
    case 'brand': return brandPanel(d);
    case 'shackles': return shacklesPanel(d);
    case 'file': return filePanel(s, d);
  }
}

// `detail` is undefined while the payload is on its way and null when it could not be had.
// `picked` is the picture on show, among the payload's.
function shellHtml(s: PtnSinner, detail: PtnSinnerDetail | null | undefined, picked: number): string {
  const panel = detail
    ? panelHtml(s, localised(detail))
    : `<p class="empty-msg">${t(detail === null ? 'loadFailed' : 'loading')}</p>`;
  return `
    <div class="detail ptn-detail" lang="${ptnLang() === 'zh' ? 'zh-Hans' : 'en'}">
      <div class="detail-body">
        <div class="detail-art-col">
          <div class="ptn-trail">
            ${crumbsHtml(nameOf(s), '#/ptn', t('Sinners'))}
            <span class="seg" role="group" aria-label="Language">
              ${PTN_LANGS.map(l => `
                <button class="seg-btn${l.id === ptnLang() ? ' on' : ''}" data-lang="${l.id}"
                        aria-pressed="${l.id === ptnLang()}">${l.label}</button>
              `).join('')}
            </span>
          </div>
          ${wallHtml(s, detail?.arts ?? [], picked)}
        </div>
        <div class="detail-data-col">
          <section class="op-panel">
            ${headerHtml(s)}
            <div class="op-tabs" role="tablist">
              ${TABS.map(entry => `
                <button class="op-tab${entry.id === tab ? ' on' : ''}" role="tab"
                        aria-selected="${entry.id === tab}" data-tab="${entry.id}">${t(entry.label)}</button>
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
          ${crumbsHtml(undefined, '#/ptn', t('Sinners'))}
          <div class="state-msg"><div class="label">${t('unknownSinner')}</div>${t('noFile')} <code>${escHtml(id)}</code></div>
        </div>
      </div>
    `;
    return;
  }

  let detail: PtnSinnerDetail | null | undefined;
  let picked = 0;
  let root: Element | null = null;
  const render = (): void => {
    // The section link is this game's roster, named in the language that is on.
    document.getElementById('nav-operators-label')!.textContent = t('Sinners');
    document.documentElement.lang = ptnLang() === 'zh' ? 'zh-CN' : 'en';
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
      const langButton = target.closest<HTMLElement>('[data-lang]');
      if (langButton) {
        setPtnLang(langButton.dataset.lang as PtnLang);
        render();
        container.querySelector<HTMLElement>(`[data-lang="${ptnLang()}"]`)?.focus();
        return;
      }
      if (target.closest('[data-art-open]')) openViewer();
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
      sinner.id, arts.map(a => ({ suffix: a.kind, label: labelOf(a), artist: null, url: a.url })), picked,
      (index) => { picked = index; render(); },
      art => artUrl(art.url, 128),
    );
  };
  render();
  // A figure is pressed from anywhere down the wall, and the window would stay that far down.
  window.scrollTo(0, 0);

  // If the page has been left by the time the file arrives, it is not this one's to draw.
  const arrived = (file: PtnSinnerDetail | null): void => {
    if (!root?.isConnected) return;
    detail = file;
    // On the picture the roster was showing, where the Sinner has it.
    picked = Math.max(0, (file?.arts ?? []).findIndex(a => a.kind === (ptnRoster.look || 'mugshot')));
    render();
  };
  fetchPtnSinner(id).then(arrived, () => arrived(null));
}
