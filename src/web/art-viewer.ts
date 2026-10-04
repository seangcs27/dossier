// The artwork, opened large: a popup over the detail page with zoom, drag to pan, and a way
// through every piece the operator has — arrow buttons, the arrow keys, a sideways drag or
// swipe, or the thumbnails along the bottom. Modelled on the viewer AN-EN-Tags opens from
// its own operator page.
//
// A native <dialog>, shown modally: that is what supplies the focus trap, Escape to close,
// and the page behind going inert, none of which then has to be written here.
//
// What each gesture on the art does:
//   pinch (two fingers on a screen or a trackpad)       zoom
//   wheel, or two fingers up and down a trackpad        zoom
//   two fingers sideways on a trackpad                  previous / next
//   drag (mouse or one finger)                          pan when zoomed in, else previous / next
import { artUrl, operatorSkinAvatarUrl } from '../shared/api/hella-api';
import type { OperatorArt, OperatorId } from '../shared/types';
import { escHtml } from './format';

const ZOOM_FIT = 100;   // percent; 100 fits the stage, and is where every piece opens
const ZOOM_MIN = 50;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

// How far a drag or a sideways trackpad swipe has to travel to turn to the next piece.
const SWIPE_PX = 60;
// A trackpad swipe keeps sending wheel events while it coasts. It counts as over once this
// long passes without one.
const SWIPE_REST_MS = 200;

/**
 * Opens the viewer on `arts[start]`. `onClose` is told which piece was showing when it
 * closed, so the page behind can follow the viewer rather than snap back.
 */
