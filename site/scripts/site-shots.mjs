// Full-page screenshots of the site itself, for visual QA. node scripts/site-shots.mjs [baseUrl] [outDir] [--dark] [--only=a,b]
// --dark emulates prefers-color-scheme: dark (vocs follows it when no theme is stored) and suffixes files with -dark.
// Desktop (1440 wide): <name>.png is the full page, <name>-top.png the first viewport.
// Phone (375 wide): the full page is cut into <name>-m-1.png, -m-2.png ... slices 1400px tall, so each stays readable.
import puppeteer from 'puppeteer-core';
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const base = args[0] || 'http://127.0.0.1:5173';
const out = args[1] || '/tmp';
const dark = flags.includes('--dark');
const only = (flags.find(f => f.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const suffix = dark ? '-dark' : '';
const BRAVE = process.env.BRAVE || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const allPages = [['/', 'landing'], ['/docs', 'docs-overview'], ['/docs/why-now', 'docs-why'], ['/docs/what-has-to-change', 'docs-work'], ['/docs/post-quantum', 'docs-pq'], ['/docs/transaction-security', 'docs-security'], ['/docs/readable-signing', 'docs-readable'], ['/docs/banking-app', 'docs-banking'], ['/docs/app-builders', 'docs-apps'], ['/docs/extensions', 'docs-extensions'], ['/docs/deliverables', 'docs-road'], ['/docs/account-model', 'docs-account'], ['/docs/standards', 'docs-standards'], ['/research', 'research']];
const pages = only.length ? allPages.filter(([, n]) => only.includes(n)) : allPages;
const views = [
  ['desktop', { width: 1440, height: 900, deviceScaleFactor: 1 }],
  ['phone', { width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true }],
];
const SLICE = 1400;
const browser = await puppeteer.launch({ executablePath: BRAVE, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
if (dark) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
for (const [view, viewport] of views) {
  await page.setViewport(viewport);
  for (const [path, name] of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    // Scroll through once so lazy images load before the capture.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } window.scrollTo(0, 0); });
    // Force every lazy image to load and decode.
    await page.evaluate(async () => { const imgs = [...document.images]; imgs.forEach(i => { i.loading = 'eager'; }); await Promise.all(imgs.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = r; i.onerror = r; })).then(() => i.decode().catch(() => {})))); });
    await new Promise(r => setTimeout(r, 300));
    if (view === 'desktop') {
      await page.screenshot({ path: `${out}/${name}${suffix}-top.png` });
      await page.screenshot({ path: `${out}/${name}${suffix}.png`, fullPage: true });
      console.log(view, name, 'ok');
    } else {
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      for (let y = 0, i = 1; y < total; y += SLICE, i++) {
        await page.screenshot({ path: `${out}/${name}${suffix}-m-${i}.png`, clip: { x: 0, y, width: viewport.width, height: Math.min(SLICE, total - y) }, captureBeyondViewport: true });
      }
      console.log(view, name, 'ok', total + 'px', wide ? 'HORIZONTAL OVERFLOW' : 'no horizontal scroll');
    }
  }
}
await browser.close();
