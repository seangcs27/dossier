// Makes an operator card a physical object: drag or flick it and it spins around its
// vertical axis with inertia, resting at whatever angle friction leaves it. A lit card
// also carries a small highlight and a matching shadow, so the plate reads as a surface
// catching light rather than a flat picture.
//
// Design decisions worth keeping:
//  · Y spins freely, X is a small tilt that always springs back. Free rotation on both
//    axes reads as broken — past a quarter turn on X, a sideways drag appears to spin
//    the card the wrong way.
//  · `touch-action: pan-y` (see styles.scss) leaves vertical scrolling to the browser,
//    so only sideways drags reach this code. A vertical drag is handed straight back.
//  · The 3D setup and the back face cost a compositor layer per card, so they are only
//    switched on (`is-live`) while a card is hovered or moving. A grid of ~430 cards
//    with all of them live is not something to ship.
//  · Opening the operator is gated by the anchor's own href, not by cancelling clicks:
//    a spin removes the href outright, so no click, whenever a browser chooses to fire
//    one, can follow a link that is not there.
//  · Dragging one card sweeps the rest: the dragged card holds pointer capture, so it
//    looks up whatever card is under the pointer and flicks it at the pointer's speed.

const SLOP = 6;           // px before a press becomes a drag rather than a click
const DEG_PER_PX = 0.6;   // half a turn per 300px of drag
const TILT_MAX = 25;      // deg, the X clamp while dragging
const HOVER_TILT = 9;     // deg of pointer-follow tilt at rest
const FRICTION = 0.955;   // velocity kept per 60Hz frame while coasting
const STOP = 0.02;        // deg/ms below which the card is treated as stopped
const FRAME = 1000 / 60;
const VMAX = 3;           // deg/ms cap on a flick, about eight turns a second
const TURN_EPS = 2;       // deg of movement during a press that suppresses opening

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Each mounted card's way to be flicked by a drag passing over it, in deg/ms.
const kicks = new WeakMap<HTMLElement, (v: number) => void>();

