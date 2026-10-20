import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './state.jsx';
import { Icon } from './icons.jsx';
import { CHAPTERS, SLIDES } from './tour.js';
import { Marks, pickTarget } from './Marks.jsx';
import { PencilEdge, PencilRule } from './Sketch.jsx';

// The interactive tutorial (tour.js holds the script, Intro.jsx the full-screen pages). The visitor sees one of five
// views:
//   slide     the overview the mockup opens on: a few slides on what the standard does
//   welcome   the page after them: what this is, and what the chapters will show, in order
//   intro     a section's own page: its benefits, one short line each
//   step      the mockup, with the tutorial's marks on the stage (Marks.jsx)
//   closing   the last page, which asks them to join the working group
// The chapters run in one order, and each step asks for one thing. A chapter starts the mockup over from its own
// starting point while its intro shows. A red pen ring shows the one thing to click and the prompt beside it says what
// to do with it. Once the step's check on the store passes, a card beside the result says what it got them, with a
// link to the docs.
//
// The mockup is locked while a step runs: the ringed element is the only thing on the stage that takes a click or a
// key. A click anywhere else does nothing but nudge the ring (or, while a card shows, its Continue). Scrolling still
// works. "Do it for me" presses the ringed element with untrusted events, which the lock lets through.
//
// A step moves through three phases: `prompt` (waiting for the visitor), `settle` (they did it; the mockup is still
// finishing, e.g. Face ID or the network) and `done` (the card). `off` marks a step that lost its way: 'no' after a
// Reject, 'away' when the thing to click has gone. The lock makes both rare; "Put it back" restores the mockup as it
// was when the step began.
//
// A `quiet` step has no card: it only gets the visitor somewhere (Back, a menu, Next on the Anchor). Once it is done,
// the next step begins at once. The counter and the rail count the steps with cards; a quiet step carries the number
// of the card it leads to. A target that is a field takes exactly its `value`: other keys are turned away.
//
// The address bar follows the view: nothing (the first slide) or #overview/slide for a slide, #start for the
// welcome, #chapter for an intro, #chapter/step for a step, #join for the closing page. The docs link to #chapter, so
// a visitor from the docs lands on that chapter's intro.

const Ctx = createContext(null);
export function useTour() { return useContext(Ctx); }

// Where the docs live. On the site the mockup is /demo/ (demo.html forwards to index.html), so the docs are on the
// same origin. Served on its own
// (python3 -m http.server 8791, or Vite) there are no docs beside it, so links go to the live site. ?docs=<url> points
// them elsewhere for one load (the site's dev server, a staging copy). Only http(s) is taken: the value ends up in an href.
const DOCS_LIVE = 'https://erc-xxxx.ethlabs.dev';
function docsBase() {
  const q = new URLSearchParams(location.search).get('docs');
  if (q) { try { const u = new URL(q, location.href); if (/^https?:$/.test(u.protocol)) return (u.origin + u.pathname).replace(/\/+$/, ''); } catch { /* fall through */ } }
  return /\/demo\/(?:demo\.html|index\.html)?$/.test(location.pathname) ? location.origin : DOCS_LIVE;
}
export function docsHref({ page, hash }) { return `${docsBase()}/docs${page ? '/' + page : ''}${hash ? '#' + hash : ''}`; }
// "Join the Working Group": the same destination as the site's Join button (site/src/components/Join.tsx).
export const joinHref = () => docsHref({ page: 'deliverables', hash: 'get-involved' });

// Is the mockup busy with something the visitor waits on (a simulation, Face ID, a co-signer, the network)? The Anchor
// is not busy: it waits for the visitor. The add-key sheet sets up its simulation when it opens but only runs it on its
// review page, where a disabled Approve already says so.
function inFlight(s) {
  const sim = !!s.sim && s.sim.phase === 'running' && !(s.sheet && s.sheet.kind === 'addKey');
  return !!(s.faceId || s.cosign || (s.flow && s.flow.phase === 'confirming') || sim || s.txs.some(t => t.status === 'pending'));
}
// A step's target as a list of candidates, deepest first: a selector, { at, has?, value?, note? }, a list of those, or
// a function of the store state that returns one.
export function candidates(target, s) {
  if (!target) return null;
  const t = typeof target === 'function' ? target(s) : target;
  return (Array.isArray(t) ? t : [t]).map(c => (typeof c === 'string' ? { at: c } : c));
}
// What the prompt says right now. A step whose target moves on as the visitor clicks (Review, then Next, then Approve
// on the Anchor) says one thing at a time: the ringed candidate's own `say`, or the step's prompt, either of which can
// be a function of the store.
export function promptOf(st, s, cand = 0) {
  const c = (candidates(st.target, s) || [])[cand];
  const say = c && c.say != null ? c.say : st.prompt;
  return typeof say === 'function' ? say(s) : say;
}
// Answers the mockup gives that mean "no" to the step.
const NO = new Set(['reject', 'hwCancel', 'cosignRefuse']);
export const pad = n => String(n).padStart(2, '0');
const stepOf = (p) => CHAPTERS[p.ch].steps[p.i];
export const isRead = (st) => !st.done && !st.seen;
const LAST = CHAPTERS.length - 1;
// The steps with a card, and the number of the card step `i` is on or leads to.
export const cards = (c) => c.steps.filter(x => !x.quiet).length;
export function cardNo(c, i) { let n = 1; for (let k = 0; k < i; k++) if (!c.steps[k].quiet) n++; return n; }
// The feature step `i` belongs to: the topic of the nearest step at or before it that names one.
export function topicOf(c, i) { for (let k = i; k >= 0; k--) if (c.steps[k].topic) return c.steps[k].topic; return null; }
// The brief of the feature step `i` belongs to ({ today, try }): what happens today and what the visitor is about to
// try. It shows with every prompt of the feature until the feature's first card, so the clicks before that card
// have their purpose beside them. A feature that opens on a card to read shows its brief in that card.
export function briefOf(c, i) {
  let k = i;
  while (k > 0 && !c.steps[k].topic) k--;
  const b = c.steps[k].brief;
  if (!b) return null;
  for (let j = k; j < i; j++) if (!c.steps[j].quiet) return null;
  return b;
}

