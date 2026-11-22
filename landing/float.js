// The games inside the "dossier" box drift slowly, bounce off its edges and off each other, and
// never overlap. Each link is a box (emblem and name) that moves by its transform. One under the
// pointer, a finger or keyboard focus slows to a stop so it can be pressed, and moves on when
// let go.
//
// The links start from where the still row put them, so they never start overlapping. Without
// the script, or with reduced motion, the row is what stays.
(() => {
  const arena = document.getElementById('arena');
  if (!arena) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const SPEED = 24; // px per second
  const EASE = 6; // how fast a held logo stops and a freed one gets going, per second

  const bodies = [...arena.querySelectorAll('.game')].map(el => ({
    el, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, pace: 1, hover: false, focus: false,
  }));
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = 0;

  function measure() {
    width = arena.clientWidth;
    height = arena.clientHeight;
    for (const b of bodies) {
      b.w = b.el.offsetWidth;
      b.h = b.el.offsetHeight;
    }
  }

  function walls(b) {
    if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); }
    if (b.x + b.w > width) { b.x = Math.max(0, width - b.w); b.vx = -Math.abs(b.vx); }
    if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy); }
    if (b.y + b.h > height) { b.y = Math.max(0, height - b.h); b.vy = -Math.abs(b.vy); }
  }

  // Two boxes that overlap are pushed apart along the axis they overlap least on, and bounce on
  // it: two free ones trade speeds as equal masses do; a free one leaves a held one alone. A pair
  // the walls pushed back together is pushed along the other axis (`other`): without that, a
  // column taller than the box (left by a narrow window) jams against the floor and ceiling.
  function collide(a, b, other) {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox <= 0 || oy <= 0) return;
    const aHeld = a.hover || a.focus;
    const bHeld = b.hover || b.focus;
    const shareA = aHeld === bHeld ? 0.5 : aHeld ? 0 : 1;
    const axis = (ox < oy) !== other ? ['x', 'vx', ox, a.x + a.w / 2 < b.x + b.w / 2] : ['y', 'vy', oy, a.y + a.h / 2 < b.y + b.h / 2];
    const [p, v, depth, aFirst] = axis;
    const s = aFirst ? 1 : -1; // the side b is on, seen from a
    a[p] -= s * depth * shareA;
    b[p] += s * depth * (1 - shareA);
    if (!aHeld && !bHeld) {
      if ((a[v] - b[v]) * s > 0) [a[v], b[v]] = [b[v], a[v]];
    } else {
      if (!aHeld) a[v] = -s * Math.abs(a[v]);
      if (!bHeld) b[v] = s * Math.abs(b[v]);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const b of bodies) {
      const goal = b.hover || b.focus ? 0 : 1;
      b.pace += (goal - b.pace) * Math.min(1, dt * EASE);
      b.x += b.vx * b.pace * dt;
      b.y += b.vy * b.pace * dt;
      walls(b);
    }
    for (const other of [false, true]) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) collide(bodies[i], bodies[j], other);
      }
      for (const b of bodies) walls(b);
    }
    for (const b of bodies) {
      b.el.style.transform = `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px)`;
    }
  }

  function start() {
    if (raf) return;
    // Take each link from its place in the row, then let it go in a direction of its own.
    for (const b of bodies) {
      b.x = b.el.offsetLeft;
      b.y = b.el.offsetTop;
      const angle = Math.random() * Math.PI * 2;
      b.vx = Math.cos(angle) * SPEED;
      b.vy = Math.sin(angle) * SPEED;
    }
    arena.classList.add('is-floating');
    measure();
    for (const b of bodies) b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    arena.classList.remove('is-floating');
    for (const b of bodies) b.el.style.transform = '';
  }

  for (const b of bodies) {
    b.el.addEventListener('pointerenter', () => { b.hover = true; });
    b.el.addEventListener('pointerleave', () => { b.hover = false; });
    b.el.addEventListener('pointercancel', () => { b.hover = false; });
    b.el.addEventListener('focus', () => { b.focus = true; });
    b.el.addEventListener('blur', () => { b.focus = false; });
  }

  new ResizeObserver(() => { if (raf) measure(); }).observe(arena);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (raf) measure(); });
  reduce.addEventListener('change', () => (reduce.matches ? stop() : start()));
  if (!reduce.matches) start();
})();
