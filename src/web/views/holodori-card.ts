import { openArtViewer } from '../art-viewer';
import { crumbsHtml, escHtml } from '../format';
import { stopAudio } from '../holodori-audio';
import {
  cardArtUrl, cardMovieUrl, cardSignUrl, fetchHolodoriCard, getHolodoriCards, getHolodoriCharacters, voiceUrl,
  type HolodoriCard, type HolodoriCardDetail, type HolodoriLine,
} from '../holodori-index';
import { playReveal, revealHtml } from '../holodori-reveal';
import { bubbleHtml, dockHtml, voiceClick, type Speaker } from '../holodori-voice';
import { skillHtml, starsHtml } from './holodori-cards';
import { faceHtml } from './holodori-songs';

// A hololive Dreams card's own page (#/holodori/card/<id>), after holodori.best's: its
// illustration (and a 5-star card's animation and signature, which Reveal plays as the game
// does when a card is won), its stats at the level and bloom picked, its skills as that bloom
// has them, its voice lines and its live dialogues as bubbles with a player. Everything under
// the head is the card's payload, fetched when the page opens. In the album's world
// (_holodori.scss).

const STATS = ['Performance', 'Technique', 'Sense'];
const SKILLS = [
  { key: 'passive', label: 'Passive skill' },
  { key: 'active', label: 'Active skill' },
  { key: 'special', label: 'Special skill' },
  { key: 'connect', label: 'Connect effect' },
] as const;
type Shown = 'art' | 'movie' | 'sign' | 'reveal';

const cards = getHolodoriCards();
const cast = getHolodoriCharacters();
const byId = new Map(cast.map(c => [c.id, c]));

// The level and bloom picked, kept from one card to the next as the Arknights dossier keeps
// its elite and potential. 'max' follows each card's own top level.
let level: number | 'max' = 'max';
let bloom = 0;

/**
 * A stat at a level and bloom: the level's base times the card's share, rounded up, then
 * raised by what the blooms add and rounded up again, as holodori.best has every card.
 */
function statsAt(d: HolodoriCardDetail, lv: number, b: number): number[] {
  const up = d.blooms.slice(0, b).reduce((sum, x) => sum + (x.kind === 'stats' ? x.up ?? 0 : 0), 0);
  const base = d.levels[lv - 1] ?? 0;
  return d.permil.map(p => Math.ceil((Math.ceil((base * p) / 1000) * (1000 + up)) / 1000));
}

// The bloom that raises a skill to its second level, or 0 if none does.
const raisedAt = (d: HolodoriCardDetail, kind: string): number => d.blooms.findIndex(x => x.kind === kind) + 1;

function stepHtml(card: HolodoriCard, rel: 'prev' | 'next'): string {
  const arrow = rel === 'prev' ? '<path d="M10 3.5L5.5 8l4.5 4.5"></path>' : '<path d="M6 3.5L10.5 8 6 12.5"></path>';
  return `
    <a class="hm-step ${rel}" href="#/holodori/card/${encodeURIComponent(card.id)}" rel="${rel}"
       aria-label="${rel === 'prev' ? 'Previous' : 'Next'} card: ${escHtml(card.name)}">
      <svg viewBox="0 0 16 16" aria-hidden="true">${arrow}</svg>
      <span><small>${escHtml(byId.get(card.holomem)?.shortName ?? '')}</small>${rel === 'prev' ? 'Previous' : 'Next'}</span>
    </a>
  `;
}

// The line a card's reveal plays with its signature, which a 5-star card has first.
const cardGet = (d: HolodoriCardDetail): HolodoriLine | undefined => d.voices.find(v => v.label === 'Card get') ?? d.voices[0];

