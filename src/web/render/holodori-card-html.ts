import { crumbsHtml, escHtml } from '../format';
import {
  cardMovieUrl, cardSignUrl, getHolodoriCards, getHolodoriCharacters,
  type HolodoriCard, type HolodoriCardDetail, type HolodoriLine,
} from '../holodori-index';
import { skillHtml, starsHtml } from './holodori-cards-html';
import { faceHtml } from './holodori-songs-html';

// A hololive Dreams card's own page (#/holodori/card/<id>), after holodori.best's: its
// illustration (and a 5-star card's animation and signature, which Play plays as the game
// does when a card is won), its stats at the level and bloom picked, its skills as that bloom
// has them, its voice lines and its live dialogues as bubbles with a player. Everything under
// the head is the card's payload. In the album's world (_holodori.scss). No DOM and no window:
// the view and the pages built at build time (site/) draw from this, the level and bloom
// picked and the volume being what the caller has kept.

const STATS = ['Performance', 'Technique', 'Sense'];
const SKILLS = [
  { key: 'passive', label: 'Passive skill' },
  { key: 'active', label: 'Active skill' },
  { key: 'special', label: 'Special skill' },
  { key: 'connect', label: 'Connect effect' },
] as const;
export type Shown = 'art' | 'movie' | 'sign' | 'reveal';

const cards = getHolodoriCards();
const cast = getHolodoriCharacters();
const byId = new Map(cast.map(c => [c.id, c]));

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

/**
 * The stage is the card list's alone, so it is whole before the payload comes, or without it.
 * `reveal` is the reveal's screen and bar, which the view draws (they hold the player's volume)
 * and is only needed when `shown` is 'reveal'.
 */
