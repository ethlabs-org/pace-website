// Walks the interactive mockup's whole tutorial in headless Brave, on the GPU, the way a visitor would (real mouse
// clicks on Next, Start the tour, Show me, the ringed target or "Do it for me" for a field, and Continue), and reports
// how smoothly each interaction ran, from Chrome's frame pipeline events:
//   fr / part / drop   frames presented in full / presented without the main thread's part / dropped
//   busy / long / n16  main-thread time, its longest task and how many tasks took more than a 60 Hz frame (ms)
//   paint, lay, sty    how many paints, layouts and style recalculations, and their ms
//   rast, gpu          raster ms on the renderer's workers and in the GPU process
//   main               animations that ran on the main thread instead of the compositor
// It also checks that the page comes to rest (layouts and style recalculations per second on a slide, the welcome and
// a section's page). With --jumps it records instead every time a tutorial box, note, arrow or ring that is already
// showing moves (it should glide, and only rarely move at all).
//
//   node scripts/frame-check.mjs [--size=1440x900] [--dpr=2] [--only=overview,keys] [--url=http://127.0.0.1:8791/] [--jumps] [--out=dir]
//
// Serve the repo first (python3 serve.py 8791). A trace per section is written to --out (default: a temp folder) and
// read back. The display decides the frame rate: a MacBook Pro runs at 120 Hz, so a frame lasts 8.3 ms.
import puppeteer from 'puppeteer-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const URL_ = arg('url', 'http://127.0.0.1:8791/');
const [VW, VH] = arg('size', '1440x900').split('x').map(Number);
const DPR = Number(arg('dpr', '2'));
const only = arg('only', '') ? new Set(arg('only', '').split(',')) : null;
const JUMPS = process.argv.includes('--jumps');
const OUT = arg('out', '') || fs.mkdtempSync(path.join(os.tmpdir(), 'frame-check-'));
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const { CHAPTERS, SLIDES } = await import(pathToFileURL(path.resolve(here, '../../src/tour.js')).href);

