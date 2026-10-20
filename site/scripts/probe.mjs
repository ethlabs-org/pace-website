// Evaluate JS in a page of the running site and print the JSON result.
//   node scripts/probe.mjs <path> '<js expression>' [--w=1440] [--h=900] [--dark]
// The expression runs in the page after fonts + lazy images settle. Top-level await is allowed.
// Handy globals injected for you:
//   $(sel)            -> first element
//   $$(sel)           -> array of elements
//   box(sel|el)       -> {x,y,w,h,right,bottom} rounded, viewport coords
//   css(sel|el, ...p) -> {prop: computedValue}
//   boxes(sel)        -> box() for every match
//   text(sel)         -> trimmed textContent
//   lines(sel)        -> the element's text split where it actually wraps, one string per rendered line
import puppeteer from 'puppeteer-core'
const argv = process.argv.slice(2)
const flags = argv.filter(a => a.startsWith('--'))
const [path = '/', expr = 'document.title'] = argv.filter(a => !a.startsWith('--'))
const num = (f, d) => { const m = flags.find(x => x.startsWith(`--${f}=`)); return m ? Number(m.split('=')[1]) : d }
const base = (flags.find(f => f.startsWith('--base=')) || '--base=http://127.0.0.1:5173').split('=')[1]
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const browser = await puppeteer.launch({ executablePath: BRAVE, headless: true, args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: num('w', 1440), height: num('h', 900), deviceScaleFactor: 1, isMobile: num('w', 1440) < 700, hasTouch: num('w', 1440) < 700 })
if (flags.includes('--dark')) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])
if (flags.includes('--reduce-motion')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
const msgs = []
page.on('console', m => msgs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', e => msgs.push(`pageerror: ${e.message}`))
await page.goto(base + path, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => document.fonts.ready)
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)) } window.scrollTo(0, 0) })
await page.evaluate(async () => { await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = r; i.onerror = r }))) })
await new Promise(r => setTimeout(r, 250))
const out = await page.evaluate(async (src) => {
  const $ = s => document.querySelector(s)
  const $$ = s => [...document.querySelectorAll(s)]
  const el = x => typeof x === 'string' ? document.querySelector(x) : x
  const R = n => Math.round(n * 10) / 10
  const box = x => { const e = el(x); if (!e) return null; const r = e.getBoundingClientRect(); return { x: R(r.x), y: R(r.y + window.scrollY), w: R(r.width), h: R(r.height), right: R(r.right), bottom: R(r.bottom + window.scrollY) } }
  const boxes = s => $$(s).map(box)
  const css = (x, ...props) => { const e = el(x); if (!e) return null; const c = getComputedStyle(e); return Object.fromEntries(props.map(p => [p, c.getPropertyValue(p)])) }
  const text = s => ($(s)?.textContent || '').trim()
  // Where the text actually wraps: walk every text node a character at a time and cut whenever the client rect
  // jumps to a new line box. Handles inline markup inside the element (a <span> or <br> in a headline), so it
  // reports the rendered lines rather than the source. Used to check headline breaks, which text-wrap: balance
  // decides at render time.
  const lines = (s) => {
    const e = el(s); if (!e) return null
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
    const r = document.createRange(); const out = []; let buf = '', prev = null, n
    while ((n = w.nextNode())) {
      for (let i = 0; i < n.length; i++) {
        r.setStart(n, i); r.setEnd(n, i + 1)
        const top = r.getBoundingClientRect().top
        if (prev === null) prev = top
        if (Math.abs(top - prev) > 2) { if (buf.trim()) out.push(buf.trim()); buf = ''; prev = top }
        buf += n.data[i]
      }
    }
    if (buf.trim()) out.push(buf.trim())
    return out
  }
  try { return { ok: true, value: await eval(`(async () => { ${src.includes('return') ? src : 'return (' + src + ')'} })()`) } }
  catch (e) { return { ok: false, error: String(e && e.stack || e) } }
}, expr)
if (msgs.length) out.console = msgs.slice(0, 40)
console.log(JSON.stringify(out, null, 2))
await browser.close()