export function stageHtml(card: HolodoriCard, shown: Shown, reveal = ''): string {
  const poster = card.full ?? '';
  const media = shown === 'reveal'
    ? reveal
    : shown === 'art'
      ? `<button class="hc-art" type="button" aria-label="Open the illustration full size">
           ${poster ? `<img src="${escHtml(poster)}" alt="${escHtml(card.name)}" decoding="async">` : ''}
         </button>
         ${card.movie ? '<button class="rv-go" type="button" data-reveal>Play</button>' : ''}`
      : shown === 'sign'
        // The signature's video is its writing over a matte of it, one above the other: shown
        // as it is, the box showed the foot of the one over the head of the other. It is drawn
        // over the art as the reveal draws it (holodori-reveal.ts, loopSign).
        ? `<div class="rv-screen hc-sign">
             ${poster ? `<img class="rv-art" src="${escHtml(poster)}" alt="">` : ''}
             <video class="rv-sign" src="${escHtml(cardSignUrl(card.asset))}" autoplay muted loop playsinline></video>
             <canvas class="rv-matte" width="1280" height="720"></canvas>
             <canvas class="rv-ink" width="1280" height="720"></canvas>
           </div>`
        : `<video src="${escHtml(cardMovieUrl(card.asset))}" poster="${escHtml(poster)}"
                autoplay muted loop playsinline controls></video>`;
  const tabs: [Shown, string][] = [['reveal', 'Play'], ['art', 'Illustration'], ['movie', 'Animation'], ['sign', 'Signature']];
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

export function headHtml(card: HolodoriCard, d: HolodoriCardDetail | null): string {
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

// `level` is the level picked, or 'max' for each card's own top level.
const levelOf = (d: HolodoriCardDetail, level: number | 'max'): number => (level === 'max' ? d.levels.length : Math.min(level, d.levels.length));

/** What the level slider changes: the level's number, the limit breaks it needs and the stats. */
export function readoutHtml(d: HolodoriCardDetail, level: number | 'max', bloom: number): string {
  const lv = levelOf(d, level);
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

function statsHtml(d: HolodoriCardDetail, level: number | 'max', bloom: number): string {
  return `
    <section class="hc-panel hc-stats" aria-labelledby="hc-stats">
      <h3 class="hm-head" id="hc-stats">Stats</h3>
      <div class="hc-control">
        <label for="hc-level">Level</label>
        <input id="hc-level" type="range" min="1" max="${d.levels.length}" value="${levelOf(d, level)}"
               aria-valuetext="Level ${levelOf(d, level)}">
      </div>
      <div class="hc-control">
        <span id="hc-bloom">Bloom</span>
        <div class="hc-blooms" role="group" aria-labelledby="hc-bloom">
          ${[0, 1, 2, 3, 4, 5].map(b => `<button type="button" data-bloom="${b}" aria-pressed="${b === bloom}">${b}</button>`).join('')}
        </div>
      </div>
      <div class="hc-readout">${readoutHtml(d, level, bloom)}</div>
    </section>
  `;
}

function skillsHtml(d: HolodoriCardDetail, bloom: number): string {
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

/**
 * What goes under the head: the stats and skills at the level and bloom picked, or the word
 * that the payload is on its way (`failed` false) or was never baked.
 */
export function bodyHtml(d: HolodoriCardDetail | null, failed: boolean, level: number | 'max', bloom: number): string {
  return d
    ? `<div class="hc-body">${statsHtml(d, level, bloom)}${skillsHtml(d, bloom)}</div>`
    : `<div class="state-msg">${failed ? '<div class="label">No payload</div>The last build did not bake this card\'s details.' : 'Loading…'}</div>`;
}

// The voice lines' bubbles and the dock they share, as holodori-voice.ts's player works them.
// Its volume and waveform are drawn here as holodori-audio.ts draws them, which a module that
// listens to the window cannot be imported for.

/** Who says a line, for its bubble. */
export interface Speaker {
  colour: string;   // '#RRGGBB'
  face: string;     // her round face, as markup
  mine: boolean;    // the card's own holomem, whose bubbles stand on the left
}

const PLAY = '<svg class="ico-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L13 8z"></path></svg>';
const PAUSE = '<svg class="ico-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z"></path></svg>';

/**
 * A strip of bars, the same for the same `seed`: the shape of a line is for the eye, not read
 * from its audio. The second copy is clipped to what has played (`--p`, 0 to 1, set on the
 * strip's owner), so a line fills as it goes.
 */
function waveHtml(seed: string, bars = 36): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let out = '';
  for (let i = 0; i < bars; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    out += `<i style="height: ${28 + (h % 72)}%"></i>`;
  }
  return `<span class="wave" aria-hidden="true"><span>${out}</span><span class="wave-on">${out}</span></span>`;
}

/** A speaker button that mutes and a slider beside it, at `volume`, 0 to 1. */
function volumeHtml(volume: number): string {
  return `
    <span class="vol">
      <button class="vol-mute${volume === 0 ? ' is-muted' : ''}" type="button" aria-label="Mute" aria-pressed="${volume === 0}">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path class="vol-cone" d="M2 6h3l4-3v10l-4-3H2z"></path>
          <path class="vol-waves" d="M11.2 5.6a3.4 3.4 0 010 4.8M13 3.8a6 6 0 010 8.4"></path>
          <path class="vol-slash" d="M11 6l4 4M15 6l-4 4"></path>
        </svg>
      </button>
      <input class="vol-range" type="range" min="0" max="100" step="1" value="${Math.round(volume * 100)}" aria-label="Volume">
    </span>
  `;
}

/** One line as a bubble: `label` is what it is called, a kind of line or who says it. */
function bubbleHtml(line: HolodoriLine, who: Speaker, label: string): string {
  const text = escHtml(line.text).replace(/\n/g, '<br>');
  return `
    <li class="vl${who.mine ? '' : ' them'}" data-audio="${escHtml(line.audio)}" style="--who: ${escHtml(who.colour)}">
      ${who.face}
      <div class="vl-bub">
        <button class="vl-play" type="button" aria-pressed="false" aria-label="Play: ${escHtml(label)}">${PLAY}${PAUSE}</button>
        <div class="vl-body">
          <span class="vl-lab">${escHtml(label)}</span>
          <p class="vl-text"><span>${text}</span><span class="vl-fill" aria-hidden="true"><span>${text}</span></span></p>
          <span class="vl-seek" data-seek>${waveHtml(line.audio)}</span>
        </div>
      </div>
    </li>
  `;
}

/** The dock the page's bubbles share. */
function dockHtml(volume: number): string {
  const skip = (to: 'prev' | 'next', path: string): string => `
    <button class="vd-step" type="button" data-vd="${to}" aria-label="${to === 'prev' ? 'Previous' : 'Next'} line">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"></path></svg>
    </button>`;
  return `
    <div class="vd" role="group" aria-label="Voice player">
      ${skip('prev', 'M11.5 3.5v9L6 8zM3.8 3.5h1.8v9H3.8z')}
      <button class="vd-go" type="button" data-vd="play" aria-label="Play or pause">${PLAY}${PAUSE}</button>
      ${skip('next', 'M4.5 3.5v9L10 8zM10.4 3.5h1.8v9h-1.8z')}
      <span class="vd-name">Pick a line</span>
      <span class="vd-seek" data-seek></span>
      <span class="vd-time" aria-hidden="true">0:00 / 0:00</span>
      ${volumeHtml(volume)}
      <button class="vd-rate" type="button" data-vd="rate" aria-label="Speed">1×</button>
    </div>
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

/** The voice lines and live dialogues with the dock they share, drawn with the volume at `volume`. */
export function voicesHtml(card: HolodoriCard, d: HolodoriCardDetail, volume = 0.25): string {
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
    ${dockHtml(volume)}
  `;
}

/**
 * A card's page body, or the page that says no card has this id. The defaults are a page just
 * opened: the payload not yet there, the top level, bloom 0 and the player's volume at half.
 * With `d` it is the whole page, the voices included.
 */
export function cardHtml(
  id: string, d: HolodoriCardDetail | null = null, level: number | 'max' = 'max', bloom = 0, volume = 0.25,
): string {
  const i = cards.findIndex(k => k.id === id);
  const card = cards[i];
  if (!card) {
    return `
      <div class="roster-page hc-page">
        ${crumbsHtml(undefined, '#/holodori/cards', 'Cards')}
        <div class="state-msg"><div class="label">Unknown card</div>No card in the game is <code>${escHtml(id)}</code>.</div>
      </div>
    `;
  }
  const c = byId.get(card.holomem);
  return `
      <div class="roster-page hc-page r${card.rarity}" style="--a: ${escHtml(c?.colors[0] ?? '#18c9f0')}">
        <div class="hm-trail">
          ${crumbsHtml(card.name, '#/holodori/cards', 'Cards')}
          <nav class="hm-steps" aria-label="Other cards">
            ${stepHtml(cards[(i - 1 + cards.length) % cards.length], 'prev')}
            ${stepHtml(cards[(i + 1) % cards.length], 'next')}
          </nav>
        </div>
        <section class="hc-top">${stageHtml(card, 'art')}${headHtml(card, d)}</section>
        <div class="hc-main">${bodyHtml(d, false, level, bloom)}</div>
        <div class="hc-voices">${d ? voicesHtml(card, d, volume) : ''}</div>
        <p class="hd-credit">Art, video and voices: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a>'s CDN · Numbers checked against <a href="https://holodori.best/cards/${encodeURIComponent(card.id)}" target="_blank" rel="noopener">holodori.best</a></p>
      </div>
    `;
}
