import { defineConfig } from 'vocs/config'
import rehypeTerms from './plugins/rehype-terms.mjs'

// The PACE (Portable Account Core for Ethereum) site. Landing at /, docs under /docs, research notes under /research, the
// interactive mockup copied into public/demo by scripts/sync-demo.mjs. Fully static output (dist/public).
// The glossary plugin is bundled with this config: after editing plugins/rehype-terms.mjs, restart the dev server.
export default defineConfig({
  title: 'PACE',
  titleTemplate: (path) =>
    path === '/' ? '%s' : path.startsWith('/research') ? '%s · Research · PACE' : '%s · PACE',
  description:
    "PACE, the Portable Account Core for Ethereum, is an industry effort to agree on the part of Ethereum's new account that every wallet builds the same way: a spec for EIP-8130 keys and sessions, a threshold authenticator, ERC-7715 and ERC-7710 app permissions, EIP-7906 assertions and ERC-7730 clear signing metadata, plus a few shared contracts. Wallets add everything else on top. Stewarded by Ethlabs.",
  baseUrl: 'https://erc-xxxx.ethlabs.dev',
  // baseUrl feeds the sitemap and canonical URLs; without `base: false` the page also gets an absolute <base>
  // tag, which makes every build load its scripts from the production domain even on a local or staging copy.
  // The canonical link has to be set here because turning the base tag off also drops it.
  head: (path) => ({
    base: false,
    canonical: `https://erc-xxxx.ethlabs.dev${path === '/' ? '' : path}`,
    meta: { themeColor: '#FFFFFF' },
  }),
  // Without this a link to the site previews as plain text. public/og.png is 1200x630. The URL has to be
  // absolute: crawlers fetch og:image on its own, with no page to resolve a relative path against.
  ogImageUrl: 'https://erc-xxxx.ethlabs.dev/og.png',
  renderStrategy: 'full-static',
  // No logoUrl: vocs then sets `title` as live text, which _root.css styles as the wordmark with the mark in front.
  // An SVG logo loaded through <img> cannot use the page's web fonts, so its text fell back to the system face.
  // The favicon path is new for the same reason the old logo paths were: a new path is the only reliable cache
  // bust for a static asset.
  iconUrl: '/mark.svg',
  // The UI accent (active sidebar item, active nav tab, outline, steps, focus) is the ink colour, so the chrome
  // stays monochrome. Links in the text keep the green through --vocs-text-color-link in _root.css.
  accentColor: 'light-dark(#101216, #ECEDEF)',
  colorScheme: 'light dark',
  topNav: [
    { text: 'Docs', link: '/docs', match: '/docs' },
    { text: 'Research', link: '/research', match: '/research' },
    { text: 'Interactive mockup', link: '/demo/demo.html', external: true },
  ],
  sidebar: {
    // The docs follow the landing page: why, the work, what every user gets (one page per theme), what app builders
    // get, what a wallet can add, and the road to Hegotá. Two reference pages hold the detail.
    '/docs': [
      {
        text: 'Start here',
        items: [
          { text: 'Overview', link: '/docs' },
          { text: 'Why this needs to exist', link: '/docs/why-now' },
          { text: 'What we need to do', link: '/docs/what-has-to-change' },
        ],
      },
      {
        text: 'What every user gets',
        items: [
          { text: 'Move to post-quantum keys', link: '/docs/post-quantum' },
          { text: 'Approve the result you expect', link: '/docs/transaction-security' },
          { text: 'Read every transaction on your hardware wallet', link: '/docs/readable-signing' },
          { text: 'Use Ethereum like a banking app', link: '/docs/banking-app' },
        ],
      },
      {
        text: 'What app builders get',
        items: [{ text: 'One transaction path', link: '/docs/app-builders' }],
      },
      {
        text: 'What a wallet can add',
        items: [{ text: 'Wallet extensions', link: '/docs/extensions' }],
      },
      {
        text: 'The road to Hegotá',
        items: [{ text: 'From draft to mainnet', link: '/docs/deliverables' }],
      },
      {
        text: 'Reference',
        items: [
          { text: 'How the account works', link: '/docs/account-model' },
          { text: 'Built from existing standards', link: '/docs/standards' },
        ],
      },
    ],
    '/research': {
      backLink: true,
      items: [
        { text: 'Research notes', link: '/research' },
        { text: 'EIP-8130 and EIP-8141', link: '/research/8130-8141' },
        { text: 'ERC-7715 and ERC-7710', link: '/research/7710-7715' },
        { text: 'ERC-8211, ERC-7730, ERC-7964', link: '/research/8211-7730-7964' },
        { text: 'EIP-7906 and co-signers', link: '/research/7906-cosigners' },
        { text: 'Privacy', link: '/research/privacy' },
        { text: 'Post-quantum', link: '/research/post-quantum' },
        { text: 'Where 8130 and 8141 disagree', link: '/research/the-split' },
        { text: 'ERC-8403 and the Keystore read', link: '/research/erc-8403' },
      ],
    },
  },
  socials: [{ icon: 'github', link: 'https://github.com/ethlabs' }],
  markdown: { rehypePlugins: [rehypeTerms] },
  codeHighlight: {
    themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    langAlias: { sol: 'solidity' },
  },
  checkDeadlinks: 'warn',
})