// What the address bar says, as a view: { view, ch, i, s }. `s` is the slide. No address is the first slide.
function fromHash() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (!raw) return { view: 'slide', ch: 0, i: 0, s: 0 };
  if (raw === 'join') return { view: 'closing', ch: LAST, i: 0 };
  const [c, st] = raw.split('/');
  // #overview alone, or a slide that is gone, opens the first slide, and the address bar says so
  if (c === 'overview') { const s = SLIDES.findIndex(x => x.id === st); return { view: 'slide', ch: 0, i: 0, s: Math.max(0, s), alias: s < 0 }; }
  const ch = CHAPTERS.findIndex(x => x.id === c || (x.aliases || []).includes(c));
  if (ch < 0) return { view: 'slide', ch: 0, i: 0, s: 0 };
  // an old chapter id that became part of another chapter opens that chapter's intro, and the address bar says so
  if (CHAPTERS[ch].id !== c) return { view: 'intro', ch, i: 0, alias: true };
  if (!st) return { view: ch === 0 ? 'welcome' : 'intro', ch, i: 0 };
  return { view: 'step', ch, i: Math.max(0, CHAPTERS[ch].steps.findIndex(x => x.id === st)) };
}
function writeHash(view, ch, i, how, s = 0) {
  if (how === 'none') return;
  const c = CHAPTERS[ch];
  const h = view === 'welcome' ? '#start' : view === 'slide' ? '#overview/' + SLIDES[s].id : view === 'closing' ? '#join' : view === 'intro' ? '#' + c.id : '#' + c.id + '/' + c.steps[i].id;
  if (location.hash === h) return;
  history[how === 'push' ? 'pushState' : 'replaceState'](null, '', h || location.pathname + location.search);
}
// Sets a field's value the way typing would, so React's onChange runs.
function fill(el, value) {
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const typing = el => !!(el && el.closest && el.closest('input, select, textarea, [contenteditable]'));

export function TourProvider({ children }) {
  const { state, dispatch, drain } = useStore();
  // n counts view and step starts, so a step that starts again (Put it back) gets fresh marks.
  const [pos, setPos] = useState({ view: 'slide', ch: 0, i: 0, s: 0, n: 0, phase: 'intro', off: null, by: null, target: 'none', cand: 0 });
  const [did, setDid] = useState({});
  const posRef = useRef(pos); posRef.current = pos;
  const stateRef = useRef(state);
  const prevRef = useRef(state);
  const snaps = useRef([]);            // the store as it was when each step of this chapter began
  const base = useRef([]);             // later steps whose check already passed when this step began: never count them
  const latched = useRef(new Set());   // the next step, when the visitor did it while reading this one
  const begun = useRef(-1);
  const found = useRef({ status: 'none', el: null, cand: -1 });
  const auto = useRef(0);              // "Do it for me": presses left while it walks the step
  const autoT = useRef(0);
  const pressT = useRef(0);            // a press waiting for the ring's nudge to finish
  const since = useRef(0);             // when this step began
  const lostT = useRef(0);
  const entry = useRef(true);          // the step was entered by a jump or a put-back: its `open` boxes are opened for it
  const wants = useRef({ reveal: false, measure: null });
  const busy = inFlight(state);
  const busyRef = useRef(busy); busyRef.current = busy;

  const quiet = () => { auto.current = 0; clearTimeout(autoT.current); clearTimeout(pressT.current); clearTimeout(lostT.current); found.current = { status: 'none', el: null, cand: -1 }; wants.current.reveal = false; };
  const mark = useCallback((ch, i) => setDid(d => (d[`${ch}/${i}`] ? d : { ...d, [`${ch}/${i}`]: true })), []);
  const begin = useCallback((ch, i, how = 'replace', isEntry = false) => {
    const st = CHAPTERS[ch].steps[i];
    quiet();
    entry.current = isEntry; since.current = performance.now();
    if (isRead(st)) mark(ch, i);
    setPos(p => ({ view: 'step', ch, i, n: p.n + 1, phase: isRead(st) ? 'done' : 'prompt', off: null, by: isRead(st) ? 'read' : null, target: 'none', cand: 0 }));
    writeHash('step', ch, i, how);
  }, [mark]);

  // A full-screen page: a slide, the welcome, a chapter's intro, or the closing page. Behind the slides, the welcome
  // and an intro, the mockup already starts the chapter over, so "Show me" reveals a stage that is ready. The slides
  // and the welcome share chapter 0's start, so moving between them leaves the mockup alone.
  const page = useCallback((view, ch, how = 'push', s = 0) => {
    quiet();
    const p = posRef.current;
    const same = p.n > 0 && ch === 0 && p.ch === 0 && (p.view === 'welcome' || p.view === 'slide');
    if (view !== 'closing' && !same) {
      const c = CHAPTERS[ch];
      dispatch({ type: 'tour', patch: { ...(c.start || {}) } });
      snaps.current = []; latched.current = new Set();
    }
    setPos(q => ({ view, ch, i: 0, s, n: q.n + 1, from: q.n ? q.view : null, phase: 'intro', off: null, by: null, target: 'none', cand: 0 }));
    writeHash(view, ch, 0, how, s);
  }, [dispatch]);

  // Opens a chapter: at its intro, or straight at a step. A step without `setup` can't be rebuilt on its own, so the
  // chapter opens at the nearest earlier step that can.
  const open = useCallback((ch, i = 0, how = 'push', intro = true) => {
    ch = Math.max(0, Math.min(LAST, ch));
    if (intro) { page(ch === 0 ? 'welcome' : 'intro', ch, how); return; }
    const c = CHAPTERS[ch];
    let j = Math.max(0, Math.min(c.steps.length - 1, i));
    while (j > 0 && !c.steps[j].setup) j--;
    dispatch({ type: 'tour', patch: { ...(c.start || {}), ...(c.steps[j].setup || {}) } });
    snaps.current = []; latched.current = new Set();
    begin(ch, j, how === 'none' && j !== i ? 'replace' : how, true);
  }, [dispatch, begin, page]);

  // The step is done: show the card, or wait until the mockup has finished what the visitor started.
  const finish = useCallback((i, by) => {
    const p = posRef.current, st = CHAPTERS[p.ch].steps[i];
    for (let k = p.i; k <= i; k++) mark(p.ch, k);
    quiet();
    const ready = !st.wait || st.wait(stateRef.current);
    setPos(q => ({ ...q, i, phase: ready ? 'done' : 'settle', off: null, by }));
    if (i !== p.i) writeHash('step', p.ch, i, 'replace');
  }, [mark]);

  // The slides lead to the welcome, and the welcome to chapter 0's first step.
  const next = useCallback(() => {
    const p = posRef.current, c = CHAPTERS[p.ch];
    if (p.view === 'slide') { if (p.s + 1 < SLIDES.length) page('slide', 0, 'push', p.s + 1); else page('welcome', 0, 'push'); return; }
    if (p.view === 'welcome') { begin(0, 0, 'push', true); return; }
    if (p.view === 'intro') { begin(p.ch, 0, 'replace', true); return; }
    if (p.view !== 'step') return;
    if (p.i + 1 < c.steps.length) begin(p.ch, p.i + 1);
    else if (p.ch < LAST) open(p.ch + 1, 0, 'push', true);
    else page('closing', LAST, 'push');
  }, [begin, open, page]);
  // Back to where step j began, as the store was then. Before the first step is the chapter's intro. A step never
  // reached in this chapter opens from the chapter. A `local` step began from screen state the store doesn't keep (a
  // menu that was open, a form half filled in), which the remounted stage has lost, so it goes back to the step before.
  const rewind = useCallback((j) => {
    const p = posRef.current, c = CHAPTERS[p.ch];
    while (j > 0 && c.steps[j].local) j--;
    if (j < 0) { open(p.ch, 0, 'replace', true); return; }
    const snap = snaps.current[j];
    if (!snap) { open(p.ch, j, 'replace', false); return; }
    dispatch({ type: 'rewind', state: snap, patch: c.steps[j].setup });
    latched.current = new Set();
    begin(p.ch, j, 'replace', true);
  }, [dispatch, begin, open]);
  // Back from a slide is the slide before (the first slide is the first page), and from the welcome the last slide.
  const back = useCallback(() => {
    const p = posRef.current;
    if (p.view === 'slide') { if (p.s > 0) page('slide', 0, 'push', p.s - 1); return; }
    if (p.view === 'welcome') { page('slide', 0, 'push', SLIDES.length - 1); return; }
    if (p.view === 'closing') { open(LAST, 0, 'push', true); return; }
    if (p.view === 'intro') { open(p.ch - 1, 0, 'push', true); return; }
    const st = stepOf(p);
    // Back undoes one step: from a prompt, the step before it (quiet or not) starts again; from a card, this one.
    rewind((p.phase === 'prompt' && !p.off) || isRead(st) ? p.i - 1 : p.i);
  }, [rewind, open, page]);
  const putBack = useCallback(() => rewind(posRef.current.i), [rewind]);

  // Presses the ring's element: a short press on the ring, then the click (or the value, for a field).
  const press = useCallback(() => {
    const f = found.current, p = posRef.current;
    const cands = candidates(stepOf(p).target, stateRef.current) || [];
    const c = cands[f.cand] || {};
    const el = f.el;
    if (!el || !el.isConnected) return;
    found.current = { ...f, fresh: false };   // the next press waits for Marks to measure what this one changed
    // Only while the same step still waits for it: the visitor may have done it themselves in the meantime.
    const act = () => {
      const q = posRef.current;
      if (!el.isConnected || q.n !== p.n || q.phase !== 'prompt') return;
      if (c.value != null && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) fill(el, c.value);
      else el.click();
    };
    const ring = document.querySelector('.tn-ring > svg');
    clearTimeout(pressT.current);
    if (ring && !reduced()) { ring.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' }); pressT.current = setTimeout(act, 170); } else act();
  }, []);
  // "Do it for me": press the ring's element, and keep pressing as the ring moves on (Keys, then App-controlled keys;
  // Next on the Anchor until Approve), until the step is done. It runs on a short timer only while it works, and each
  // press waits for a fresh measure. A ring on something disabled or covered (Approve while Keel simulates) waits too.
  const doIt = useCallback(() => {
    const n0 = posRef.current.n;
    let ticks = 0;
    auto.current = 16;
    wants.current.reveal = true;
    const tick = () => {
      const p = posRef.current, f = found.current;
      if (auto.current <= 0 || p.n !== n0 || p.phase !== 'prompt' || p.off === 'no' || ++ticks > 120) { auto.current = 0; return; }
      if (f.status === 'found' && f.fresh !== false) { auto.current--; press(); autoT.current = setTimeout(tick, 650); return; }
      if (wants.current.measure) wants.current.measure();
      autoT.current = setTimeout(tick, 200);
    };
    clearTimeout(autoT.current);
    tick();
  }, [press]);

  // What the ring's element is doing, from Marks, after every measure. Feeds "Do it for me" and notices a visitor who
  // wandered off: the thing to click has been gone for a while and the mockup isn't busy.
  const onReport = useCallback(({ status, el, seen, cand }) => {
    const p = posRef.current;
    if (p.view !== 'step') return;
    const was = found.current.status;
    found.current = { status, el, cand, fresh: true };
    const st = stepOf(p);
    if (was !== status || (cand >= 0 && cand !== p.cand)) setPos(q => (q.target === status && (cand < 0 || q.cand === cand) ? q : { ...q, target: status, cand: cand < 0 ? q.cand : cand }));
    if (p.phase !== 'prompt') return;
    if (seen) { finish(p.i, 'seen'); return; }
    if (status !== 'missing') clearTimeout(lostT.current);
    else if (st.target && was !== 'missing' && !p.off) {
      // Gone for a moment is normal (a screen changing); gone for most of a second, with nothing in flight, is a wander.
      const n0 = p.n;
      const check = () => {
        const q = posRef.current;
        if (q.n !== n0 || q.phase !== 'prompt' || q.off || found.current.status !== 'missing') return;
        if (busyRef.current || performance.now() - since.current < 1200) { lostT.current = setTimeout(check, 400); return; }
        setPos(r => ({ ...r, off: 'away' }));
      };
      clearTimeout(lostT.current);
      lostT.current = setTimeout(check, 900);
    }
    if (status === 'found' && p.off && !(st.lost && st.lost(stateRef.current))) setPos(q => ({ ...q, off: null }));
  }, [finish]);

  // After every commit: where the step began, whether its check passed, whether the visitor ran ahead or said no.
  useLayoutEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    const acts = drain();
    const prev = prevRef.current;
    prevRef.current = state;
    if (pos.view !== 'step') return;
    const c = CHAPTERS[pos.ch], steps = c.steps, st = steps[pos.i];
    if (begun.current !== pos.n) {
      begun.current = pos.n;
      snaps.current[pos.i] = state;
      base.current = steps.map((x, k) => k > pos.i && x.done ? !!x.done(state, state, []) : false);
      if (pos.phase === 'prompt' && ((st.done && st.done(state, state, [])) || latched.current.has(pos.i))) { finish(pos.i, 'ahead'); return; }
      return;
    }
    // The next step done early is remembered (tapping Approve while reading), so a quick visitor never does a thing
    // twice. Only one step ahead: further on, a check can pass for a reason that has nothing to do with its step.
    for (let k = pos.i + (pos.phase === 'prompt' ? 0 : 1); k <= pos.i + 1 && k < steps.length; k++) {
      const x = steps[k];
      if (x.done && !base.current[k] && !latched.current.has(k) && x.done(state, prev, acts)) latched.current.add(k);
    }
    if (pos.phase === 'prompt') {
      const top = Math.max(-1, ...[...latched.current].filter(k => k >= pos.i));
      if (top >= pos.i) { finish(top, top > pos.i ? 'ahead' : 'done'); return; }
    }
    if (pos.phase === 'settle' && (!st.wait || st.wait(state))) { setPos(q => ({ ...q, phase: 'done' })); return; }
    if (pos.phase === 'done') return;
    if (acts.some(a => NO.has(a.type))) { auto.current = 0; setPos(q => (q.off === 'no' ? q : { ...q, off: 'no' })); return; }
    const lost = (st.lost && st.lost(state)) || (c.lost && c.lost(state));
    if (lost && !pos.off) setPos(q => ({ ...q, off: 'away' }));
  }, [state, pos.n, pos.phase, pos.view]); // eslint-disable-line react-hooks/exhaustive-deps

  // A quiet step moves on by itself once it is done, after a beat so the visitor sees the step take.
  useEffect(() => {
    if (pos.view !== 'step' || pos.phase !== 'done' || !stepOf(pos).quiet) return undefined;
    const t = setTimeout(() => { if (posRef.current.n === pos.n && posRef.current.phase === 'done') next(); }, 220);
    return () => clearTimeout(t);
  }, [pos.view, pos.phase, pos.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // The address bar opens a view on load and on Back and Forward.
  useLayoutEffect(() => {
    const go = () => {
      const h = fromHash(), p = posRef.current;
      // already there: only an old address (#overview, a merged chapter's id) is rewritten
      if (p.n > 0 && h.view === p.view && h.ch === p.ch && (h.view !== 'step' || h.i === p.i) && (h.view !== 'slide' || h.s === p.s)) { if (h.alias) writeHash(h.view, h.ch, h.i, 'replace', h.s); return; }
      if (h.view === 'closing') page('closing', LAST, 'none');
      else if (h.view === 'slide') page('slide', 0, h.alias ? 'replace' : 'none', h.s);
      else open(h.ch, h.i, h.alias ? 'replace' : 'none', h.view !== 'step');
    };
    go();
    window.addEventListener('popstate', go);
    window.addEventListener('hashchange', go);
    return () => { window.removeEventListener('popstate', go); window.removeEventListener('hashchange', go); };
  }, [open, page]);

  // The one thing to do next, whatever the view: the stage's buttons, the strip's fallback and the → key all run it.
  const step = stepOf(pos);
  const lastStep = pos.i === CHAPTERS[pos.ch].steps.length - 1;
  const primary = pos.view === 'welcome' ? { label: 'Start the tour', on: next }
    : pos.view === 'slide' ? { label: 'Next', on: next }
    : pos.view === 'intro' ? { label: 'Show me', on: next }
    : pos.view === 'closing' ? null
    : pos.off && pos.phase !== 'done' ? { label: 'Put it back', on: putBack }
    : pos.phase === 'prompt' ? (step.target ? { label: 'Do it for me', on: doIt } : null)
    : pos.phase === 'settle' || step.quiet ? null
    : { label: !lastStep ? 'Continue' : pos.ch === LAST ? 'Finish' : 'Next section', on: next };

  // → runs the primary, ← goes back, Esc and Enter on a full-screen page run the primary too. Not while typing in a
  // field, and a held key does not repeat (holding → would otherwise run through a chapter).
  const keys = useRef({ primary, back, view: pos.view });
  keys.current = { primary, back, view: pos.view };
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const k = keys.current;
      if (e.key === 'ArrowRight' && k.primary) { e.preventDefault(); k.primary.on(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); k.back(); }
      // on a full-screen page, Esc and Enter move on too (Enter only while the page itself has the focus)
      else if ((k.view === 'intro' || k.view === 'welcome' || k.view === 'slide') && k.primary && (e.key === 'Escape' || (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ti')))) { e.preventDefault(); k.primary.on(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The lock. On the stage, only the ringed element takes the visitor's clicks and keys, and only while the step waits
  // for them. The listeners sit on the window in the capture phase, so they run before React's own and before the
  // element's default action (a focus, a toggle). Scrolling is left alone. Events the tutorial makes itself ("Do it for
  // me", opening an "Under the hood" box) are untrusted, and pass. A click that is turned away nudges what the visitor
  // should press instead: the ring, or the card's Continue. `data-blocked` on the strip counts them, for the checks.
  useEffect(() => {
    const strip = () => document.querySelector('footer.tour');
    // The ringed element, and the label around it when it is a field (the label is the field's tap area). Marks
    // reports the ring after it measures, so a target that has only just appeared is looked up here as well.
    const inside = (el, t) => !!el && el.isConnected && (el.contains(t) || (!!el.closest('label') && el.closest('label').contains(t)));
    const allowed = (t) => {
      const p = posRef.current, f = found.current;
      if (p.view !== 'step' || p.phase !== 'prompt') return false;
      if (inside(f.el, t)) return true;
      const pick = pickTarget(document.querySelector('.stage'), candidates(stepOf(p).target, stateRef.current) || []);
      return !!pick && !pick.el.disabled && inside(pick.el, t);
    };
    const onStage = (e) => e.isTrusted && e.target instanceof Element && !!e.target.closest('.stage') && !allowed(e.target);
    let t0 = 0;
    const nudge = () => {
      const now = performance.now();
      if (now - t0 < 500 || reduced()) return;
      t0 = now;
      const el = document.querySelector('.tn-ring > svg') || document.querySelector('.tn-box.in .tc-go');
      if (el) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-in-out' });
    };
    const turnAway = (e) => {
      e.preventDefault(); e.stopPropagation();
      const s = strip();
      if (s) s.dataset.blocked = String(Number(s.dataset.blocked || 0) + 1);
      nudge();
    };
    // The value the ringed field has to take, if it is a field with one.
    const wanted = (el) => {
      const f = found.current, c = (candidates(stepOf(posRef.current).target, stateRef.current) || [])[f.cand];
      return c && c.value != null && el === f.el && /^(INPUT|TEXTAREA)$/.test(el.tagName) ? String(c.value) : null;
    };
    const onPointer = (e) => {
      if (onStage(e)) {
        if (e.type === 'click') turnAway(e);
        else { e.preventDefault(); e.stopPropagation(); }
        return;
      }
      // A click into the ringed field (or its label) selects what is in it, so typing the value replaces it.
      const f = found.current.el;
      if (e.type === 'click' && e.isTrusted && e.target instanceof Element && f && wanted(f) != null && inside(f, e.target)) setTimeout(() => { if (f.isConnected) { f.focus(); f.select(); } }, 0);
    };
    // Keys on a focused element of the stage: Tab still moves the focus and the arrows still drive the tutorial, but
    // nothing that would press, type or change a value gets through. In the ringed field, only the keys that spell its
    // value (and the ones that delete) go in.
    const onKey = (e) => {
      if (!e.isTrusted || !(e.target instanceof Element)) return;
      const want = wanted(e.target);
      if (want != null && !onStage(e)) {
        if (e.key.length !== 1 || e.metaKey || e.ctrlKey) return;
        const el = e.target, v = el.value, a = el.selectionStart ?? v.length, b = el.selectionEnd ?? v.length;
        if (!want.startsWith(v.slice(0, a) + e.key + v.slice(b))) turnAway(e);
        return;
      }
      if (!onStage(e) || e.key === 'Tab') return;
      if (/^Arrow/.test(e.key) && !typing(e.target)) return;
      e.preventDefault(); e.stopPropagation();
    };
    const kinds = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu'];
    for (const k of kinds) window.addEventListener(k, onPointer, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      for (const k of kinds) window.removeEventListener(k, onPointer, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  const value = useMemo(() => ({
    pos, did, busy, chapter: CHAPTERS[pos.ch], step, entry: entry.current, wants, primary,
    open, next, back, putBack, doIt, onReport,
  }), [pos, did, busy, step, primary, open, next, back, putBack, doIt, onReport]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---- On the stage ----

// The marks over the stage, while a step runs.
export function TourMarks() {
  const { pos } = useTour();
  return pos.view === 'step' ? <StepMarks /> : null;
}

function StepMarks() {
  const { state } = useStore();
  const t = useTour();
  const { pos, step, entry, wants, onReport, busy } = t;
  const off = pos.off && pos.phase !== 'done' ? pos.off : null;
  const any = pos.phase === 'prompt' || off ? candidates(step.target, state) : null;
  const anyKey = any ? JSON.stringify(any) : '';
  const waitLine = pos.phase === 'prompt' && !off && step.waiting && (busy || pos.target === 'disabled');
  const notes = useMemo(() => {
    const dev = step.dev || 'phone';
    // off the path, Marks still looks for the thing to click, so the step picks up again if the visitor finds it
    if (off) return [{ kind: 'off', dev, any, body: <OffBody no={off === 'no'} /> }];
    if (pos.phase === 'prompt') return any ? [{ kind: 'ask', any, dev, body: <AskBody wait={waitLine} /> }] : [];
    if (pos.phase === 'settle') return [{ kind: 'wait', at: step.at, dev, body: <WaitBody /> }];
    if (step.quiet) return [];   // it moves on by itself
    return [{ kind: 'card', at: step.at, dev, body: <CardBody /> }, ...(step.points || []).map(p => ({ kind: 'point', ...p }))];
  }, [off, pos.phase, anyKey, waitLine, step, pos.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Marks key={`${pos.n}/${pos.phase}/${off || ''}`} id={`${pos.ch}/${step.id}`} notes={notes} watch={pos.phase === 'prompt' ? step.seen : null}
    open={entry ? step.open : null} wants={wants} onReport={onReport} tag={<TagBody />} />;
}

// The tag heading the tutorial's column: the section's name first and largest (the talking point the reader anchors
// to), then the feature on screen, one line on it, and the standards it rests on.
function TagBody() {
  const { pos, chapter } = useTour();
  const t = topicOf(chapter, pos.i);
  return (
    <div className="tg">
      <p className="tg-sec"><span>{pad(pos.ch)}</span>{chapter.title}</p>
      {t && <p className="tg-h">{t.name}</p>}
      {t && t.line && <p className="tg-s">{t.line}</p>}
      {t && t.eips && t.eips.length > 0 && <p className="tg-e">{t.eips.map(e => <span key={e}>{e}</span>)}</p>}
    </div>
  );
}

// A feature's brief: today's problem in one line, then what the visitor is about to try.
function Brief({ b }) {
  return (
    <div className="tbf" role="note" aria-label="Why this matters">
      {b.today && <p className="tbf-row was"><span className="tbf-k">Today</span><span>{b.today}</span></p>}
      {b.try && <p className="tbf-row now"><span className="tbf-k">Try</span><span>{b.try}</span></p>}
    </div>
  );
}
// The prompt beside the ring: the feature's brief while it has one, what to do, what the click is for (`hint`) or what
// the mockup is busy with, and "Do it for me".
function AskBody({ wait }) {
  const { state } = useStore();
  const { pos, step, chapter, doIt } = useTour();
  const brief = briefOf(chapter, pos.i);
  return (
    <div className="ta">
      {brief && <Brief b={brief} />}
      <span className="tb-n">Step {cardNo(chapter, pos.i)} of {cards(chapter)}</span>
      <p className="ta-say">{promptOf(step, state, pos.cand)}</p>
      {wait ? <p className="ta-wait">{step.waiting}</p> : step.hint ? <p className="ta-hint">{step.hint}</p> : null}
      <button type="button" className="ta-do" data-tour-act="doit" onClick={doIt}>Do it for me</button>
    </div>
  );
}
function WaitBody() {
  const { step } = useTour();
  return (
    <div className="tw" role="status">
      <p className="tw-done"><Icon name="check" size={15} />Done</p>
      <p className="tw-wait">{step.waiting || 'The mockup is finishing what you started.'}</p>
    </div>
  );
}
// The card: what the visitor's click got them, how it works, and the docs for the details.
function CardBody() {
  const { pos, step, chapter, next } = useTour();
  const n = cards(chapter), lastStep = pos.i === chapter.steps.length - 1, lastCh = pos.ch === LAST;
  const ref = useRef(null);
  // Continue takes the focus when nothing else has it, or when the stage has it (the button the visitor just pressed;
  // the lock keeps it from taking more keys), so Enter and Space move on too. The box is hidden until Marks has placed
  // it, and a hidden button can't take the focus, so this waits a few frames for it.
  useEffect(() => {
    let tries = 0, raf = 0;
    const go = () => {
      const el = ref.current, a = document.activeElement;
      if (!el || !(!a || a === document.body || (a.closest && a.closest('.tn-boxes, .tour, .stage')))) return;
      if (el.closest('.tn-box.in')) { el.focus({ preventScroll: true }); return; }
      if (++tries < 20) raf = requestAnimationFrame(go);
    };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="tc" role="group" aria-label="What this step shows">
      <PencilEdge seed={pos.i * 7 + 3} />
      <div className="tc-top">
        <span className="tb-n">{pos.ch === 0 ? `Before you start · ${cardNo(chapter, pos.i)} of ${n}` : step.wrap ? `Section ${pos.ch} of ${LAST} · done` : `Step ${cardNo(chapter, pos.i)} of ${n}`}</span>
        {step.eips && step.eips.length > 0 && <span className="tc-eips">{step.eips.join(' · ')}</span>}
      </div>
      {isRead(step) && step.topic && step.brief && <Brief b={step.brief} />}
      <p className="tc-head">{step.head || step.prompt}</p>
      {step.explain && <p className="tc-text">{step.explain}</p>}
      {step.seq && (
        <ol className="tc-seq" aria-label="How it works">
          {step.seq.list.map((x, k) => <li key={x} className={k < step.seq.at ? 'did' : k === step.seq.at ? 'on' : ''} aria-current={k === step.seq.at ? 'step' : undefined}><span>{k + 1}</span>{x}</li>)}
        </ol>
      )}
      {step.wrap && chapter.recap && (
        <div className="tc-recap">
          <p className="tc-k">In this section you</p>
          <ul>{chapter.recap.map(x => <li key={x}><Icon name="check" size={13} />{x}</li>)}</ul>
        </div>
      )}
      {step.wrap && chapter.why && <p className="tc-why"><span className="tc-k">Why it needs one standard</span>{chapter.why}</p>}
      {step.docs && (
        <a className="tc-docs" href={docsHref(step.docs)} target="_blank" rel="noreferrer">
          <Icon name="book" size={14} /><span>{step.docs.label}</span><Icon name="ext" size={11} />
        </a>
      )}
      {lastStep && !lastCh && <p className="tc-up">Up next: {CHAPTERS[pos.ch + 1].title}</p>}
      <button type="button" ref={ref} className="tc-go" data-tour-act="continue" onClick={next}>
        {!lastStep ? 'Continue' : lastCh ? 'Finish' : 'Next section'}<Icon name="arrowR" size={16} />
      </button>
    </div>
  );
}
function OffBody({ no }) {
  const { putBack } = useTour();
  return (
    <div className="tc off" role="group" aria-label={no ? 'You said no' : 'The step lost its way'}>
      <PencilEdge seed={5} />
      <p className="tc-head">{no ? 'You said no, so nothing was signed.' : 'The mockup moved on without this step.'}</p>
      <p className="tc-text">{no ? 'Saying no is always safe. Put the step back to try it again.' : 'The thing to click has gone. Put the step back to carry on from where it started.'}</p>
      <button type="button" className="tc-go" data-tour-act="putback" onClick={putBack}><Icon name="reset" size={15} />Put it back</button>
    </div>
  );
}

// The rail: a tick per card step, grouped by section. It changes only when the visitor moves on, so the store's
// other changes (every click in the mockup) don't render its ticks again.
const Rail = memo(function Rail({ ch, i, view, did }) {
  return (
    <div className="tr-rail" aria-hidden="true">
      {CHAPTERS.slice(1).map((c, k0) => {
        const k = k0 + 1;
        return (
          <span key={c.id} className={'tr-grp' + (k === ch ? ' on' : '')} style={{ flexGrow: cards(c) }}>
            {c.steps.map((s, j) => s.quiet ? null : <span key={s.id} className={'tr-tick' + (k === ch && view === 'step' && cardNo(c, i) === cardNo(c, j) ? ' on' : '') + (did[`${k}/${j}`] ? ' done' : '')} />)}
          </span>
        );
      })}
    </div>
  );
});

// ---- The strip along the bottom: where you are in the story, and two small arrow buttons for Back and the one thing
// to do next ----
// The rail shows the sections and their steps in order. It only shows progress: the way through is the stage's
// buttons, and the → and ← keys. The arrows are a spare way to the same two things, so they carry no words and the
// stage never shows a second Continue.
export function TourBar() {
  const { state } = useStore();
  const t = useTour();
  const { pos, did, busy, chapter: c, step, primary } = t;
  const phase = pos.view !== 'step' ? pos.view : pos.off && pos.phase !== 'done' ? 'off' : pos.phase;
  const say = pos.view !== 'step' ? '' : phase === 'prompt' ? promptOf(step, state, pos.cand) : phase === 'done' ? step.head : '';
  const where = pos.view === 'closing' ? 'The end' : pos.view === 'welcome' ? 'Welcome' : pos.view === 'slide' ? 'Overview' : c.title;
  return (
    <footer className="tour" aria-label="Tutorial" data-view={pos.view} data-chapter={c.id} data-step={pos.view === 'step' ? step.id : ''}
      data-slide={pos.view === 'slide' ? SLIDES[pos.s].id : ''} data-phase={phase}
      data-busy={busy ? '1' : ''} data-target={pos.target} data-by={pos.by || ''}>
      <PencilRule />
      <div className="tr-where">
        <span className="tr-mk" aria-hidden="true">{pos.view === 'closing' ? '✓' : pad(pos.ch)}</span>
        <span className="tr-title">{pos.ch && pos.view !== 'closing' ? <><b>Section {pos.ch} of {LAST}</b>{where}</> : where}</span>
      </div>
      <Rail ch={pos.ch} i={pos.i} view={pos.view} did={did} />
      <div className="tr-nav">
        <button type="button" className="tr-btn" aria-label="Back" title="Back (←)" disabled={pos.view === 'slide' && !pos.s} onClick={t.back}><Icon name="chevL" size={17} /></button>
        <button type="button" className="tr-btn fwd" data-tour-act="strip-next" aria-label={primary ? primary.label : 'Next'} title={`${primary ? primary.label : 'Next'} (→)`} disabled={!primary} onClick={primary ? primary.on : undefined}><Icon name="chevR" size={17} /></button>
      </div>
      <p className="sr-only" aria-live="polite">{say}</p>
    </footer>
  );
}