// The stage is the card list's alone, so it is whole before the payload comes, or without it.
// Only the reveal needs the payload, for its voice line, and is drawn once it is there.
function stageHtml(card: HolodoriCard, shown: Shown, d: HolodoriCardDetail | null): string {
  const poster = card.full ?? '';
  const line = d ? cardGet(d) : undefined;
  const media = shown === 'reveal'
    ? revealHtml({
      poster,
      movie: cardMovieUrl(card.asset),
      sign: cardSignUrl(card.asset),
      voice: line && { label: line.label ?? 'Card get', text: line.text },
    })
    : shown === 'art'
      ? `<button class="hc-art" type="button" aria-label="Open the illustration full size">
           ${poster ? `<img src="${escHtml(poster)}" alt="${escHtml(card.name)}" decoding="async">` : ''}
         </button>
         ${card.movie ? '<button class="rv-go" type="button" data-reveal>Reveal</button>' : ''}`
      : `<video src="${escHtml(shown === 'movie' ? cardMovieUrl(card.asset) : cardSignUrl(card.asset))}" poster="${escHtml(poster)}"
                autoplay muted loop playsinline controls></video>`;
  const tabs: [Shown, string][] = [['reveal', 'Reveal'], ['art', 'Illustration'], ['movie', 'Animation'], ['sign', 'Signature']];
  return `
    <figure class="hc-stage${shown === 'reveal' ? ' hc-reveal' : ''}">
      ${media}
      ${card.movie ? `
        <div class="hc-shows" role="group" aria-label="Show">
          ${tabs.map(([id, label]) => `<button type="button" data-show="${id}" aria-pressed="${id === shown}">${label}</button>`).join('')}
        </div>` : ''}
    </figure>
  `;
}

