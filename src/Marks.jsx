import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// The tutorial's marks on the stage (Tour.jsx decides what they say). They sit in the tutorial's column between the app
// and the phone (.guide), so the visitor always reads in the same place, and point into the mockup with hand-drawn
// arrows.
//
// One note is the MAIN BOX, a real piece of UI with buttons and links:
//   { kind: 'ask', any, dev, body }   what to click: a red pen ring on the thing, the prompt beside it (with "Do it for
//                                     me"). `any` lists the candidates for the thing, deepest first: the first one on
//                                     screen that can be pressed is ringed, so the ring walks through a few clicks.
//   { kind: 'card', at?, dev, body }  what it got you: the explanation card, with a blue arrow to `at` ({ at, has? }).
//   { kind: 'wait', at?, dev, body }  the mockup is still finishing what the visitor started.
//   { kind: 'off', dev, any?, body }  the visitor said no, or wandered off. With `any`, the thing to click is still
//                                     looked for and reported, but not ringed.
// `dev` is the device the box belongs to ('app' for Tidepool, 'phone', 'hw' for the Anchor). It picks the column's side
// the box leans to (left for the app and the Anchor, right for the phone) and is where the arrow points when `at`
// can't be found.
// The other notes are POINTS, short handwritten lines with a blue arrow: { kind: 'point', at, has?, text }.
//
// Placement: the tag heads the column. The main box is placed next, level with what it points at, and never hidden:
// when its element is gone it stays where it was, or sits level with the middle of its device. Points then take the
// free space in their outer margin nearest their element, or the column's when the margin is narrow; a point that fits
// nowhere is dropped (data-dropped, which the checks catch), and a point whose element is out of view waits for it
// (data-off). In a window too narrow for the column, the box docks over the stage next to its target. Widths are set
// before heights are read, in the same pass, and a ResizeObserver on every box catches late changes (fonts, a waiting
// line). Scrolling moves only the arrows, so a button never slides away under the pointer.
//
// After every measure Marks reports on the ring's element: `missing`, `moving` (sliding in), `hidden` (scrolled or
// clipped away), `covered` (an overlay is over it), `disabled` or `found`, plus which candidate it is. With `watch`, it
// also reports whether that selector matches a laid-out element.

// A small seeded random, so a note's hand-drawn marks keep their shape each time they are measured again.
function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }
const f = n => n.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// A curved arrow from (x1, y1) to (x2, y2) that bows a little to one side, and its head.
function arrow(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bow = Math.min(30, len * 0.16) * (r() > 0.5 ? 1 : -1);
  const c1x = x1 + dx * 0.3 + nx * bow, c1y = y1 + dy * 0.3 + ny * bow;
  const c2x = x1 + dx * 0.72 + nx * bow * 0.55, c2y = y1 + dy * 0.72 + ny * bow * 0.55;
  const tx = x2 - c2x, ty = y2 - c2y, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
  const L = 11, a = 0.48 + r() * 0.12, cs = Math.cos(a), sn = Math.sin(a);
  const h1 = [x2 - L * (ux * cs - uy * sn), y2 - L * (uy * cs + ux * sn)];
  const h2 = [x2 - L * (ux * cs + uy * sn), y2 - L * (uy * cs - ux * sn)];
  return { d: `M${f(x1)} ${f(y1)} C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x2)} ${f(y2)}`, head: `M${f(h1[0])} ${f(h1[1])} L${f(x2)} ${f(y2)} L${f(h2[0])} ${f(h2[1])}` };
}
// A pen loop round an element: once round and a little past where it started, drifting outward, like a quick circle
// by hand. Each arc is shorter than half a turn, so it follows the ellipse however wide the element is.
function loop(cx, cy, rx, ry, r) {
  const a0 = -2.4 + r() * 0.4;
  const pt = (a, k) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  const p0 = pt(a0, 1);
  let d = `M${f(p0[0])} ${f(p0[1])}`;
  for (const [turn, k] of [[0.72, 1.01], [1.45, 1.03], [2.18, 1.06]]) {
    const p = pt(a0 + Math.PI * turn, k);
    d += ` A${f(rx * k)} ${f(ry * k)} 0 0 1 ${f(p[0])} ${f(p[1])}`;
  }
  return d;
}
// A bracket beside a big element, on the side the note is on. Its long stroke bows a little, as a hand-drawn line does.
function bracket(x, top, bottom, dir, r) {
  const k = 7 * dir, bow = (r() - 0.5) * 3;
  return `M${f(x + k)} ${f(top)} Q${f(x)} ${f(top)} ${f(x)} ${f(top + 9)} Q${f(x + bow)} ${f((top + bottom) / 2)} ${f(x)} ${f(bottom - 9)} Q${f(x)} ${f(bottom)} ${f(x + k)} ${f(bottom)}`;
}

