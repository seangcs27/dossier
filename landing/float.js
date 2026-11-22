// The games inside the "dossier" box drift slowly, bounce off its edges and off each other, and
// never overlap. Each link is a box (emblem and name) that moves by its transform. One under the
// pointer, a finger or keyboard focus slows to a stop so it can be pressed, and moves on when
// let go.
//
// A logo can be dragged with a mouse or a finger, and thrown: let go, it keeps the speed it was
// moving at, which wears off back to the drift. A press that does not travel is a click and opens
// the game; a drag never does.
//
// The links start from where the still row put them, so they never start overlapping. Without
// the script, or with reduced motion, the row is what stays.
(() => {
  const arena = document.getElementById('arena');
  if (!arena) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const SPEED = 48; // px per second
  const EASE = 6; // how fast a held logo stops and a freed one gets going, per second
  const DRAG_START = 6; // px a press travels before it is a drag and not a click
  const THROW_MAX = 900; // px per second
  const THROW_DECAY = 1.5; // how fast a throw wears off, per second

  const bodies = [...arena.querySelectorAll('.game')].map(el => ({
    el, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, pace: 1, hover: false, focus: false, drag: false, safeX: 0, safeY: 0,
  }));
  let width = 0;
  let height = 0;
  let raf = 0;
  let last = 0;
  let grab = null; // the press on a logo that may become a drag
  let swallowUntil = 0; // a click before this time ends a drag and opens nothing

  let yielding = false; // the dragged logo gives way like any other (see frame)
  const held = b => (b.drag ? !yielding : b.hover || b.focus);

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
    if (ox <= 0.01 || oy <= 0.01) return false;
    const aHeld = held(a);
    const bHeld = held(b);
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
    return true;
  }

  // Passes over every pair until none overlaps (16 at most), since separating one pair can push
  // it into a third logo; then one pass along the other axis for a pair the walls keep together.
  function solve() {
    for (const other of [false, true, false]) {
      for (let pass = 0; pass < (other ? 1 : 16); pass++) {
        let any = false;
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) any = collide(bodies[i], bodies[j], other) || any;
        }
        for (const b of bodies) walls(b);
        if (!any) break;
      }
    }
  }

  function overlapping() {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5) return true;
      }
    }
    return false;
  }

  // A free logo's speed goes back to the drift: a throw wears off, and one let go at rest picks
  // up again, in a direction of its own if it had none.
  function settle(b, dt) {
    let speed = Math.hypot(b.vx, b.vy);
    if (speed < 1) {
      const angle = Math.random() * Math.PI * 2;
      b.vx = Math.cos(angle);
      b.vy = Math.sin(angle);
      speed = 1;
    }
    const next = speed > SPEED
      ? SPEED + (speed - SPEED) * Math.exp(-dt * THROW_DECAY)
      : speed + (SPEED - speed) * Math.min(1, dt * 2);
    b.vx *= next / speed;
    b.vy *= next / speed;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const b of bodies) {
      if (b.drag) continue; // the pointer places it
      const goal = held(b) ? 0 : 1;
      b.pace += (goal - b.pace) * Math.min(1, dt * EASE);
      if (!held(b)) settle(b, dt);
      b.x += b.vx * b.pace * dt;
      b.y += b.vy * b.pace * dt;
      walls(b);
    }
    // A dragged logo pushes the others away; then the pairs are solved again with it giving way
    // like the rest, so that a pointer cannot force two logos together in a crowd.
    // If that still leaves an overlap (a narrow phone has room for no logo beside one dragged to
    // the middle), the dragged logo stays at its last place with room this frame.
    solve();
    const d = bodies.find(b => b.drag);
    if (d) {
      yielding = true;
      solve();
      if (overlapping()) {
        d.x = d.safeX;
        d.y = d.safeY;
        solve();
      }
      yielding = false;
      if (!overlapping()) { d.safeX = d.x; d.safeY = d.y; }
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
    endDrag(null);
    arena.classList.remove('is-floating');
    for (const b of bodies) b.el.style.transform = '';
  }

  // Dragging. The press is watched from the window, since the pointer can leave the logo before
  // the drag starts; once it starts, the logo captures the pointer.
  arena.addEventListener('pointerdown', e => {
    if (!raf || grab || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.target.closest('.game');
    if (!el) return;
    const b = bodies.find(o => o.el === el);
    const box = arena.getBoundingClientRect();
    grab = {
      b, id: e.pointerId, startX: e.clientX, startY: e.clientY,
      dx: e.clientX - box.left - b.x, dy: e.clientY - box.top - b.y, trail: [[e.timeStamp, e.clientX, e.clientY]],
    };
  });

  window.addEventListener('pointermove', e => {
    if (!grab || e.pointerId !== grab.id) return;
    const { b } = grab;
    if (!b.drag) {
      if (Math.hypot(e.clientX - grab.startX, e.clientY - grab.startY) < DRAG_START) return;
      b.drag = true;
      b.safeX = b.x;
      b.safeY = b.y;
      b.el.setPointerCapture(e.pointerId);
      document.body.classList.add('is-dragging');
    }
    grab.trail.push([e.timeStamp, e.clientX, e.clientY]);
    while (grab.trail.length > 2 && e.timeStamp - grab.trail[0][0] > 100) grab.trail.shift();
    const box = arena.getBoundingClientRect();
    b.x = Math.min(Math.max(0, e.clientX - box.left - grab.dx), Math.max(0, width - b.w));
    b.y = Math.min(Math.max(0, e.clientY - box.top - grab.dy), Math.max(0, height - b.h));
  });

  // Let go: the logo leaves at the speed the pointer had over its last tenth of a second.
  function endDrag(e) {
    if (!grab || (e && e.pointerId !== grab.id)) return;
    const { b, trail } = grab;
    if (b.drag) {
      const [t0, x0, y0] = trail[0];
      const [t1, x1, y1] = e ? [e.timeStamp, e.clientX, e.clientY] : trail[trail.length - 1];
      const dt = (t1 - t0) / 1000;
      let vx = dt > 0.008 ? (x1 - x0) / dt : 0;
      let vy = dt > 0.008 ? (y1 - y0) / dt : 0;
      const speed = Math.hypot(vx, vy);
      if (speed > THROW_MAX) { vx *= THROW_MAX / speed; vy *= THROW_MAX / speed; }
      b.vx = vx;
      b.vy = vy;
      b.pace = 1;
      b.drag = false;
      swallowUntil = performance.now() + 400;
      document.body.classList.remove('is-dragging');
    }
    grab = null;
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // The click that ends a drag opens nothing. Caught on the way down, before field.js's own
  // handler on the link sends its ring and changes the page.
  arena.addEventListener('click', e => {
    if (performance.now() < swallowUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  // The browser's own drag of a link (its address as a ghost) would take the pointer away.
  arena.addEventListener('dragstart', e => e.preventDefault());

  for (const b of bodies) {
    b.el.addEventListener('pointerenter', () => { b.hover = true; });
    b.el.addEventListener('pointerleave', () => { b.hover = false; });
    b.el.addEventListener('pointercancel', () => { b.hover = false; });
    // Only keyboard focus holds a logo: a mouse press focuses the link too, and a logo thrown
    // would then stop dead where it was let go.
    b.el.addEventListener('focus', () => { b.focus = b.el.matches(':focus-visible'); });
    b.el.addEventListener('blur', () => { b.focus = false; });
  }

  new ResizeObserver(() => { if (raf) measure(); }).observe(arena);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (raf) measure(); });
  reduce.addEventListener('change', () => (reduce.matches ? stop() : start()));
  if (!reduce.matches) start();
})();