/** Turns one card into a spinnable object. Safe to call once per card, per render. */
function mountCard(card: HTMLElement): void {
  let ry = 0, rx = 0;             // the card's angles, deg
  let vy = 0, vx = 0;             // velocities, deg/ms
  let tiltX = 0, tiltY = 0;       // hover tilt, added on top of rx/ry
  let state: 'idle' | 'pending' | 'drag' | 'coast' = 'idle';
  let startX = 0, startY = 0, lastX = 0, lastY = 0, lastT = 0, frame = 0;
  let hovering = false, moved = false, caught = false, downRy = 0;

  const href = card.getAttribute('href') ?? '';
  const setVar = (name: string, value: string): void => card.style.setProperty(name, value);
  const norm = (deg: number): number => ((deg % 360) + 360) % 360;

  const paint = (): void => {
    const y = ry + tiltY;
    setVar('--rx', `${rx + tiltX}deg`);
    setVar('--ry', `${y}deg`);
    // While turning, the light stops following the pointer and behaves like a fixed lamp
    // the card turns under: the highlight sweeps across the face and crosses the middle
    // as the card goes edge-on.
    if (state === 'drag' || state === 'coast') {
      setVar('--lx', '50%');
      setVar('--ly', `${(50 + 42 * Math.sin(y * Math.PI / 180)).toFixed(1)}%`);
    }
  };

  let sleepTimer = 0;

  // The back face's images carry `data-src` rather than `src`: a hidden image still
  // downloads, which doubled the grid's image traffic for a face nobody had turned to
  // yet. They are fetched the first time this card is touched.
  const goLive = (): void => {
    clearTimeout(sleepTimer);   // a card being touched again must not sleep mid-gesture
    card.classList.add('is-live');
    card.querySelectorAll<HTMLImageElement>('.op-card-back img[data-src]').forEach((img) => {
      img.src = img.dataset.src ?? '';
      delete img.dataset.src;
    });
  };

  // Only sleeps a card that is square-on and still: with preserve-3d off, a card resting
  // at half a turn would flatten and show its own front face mirrored.
  //
  // And only once it has finished MOVING there. The angles reach zero in this code the
  // moment the pointer leaves, while the plate is still easing back over the next quarter
  // second — dropping the 3D setup inside that window leaves a visibly rotated card in a
  // flattened context, which is where Firefox loses the face entirely. The timer is a
  // backstop for the cases where no transition runs at all, such as reduced motion.
  const sleepIfSettled = (): void => {
    clearTimeout(sleepTimer);
    sleepTimer = window.setTimeout(() => {
      if (!hovering && state === 'idle' && norm(ry) === 0 && rx === 0) card.classList.remove('is-live');
    }, 300);
  };

  card.addEventListener('dragstart', (e) => e.preventDefault());

  card.addEventListener('click', (e) => {
    if (moved || caught || Math.abs(ry - downRy) > TURN_EPS) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  card.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    hovering = true;
    goLive();
    card.classList.add('is-lit');
  });

  card.addEventListener('pointerleave', () => {
    hovering = false;
    tiltX = tiltY = 0;
    card.classList.remove('is-lit');
    if (state === 'pending') state = 'idle';
    paint();
    sleepIfSettled();
  });

  card.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    cancelAnimationFrame(frame);
    // Pressing a moving card stops it, and that press does not also open the operator.
    caught = state === 'coast';
    if (caught) { card.classList.remove('is-spinning'); card.removeAttribute('href'); }
    else if (href && !card.hasAttribute('href')) card.setAttribute('href', href);
    moved = false;
    downRy = ry;
    vy = vx = 0;
    state = 'pending';
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    lastT = e.timeStamp;
    goLive();
  });

  card.addEventListener('pointermove', (e) => {
    if (!e.isPrimary) return;
    const box = card.getBoundingClientRect();
    if (box.width && box.height) {
      setVar('--lx', `${((e.clientX - box.left) / box.width * 100).toFixed(1)}%`);
      setVar('--ly', `${((e.clientY - box.top) / box.height * 100).toFixed(1)}%`);
    }

    if (state === 'pending') {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      // On touch the page scrolls instead. A mouse has nothing to hand back, and a sweep
      // down a column needs vertical drags to count.
      if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { state = 'idle'; return; }
      state = 'drag';
      moved = true;
      tiltX = tiltY = 0;
      card.removeAttribute('href');
      card.classList.add('is-spinning', 'is-lit');
      try { card.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    }

    if (state === 'drag') {
      const dt = Math.max(1, e.timeStamp - lastT);
      const dY = (e.clientX - lastX) * DEG_PER_PX;
      const dX = -(e.clientY - lastY) * DEG_PER_PX * 0.5;
      ry += dY;
      rx = Math.max(-TILT_MAX, Math.min(TILT_MAX, rx + dX));
      vy = Math.max(-VMAX, Math.min(VMAX, vy * 0.6 + (dY / dt) * 0.4));
      vx = Math.max(-VMAX / 4, Math.min(VMAX / 4, vx * 0.6 + (dX / dt) * 0.4));
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.op-card');
      if (under && under !== card) {
        const dx = e.clientX - lastX;
        const speed = Math.hypot(dx, e.clientY - lastY) / dt * DEG_PER_PX;
        kicks.get(under)?.((dx < 0 ? -1 : 1) * Math.min(VMAX, speed));
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = e.timeStamp;
      paint();
      return;
    }

    if (state === 'idle' && hovering) {
      const px = (e.clientX - box.left) / box.width - 0.5;
      const py = (e.clientY - box.top) / box.height - 0.5;
      tiltY = px * HOVER_TILT * 2;
      tiltX = -py * HOVER_TILT * 2;
      paint();
    }
  });

  const release = (e: PointerEvent): void => {
    if (state !== 'drag') { state = 'idle'; return; }
    try { card.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (reduceMotion) vy = vx = 0;
    state = 'coast';
    lastT = performance.now();
    frame = requestAnimationFrame(coast);
  };
  kicks.set(card, (v) => {
    if (reduceMotion || state === 'drag' || Math.abs(v) <= Math.abs(vy)) return;
    cancelAnimationFrame(frame);
    goLive();
    card.removeAttribute('href');
    card.classList.add('is-spinning', 'is-lit');
    vy = v;
    state = 'coast';
    lastT = performance.now();
    frame = requestAnimationFrame(coast);
  });

  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);

  function coast(now: number): void {
    const dt = Math.min(now - lastT, 50);   // clamp the gap after a hidden tab
    lastT = now;
    const steps = dt / FRAME;
    const decay = Math.pow(FRICTION, steps);
    ry += vy * dt;
    vy *= decay;
    rx = (rx + vx * dt) * Math.pow(0.85, steps);   // X always springs home
    vx *= decay;
    if (Math.abs(vy) < STOP && Math.abs(rx) < 0.05) {
      rx = 0;
      ry = norm(ry);
      paint();
      card.classList.remove('is-spinning');
      if (!hovering) card.classList.remove('is-lit');
      state = 'idle';
      if (href && !card.hasAttribute('href')) card.setAttribute('href', href);
      sleepIfSettled();
      return;
    }
    paint();
    frame = requestAnimationFrame(coast);
  }

  paint();
}

/**
 * Lights every card from the device's own tilt, for touch devices, where there is no
 * pointer to follow and nothing to hover. iOS only reports orientation after an explicit
 * grant, and that grant has to come from a tap, so the first tap anywhere asks for it.
 */
function mountTiltLight(): void {
  const root = document.documentElement;
  const clamp = (v: number): number => Math.max(-20, Math.min(120, v));

  const onTilt = (e: DeviceOrientationEvent): void => {
    if (e.gamma == null) return;
    root.classList.add('sensor');
    const x = clamp(50 + Math.max(-45, Math.min(45, e.gamma)) / 45 * 50);
    const y = clamp(50 + Math.max(-45, Math.min(45, (e.beta ?? 0) - 40)) / 45 * 50);
    // A non-finite value would reach CSS as "Infinity%", which invalidates the whole
    // gradient and makes the light vanish.
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    root.style.setProperty('--lx', `${x.toFixed(1)}%`);
    root.style.setProperty('--ly', `${y.toFixed(1)}%`);
  };

  // `requestPermission` exists on iOS only; the type is not in lib.dom.
  const requestPermission = (DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<PermissionState>;
  }).requestPermission;

  if (typeof requestPermission !== 'function') {
    addEventListener('deviceorientation', onTilt);
    return;
  }
  addEventListener('pointerdown', function ask(): void {
    removeEventListener('pointerdown', ask);
    void requestPermission().then((res) => {
      if (res === 'granted') addEventListener('deviceorientation', onTilt);
    }).catch(() => { /* declined or unavailable: cards simply stay unlit on tilt */ });
  }, { once: true });
}

let tiltMounted = false;

/** Makes every card inside `container` spinnable. Call once per batch of new cards. */
export function mountCardSpin(container: ParentNode): void {
  container.querySelectorAll<HTMLElement>('.op-card').forEach(mountCard);
  if (!tiltMounted) { mountTiltLight(); tiltMounted = true; }
}