// The part of an element its scrolling and clipping ancestors leave visible, or null. `clips` caches the ancestors.
function visibleRect(el, root, clips) {
  let list = clips.get(el);
  if (!list) {
    list = [];
    for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') list.push(p);
    }
    clips.set(el, list);
  }
  let { top, bottom, left, right } = el.getBoundingClientRect();
  for (const p of list) {
    const pr = p.getBoundingClientRect();
    top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom); left = Math.max(left, pr.left); right = Math.min(right, pr.right);
  }
  return bottom - top > 4 && right - left > 4 ? { top, bottom, left, right } : null;
}
// The nearest ancestor that scrolls, unless the element sits in a sticky bar (which scrolling does not move).
function scroller(el, root, scrolls) {
  let chain = scrolls.get(el);
  if (!chain) {
    chain = [];
    for (let p = el; p && p !== root; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const can = p !== el && (cs.overflowY === 'auto' || cs.overflowY === 'scroll');
      if (can || cs.position === 'sticky') chain.push({ p, can, sticky: cs.position === 'sticky' });
    }
    scrolls.set(el, chain);
  }
  let sticky = false;
  for (const c of chain) {
    if (c.can && c.p.scrollHeight > c.p.clientHeight + 2) return sticky ? null : c.p;
    if (c.sticky) sticky = true;
  }
  return null;
}
// Sticky bars near the top of a scrolling area (an app's header), which cover what scrolls under them. Looked up once
// per area, three levels deep.
function stickies(sc, cache) {
  let list = cache.get(sc);
  if (!list) {
    list = [];
    const walk = (el, depth) => { for (const c of el.children) { if (getComputedStyle(c).position === 'sticky') list.push(c); else if (depth < 3) walk(c, depth + 1); } };
    walk(sc, 1);
    cache.set(sc, list);
  }
  return list;
}
// Scrolls so the given elements in one scrolling area are in view, below any sticky bar at its top: all of them when
// they fit, else from the first.
function reveal(sc, els, cache) {
  const pr = sc.getBoundingClientRect();
  let top0 = pr.top;
  for (const st of stickies(sc, cache)) { const r = st.getBoundingClientRect(); if (r.top <= pr.top + 4 && r.bottom > top0) top0 = r.bottom; }
  const rs = els.map(e => e.getBoundingClientRect());
  const top = Math.min(...rs.map(r => r.top)), bottom = Math.max(...rs.map(r => r.bottom));
  const room = pr.bottom - top0 - 32;
  let d = 0;
  if (bottom - top <= room) {
    if (top < top0 + 16) d = top - top0 - 16;
    else if (bottom > pr.bottom - 16) d = bottom - pr.bottom + 16;
  } else if (Math.abs(rs[0].top - top0 - 16) > 2) d = rs[0].top - top0 - 16;
  if (Math.abs(d) > 1) sc.scrollTop += d;
}
// The first match of a note's selector that is laid out and, with `has`, whose text contains it. Case is ignored,
// because labels are set in capitals by CSS.
export function findTarget(scope, n) {
  if (!scope || !n || !n.at) return null;
  const has = n.has && n.has.toLowerCase();
  for (const el of scope.querySelectorAll(n.at)) {
    if (has && !(el.textContent || '').toLowerCase().includes(has)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}
// The ring's element: the first candidate that is laid out and enabled, else the first that is laid out. `k` is its
// place in the list.
const pressable = el => !el.disabled && el.getAttribute('aria-disabled') !== 'true';
export function pickTarget(scope, any) {
  let first = null;
  for (let k = 0; k < any.length; k++) {
    const el = findTarget(scope, any[k]);
    if (!el) continue;
    if (pressable(el)) return { el, k };
    if (!first) first = { el, k };
  }
  return first;
}
// Finite CSS animations running on an element or its ancestors (a sheet sliding up, a list rising in). Spinners and
// other endless animations don't count.
function arriving(el) {
  return document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.contains(el)
    && a.effect.getTiming().iterations !== Infinity);
}
// Where a rect will be once the entrances moving it have ended: less each moving element's current translation. The
// stage's entrances (a sheet sliding up, a list rising in) only translate, so this is where the element lands. A
// translation is in the element's own pixels, which the phone draws scaled down: it is scaled by how much smaller its
// parent is drawn than it is laid out.
function landed(v, moving) {
  let dx = 0, dy = 0;
  for (const t of new Set(moving.filter(a => !a.effect.pseudoElement).map(a => a.effect.target))) {
    const tf = getComputedStyle(t).transform;
    if (!tf || tf === 'none') continue;
    const m = new DOMMatrixReadOnly(tf);
    let k = 1;
    for (let p = t.parentElement; p; p = p.parentElement) if (p.offsetWidth > 0) { k = p.getBoundingClientRect().width / p.offsetWidth; break; }
    dx += m.m41 * k; dy += m.m42 * k;
  }
  return { top: v.top - dy, bottom: v.bottom - dy, left: v.left - dx, right: v.right - dx };
}
// The Anchor is the `aside.hw` panel. A bare `.hw` would also match the "Check your Anchor" ring on the phone
// (`.faceid .ring.hw`), which would then be dimmed as a device of its own.
const DEVICE = { app: '.browser', phone: '.phoneWrap', hw: 'aside.hw' };
const ROOTS = '.browser, aside.hw, .phoneWrap';
// Is `el` (or what covers it) the thing at the centre of its visible rect? The tutorial's own boxes (`skip`) don't
// count: in a narrow window they can sit over the stage.
function uncovered(el, v, skip) {
  for (const hit of document.elementsFromPoint((v.left + v.right) / 2, (v.top + v.bottom) / 2)) {
    if (skip && skip.contains(hit)) continue;
    return el.contains(hit) || hit.contains(el);
  }
  return false;
}

// The marks never run work on every frame. They are measured when they mount, a few times while a step opens
// (sheets slide up, a simulation finishes), once after a burst of changes in the stage has settled, when an animation
// the ring waits on lands, when a box changes size, and at most once a frame while the visitor scrolls. Each mark is
// its own small layer that fades in with opacity and a short slide, which the compositor runs.
const OPEN_AT = [120, 350, 750, 1400, 2400];
const GAP = 14;   // between stacked notes
const HOLD = 800; // longest a prompt waits for its target to show up (the stage's entrances end by about 700ms)
const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function Marks({ id, notes, watch, open, wants, onReport, tag }) {
  const layer = useRef(null);
  const boxes = useRef(null);
  const boxEl = useRef(null);
  const tagEl = useRef(null);
  const pointEls = useRef([]);
  const [placed, setPlaced] = useState({ box: null, points: [], marks: [], ring: null, tag: null });
  const settle = useRef(0);            // until when the marks may still scroll their elements into view
  const moved = useRef(false);         // the visitor has scrolled or clicked: leave the scrolling to them
  const scrolled = useRef(false);      // this measure comes from a scroll: keep the boxes still
  const frame = useRef(0);
  const timers = useRef([]);
  const quiet = useRef(0);
  const last = useRef('');
  const lastBox = useRef(null);        // where the main box was, so it stays put when its element goes
  const bornAt = useRef(0);            // when these marks mounted
  const shown = useRef(false);         // the main box has been placed once
  const holdT = useRef(0);             // the measure at the end of a prompt's wait for its target
  const shownBox = useRef(null);       // where the main box was last placed
  const moveGen = useRef(0);           // how often the main box has moved since it was placed
  const renderedBox = useRef(null);    // where the main box was drawn last, for its glide
  const glide = useRef(null);
  const waited = useRef(new WeakSet());
  const outlined = useRef(null);
  const ringed = useRef(null);
  // Style lookups are cached per element for as long as these marks are up. The stage can change under them (a sheet
  // opens), but a cached element keeps its own ancestors.
  const clips = useRef(new WeakMap());
  const scrolls = useRef(new WeakMap());
  const sticky = useRef(new WeakMap());
  const report = useRef(onReport);
  report.current = onReport;

  const main = notes.find(n => n.kind !== 'point') || null;
  const points = notes.filter(n => n.kind === 'point');

  const measure = useCallback(() => {
    const el = layer.current;
    if (!el) return;
    const fromScroll = scrolled.current;
    scrolled.current = false;
    const work = el.parentElement;
    const W = work.getBoundingClientRect();
    const app = work.querySelector('.col-app');
    const phone = work.querySelector('.phoneWrap');
    if (!app || !phone) return;
    // Everything below is in the layer's own coordinates, which start at the stage's top left corner.
    const rel = v => ({ top: v.top - W.top, bottom: v.bottom - W.top, left: v.left - W.left, right: v.right - W.left });
    const A = rel(app.getBoundingClientRect()), P = rel(phone.getBoundingClientRect());
    // The tutorial's column (.guide) between the app and the phone holds the tag, the prompt and the card. The outer
    // margins only take handwritten points, when they are wide enough.
    const guide = work.querySelector('.guide');
    const G = guide ? rel(guide.getBoundingClientRect()) : null;
    const cols = {
      left: { x0: 16, x1: A.left - 24 },
      right: { x0: P.right + 24, x1: W.width - 16 },
      mid: G ? { x0: G.left, x1: G.right } : { x0: A.right + 24, x1: P.left - 24 },
    };
    const lo = 10, hi = W.height - 10;
    const sideOf = root => (root && root.classList.contains('phoneWrap') ? 'right' : 'left');
    const r = rng(1 + id.length * 31 + (main ? main.kind.length * 7 : 0));

    // What a card or a note points at may still be sliding in: it is placed by where it will land, and measured once
    // more when it has.
    const settledRect = (t, v) => {
      const moving = arriving(t);
      if (!moving.length) return v;
      for (const a of moving) if (!waited.current.has(a)) { waited.current.add(a); a.finished.then(() => soonRef.current(), () => {}); }
      return landed(v, moving);
    };

    // ---- the main box's element: the ring's target, or what the card explains ----
    // `level`: a target that can't be pressed yet (disabled, under an overlay, or still sliding in, where it will land).
    // It isn't ringed yet, but the prompt already sits level with it, so it doesn't jump there once the target can be
    // pressed.
    let status = 'missing', target = null, cand = -1, anchor = null, level = null, root = null, top = null, cardEl = null;
    if (main && main.any && (main.kind === 'ask' || main.kind === 'off')) {
      const pick = pickTarget(work, main.any);
      if (pick) { target = pick.el; cand = pick.k; }
      if (target && !work.contains(target)) { top = target; status = pressable(target) ? 'found' : 'disabled'; target = null; }
      if (target) {
        root = target.closest(ROOTS);
        status = 'hidden';
        const v = root && visibleRect(target, root, clips.current);
        if (v) {
          if (!uncovered(target, v, boxes.current)) { status = 'covered'; level = rel(v); }
          else {
            const moving = arriving(target);
            if (moving.length) {
              status = 'moving';
              for (const a of moving) if (!waited.current.has(a)) { waited.current.add(a); a.finished.then(() => soonRef.current(), () => {}); }
              level = landed(rel(v), moving);
            } else if (!pressable(target)) { status = 'disabled'; level = rel(v); }
            else { status = 'found'; anchor = { v: rel(v), kind: 'ring' }; }
          }
        }
      }
    } else if (main && main.at) {
      const t = findTarget(work, main.at);
      if (t) {
        cardEl = t;
        root = t.closest(ROOTS);
        const v = root && visibleRect(t, root, clips.current);
        if (v && uncovered(t, v, boxes.current)) anchor = { v: settledRect(t, rel(v)), kind: 'el' };
      }
    }
    if (main && main.kind === 'off') anchor = null;   // off the path: the target is only watched, never ringed
    if (outlined.current !== top) {
      if (outlined.current) outlined.current.removeAttribute('data-tour-target');
      if (top) top.setAttribute('data-tour-target', '');
      outlined.current = top;
    }
    // The element the visitor may press (the lock in Tour.jsx lets only it take clicks): it keeps its pointer cursor.
    const ringEl = main && main.kind === 'ask' ? target : null;
    if (ringed.current !== ringEl) {
      if (ringed.current) ringed.current.removeAttribute('data-tour-ring');
      if (ringEl) ringEl.setAttribute('data-tour-ring', '');
      ringed.current = ringEl;
    }
    const devEl = main && main.dev ? work.querySelector(DEVICE[main.dev]) : null;
    if (!root) root = devEl || null;
    if (!anchor && root && main && main.kind !== 'ask' && main.kind !== 'off') {
      // what the card explains is gone or covered (a sheet closed, Face ID is up): point at the device instead
      anchor = { v: rel(root.getBoundingClientRect()), kind: 'device' };
    }

    // ---- points: their elements (`ptEls` also holds the ones scrolled out of view, so they can be brought back) ----
    const ptEls = points.map(n => { const t = findTarget(work, n); return t ? { t, root: t.closest(ROOTS) } : null; });
    const pts = ptEls.map(x => {
      if (!x) return null;
      const { t, root: rt } = x;
      const v = rt && visibleRect(t, rt, clips.current);
      if (!v || !uncovered(t, v, boxes.current)) return null;
      return { t, root: rt, v: settledRect(t, rel(v)), side: sideOf(rt), sc: scroller(t, rt, scrolls.current) };
    });

    // Dim the devices these marks say nothing about (the app while the wallet is asking).
    const used = new Set([root, ...pts.filter(Boolean).map(x => x.root)].filter(Boolean));
    for (const d of work.querySelectorAll(ROOTS)) {
      const dim = used.size && !used.has(d) ? '1' : '';
      if ((d.dataset.dim || '') !== dim) d.dataset.dim = dim;
    }
    // While the marks settle, keep their elements in view in each scrolling area. "Do it for me" asks for its target
    // to be shown whatever the visitor scrolled.
    const want = !!(wants && wants.current && wants.current.reveal) && main && main.kind === 'ask';
    if ((!moved.current && performance.now() < settle.current) || want) {
      const groups = new Map();
      const add = (t, rt) => { const sc = rt && scroller(t, rt, scrolls.current); if (sc) groups.set(sc, [...(groups.get(sc) || []), t]); };
      if (target && root) add(target, root);
      // what a card explains is scrolled into view too (a key added below the fold), so its arrow has something to point at
      if (cardEl && root && !want) add(cardEl, root);
      if (!want) ptEls.forEach(x => x && x.root && add(x.t, x.root));
      for (const [sc, els] of groups) reveal(sc, els, sticky.current);
    }

    // The marks for one note: a loop round a small element (or the ring's target), a bracket beside a big one, or
    // nothing when it points at a whole device; then the arrow from (sx, sy) on the note's edge. `toRight` says the
    // element lies to the right of the note.
    const drawTo = (v, kind, sx, sy, toRight) => {
      const vw = v.right - v.left, vh = v.bottom - v.top;
      let mark = null, ex, ey, mb;
      if (kind === 'device') {
        ex = toRight ? v.left - 8 : v.right + 8; ey = clamp(sy, v.top + 24, v.bottom - 24); mb = [ex, ey, ex, ey];
      } else if (kind === 'ring' || (vw <= 200 && vh <= 72)) {
        const cx = (v.left + v.right) / 2, cy = (v.top + v.bottom) / 2, rx = vw / 2 + 10, ry = vh / 2 + 8;
        mark = loop(cx, cy, rx, ry, r);
        ex = toRight ? cx - rx - 3 : cx + rx + 3; ey = cy;
        mb = [cx - rx * 1.12, cy - ry * 1.12, cx + rx * 1.12, cy + ry * 1.12];
      } else {
        const bx = toRight ? v.left - 7 : v.right + 7;
        mark = bracket(bx, v.top + 2, v.bottom - 2, toRight ? 1 : -1, r);
        ex = toRight ? bx - 4 : bx + 4; ey = clamp(sy, v.top + 12, v.bottom - 12);
        mb = [bx - 9, v.top, bx + 9, v.bottom];
      }
      const a = arrow(sx, sy, ex, ey, r);
      const pad = 40;
      const box = [Math.min(mb[0], sx, ex) - pad, Math.min(mb[1], sy, ey) - pad, Math.max(mb[2], sx, ex) + pad, Math.max(mb[3], sy, ey) + pad].map(Math.round);
      return { mark, arrow: a.d, head: a.head, box, mb };
    };

    // ---- the tag: the column's heading, pinned to its top, as wide as the column, and kept clear of by everything
    // else. It is left out when the column is too narrow for it (the boxes dock over the stage then). ----
    let tag = null;
    const occupied = { left: [], right: [], mid: [] };
    const room = cols.mid.x1 - cols.mid.x0;
    const narrow = room < 200;
    const colW = Math.round(Math.min(room, 420));
    const te = tagEl.current;
    if (te && !narrow) {
      if (te.style.width !== colW + 'px') te.style.width = colW + 'px';
      tag = { x: Math.round(cols.mid.x0), y: lo, w: colW, h: te.offsetHeight };
      occupied.mid.push([tag.y - GAP, tag.y + tag.h + GAP]);
    }

    // ---- place the main box ----
    // A prompt whose target is scrolled away or not there yet waits to appear until it is, for at most HOLD ms. Shown
    // at once, it would sit in the middle of its device and then jump to the target. (A target still sliding in has a
    // `level`: where it will land.)
    const askLevel = main && main.kind === 'ask' ? level : null;
    const hold = !!main && main.kind === 'ask' && !shown.current && !anchor && !askLevel && !top && performance.now() - bornAt.current < HOLD;
    if (hold && !holdT.current) holdT.current = setTimeout(() => { holdT.current = 0; soonRef.current(); }, HOLD - (performance.now() - bornAt.current) + 16);
    let box = null, ring = null;
    const marks = [];
    const bx = boxEl.current;
    if (main && bx && !hold) {
      const col = cols.mid;
      // 'r': what the box is about is on the phone, to the column's right; 'l': in the app or on the Anchor
      const dir = sideOf(root) === 'right' ? 'r' : 'l';
      const w = narrow ? Math.min(360, W.width - 32) : colW;
      if (bx.style.width !== w + 'px') bx.style.width = w + 'px';
      const h = bx.offsetHeight;
      // An ask box can open with a short brief (what happens today, what to try) over its prompt. The prompt line is
      // what sits level with the ring, and where the arrow leaves from.
      const say = main.kind === 'ask' ? bx.querySelector('.ta-say') : null;
      const sayAt = say ? say.offsetTop + 13 : 20;
      let x, y;
      if (narrow) {
        // No room for the column (a window under about 960px): the box sits over the stage, just below what it is
        // about, or above it, so it never hides the thing to click.
        const v = anchor && anchor.kind !== 'device' ? anchor.v : askLevel;
        x = clamp(v ? (v.left + v.right) / 2 - w / 2 : (W.width - w) / 2, 8, W.width - w - 8);
        y = !v ? hi - h : v.bottom + 14 + h <= hi ? v.bottom + 14 : v.top - 14 - h >= lo ? v.top - 14 - h : hi - h;
      }
      else {
        // in the column, on the side of what it is about, level with it: the box only ever moves up and down
        x = dir === 'r' ? col.x1 - w : col.x0;
        const lv = anchor && anchor.kind !== 'device' ? anchor.v : askLevel;
        const aY = lv ? (lv.top + lv.bottom) / 2 : null;
        const wantY = aY != null ? aY - (main.kind === 'ask' ? sayAt : Math.min(h * 0.3, 60))
          : lastBox.current ? lastBox.current.y
          : root ? (() => { const R = rel(root.getBoundingClientRect()); return (R.top + R.bottom) / 2 - h / 2; })() : W.height / 2 - h / 2;
        // the tag at the column's top gives way to a box too tall to fit under it
        if (tag && h > hi - (tag.y + tag.h + GAP)) { tag = null; occupied.mid = []; }
        y = clamp(wantY, tag ? tag.y + tag.h + GAP : lo, hi - h);
        if (fromScroll && lastBox.current) y = lastBox.current.y;
      }
      box = { x: Math.round(x), y: Math.round(y), w, h, dir, narrow };
      // A box that moves once it is up glides there (the layout effect below), and its arrow is drawn in afresh at the
      // new place: the arrow's key changes, so it fades in again rather than jumping.
      const was = shownBox.current;
      if (was && (Math.abs(was.x - box.x) > 4 || Math.abs(was.y - box.y) > 4)) moveGen.current++;
      shownBox.current = box;
      shown.current = true;
      lastBox.current = box;
      if (!narrow) occupied.mid.push([y - GAP, y + h + GAP]);
      if (anchor && narrow && anchor.kind === 'ring') {
        // docked: the ring still goes round the thing to click, with no arrow from the box
        const v = anchor.v, cx = (v.left + v.right) / 2, cy = (v.top + v.bottom) / 2, rx = (v.right - v.left) / 2 + 10, ry = (v.bottom - v.top) / 2 + 8;
        ring = { d: loop(cx, cy, rx, ry, r), box: [cx - rx * 1.12 - 6, cy - ry * 1.12 - 6, cx + rx * 1.12 + 6, cy + ry * 1.12 + 6].map(Math.round) };
      }
      if (anchor && !narrow) {
        const toRight = dir === 'r';
        const sx = toRight ? x + w + 6 : x - 6;
        const sy = main.kind === 'ask' ? y + sayAt : clamp((anchor.v.top + anchor.v.bottom) / 2, y + 22, y + h - 22);
        // A ring round a whole card would be a loop over its contents; a big target gets a red bracket instead.
        const big = anchor.kind === 'ring' && (anchor.v.right - anchor.v.left > 260 || anchor.v.bottom - anchor.v.top > 110);
        const m = drawTo(anchor.v, big ? 'el' : anchor.kind, sx, sy, toRight);
        const key = 'm' + moveGen.current;
        if (big) marks.push({ key, tone: 'red', arrow: m.arrow, head: m.head, mark: m.mark, box: m.box });
        else if (anchor.kind === 'ring') {
          ring = { d: m.mark, box: [m.mb[0] - 6, m.mb[1] - 6, m.mb[2] + 6, m.mb[3] + 6].map(Math.round) };
          marks.push({ key, tone: 'red', arrow: m.arrow, head: m.head, mark: null, box: m.box });
        } else {
          marks.push({ key, tone: main.kind === 'card' ? 'blue' : 'pencil', arrow: m.arrow, head: m.head, mark: m.mark, box: m.box });
        }
      }
    }

    // ---- fit the points into the free space of their outer margin, nearest their element, or into the column's when
    // the margin is too narrow ----
    const placedPts = points.map((n, k) => {
      const x = pts[k];
      const pe = pointEls.current[k];
      if (!pe || (box && box.narrow)) return null;   // a docked box leaves no margin for notes
      // its element exists but is out of view (scrolled away to keep the card's subject in view, or under a sticky bar)
      if (!x) return ptEls[k] ? { k, off: true } : null;
      const outer = cols[x.side].x1 - cols[x.side].x0 >= 150;
      const where = outer ? x.side : 'mid';
      const col = cols[where];
      const w = Math.round(clamp(col.x1 - col.x0, 110, 210));
      if (pe.style.width !== w + 'px') pe.style.width = w + 'px';
      const h = pe.offsetHeight;
      const wantY = (x.v.top + x.v.bottom) / 2 - 13;
      const ivs = occupied[where];
      const fits = yy => yy >= lo - 0.5 && yy + h <= hi + 0.5 && ivs.every(([a, b]) => yy + h <= a || yy >= b);
      const cands = [clamp(wantY, lo, hi - h), ...ivs.flatMap(([a, b]) => [a - h, b])].filter(fits);
      if (!cands.length || col.x1 - col.x0 < 100) return { k, dropped: true };
      const y = cands.sort((p, q) => Math.abs(p - wantY) - Math.abs(q - wantY))[0];
      ivs.push([y - GAP, y + h + GAP]);
      // in the left margin or the column, a point on the phone lies to the note's right; in the right margin, to its left
      const toRight = outer ? x.side === 'left' : x.side === 'right';
      const nx = toRight ? col.x1 - w : col.x0;
      const m = drawTo(x.v, 'el', toRight ? col.x1 + 6 : col.x0 - 6, y + 13, toRight);
      marks.push({ key: 'p' + k, tone: 'blue', arrow: m.arrow, head: m.head, mark: m.mark, box: m.box });
      return { k, x: Math.round(nx), y: Math.round(y), w, align: toRight ? 'right' : 'left' };
    });

    const next = { box, points: placedPts, marks, ring, tag };
    const key = JSON.stringify([tag && [tag.x, tag.y, tag.w], box && [box.x, box.y, box.w, box.h], placedPts.map(p => p && (p.dropped ? 'x' : p.off ? 'o' : [p.x, p.y, p.w])), marks.map(m => m.arrow + m.mark), ring && ring.d]);
    if (key !== last.current) { last.current = key; setPlaced(next); }
    // What the tutorial is told after every measure: the ring's element and its status, and whether the watched element is up.
    const seen = watch ? !!findTarget(work, { at: watch }) : false;
    if (status === 'found' && wants && wants.current) wants.current.reveal = false;
    if (report.current) report.current({ status, el: target || top, seen, cand });
  }, [notes, watch, id, wants]); // eslint-disable-line react-hooks/exhaustive-deps

  const latest = useRef(measure);
  latest.current = measure;
  // One measure on the next frame; calls in the same frame share it.
  const soon = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => { frame.current = 0; latest.current(); });
  }, []);
  const soonRef = useRef(soon);
  if (wants) wants.current.measure = soon;
  const at = useCallback((delays) => { for (const d of delays) timers.current.push(setTimeout(soon, d)); }, [soon]);

  useLayoutEffect(() => {
    last.current = ''; moved.current = false; lastBox.current = null;
    bornAt.current = performance.now(); shown.current = false; shownBox.current = null; moveGen.current = 0;
    clearTimeout(holdT.current); holdT.current = 0;
    settle.current = performance.now() + 2600;
    timers.current.forEach(clearTimeout); timers.current = [];
    latest.current();
    at(OPEN_AT);
    // Collapsed boxes a step needs open (an "Under the hood" box) are clicked once they exist, unless already open.
    const todo = [...(open || [])];
    let tries = 0, t = 0;
    const poke = () => {
      for (let j = todo.length - 1; j >= 0; j--) {
        const el = document.querySelector(todo[j]);
        if (!el) continue;
        if (!el.closest('.details.on')) el.click();
        todo.splice(j, 1);
      }
      if (todo.length && ++tries < 30) t = setTimeout(poke, 120);
      else at([60, 450]);
    };
    if (todo.length) t = setTimeout(poke, 60);
    return () => clearTimeout(t);
  }, [id, open, at]);

  // A box that moves once it is up glides from where it was: its contents start at the old place and ease into the new
  // one with a transform (the box itself keeps its entrance animation, and two transform animations on one element
  // would both leave the compositor). A glide that is still running hands over from where it has got to.
  useLayoutEffect(() => {
    const b = placed.box, was = renderedBox.current;
    renderedBox.current = b;
    const body = boxEl.current && boxEl.current.firstElementChild;
    if (!b || !was || !body || reducedMotion()) return;
    let dx = was.x - b.x, dy = was.y - b.y;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    if (glide.current && glide.current.playState === 'running') {
      const m = new DOMMatrixReadOnly(getComputedStyle(body).transform);
      dx += m.m41; dy += m.m42;
      glide.current.cancel();
    }
    glide.current = body.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }], { duration: 260, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }, [placed]);

  // A box that changes size (a font arrives, the waiting line comes and goes) is placed again.
  useEffect(() => {
    const ro = new ResizeObserver(() => soon());
    if (boxEl.current) ro.observe(boxEl.current);
    if (tagEl.current) ro.observe(tagEl.current);
    for (const p of pointEls.current) if (p) ro.observe(p);
    return () => ro.disconnect();
  }, [soon, notes]);

  useEffect(() => {
    const el = layer.current;
    if (!el) return undefined;
    const work = el.parentElement;
    const mine = n => el.contains(n) || (boxes.current && boxes.current.contains(n));
    // After the stage changes (a sheet opens, a simulation ends, the visitor clicks through a flow), wait until it
    // has been quiet for a moment, then measure, and once more after the animations that change started.
    const mo = new MutationObserver(recs => {
      if (!recs.some(r => !mine(r.target) && r.attributeName !== 'data-dim' && r.attributeName !== 'data-tour-target' && r.attributeName !== 'data-tour-ring')) return;
      clearTimeout(quiet.current);
      quiet.current = setTimeout(() => { soon(); at([380, 800]); }, 140);
    });
    mo.observe(work, { subtree: true, childList: true, attributes: true, characterData: true });
    const onScroll = (e) => { if (!mine(e.target)) { scrolled.current = true; soon(); } };
    let rz = 0;
    const onResize = () => { clearTimeout(rz); rz = setTimeout(() => { lastBox.current = null; soon(); }, 150); };
    const onHand = (e) => { if (!mine(e.target)) moved.current = true; };
    // A hidden tab barely runs timers or frames, so when it comes back the marks get their settling time again.
    const onShow = () => {
      if (document.visibilityState !== 'visible') return;
      settle.current = Math.max(settle.current, performance.now() + 1500);
      at([0, 400, 1000]);
    };
    document.addEventListener('visibilitychange', onShow);
    work.addEventListener('scroll', onScroll, true);
    work.addEventListener('wheel', onHand, { passive: true });
    work.addEventListener('pointerdown', onHand);
    window.addEventListener('resize', onResize);
    return () => {
      mo.disconnect(); clearTimeout(quiet.current); clearTimeout(rz); clearTimeout(holdT.current); holdT.current = 0;
      timers.current.forEach(clearTimeout); timers.current = [];
      work.removeEventListener('scroll', onScroll, true); work.removeEventListener('wheel', onHand); work.removeEventListener('pointerdown', onHand);
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onShow);
      cancelAnimationFrame(frame.current); frame.current = 0;
      if (outlined.current) { outlined.current.removeAttribute('data-tour-target'); outlined.current = null; }
      if (ringed.current) { ringed.current.removeAttribute('data-tour-ring'); ringed.current = null; }
    };
  }, [soon, at]);

  const { box } = placed;
  return (
    <>
      <div className="tn-layer" ref={layer} aria-hidden="true">
        {placed.marks.map((m, k) => (
          <svg key={id + m.key} className={'tn-marks ' + m.tone} style={{ '--i': k, left: m.box[0], top: m.box[1] }}
            width={m.box[2] - m.box[0]} height={m.box[3] - m.box[1]} viewBox={`${m.box[0]} ${m.box[1]} ${m.box[2] - m.box[0]} ${m.box[3] - m.box[1]}`}>
            {m.mark && <path d={m.mark} />}
            <path d={m.arrow} />
            <path d={m.head} />
          </svg>
        ))}
        {/* The ring is its own small layer, so its entrance and nudge are transforms the compositor runs. The
            entrance and the nudge are one animation on the outer span (two transform animations on one element would
            both fall back to the main thread), and a press from the tutorial animates the SVG inside it. */}
        {placed.ring && (
          <span key={id + 'ring'} className="tn-ring" style={{ left: placed.ring.box[0], top: placed.ring.box[1], '--ox': (placed.ring.box[2] - placed.ring.box[0]) / 2 + 'px', '--oy': (placed.ring.box[3] - placed.ring.box[1]) / 2 + 'px' }}>
            <svg width={placed.ring.box[2] - placed.ring.box[0]} height={placed.ring.box[3] - placed.ring.box[1]} viewBox={`${placed.ring.box[0]} ${placed.ring.box[1]} ${placed.ring.box[2] - placed.ring.box[0]} ${placed.ring.box[3] - placed.ring.box[1]}`}>
              <path d={placed.ring.d} />
            </svg>
          </span>
        )}
        {points.map((n, k) => {
          const p = placed.points[k];
          const ok = p && !p.dropped && !p.off;
          return (
            <div key={id + 'p' + k} ref={e => { pointEls.current[k] = e; }} className={'tn-note' + (ok ? ' in' : '')} data-dropped={p && p.dropped ? '' : undefined} data-off={p && p.off ? '' : undefined}
              style={{ '--i': k + 1, left: ok ? p.x : 0, top: ok ? p.y : 0, textAlign: ok ? p.align : 'left' }}>
              {n.text}
            </div>
          );
        })}
      </div>
      <div className="tn-boxes" ref={boxes}>
        {tag && (
          <div ref={tagEl} className={'tn-tag' + (placed.tag ? ' in' : '')} role="note" aria-label="What you are exploring"
            style={placed.tag ? { left: placed.tag.x, top: placed.tag.y, width: placed.tag.w } : undefined}>
            {tag}
          </div>
        )}
        {main && (
          <div key={id + main.kind} ref={boxEl} className={`tn-box tn-${main.kind}${box ? ' in' : ''}${box ? ' to-' + box.dir : ''}`} data-narrow={box && box.narrow ? '' : undefined}
            style={box ? { left: box.x, top: box.y, width: box.w } : undefined} data-kind={main.kind}>
            {main.body}
          </div>
        )}
      </div>
    </>
  );
}