function headHtml(card: HolodoriCard, d: HolodoriCardDetail | null): string {
  const c = byId.get(card.holomem);
  const top = d?.levels.length ?? 0;
  const facts: [string, string][] = d ? [
    ['Main stat', STATS[d.permil.indexOf(Math.max(...d.permil))]],
    ['Level cap', `${d.limits[0]} → ${top} with ${d.limits.length - 1} limit breaks`],
    ['Top total', `${statsAt(d, top, 5).reduce((a, b) => a + b, 0).toLocaleString('en')} at Lv ${top}, bloom 5`],
    ['Outfit', d.outfit],
    ['Voice lines', d.voices.length ? `${d.voices.length}, and ${d.dialogues.length} live dialogues` : `${d.dialogues.length} live dialogues`],
  ] : [];
  return `
    <div class="hc-head">
      <p class="hc-meta">
        <span class="hcard-stars" aria-label="${card.rarity} stars">${starsHtml(card.rarity)}</span>
        ${card.type ? `<em class="hcard-type type-${card.type.toLowerCase()}">${escHtml(card.type)}</em>` : ''}
      </p>
      <h2 class="lettered hc-name">${escHtml(card.name)}</h2>
      ${c ? `
        <a class="hc-who" href="#/holodori/holomem/${encodeURIComponent(c.id)}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
          ${faceHtml(c)}${escHtml(c.name)}
        </a>` : ''}
      ${facts.length ? `
        <dl class="hm-facts hc-facts">
          ${facts.filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${escHtml(v)}</dd></div>`).join('')}
        </dl>` : ''}
    </div>
  `;
}

const levelOf = (d: HolodoriCardDetail): number => (level === 'max' ? d.levels.length : Math.min(level, d.levels.length));

// What the level slider changes: the level's number, the limit breaks it needs and the stats.
function readoutHtml(d: HolodoriCardDetail): string {
  const lv = levelOf(d);
  const values = statsAt(d, lv, bloom);
  const best = Math.max(...values);
  const main = d.permil.indexOf(Math.max(...d.permil));
  // Each limit break raises the cap; a level past the first cap needs that many.
  const breaks = d.limits.findIndex(cap => lv <= cap);
  return `
      <p class="hc-note"><b>Lv ${lv}</b> · ${breaks > 0 ? `needs ${breaks} limit break${breaks === 1 ? '' : 's'}` : 'no limit break needed'}</p>
      <dl class="hc-values">
        ${values.map((v, i) => `
          <div>
            <dt>${STATS[i]}${i === main ? ' <small>Main</small>' : ''}</dt>
            <dd><i style="--v: ${(v / best) * 100}%"></i><span>${v.toLocaleString('en')}</span></dd>
          </div>`).join('')}
        <div class="hc-total"><dt>Total</dt><dd><span>${values.reduce((a, b) => a + b, 0).toLocaleString('en')}</span></dd></div>
      </dl>
  `;
}

function statsHtml(d: HolodoriCardDetail): string {
  return `
    <section class="hc-panel hc-stats" aria-labelledby="hc-stats">
      <h3 class="hm-head" id="hc-stats">Stats</h3>
      <div class="hc-control">
        <label for="hc-level">Level</label>
        <input id="hc-level" type="range" min="1" max="${d.levels.length}" value="${levelOf(d)}"
               aria-valuetext="Level ${levelOf(d)}">
      </div>
      <div class="hc-control">
        <span id="hc-bloom">Bloom</span>
        <div class="hc-blooms" role="group" aria-labelledby="hc-bloom">
          ${[0, 1, 2, 3, 4, 5].map(b => `<button type="button" data-bloom="${b}" aria-pressed="${b === bloom}">${b}</button>`).join('')}
        </div>
      </div>
      <div class="hc-readout">${readoutHtml(d)}</div>
    </section>
  `;
}

function skillsHtml(d: HolodoriCardDetail): string {
  const entries = SKILLS.filter(s => d[s.key].length).map((s) => {
    const at = raisedAt(d, s.key);
    const up = at > 0 && bloom >= at;
    return `
      <div class="hc-skill">
        <h4>${s.label}<small>${up ? 'Lv 2' : at ? `Lv 1 · Lv 2 at bloom ${at}` : 'Lv 1'}</small></h4>
        <p>${skillHtml(d[s.key][up ? 1 : 0] ?? d[s.key][0])}</p>
      </div>
    `;
  });
  if (d.outfitSkill) {
    entries.push(`
      <div class="hc-skill">
        <h4>Outfit skill<small>${escHtml(d.outfit)}</small></h4>
        <p>${skillHtml(d.outfitSkill)}</p>
      </div>
    `);
  }
  return `
    <section class="hc-panel hc-skills" aria-labelledby="hc-skills">
      <h3 class="hm-head" id="hc-skills">Skills</h3>
      ${entries.join('')}
    </section>
  `;
}

// A line's bubble: the card's own holomem on the left, whoever answers her on the right.
function lineHtml(card: HolodoriCard, line: HolodoriLine): string {
  const who = byId.get(line.holomem ?? card.holomem);
  const speaker: Speaker = {
    colour: who?.colors[0] ?? '#18c9f0',
    face: who ? faceHtml(who) : '',
    mine: !line.holomem || line.holomem === card.holomem,
  };
  return bubbleHtml(line, speaker, line.label ?? who?.shortName ?? '');
}

function voicesHtml(card: HolodoriCard, d: HolodoriCardDetail): string {
  if (!d.voices.length && !d.dialogues.length) return '';
  return `
    ${d.voices.length ? `
      <section class="hm-section" aria-labelledby="hc-voices">
        <h3 class="hm-head" id="hc-voices">Voice lines <small>${d.voices.length}</small></h3>
        <ul class="vl-list">${d.voices.map(line => lineHtml(card, line)).join('')}</ul>
      </section>` : ''}
    ${d.dialogues.length ? `
      <section class="hm-section" aria-labelledby="hc-dialogues">
        <h3 class="hm-head" id="hc-dialogues">Live dialogues <small>${d.dialogues.length}</small></h3>
        <div class="hc-dialogues">
          ${d.dialogues.map(x => `
            <div class="hc-dialogue">
              <div class="hc-dialogue-head">
                <h4>${escHtml(x.title.replace('&', ' & '))}</h4>
                <button class="vl-conv" type="button" data-conv>Play conversation</button>
              </div>
              <ul class="vl-list vl-chat">${x.lines.map(line => lineHtml(card, line)).join('')}</ul>
            </div>`).join('')}
        </div>
      </section>` : ''}
    ${dockHtml()}
  `;
}

export function mountHolodoriCard(container: HTMLElement, id: string): void {
  // The search box, its filters and the count are a roster's: put away as on every dossier.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  const i = cards.findIndex(k => k.id === id);
  const card = cards[i];
  if (!card) {
    container.innerHTML = `
      <div class="roster-page hc-page">
        ${crumbsHtml(undefined, '#/holodori/cards', 'Cards')}
        <div class="state-msg"><div class="label">Unknown card</div>No card in the game is <code>${escHtml(id)}</code>.</div>
      </div>
    `;
    return;
  }
  const c = byId.get(card.holomem);
  let detail: HolodoriCardDetail | null = null;
  let failed = false;
  let shown: Shown = 'art';
  let drawn = false;

  const bodyHtml = (): string => (detail
    ? `<div class="hc-body">${statsHtml(detail)}${skillsHtml(detail)}</div>`
    : `<div class="state-msg">${failed ? '<div class="label">No payload</div>The last build did not bake this card\'s details.' : 'Loading…'}</div>`);

  // The first call draws the page. After it only the head and the stats and skills are drawn
  // again, which a bloom or the payload coming changes: the stage and the voices hold a
  // reveal or a line that is playing, and are left alone.
  const render = (): void => {
    const mounted = page();
    if (drawn && mounted) {
      mounted.querySelector('.hc-head')!.outerHTML = headHtml(card, detail);
      mounted.querySelector('.hc-main')!.innerHTML = bodyHtml();
      return;
    }
    drawn = true;
    container.innerHTML = `
      <div class="roster-page hc-page r${card.rarity}" style="--a: ${escHtml(c?.colors[0] ?? '#18c9f0')}">
        <div class="hm-trail">
          ${crumbsHtml(card.name, '#/holodori/cards', 'Cards')}
          <nav class="hm-steps" aria-label="Other cards">
            ${stepHtml(cards[(i - 1 + cards.length) % cards.length], 'prev')}
            ${stepHtml(cards[(i + 1) % cards.length], 'next')}
          </nav>
        </div>
        <section class="hc-top">${stageHtml(card, shown, detail)}${headHtml(card, detail)}</section>
        <div class="hc-main">${bodyHtml()}</div>
        <div class="hc-voices"></div>
        <p class="hd-credit">Art, video and voices: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a>'s CDN · Numbers checked against <a href="https://holodori.best/cards/${encodeURIComponent(card.id)}" target="_blank" rel="noopener">holodori.best</a></p>
      </div>
    `;
  };

  const page = (): HTMLElement | null => container.querySelector<HTMLElement>('.hc-page');

  const drawStage = (): void => {
    page()!.querySelector('.hc-stage')!.outerHTML = stageHtml(card, shown, detail);
  };

  // Plays the reveal on the stage, from a press. The card-get line is in the payload, which
  // is asked for if it has not come yet.
  const reveal = async (): Promise<void> => {
    const d = detail ?? await fetchHolodoriCard(id).catch(() => null);
    if (!page()) return;
    detail = d ?? detail;
    shown = 'reveal';
    drawStage();
    const line = d ? cardGet(d) : undefined;
    playReveal(page()!.querySelector<HTMLElement>('.hc-stage')!, line && voiceUrl(line.audio));
    page()!.querySelector<HTMLElement>('[data-show="reveal"]')?.focus();
  };

  // Handlers are assigned to the container, since the page is drawn again on every change.
  container.oninput = (e) => {
    const input = e.target as HTMLInputElement;
    if (input.id !== 'hc-level' || !detail) return;
    level = Number(input.value) === detail.levels.length ? 'max' : Number(input.value);
    input.setAttribute('aria-valuetext', `Level ${input.value}`);
    page()!.querySelector('.hc-readout')!.innerHTML = readoutHtml(detail);
  };
  container.onclick = (e) => {
    if (voiceClick(e, container)) return;
    const target = e.target as HTMLElement;
    const b = target.closest<HTMLElement>('[data-bloom]');
    const show = target.closest<HTMLElement>('[data-show]');
    if (b) {
      bloom = Number(b.dataset.bloom);
      render();
      page()?.querySelector<HTMLElement>(`[data-bloom="${bloom}"]`)?.focus();
    } else if (target.closest('[data-reveal]') || show?.dataset.show === 'reveal') {
      void reveal();
    } else if (show) {
      stopAudio();
      shown = show.dataset.show as Shown;
      drawStage();
      page()?.querySelector<HTMLElement>(`[data-show="${shown}"]`)?.focus();
    } else if (target.closest('.hc-art')) {
      openArtViewer(
        card.id, [{ suffix: 'full', label: card.name, artist: null, url: cardArtUrl(card.asset) }], 0,
        () => undefined, () => card.art ?? '',
      );
    }
  };
  render();
  fetchHolodoriCard(id).then((d) => { detail = d; }, () => { failed = true; }).then(() => {
    // The page may have been left, or mounted again for another card, while it came.
    if (!page() || location.hash !== `#/holodori/card/${encodeURIComponent(id)}`) return;
    render();
    if (detail) page()!.querySelector('.hc-voices')!.innerHTML = voicesHtml(card, detail);
  });
}
