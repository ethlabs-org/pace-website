// Render public/og.png, the 1200x630 card crawlers fetch for link previews.
//   node scripts/og.mjs
// It is a real screenshot of an HTML page rather than a hand-made image, so the card stays in step with the
// site's tokens: change a colour or the headline here and re-run. The fonts are loaded straight out of
// node_modules as file:// URLs, so nothing has to be served for this to work.
//
// Remember this file exists. og.png carries the product name in pixels, which no grep for an old name will
// ever find.
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import puppeteer from 'puppeteer-core'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const font = (p) => 'file://' + join(root, 'node_modules', p)

const BRAND = 'PACE'
const TITLE = 'The Portable Account Core for Ethereum'
const META = [['Number', 'ERC-XXXX'], ['Status', 'Draft'], ['Core', 'EIP-8130 · ERC-7715 · EIP-7906'], ['Proposed by', 'Ethlabs']]
const URL = 'erc-xxxx.ethlabs.dev'

// The same look as the site's hero: white, ink, one grey, hairlines, the preamble as a row of key/value pairs.
const MARK = `<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#101216"/><path d="M9.6 8h12.8v3.2h-8.8v3.2h6.4v3.2h-6.4v3.2h8.8V24H9.6z" fill="#fff"/></svg>`

const html = `<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: 'Schibsted Grotesk'; font-weight: 400 700;
    src: url('${font('@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2')}') format('woff2-variations'); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; padding: 60px 72px 56px;
    display: flex; flex-direction: column;
    font-family: 'Schibsted Grotesk', system-ui, sans-serif; color: #101216; background: #FFFFFF;
  }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 26px; font-weight: 600; letter-spacing: -.01em; }
  .brand svg { width: 34px; height: 34px; }
  .url { font-size: 20px; color: #6A707A; }
  h1 { margin-top: auto; font-size: 66px; font-weight: 500; line-height: 1.04; letter-spacing: -.034em; max-width: 13.5em; text-wrap: balance; }
  dl { margin-top: 44px; padding-top: 22px; border-top: 1px solid rgba(16, 18, 22, .12); display: flex; gap: 56px; }
  dt { font-size: 18px; color: #6A707A; }
  dd { margin: 4px 0 0; font-size: 22px; font-weight: 500; }
</style>
<div class="top"><span class="brand">${MARK}${BRAND}</span><span class="url">${URL}</span></div>
<h1>${TITLE}</h1>
<dl>${META.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`

const file = join(tmpdir(), `og-${Date.now()}.html`)
await mkdir(tmpdir(), { recursive: true })
await writeFile(file, html)

const browser = await puppeteer.launch({ executablePath: BRAVE, headless: true, args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
await page.goto('file://' + file, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
const out = join(root, 'public', 'og.png')
await page.screenshot({ path: out })
await browser.close()
console.log('wrote', out)
