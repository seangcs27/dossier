// The ASCII field behind the page. A grid of characters, dim at rest and drifting slowly. The
// pointer lights the cells near it, a click sends a ring out from where it landed, and a game
// row under the pointer (or with keyboard focus) tunes the whole field to that game: its
// colour and its own character ramp. Nothing here carries meaning: the page reads the same
// with the canvas gone.
//
// Reduced motion: no drift and no rings; the field is drawn again only when the pointer moves
// or a game is picked, and the colour changes at once.
(() => {
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const REST = [52, 60, 80];
  const NEUTRAL = { accent: [170, 178, 196], ramp: ' .:-=+*#%@' };
  const GAMES = {
    arknights: { accent: [104, 136, 214], ramp: " .:^<>/\\VA" },
    endfield:  { accent: [250, 232, 40],  ramp: ' .:+=-|#H' },
    ptn:       { accent: [230, 56, 60],   ramp: ' .,/\\xX#%' },
    holodori:  { accent: [90, 206, 255],  ramp: ' .,o*+O@Q' },
    fgo:       { accent: [226, 178, 84],  ramp: ' .:o()0O8@' },
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cw = 8;
  let ch = 16;
  let cols = 0;
  let rows = 0;

  let target = NEUTRAL;
  let accent = NEUTRAL.accent.slice();
  let ramp = NEUTRAL.ramp;
  let tunedRow = null;

  const pointer = { x: -9999, y: -9999, amount: 0, goal: 0, at: 0, touch: false };
  const ripples = [];
  let quiet = [];
  let dirty = true;
  let lastDraw = 0;

  const RIPPLE_MS = 900;
  const RIPPLE_SPEED = 0.62; // px per ms
  const POINTER_RADIUS = 150;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const fs = width < 720 ? 12 : 14;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${fs}px "JetBrains Mono", ui-monospace, Consolas, monospace`;
    ctx.textBaseline = 'top';
    cw = ctx.measureText('M').width || 8;
    ch = Math.round(fs * 1.35);
    cols = Math.ceil(width / cw);
    rows = Math.ceil(height / ch);
    measureQuiet();
    dirty = true;
  }

  // Where text sits: the field is held down there so the words stay readable. The row under the
  // pointer lets more through, since that is where the field is being tuned.
  function measureQuiet() {
    quiet = [];
    document.querySelectorAll('h1, .lede, .name, .what, footer p').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > height) return;
      quiet.push({ el, left: r.left - 8, right: r.right + 8, top: r.top, bottom: r.bottom });
    });
  }

  function quietAt(x, y) {
    for (const q of quiet) {
      if (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom) {
        return tunedRow && tunedRow.contains(q.el) ? 0.5 : 0.2;
      }
    }
    return 1;
  }

  const mix = (a, b, t) => `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)} ${Math.round(a[1] + (b[1] - a[1]) * t)} ${Math.round(a[2] + (b[2] - a[2]) * t)})`;

  function draw(now) {
    const t = reduce.matches ? 0 : now / 1000;
    ctx.clearRect(0, 0, width, height);
    const levels = ramp.length;
    const buckets = Array.from({ length: levels }, () => []);

    for (let j = 0; j < rows; j++) {
      const y = j * ch;
      for (let i = 0; i < cols; i++) {
        const x = i * cw;
        const cx = x + cw / 2;
        const cy = y + ch / 2;

        let v = 0.45 * (0.5 + 0.5 * Math.sin(cx * 0.011 + t * 0.35 + Math.sin(cy * 0.007 + t * 0.2) * 2)) *
          (0.55 + 0.45 * Math.sin(cy * 0.013 - t * 0.27));

        if (pointer.amount > 0.01) {
          const dx = cx - pointer.x;
          const dy = cy - pointer.y;
          v += pointer.amount * Math.exp(-(dx * dx + dy * dy) / (2 * POINTER_RADIUS * POINTER_RADIUS));
        }

        for (const rp of ripples) {
          const age = now - rp.at;
          const radius = age * RIPPLE_SPEED;
          const d = Math.hypot(cx - rp.x, cy - rp.y) - radius;
          v += Math.exp(-(d * d) / (2 * 34 * 34)) * (1 - age / RIPPLE_MS) * 0.95;
        }

        v *= quietAt(cx, cy);
        if (v < 0.04) continue;
        const k = Math.min(levels - 1, Math.floor(Math.min(v, 1) * (levels - 1) + 0.5));
        if (k > 0) buckets[k].push(x, y);
      }
    }

    for (let k = 1; k < levels; k++) {
      const list = buckets[k];
      if (!list.length) continue;
      ctx.fillStyle = mix(REST, accent, k / (levels - 1));
      const c = ramp[k];
      for (let n = 0; n < list.length; n += 2) ctx.fillText(c, list[n], list[n + 1]);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    // The pointer's light eases in and out; a touch fades a moment after the last contact.
    if (pointer.touch && now - pointer.at > 1100) pointer.goal = 0;
    const eased = pointer.amount + (pointer.goal - pointer.amount) * 0.14;
    if (Math.abs(eased - pointer.amount) > 0.002) { pointer.amount = eased; dirty = true; }

    // The colour closes on the game's own.
    let moving = false;
    for (let c = 0; c < 3; c++) {
      const diff = target.accent[c] - accent[c];
      if (Math.abs(diff) > 0.6) { accent[c] += reduce.matches ? diff : diff * 0.16; moving = true; } else accent[c] = target.accent[c];
    }
    if (moving) dirty = true;

    while (ripples.length && now - ripples[0].at > RIPPLE_MS) ripples.shift();
    if (ripples.length) dirty = true;

    // At rest the field drifts, at 12 fps: cheap, and nothing there is information.
    const idle = !reduce.matches && now - lastDraw > 83;
    if (dirty || idle) {
      draw(now);
      lastDraw = now;
      dirty = false;
    }
  }

  function tune(game, row) {
    const next = game ? GAMES[game] : NEUTRAL;
    if (next === target && row === tunedRow) return;
    target = next;
    ramp = next.ramp;
    tunedRow = row || null;
    dirty = true;
  }

  function ripple(x, y) {
    if (reduce.matches) return;
    ripples.push({ x, y, at: performance.now() });
    dirty = true;
  }

  window.addEventListener('pointermove', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.touch = e.pointerType === 'touch';
    pointer.goal = 1;
    pointer.at = performance.now();
    dirty = true;
  }, { passive: true });

  window.addEventListener('pointerdown', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.touch = e.pointerType === 'touch';
    pointer.goal = 1;
    pointer.at = performance.now();
    ripple(e.clientX, e.clientY);
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => { pointer.goal = 0; });

  const links = document.querySelectorAll('.game');
  links.forEach(a => {
    const game = a.dataset.game;
    a.addEventListener('pointerenter', () => tune(game, a));
    a.addEventListener('pointerleave', () => tune(null, null));
    a.addEventListener('focus', () => tune(game, a));
    a.addEventListener('blur', () => tune(null, null));

    // The ring leaves before the page does. A modified click, a middle click and reduced
    // motion go straight through.
    a.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduce.matches) return;
      e.preventDefault();
      const r = a.getBoundingClientRect();
      ripple(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
      setTimeout(() => { window.location.href = a.href; }, 260);
    });
  });

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { measureQuiet(); dirty = true; }, { passive: true });
  reduce.addEventListener('change', () => { dirty = true; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

  resize();
  requestAnimationFrame(frame);
})();