export function openArtViewer(
  opId: OperatorId, arts: OperatorArt[], start: number, onClose: (index: number) => void,
): void {
  let index = start;
  let zoom = ZOOM_FIT;

  const dialog = document.createElement('dialog');
  dialog.className = 'art-viewer';
  dialog.setAttribute('aria-label', 'Artwork viewer');
  dialog.innerHTML = `
    <div class="av-stage">
      <img class="av-img" src="${artUrl(arts[start].url, 2048)}" alt="${escHtml(arts[start].label)}" draggable="false">
    </div>
    <button class="av-nav av-prev" data-av="prev" aria-label="Previous artwork">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"></path></svg>
    </button>
    <button class="av-nav av-next" data-av="next" aria-label="Next artwork">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"></path></svg>
    </button>
    <div class="av-bar">
      <span class="av-label"></span>
      <div class="av-zoom">
        <button data-av="out" aria-label="Zoom out">−</button>
        <input type="range" min="${ZOOM_MIN}" max="${ZOOM_MAX}" step="${ZOOM_STEP}" aria-label="Zoom">
        <button data-av="in" aria-label="Zoom in">+</button>
        <output class="av-percent"></output>
      </div>
      <div class="av-thumbs" role="tablist" aria-label="Artwork">
        ${arts.map((a, i) => `
          <button class="av-thumb" data-av="pick" data-value="${i}" role="tab" data-tip="${escHtml(a.label)}">
            <img src="${operatorSkinAvatarUrl(opId, a.suffix)}" alt="${escHtml(a.label)}" loading="lazy"
                 onerror="this.onerror=null;this.src='${a.url.replace(/'/g, '%27')}'">
          </button>
        `).join('')}
      </div>
      <span class="av-count"></span>
    </div>
    <button class="av-close" data-av="close" aria-label="Close">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>
    </button>
  `;
  document.body.append(dialog);

  const stage = dialog.querySelector<HTMLElement>('.av-stage')!;
  const img = dialog.querySelector<HTMLImageElement>('.av-img')!;
  const slider = dialog.querySelector<HTMLInputElement>('input[type="range"]')!;
  const percent = dialog.querySelector<HTMLElement>('.av-percent')!;
  const label = dialog.querySelector<HTMLElement>('.av-label')!;
  const count = dialog.querySelector<HTMLElement>('.av-count')!;
  const thumbs = dialog.querySelectorAll<HTMLElement>('.av-thumb');

  // The art is square, so "fits the stage" is the stage's shorter side. Zooming keeps
  // whatever was at the middle of the stage at the middle. A pinch lands between the steps
  // the buttons take, so the zoom is any number in range, rounded only where it is printed.
  const setZoom = (next: number): void => {
    const cx = (stage.scrollLeft + stage.clientWidth / 2) / Math.max(1, stage.scrollWidth);
    const cy = (stage.scrollTop + stage.clientHeight / 2) / Math.max(1, stage.scrollHeight);
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    // The stage's whole box, scrollbars included: an image already in the cache is here at
    // its full size before this runs, and the scrollbars it raises would shrink the fit.
    const side = Math.min(stage.offsetWidth, stage.offsetHeight) * zoom / 100;
    img.style.width = img.style.height = `${side}px`;
    slider.value = String(zoom);
    percent.textContent = `${Math.round(zoom)}%`;
    stage.scrollLeft = cx * stage.scrollWidth - stage.clientWidth / 2;
    stage.scrollTop = cy * stage.scrollHeight - stage.clientHeight / 2;
  };

  const showArt = (next: number): void => {
    index = (next + arts.length) % arts.length;
    const art = arts[index];
    // 2048px rather than the page's 1024: this is the one place the detail is looked at.
    img.onerror = () => { img.onerror = null; img.src = art.url; };
    img.src = artUrl(art.url, 2048);
    img.alt = art.label;
    label.textContent = art.label;
    count.textContent = arts.length > 1 ? `${index + 1} / ${arts.length}` : '';
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('on', i === index);
      thumb.setAttribute('aria-selected', String(i === index));
    });
    setZoom(ZOOM_FIT);
  };

  // A press on the dialog itself is a press on the backdrop around the popup, and closes it.
  // Only when it began there too: a drag across the art let go past the popup's edge also
  // ends as a click on the dialog.
  let pressedOn: EventTarget | null = null;
  dialog.addEventListener('pointerdown', (ev) => { pressedOn = ev.target; });

  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) {
      if (pressedOn === dialog) finish();
      return;
    }
    const control = (ev.target as Element).closest<HTMLElement>('[data-av]');
    switch (control?.dataset.av) {
      case 'prev':  showArt(index - 1); break;
      case 'next':  showArt(index + 1); break;
      case 'pick':  showArt(Number(control.dataset.value)); break;
      case 'in':    setZoom(zoom + ZOOM_STEP); break;
      case 'out':   setZoom(zoom - ZOOM_STEP); break;
      case 'close': finish(); break;
    }
  });

  slider.addEventListener('input', () => setZoom(Number(slider.value)));

  dialog.addEventListener('keydown', (ev) => {
    // The slider owns its own arrow keys.
    if (ev.target === slider) return;
    if (ev.key === 'ArrowLeft') showArt(index - 1);
    else if (ev.key === 'ArrowRight') showArt(index + 1);
    else if (ev.key === '+' || ev.key === '=') setZoom(zoom + ZOOM_STEP);
    else if (ev.key === '-') setZoom(zoom - ZOOM_STEP);
    else return;
    ev.preventDefault();
  });

  // A wheel and a trackpad both arrive here, and nothing tells them apart, so the zoom goes
  // by how far the event travelled rather than a step per event: a trackpad sends dozens of
  // small ones where a wheel sends one large one.
  let swipe = 0;          // sideways travel of the trackpad swipe in progress
  let swiped = false;     // it has already turned the piece: one per swipe, however long it coasts
  let swipeRest = 0;

  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (ev.ctrlKey) {
      // A trackpad pinch: every browser but Safari sends it as a wheel with ctrl held. The
      // clamp is for ctrl with a real wheel, whose one notch is a whole pinch's travel.
      setZoom(zoom * (1 - Math.max(-25, Math.min(25, ev.deltaY)) / 100));
    } else if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
      clearTimeout(swipeRest);
      swipeRest = window.setTimeout(() => { swipe = 0; swiped = false; }, SWIPE_REST_MS);
      if (swiped) return;
      swipe += ev.deltaX;
      if (Math.abs(swipe) >= SWIPE_PX) { swiped = true; showArt(index + Math.sign(swipe)); }
    } else {
      setZoom(zoom * Math.exp(-ev.deltaY / 400));
    }
  }, { passive: false });

  // Every pointer down on the stage, by id: one drags, two pinch. The stage turns the
  // browser's own touch handling off (`touch-action: none`), so a finger is read here the
  // same way a mouse is.
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; left: number; top: number } | null = null;
  let pinch: { spread: number; zoom: number } | null = null;

  const spread = (): number => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  stage.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    stage.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 1) {
      drag = { x: ev.clientX, y: ev.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    } else {
      // A second finger makes it a pinch, and whatever the first had dragged is put back.
      drag = null;
      img.style.translate = '';
      pinch = { spread: spread(), zoom };
    }
  });

  stage.addEventListener('pointermove', (ev) => {
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pinch && pointers.size === 2) {
      setZoom(pinch.zoom * spread() / pinch.spread);
    } else if (drag && zoom > ZOOM_FIT) {
      stage.scrollLeft = drag.left - (ev.clientX - drag.x);
      stage.scrollTop = drag.top - (ev.clientY - drag.y);
    } else if (drag) {
      // Nothing to pan while the art fits, so it follows the pointer sideways: far enough
      // and letting go turns to the next piece.
      img.style.translate = `${ev.clientX - drag.x}px`;
    }
  });

  const release = (ev: PointerEvent): void => {
    if (!pointers.delete(ev.pointerId)) return;
    pinch = null;
    if (!drag) return;
    const travel = ev.clientX - drag.x;
    drag = null;
    img.style.translate = '';
    // Dragging the art left brings the next one in from the right.
    if (ev.type === 'pointerup' && zoom <= ZOOM_FIT && Math.abs(travel) >= SWIPE_PX) {
      showArt(index + (travel < 0 ? 1 : -1));
    }
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  // Safari sends a trackpad pinch as gesture events of its own. On a phone it sends them
  // alongside the two touches, which the pointer handlers above have already read.
  let gestureFrom = zoom;
  stage.addEventListener('gesturestart', (ev) => { ev.preventDefault(); gestureFrom = zoom; });
  stage.addEventListener('gesturechange', (ev) => {
    ev.preventDefault();
    if (!pointers.size) setZoom(gestureFrom * (ev as Event & { scale: number }).scale);
  });

  const refit = (): void => setZoom(zoom);
  window.addEventListener('resize', refit);

  // Takes the viewer out of the page. On its own this is the way out for a route change —
  // the phone's Back button, a link — where the page the viewer belonged to has already
  // gone and there is nothing to hand a piece to.
  const dispose = (): void => {
    window.removeEventListener('resize', refit);
    window.removeEventListener('hashchange', dispose);
    dialog.remove();
  };
  window.addEventListener('hashchange', dispose);

  // Tidies up and hands the page its piece. Called directly by the viewer's own ways out,
  // and by the `close` event for Escape, which the browser handles itself. Not left to that
  // event alone: Chromium delivers it with the next frame, which a background tab never
  // draws, so the viewer would sit closed but still in the page.
  function finish(): void {
    if (!dialog.isConnected) return;
    dispose();
    onClose(index);
  }
  dialog.addEventListener('close', finish);

  dialog.showModal();
  showArt(start);
}
