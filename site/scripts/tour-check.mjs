// Walks the interactive mockup's tutorial in headless Brave the way a visitor who presses "Show me", "Do it for me"
// and "Continue" would, and checks every page and every step:
//   - the overview: the server's root opens the first slide; each slide has its address, fits the window without
//     scrolling, offers one thing to press, keeps its words few, and keeps the sheet still after another page; ← goes
//     to the slide before (and does nothing on the first) and → comes back; Next on the last slide opens the welcome,
//     and ← from the welcome goes back to the last slide; ← from the first chapter's opening card or intro goes back
//     to the welcome; #overview/<id> opens its slide, #start the welcome, and demo.html forwards with its #chapter
//   - each chapter's page opens, fits the window without scrolling, and keeps its words few
//   - each step's prompt sits on the stage beside a ring on its target, and the step completes through its own check
//     (not by jumping ahead)
//   - each step's card appears on screen, inside the stage, clear of the devices, their labels and the other notes;
//     a quiet step shows no card and hands over to the next step by itself
//   - what a card points at (`at`) is on screen when the card opens: in the window, not scrolled or clipped away
//   - every point note is drawn (none dropped for lack of room)
//   - the card's docs link points at a docs page and heading that exist
//   - Continue on the last step opens the next chapter's intro, and the last chapter ends on the closing page
//   - the lock: at every prompt, a real click on some other control on the stage changes nothing (the stage's markup,
//     the step and its phase stay the same) and is counted as turned away; a key press on it does nothing either
//   - the pages have one way on: no chapter links on the welcome, no "All chapters", no chapter menu in the strip
//
//   - with --back: at every prompt, ← brings back the step before (a `local` step goes one further) with its target on
//     screen, and the tour walks forward to the same prompt again
//
//   node scripts/tour-check.mjs [--only=chapter,chapter] [--size=1440x900] [--url=http://127.0.0.1:8791/] [--shots=dir] [--back]
//
// Serve the repo first (python3 -m http.server 8791). --shots saves a screenshot of every intro, prompt and card.
// Exit code 1 when anything fails.
import puppeteer from 'puppeteer-core';
import GithubSlugger from 'github-slugger';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const URL_ = arg('url', 'http://127.0.0.1:8791/');
const [VW, VH] = arg('size', '1440x900').split('x').map(Number);
const only = arg('only', '') ? new Set(arg('only', '').split(',')) : null;
const SHOTS = arg('shots', '');
const BACK = process.argv.includes('--back');
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const DOCS = path.resolve(here, '../src/pages/docs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// The script itself: tour.js is plain JavaScript, so node can load it.
const { CHAPTERS, SLIDES } = await import(pathToFileURL(path.resolve(here, '../../src/tour.js')).href);
const lastSlide = SLIDES[SLIDES.length - 1].id;

// Heading anchors per docs page, as vocs makes them (github-slugger over the heading text, h1 without its [lead]).
function anchors(page) {
  const file = path.join(DOCS, (page || 'index') + '.mdx');
  if (!fs.existsSync(file)) return null;
  const body = fs.readFileSync(file, 'utf8').replace(/^---[\s\S]*?\n---\n/, '').replace(/^```[\s\S]*?^```/gm, '');
  const slugger = new GithubSlugger();
  return new Set([...body.matchAll(/^#{1,6} (.+)$/gm)].map(m => slugger.slug(m[1].replace(/ \[[^\]]*\]$/, '').replace(/`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'))));
}

const browser = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-first-run', '--hide-scrollbars', `--window-size=${VW},${VH}`] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
page.on('requestfailed', r => { if (!/favicon/.test(r.url())) errors.push(`request failed: ${r.url()}`); });
await page.goto(`${URL_}?v=${Date.now()}`, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForSelector('.tour[data-view]', { timeout: 90000 });

const strip = () => page.$eval('.tour', el => ({ ...el.dataset }));
async function until(pred, ms) {
  const t0 = Date.now();
  for (;;) {
    const b = await strip();
    if (pred(b)) return { ...b, ms: Date.now() - t0 };
    if (Date.now() - t0 > ms) return { ...b, ms: Date.now() - t0, timeout: true };
    await sleep(60);
  }
}
async function waitFor(sel, ms) { try { await page.waitForSelector(sel, { timeout: ms }); return true; } catch { return false; } }
const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
const at = (view, id) => b => b.view === view && (view === 'slide' ? b.slide === id : view === 'step' ? `${b.chapter}/${b.step}` === id : view === 'intro' ? b.chapter === id : true);
const where = b => `${b.view} ${b.slide || ''}${b.chapter || ''}${b.step ? '/' + b.step : ''}`;
// A full-screen page: does it fit, what can be pressed on it (Back aside), and is there a chapter menu anywhere.
const pageFit = () => page.evaluate(() => {
  const t = document.querySelector('.ti');
  if (!t) return null;
  const acts = [...t.querySelectorAll('button, a[href]')].filter(b => !b.classList.contains('ti-back')).map(b => b.textContent.trim());
  return { over: t.scrollHeight - t.clientHeight, h1: (t.querySelector('h1') || {}).textContent, acts, still: t.classList.contains('still'), menu: !!document.querySelector('.tour select, .tour .tr-rail button') };
});
// The words a visitor reads on a slide (the comparison included), less the small print.
const count = list => list.filter(Boolean).join(' ').split(/\s+/).length;
const words = sl => count([sl.head, ...(sl.lines || []), ...(sl.compare ? sl.compare.rows.flatMap(([a, b]) => [a, b]) : [])]);
// A slide carries at most this many words (the small print aside), and a section's page this many. The pages explain
// today's EOA next to what changes, for readers new to the problem, so they carry more than a headline.
const MAX_SLIDE = 80, MAX_INTRO = 80;

// The overview, from the first slide (the server's root) to the welcome. Returns rows.
async function slidesCheck() {
  const out = [];
  for (const [k, sl] of SLIDES.entries()) {
    const row = { step: `overview/${sl.id}`, found: '', done: '', by: '', lock: '', card: '', docs: '', problem: '' };
    const pr = [];
    const b0 = await until(at('slide', sl.id), 8000);
    if (b0.timeout) { row.problem = `never opened (strip on ${where(b0)})`; out.push(row); return out; }
    await sleep(900);
    const fit = await pageFit();
    const hash = await page.evaluate(() => location.hash);
    if (hash !== `#overview/${sl.id}` && !(k === 0 && hash === '')) pr.push(`address ${hash}`);
    if (!fit) pr.push('no page');
    else {
      if (fit.over > 1) pr.push(`page scrolls by ${fit.over}px`);
      if (fit.acts.length !== 1) pr.push(`page offers ${fit.acts.length} things to press: ${fit.acts.join(', ')}`);
      if (fit.menu) pr.push('the strip has a chapter menu');
      if (k > 0 && !fit.still) pr.push('the sheet faded in after another page');
    }
    const n = words(sl);
    row.card = `${n} words`;
    if (n > MAX_SLIDE) pr.push(`${n} words, more than a slide should carry`);
    await shot(`start-00-slide-${k + 1}-${sl.id}`);
    // ← goes to the slide before and → comes back; on the first slide, ← does nothing
    await page.keyboard.press('ArrowLeft');
    if (k === 0) {
      await sleep(500);
      const b1 = await strip();
      if (!at('slide', sl.id)(b1)) pr.push(`← on the first slide went to ${where(b1)}`);
      row.back = at('slide', sl.id)(b1) ? 'ok' : 'no';
    } else {
      const b1 = await until(at('slide', SLIDES[k - 1].id), 6000);
      if (b1.timeout) pr.push(`← went to ${where(b1)}`);
      await sleep(250);
      await page.keyboard.press('ArrowRight');
      const b2 = await until(at('slide', sl.id), 6000);
      if (b2.timeout) pr.push(`→ went to ${where(b2)}`);
      row.back = b1.timeout || b2.timeout ? 'no' : 'ok';
    }
    await sleep(350);
    const went = await page.click('[data-tour-act=next]').then(() => true, () => false);
    if (!went) pr.push('no Next');
    row.problem = pr.join('; ');
    out.push(row);
    if (!went) return out;
  }
  return out;
}
// From the welcome: ← is the last slide and → comes back; Start the tour opens the first chapter's opening card, and ←
// from it is the welcome again. Ends on the opening card.
async function welcomeCheck() {
  const first = `${CHAPTERS[0].id}/${CHAPTERS[0].steps[0].id}`;
  const pr = [];
  await page.keyboard.press('ArrowLeft');
  const b = await until(at('slide', lastSlide), 6000);
  if (b.timeout) pr.push(`← from the welcome went to ${where(b)}`);
  await sleep(300);
  await page.keyboard.press('ArrowRight');
  const w = await until(at('welcome'), 6000);
  if (w.timeout) pr.push(`→ from the last slide went to ${where(w)}`);
  if (w.timeout) await page.evaluate(() => { location.hash = 'start'; });
  await sleep(400);
  const hash = await page.evaluate(() => location.hash);
  if (hash !== '#start') pr.push(`the welcome's address is ${hash}`);
  await page.click('[data-tour-act=showme]');
  const s0 = await until(at('step', first), 8000);
  if (s0.timeout) pr.push(`Start the tour opened ${where(s0)}`);
  else {
    await waitFor('.tn-box.in[data-kind="card"]', 6000);
    await sleep(400);
    await page.keyboard.press('ArrowLeft');
    const w2 = await until(at('welcome'), 6000);
    if (w2.timeout) pr.push(`← from ${first} went to ${where(w2)}`);
    await sleep(400);
    await page.click('[data-tour-act=showme]').catch(() => pr.push('no Start the tour'));
    const s1 = await until(at('step', first), 8000);
    if (s1.timeout) pr.push(`Start the tour went to ${where(s1)}`);
  }
  return { step: `welcome ← → and ${first}`, problem: pr.join('; ') };
}
// The addresses: no address and #overview open the first slide (#overview says so), #overview/<id> its slide, #start
// the welcome, and demo.html forwards to the root's index.html with its #chapter.
async function addressCheck() {
  const pr = [];
  for (const [h, want, fix] of [...SLIDES.map(sl => [`overview/${sl.id}`, at('slide', sl.id)]), ['start', at('welcome')], ['', at('slide', SLIDES[0].id)], ['overview', at('slide', SLIDES[0].id), `#overview/${SLIDES[0].id}`]]) {
    await page.evaluate(x => { location.hash = x; }, h);
    const b = await until(want, 6000);
    if (b.timeout) pr.push(`#${h} opened ${where(b)}`);
    const now = await page.evaluate(() => location.hash);
    if (fix && now !== fix) pr.push(`#${h} left the address at ${now}`);
    await sleep(200);
  }
  const old = new URL('demo.html#' + CHAPTERS[1].id, URL_).href;
  await page.goto(old, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForSelector('.tour[data-view]', { timeout: 90000 });
  const b = await until(at('intro', CHAPTERS[1].id), 8000);
  const where2 = await page.evaluate(() => location.pathname + location.hash);
  if (b.timeout || !/\/index\.html#/.test(where2)) pr.push(`demo.html#${CHAPTERS[1].id} ended on ${where2} (${where(b)})`);
  return { step: 'addresses', problem: pr.join('; ') };
}

// Where a box sits, and what it overlaps: the devices, their figure labels, the other boxes and notes, and the tag in
// the stage's top right corner.
const layout = kind => page.evaluate(k => {
  const box = document.querySelector(`.tn-box.in[data-kind="${k}"]`);
  if (!box) return null;
  const r = box.getBoundingClientRect();
  const W = document.querySelector('.work').getBoundingClientRect();
  const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const narrow = box.hasAttribute('data-narrow');   // no margin: the box sits over the stage on purpose
  const others = [...document.querySelectorAll(narrow ? '.tn-note.in, .tn-tag.in' : '.browser, .phoneWrap, .hw, .skf-cap, .tn-note.in, .tn-tag.in')].filter(e => e !== box && hit(r, e.getBoundingClientRect()));
  return {
    inside: r.left >= W.left - 1 && r.right <= W.right + 1 && r.top >= W.top - 1 && r.bottom <= W.bottom + 1,
    overlaps: others.map(e => e.className.baseVal != null ? e.className.baseVal : e.className).map(c => String(c).split(' ')[0]),
    h: Math.round(r.height), w: Math.round(r.width), narrow,
    dropped: document.querySelectorAll('.tn-note[data-dropped]').length,
    focused: k !== 'card' || document.activeElement === box.querySelector('[data-tour-act=continue]') || !(document.activeElement === document.body || box.contains(document.activeElement)),
    notes: document.querySelectorAll('.tn-note.in').length,
    off: document.querySelectorAll('.tn-note[data-off]').length,   // a note whose element is out of view: the card's subject came first
    notesClash: [...document.querySelectorAll('.tn-note.in, .tn-tag.in')].some((a, i, all) => all.some((b, j) => j > i && hit(a.getBoundingClientRect(), b.getBoundingClientRect()))),
  };
}, kind);

// The lock. Picks a visible, enabled control on the stage that is not the ringed element (nor inside it, nor around
// it), clicks it for real, and checks that nothing changed. A stage that changes on its own (a simulation, a timer)
// is left alone for this step. `k` picks which control, so the steps try different ones.
async function lockCheck(k) {
  const pick = await page.evaluate((k) => {
    const stage = document.querySelector('.stage');
    const ring = stage.querySelector('[data-tour-ring]');
    const ok = el => {
      if (ring && (ring.contains(el) || el.contains(ring))) return null;
      if (el.disabled || el.closest('[inert]')) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return null;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(el === hit || el.contains(hit))) return null;
      return { x, y, what: (el.id ? '#' + el.id : el.tagName.toLowerCase()) + ' ' + (el.textContent || '').trim().slice(0, 24) };
    };
    const all = [...stage.querySelectorAll('button, [role=tab], [role=switch], input, select, textarea, a[href], .row')].map(ok).filter(Boolean);
    return all.length ? all[k % all.length] : null;
  }, k);
  if (!pick) return { skipped: 'nothing else to click' };
  // the stage's markup, less the marks' own attributes and the toast (which leaves on a timer)
  const snap = () => page.evaluate(() => {
    const c = document.querySelector('.stage').cloneNode(true);
    for (const t of c.querySelectorAll('.toast')) t.remove();
    return c.innerHTML.replace(/ data-(dim|tour-ring|tour-target)="[^"]*"/g, '');
  });
  const a = await snap(); await sleep(300); const b = await snap();
  if (a !== b) return { skipped: 'the stage is changing by itself' };
  const before = await strip();
  await page.mouse.click(pick.x, pick.y);
  await sleep(450);
  const after = await strip();
  const c = await snap();
  const problems = [];
  if (c !== b) problems.push(`a click on ${pick.what} changed the stage`);
  if (after.step !== before.step || after.phase !== before.phase) problems.push(`a click on ${pick.what} moved the step to ${after.step} ${after.phase}`);
  if (Number(after.blocked || 0) !== Number(before.blocked || 0) + 1) problems.push(`a click on ${pick.what} was not turned away`);
  // a key on it: focus it the way Tab would, then Enter and Space
  await page.evaluate((x, y) => { const el = document.elementFromPoint(x, y); const f = el && el.closest('button, [role=tab], [role=switch], input, select, textarea, a[href], [tabindex]'); if (f) f.focus(); }, pick.x, pick.y);
  await page.keyboard.press('Enter'); await page.keyboard.press(' ');
  await sleep(350);
  const d = await snap();
  const after2 = await strip();
  if (d !== b) problems.push(`Enter or Space on ${pick.what} changed the stage`);
  if (after2.step !== before.step || after2.phase !== before.phase) problems.push(`Enter or Space on ${pick.what} moved the step`);
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  return { what: pick.what, problems };
}

// Back from step `si`'s prompt, then forward again to it. Returns problems.
async function backCheck(c, si) {
  let j = si - 1;
  while (j > 0 && c.steps[j].local) j--;
  const want = c.steps[j];
  await page.keyboard.press('ArrowLeft');
  const b = await until(x => x.view === 'step' && x.step === want.id && (x.phase === 'done' || x.target === 'found'), 10000);
  if (b.timeout) return [`Back went to ${b.view} ${b.step} ${b.phase}/${b.target}, wanted ${want.id} with its target`];
  for (let n = 0; n < 40; n++) {
    const x = await until(y => y.phase === 'done' || (y.phase === 'prompt' && y.target === 'found') || y.phase === 'off', 25000);
    if (x.timeout || x.phase === 'off') return [`after Back, stuck at ${x.step} ${x.phase}/${x.target}`];
    if (x.step === c.steps[si].id && x.phase === 'prompt') return [];
    if (x.phase === 'prompt') { await page.click('[data-tour-act=doit]'); await until(y => y.step !== x.step || y.phase !== 'prompt', 25000); continue; }
    await sleep(350);
    const go = await page.$('.tn-box.in [data-tour-act=continue]');
    if (go) { await go.click(); await until(y => y.step !== x.step || y.phase !== 'done', 8000); }
  }
  return ['after Back, never got forward again'];
}

const rows = [];
let failed = 0;
const list = CHAPTERS.map((c, ci) => ({ c, ci })).filter(({ c }) => !only || only.has(c.id));
let expectIntro = null;   // the chapter whose intro Continue should have opened
for (const [li, { c, ci }] of list.entries()) {
  // Open the chapter by its address the first time (and whenever --only skips ahead); after that, the last step's
  // Continue has to open it.
  if (!expectIntro || expectIntro !== c.id) await page.evaluate(h => { location.hash = h; }, ci === 0 ? '' : c.id);
  // chapter 0 starts with the overview's slides, which end on the welcome
  if (ci === 0) {
    const sr = await slidesCheck();
    for (const r of sr) { rows.push(r); if (r.problem) failed++; }
    if (sr.some(r => r.problem && /never opened|no Next/.test(r.problem))) break;
  }
  const view = ci === 0 ? 'welcome' : 'intro';
  const introRow = { step: `${c.id} (${view})`, found: '', done: '', by: '', card: '', docs: '', problem: '' };
  const intro = await until(b => b.view === view && b.chapter === c.id, 8000);
  const ip = [];
  if (intro.timeout) ip.push(`intro never opened (view ${intro.view}, chapter ${intro.chapter})`);
  else {
    await sleep(900);
    const fit = await pageFit();
    if (!fit) ip.push('no page');
    else {
      if (fit.over > 1) ip.push(`page scrolls by ${fit.over}px`);
      const n = ci > 0 ? count([c.intro.head, c.intro.today, ...c.intro.gets.flatMap(([name, line]) => [name, line])]) : 0;
      if (n > MAX_INTRO) ip.push(`${n} words, more than a chapter's page should carry`);
      if (fit.acts.length !== 1) ip.push(`page offers ${fit.acts.length} things to press: ${fit.acts.join(', ')}`);
      if (fit.menu) ip.push('the strip has a chapter menu');
      introRow.card = ci > 0 ? `${n} words` : '';
    }
    // Back from the first chapter's intro is the welcome, and the way on from there leads back here
    if (ci === 1) {
      await page.keyboard.press('ArrowLeft');
      const b = await until(at('welcome'), 6000);
      if (b.timeout) ip.push(`← went to ${where(b)}`);
      else {
        await sleep(300);
        await page.keyboard.press('ArrowRight');
        const s = await until(at('step', `${CHAPTERS[0].id}/${CHAPTERS[0].steps[0].id}`), 6000);
        if (s.timeout) ip.push(`→ from the welcome went to ${where(s)}`);
        else if (!await waitFor('.tn-box.in [data-tour-act=continue]', 6000)) ip.push('no Continue on the opening card');
        else {
          await sleep(400);
          await page.click('[data-tour-act=continue]');
        }
      }
      // back on the intro, whatever happened above
      if ((await until(at('intro', c.id), 6000)).timeout) await page.evaluate(h => { location.hash = h; }, c.id);
      const i2 = await until(at('intro', c.id), 6000);
      if (i2.timeout) ip.push(`could not get back to the intro (on ${where(i2)})`);
      await sleep(700);
    }
    await shot(`${c.id}-00-intro`);
    if (ci === 0) {
      const r = await welcomeCheck();
      rows.push(r); if (r.problem) failed++;
    } else await page.click('[data-tour-act=showme]');
  }
  introRow.problem = ip.join('; ');
  if (ip.length) failed++;
  rows.push(introRow);
  if (intro.timeout) break;

  for (const [si, st] of c.steps.entries()) {
    const row = { step: `${c.id}/${st.id}`, found: '', done: '', by: '', lock: '', card: '', docs: '', problem: '' };
    const problems = [];
    const at = await until(b => b.view === 'step' && b.chapter === c.id && b.step === st.id, 8000);
    if (at.timeout) { problems.push(`never opened (strip on ${at.view} ${at.chapter}/${at.step}, ${at.phase})`); row.problem = problems.join('; '); rows.push(row); failed++; break; }
    const isRead = !st.done && !st.seen;
    if (!isRead) {
      // The prompt: the ring finds its target and the prompt box sits on the stage, clear of the devices.
      const f = await until(b => b.target === 'found' || b.phase !== 'prompt', 12000);
      row.found = f.phase === 'prompt' ? `${f.ms}ms` : `(${f.phase})`;
      if (f.timeout) problems.push(`target never found (status ${f.target})`);
      if (!f.timeout && f.phase === 'prompt') {
        await sleep(450);
        const ask = await layout('ask');
        if (!ask) problems.push('no prompt on the stage');
        else {
          if (!ask.inside) problems.push('prompt outside the stage');
          if (ask.overlaps.length) problems.push(`prompt overlaps ${ask.overlaps.join(', ')}`);
        }
        await shot(`${c.id}-${String(si + 1).padStart(2, '0')}a-${st.id}`);
        const lock = await lockCheck(si * 7 + ci * 3);
        row.lock = lock.skipped ? `(${lock.skipped})` : lock.what;
        if (lock.problems) problems.push(...lock.problems);
        if (BACK && si > 0) { const bp = await backCheck(c, si); row.back = bp.length ? 'no' : 'ok'; problems.push(...bp); await sleep(300); }
        await page.click('[data-tour-act=doit]');
      }
      const nextSt = c.steps[si + 1];
      const d = st.quiet
        ? await until(b => b.phase === 'off' || (nextSt && b.step === nextSt.id), 25000)
        : await until(b => b.phase === 'done' || b.phase === 'off', 25000);
      row.done = d.timeout ? 'timeout' : `${d.ms}ms`;
      row.by = st.quiet ? 'quiet' : d.by;
      if (d.timeout) problems.push(`never done (phase ${d.phase}, target ${d.target}, step ${d.step})`);
      if (d.phase === 'off') problems.push('went off the path');
      if (!st.quiet && d.step !== st.id) problems.push(`jumped to ${d.step}`);
      if (st.quiet && !nextSt) problems.push('a chapter can’t end on a quiet step');
    }
    if (st.quiet) {
      // no card: the next step has begun. When that step is one to read, its card is the one on screen.
      const card = await page.$('.tn-box.in[data-kind="card"]');
      const after = c.steps[si + 1];
      const readNext = !!after && !after.done && !after.seen;
      if (card && !readNext) problems.push('a quiet step showed a card');
      row.problem = problems.join('; ');
      if (problems.length) failed++;
      rows.push(row);
      if (problems.length) break;
      continue;
    }
    // The card: on screen, inside the stage, clear of the devices and the notes, with every point drawn.
    const ok = await waitFor('.tn-box.in[data-kind="card"]', 6000);
    if (!ok) problems.push('no card');
    else {
      await sleep(st.points && st.points.length ? 1500 : 700);
      const card = await layout('card');
      row.card = card ? `${card.w}x${card.h}` : '';
      if (card) {
        if (!card.inside) problems.push('card outside the stage');
        if (card.overlaps.length) problems.push(`card overlaps ${card.overlaps.join(', ')}`);
        if (card.dropped) problems.push(`${card.dropped} note(s) dropped`);
        if (!card.focused) problems.push('Continue has no focus');
        if (card.notesClash) problems.push('notes overlap each other');
        const want = card.narrow ? 0 : (st.points || []).length - card.off;   // a docked card leaves no margin for notes
        if (card.notes < want) problems.push(`notes ${card.notes} of ${want}`);
      }
      await shot(`${c.id}-${String(si + 1).padStart(2, '0')}b-${st.id}`);
      // the card's subject: found, laid out, and inside every scrolling or clipping box around it and the window
      if (st.at) {
        const seen = await page.evaluate(({ at, has }) => {
          const h = has && has.toLowerCase();
          const el = [...document.querySelectorAll('.stage ' + at.split(',').join(', .stage '))].find(e => (!h || (e.textContent || '').toLowerCase().includes(h)) && e.getBoundingClientRect().height > 0);
          if (!el) return 'not found';
          let { top, bottom } = el.getBoundingClientRect();
          for (let p = el.parentElement; p; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.overflowY !== 'visible') { const r = p.getBoundingClientRect(); top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
          }
          top = Math.max(top, 0); bottom = Math.min(bottom, innerHeight);
          return bottom - top > 12 ? '' : 'scrolled away';
        }, st.at);
        if (seen) problems.push(`the card's subject ${st.at.at}${st.at.has ? ` (${st.at.has})` : ''} is ${seen}`);
      }
    }
    // The docs link: the page exists and so does the heading.
    if (st.docs) {
      const href = await page.$eval('.tn-box .tc-docs', a => a.getAttribute('href')).catch(() => null);
      const want = `/docs${st.docs.page ? '/' + st.docs.page : ''}${st.docs.hash ? '#' + st.docs.hash : ''}`;
      const ids = anchors(st.docs.page);
      row.docs = want;
      if (!href || !href.endsWith(want)) problems.push(`docs link ${href}`);
      else if (!ids) problems.push(`no docs page ${st.docs.page}`);
      else if (st.docs.hash && !ids.has(st.docs.hash)) problems.push(`no heading #${st.docs.hash}`);
    }
    row.problem = problems.join('; ');
    if (problems.length) failed++;
    rows.push(row);
    // Continue. The last step of a chapter opens the next chapter's intro, and the last chapter's opens the closing page.
    const b = await strip();
    if (b.phase === 'off') break;
    const went = await page.click('[data-tour-act=continue]').then(() => true, () => false);
    if (!went) { rows.push({ step: `${c.id}/${st.id}`, problem: 'no Continue' }); failed++; break; }
    if (si === c.steps.length - 1) {
      const nextC = CHAPTERS[ci + 1];
      if (nextC) {
        const n = await until(x => x.view === 'intro' && x.chapter === nextC.id, 6000);
        if (n.timeout) { rows.push({ step: `${c.id} → ${nextC.id}`, problem: `Next chapter opened ${n.view} ${n.chapter}` }); failed++; }
        expectIntro = nextC.id;
      } else {
        const n = await until(x => x.view === 'closing', 6000);
        const hash = await page.evaluate(() => location.hash);
        const pr = [];
        if (n.timeout) pr.push(`Finish opened ${n.view}`);
        if (hash !== '#join') pr.push(`address ${hash}`);
        if (!n.timeout) {
          await sleep(900);
          const over = await page.evaluate(() => { const t = document.querySelector('.ti'); return t ? t.scrollHeight - t.clientHeight : -1; });
          if (over > 1) pr.push(`closing page scrolls by ${over}px`);
          await shot('zz-closing');
        }
        rows.push({ step: 'closing', problem: pr.join('; ') });
        if (pr.length) failed++;
      }
    }
  }
}
if (list.some(({ ci }) => ci === 0)) { const r = await addressCheck(); rows.push(r); if (r.problem) failed++; }
console.table(rows);
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log(' ', e); failed++; }
console.log(failed ? `✗ ${failed} problem(s)` : '✓ every page and step passed');
await browser.close();
process.exit(failed ? 1 : 0);
