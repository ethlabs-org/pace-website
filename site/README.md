# Site

The website for PACE, the Portable Account Core for Ethereum: the landing page (`/`), the docs (`/docs`) and the research notes (`/research`). It is built with [vocs](https://vocs.dev). The build is static and includes the interactive mockup at `/demo/`.

## Run

Needs Node 22.15 or newer.

```bash
npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # static site in dist/public
npm run preview   # serve the build
```

The scripts run Vite directly, so `vite.config.ts` applies. It pre-bundles Mermaid, which the vocs CLI can't.

## Screenshots

The images in `src/assets/shots` are captures of the interactive mockup (PNG, 2x). After adding or replacing one, run `npm run shots:index` to write the WebP files and `src/components/shots.gen.ts`. The build runs it too.

`npm run og` renders the link preview card, `public/og.png`, in headless Brave. If Brave isn't at its default macOS path, set `BRAVE` to the binary.

## Layout

```
vocs.config.ts            site config: nav, sidebars, theme
plugins/rehype-terms.mjs  glossary tooltips and EIP/ERC links
src/glossary.mjs          glossary terms
src/pages/                landing page, docs and research notes
src/components/           the site's own components
src/assets/shots/         mockup captures (PNG, 2x)
scripts/                  build helpers, the link preview card, QA checks for the site and the mockup's tour
```

## Writing rules

- Short, plain sentences. Explain the mechanism before the consequence.
- Write standards as `EIP-1234` or `ERC-1234`. The plugin links them and adds the glossary tooltip.
- Add new terms to `src/glossary.mjs`.
- Every page needs `showAskAi: false` in its frontmatter.
