// Screenshot one landing section by its h2 text.
//   node scripts/sec-shot.mjs "<h2 text>" <out.png> [--w=1440] [--dark] [--base=http://127.0.0.1:5173]
import puppeteer from 'puppeteer-core'
const argv = process.argv.slice(2)
const flags = argv.filter(a => a.startsWith('--'))
const [heading, out] = argv.filter(a => !a.startsWith('--'))
const num = (f, d) => { const m = flags.find(x => x.startsWith(`--${f}=`)); return m ? Number(m.split('=')[1]) : d }
const base = (flags.find(f => f.startsWith('--base=')) || '--base=http://127.0.0.1:5173').split('=')[1]
const w = num('w', 1440)
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const browser = await puppeteer.launch({ executablePath: BRAVE, headless: true, args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: w, height: 900, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: w < 700 })
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: flags.includes('--dark') ? 'dark' : 'light' }])
await page.goto(base + '/', { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => document.fonts.ready)
const handle = await page.evaluateHandle((t) => [...document.querySelectorAll('section.sec')].find(s => s.querySelector('h2')?.textContent.includes(t)), heading)
await handle.evaluate(e => e.scrollIntoView())
await new Promise(r => setTimeout(r, 400))
await handle.screenshot({ path: out })
await browser.close()