const browser = await puppeteer.launch({ executablePath: BRAVE, headless: 'new', args: ['--no-first-run', '--hide-scrollbars', `--window-size=${VW},${VH}`] });
const page = await browser.newPage();
await page.setViewport({ width: VW, height: VH, deviceScaleFactor: DPR });
const errors = [];
page.on('pageerror', e => errors.push(String(e.message || e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
// --jumps: every move of a mark that is already showing, by its left/top (its entrance and glides are transforms)
if (JUMPS) await page.evaluateOnNewDocument(() => {
  window.__jumps = [];
  const last = new WeakMap(), born = new WeakMap();
  const look = () => {
    const strip = document.querySelector('.tour');
    const step = strip ? `${strip.dataset.chapter}/${strip.dataset.step}:${strip.dataset.phase}` : '';
    const now = performance.now();
    for (const el of document.querySelectorAll('.tn-box.in, .tn-tag.in, .tn-note.in, .tn-marks, .tn-ring')) {
      const p = { x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
      const was = last.get(el);
      if (!born.has(el)) born.set(el, now);
      if (was && (Math.abs(was.x - p.x) > 2 || Math.abs(was.y - p.y) > 2)) {
        const what = el.className.baseVal != null ? el.className.baseVal.split(' ').join('.') : el.className.split(' ').slice(0, 2).join('.');
        window.__jumps.push({ step, what, dx: Math.round(p.x - was.x), dy: Math.round(p.y - was.y), age: Math.round(now - born.get(el)) });
      }
      last.set(el, p);
    }
  };
  const start = () => { const w = document.querySelector('.work'); if (!w) { setTimeout(start, 200); return; } new MutationObserver(look).observe(w, { subtree: true, attributes: true, attributeFilter: ['style', 'class'], childList: true }); };
  start();
});
await page.goto(`${URL_}?v=${Date.now()}`, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForSelector('.tour[data-view]', { timeout: 90000 });
await sleep(2500);
const cdp = await page.createCDPSession();
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));

const strip = () => page.$eval('.tour', el => ({ ...el.dataset }));
async function until(pred, ms) {
  const t0 = Date.now();
  for (;;) {
    const b = await strip();
    if (pred(b)) return { ...b, ms: Date.now() - t0 };
    if (Date.now() - t0 > ms) return { ...b, ms: Date.now() - t0, timeout: true };
    await sleep(50);
  }
}
// Marks where an interaction starts, in the trace.
const mark = label => page.evaluate(l => console.timeStamp('ix:' + l), label);
// A real click at the middle of the first laid-out match. (Puppeteer's ElementHandle.click checks visibility with an
// IntersectionObserver in the page, which would show up in the trace as the page's own work.)
async function clickSel(sel) {
  const pt = await page.evaluate(s => {
    const el = [...document.querySelectorAll(s)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!pt) return false;
  await page.mouse.move(pt.x, pt.y, { steps: 4 });
  await page.mouse.click(pt.x, pt.y);
  return true;
}
async function waitSel(sel, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(s => !!document.querySelector(s), sel)) return true; await sleep(50); } return false; }

// ---- reading a trace ----
function analyze(file) {
  const ev = JSON.parse(fs.readFileSync(file, 'utf8')).traceEvents;
  const thr = {};
  for (const e of ev) if (e.name === 'thread_name') thr[e.pid + ':' + e.tid] = e.args.name;
  const stamps = ev.filter(e => e.name === 'TimeStamp' && e.args?.data?.message?.startsWith('ix:')).sort((a, b) => a.ts - b.ts);
  if (!stamps.length) return [];
  const rpid = stamps[0].pid;
  const mainTid = Object.entries(thr).find(([k, v]) => k.startsWith(rpid + ':') && v === 'CrRendererMain')[0].split(':')[1];
  let end = 0;
  for (const e of ev) { const x = e.ts + (e.dur || 0); if (x > end) end = x; }
  // animations: a begin event opens a record for its id (ids are reused once an animation ends), and an instant
  // event says whether it got onto the compositor
  const anims = [], cur = {};
  for (const e of ev.filter(e => e.name === 'Animation' && e.pid === rpid).sort((a, b) => a.ts - b.ts)) {
    const id = e.id2 ? e.id2.local : e.id;
    if (e.ph === 'b') { cur[id] = { ts: e.ts, name: e.args.data.displayName || e.args.data.name, node: e.args.data.nodeName || '' }; anims.push(cur[id]); continue; }
    if (cur[id] && e.ph === 'n' && e.args.data && e.args.data.compositeFailed) cur[id].failed = (e.args.data.unsupportedProperties || []).join(',') || String(e.args.data.compositeFailed);
  }
  const onMain = e => String(e.tid) === mainTid;
  const rows = [];
  for (let k = 0; k < stamps.length; k++) {
    const label = stamps[k].args.data.message.slice(3);
    if (label === 'start') continue;
    const t0 = stamps[k].ts, t1 = k + 1 < stamps.length ? stamps[k + 1].ts : end;
    const inW = e => e.ts >= t0 && e.ts < t1;
    const f = { all: 0, part: 0, drop: 0 };
    for (const e of ev) {
      if (e.name !== 'PipelineReporter' || e.ph !== 'b' || e.pid !== rpid || !inW(e)) continue;
      const st = (e.args.frame_reporter || e.args.chrome_frame_reporter || {}).state;
      if (st === 'STATE_PRESENTED_ALL') f.all++; else if (st === 'STATE_PRESENTED_PARTIAL') f.part++; else if (st === 'STATE_DROPPED') f.drop++;
    }
    const tasks = ev.filter(e => e.pid === rpid && onMain(e) && e.name === 'RunTask' && e.ph === 'X' && inW(e));
    const sum = (name, ok) => { const l = ev.filter(e => e.name === name && e.ph === 'X' && e.pid === rpid && ok(e) && inW(e)); return `${l.length}/${(l.reduce((t, e) => t + e.dur, 0) / 1000).toFixed(0)}`; };
    const gpu = ev.filter(e => e.name === 'RasterDecoderImpl::DoRasterCHROMIUM' && e.ph === 'X' && inW(e)).reduce((t, e) => t + e.dur, 0) / 1000;
    rows.push({
      interaction: label, s: ((t1 - t0) / 1e6).toFixed(1), fr: f.all, part: f.part, drop: f.drop,
      busy: (tasks.reduce((t, e) => t + e.dur, 0) / 1000).toFixed(0), long: (tasks.reduce((m, e) => Math.max(m, e.dur), 0) / 1000).toFixed(1),
      n16: tasks.filter(e => e.dur > 16700).length, paint: sum('Paint', onMain), lay: sum('Layout', onMain), sty: sum('UpdateLayoutTree', onMain),
      rast: sum('RasterTask', e => !onMain(e)).split('/')[1], gpu: gpu.toFixed(0),
      main: [...new Set(anims.filter(a => a.failed && a.ts >= t0 && a.ts < t1).map(a => `${a.name} (${a.failed})`))].join(', '),
    });
  }
  return rows;
}
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink.animations', 'gpu'];
const report = [];
async function section(name, fn) {
  if (JUMPS) { await fn(); return; }
  const file = path.join(OUT, `trace-${name}.json`);
  await page.tracing.start({ path: file, categories: CATS });
  await mark('start');
  await fn();
  await sleep(300);
  await page.tracing.stop();
  report.push(...analyze(file));
}
// Layouts, style recalculations and main-thread ms per second over 3 s of rest, and what is still animating.
async function rest(label) {
  const a = await metrics(); await sleep(3000); const z = await metrics();
  const running = await page.evaluate(() => document.getAnimations().filter(x => x.playState === 'running').map(x => x.animationName || x.transitionProperty || 'script'));
  return { at: label, layouts: ((z.LayoutCount - a.LayoutCount) / 3).toFixed(1), styles: ((z.RecalcStyleCount - a.RecalcStyleCount) / 3).toFixed(1), taskMs: ((z.TaskDuration - a.TaskDuration) * 1000 / 3).toFixed(1), running: running.join(', ') };
}
const rests = [];

// One step: Continue on a card; on a prompt, clicks on the ringed element (or "Do it for me" for a field) until the
// step is done.
async function doStep(c, si) {
  const st = c.steps[si];
  const b = await until(x => x.view === 'step' && x.chapter === c.id && x.step === st.id, 10000);
  if (b.timeout) throw new Error(`${c.id}/${st.id} never opened (the strip is on ${b.view} ${b.chapter}/${b.step} ${b.phase})`);
  if (st.done || st.seen) {
    for (let n = 0; n < 12; n++) {
      const f = await until(x => x.step !== st.id || x.phase !== 'prompt' || x.target === 'found', 15000);
      if (f.step !== st.id || f.phase !== 'prompt') break;
      if (f.timeout) throw new Error(`${c.id}/${st.id}: target never found (${f.target})`);
      await sleep(n ? 250 : 700);
      const field = await page.evaluate(() => { const el = document.querySelector('[data-tour-ring]'); return !el || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName); });
      await mark(`${c.id}/${st.id}${n ? '#' + n : ''}:${field ? 'doit' : 'click'}`);
      if (field) { await clickSel('[data-tour-act=doit]'); await until(x => x.step !== st.id || x.phase !== 'prompt', 20000); break; }
      const before = await page.evaluate(() => { const el = document.querySelector('[data-tour-ring]'); return el ? el.outerHTML.length + ':' + el.textContent : ''; });
      if (!await clickSel('[data-tour-ring]')) continue;
      await until(x => x.step !== st.id || x.phase !== 'prompt' || x.target !== 'found', 1500);
      const now = await strip();
      if (now.step !== st.id || now.phase !== 'prompt') break;
      const after = await page.evaluate(() => { const el = document.querySelector('[data-tour-ring]'); return el ? el.outerHTML.length + ':' + el.textContent : ''; });
      if (after === before) await sleep(400);
    }
    const next = c.steps[si + 1];
    const d = st.quiet ? await until(x => x.phase === 'off' || (next && x.step === next.id) || x.view !== 'step', 25000) : await until(x => x.phase === 'done' || x.phase === 'off', 25000);
    if (d.timeout || d.phase === 'off') throw new Error(`${c.id}/${st.id} stuck at ${d.phase} ${d.target}`);
    if (st.quiet) return;
  }
  if (!await waitSel('.tn-box.in[data-kind="card"] [data-tour-act=continue]', 8000)) throw new Error(`no card at ${c.id}/${st.id}`);
  await sleep(1100);
  await mark(`${c.id}/${st.id}:continue`);
  await clickSel('.tn-box.in [data-tour-act=continue]');
}

let stopped = '';
try {
  for (const [ci, c] of CHAPTERS.entries()) {
    if (only && !only.has(c.id) && !(ci === 0 && only.has('overview'))) continue;
    await section(c.id, async () => {
      if (ci === 0) {
        // the overview's slides, the welcome, then the first chapter's cards
        for (const [k, sl] of SLIDES.entries()) {
          await until(x => x.view === 'slide' && x.slide === sl.id, 8000);
          await sleep(1400);
          if (k === 0) rests.push(await rest(`slide ${sl.id}`));
          await mark(`slide:${sl.id}:next`);
          await clickSel('[data-tour-act=next]');
        }
        await until(x => x.view === 'welcome', 8000);
        await sleep(1400);
        rests.push(await rest('welcome'));
        await mark('welcome:start');
        await clickSel('[data-tour-act=showme]');
      } else {
        // a section's page: by its address the first time (or when --only skips ahead), else the last Continue opened it
        const b = await strip();
        if (!(b.view === 'intro' && b.chapter === c.id)) await page.evaluate(h => { location.hash = h; }, c.id);
        await until(x => x.view === 'intro' && x.chapter === c.id, 8000);
        await sleep(1400);
        if (rests.length < 3) rests.push(await rest(`section ${c.id}`));
        await mark(`${c.id}:showme`);
        await clickSel('[data-tour-act=showme]');
      }
      for (let si = 0; si < c.steps.length; si++) await doStep(c, si);
      await sleep(1600);
    });
  }
} catch (e) {
  stopped = e.message;
}

if (!JUMPS) {
  console.table(report);
  const t = report.reduce((s, x) => ({ fr: s.fr + x.fr, part: s.part + x.part, drop: s.drop + x.drop, busy: s.busy + Number(x.busy) }), { fr: 0, part: 0, drop: 0, busy: 0 });
  console.log(`${report.length} interactions: ${t.fr} frames presented in full, ${t.part} without the main thread's part, ${t.drop} dropped; ${(t.busy / 1000).toFixed(1)} s of main-thread work`);
  const main = [...new Set(report.flatMap(x => x.main ? x.main.split(', ') : []))];
  console.log(main.length ? `On the main thread: ${main.join('; ')}` : 'Every animation ran on the compositor.');
}
console.table(rests);
if (JUMPS) {
  const jumps = await page.evaluate(() => window.__jumps || []);
  console.log(`${jumps.length} moves of marks that were already showing:`);
  for (const j of jumps) console.log(`  ${j.step.padEnd(40)} ${j.what.padEnd(22)} ${String(j.dx).padStart(4)},${String(j.dy).padStart(4)}  ${j.age} ms after it appeared`);
}
if (errors.length) { console.log('Page errors:'); for (const e of [...new Set(errors)]) console.log(' ', e); }
if (stopped) console.log('The walk stopped:', stopped);
await browser.close();
process.exit(stopped || errors.length ? 1 : 0);
