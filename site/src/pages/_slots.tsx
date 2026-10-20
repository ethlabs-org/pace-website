// Slots into the vocs shell. Three columns: the note every page of the old site ended with, then the two
// sections of the site, so the page has somewhere to go at the bottom.
const DOCS = [
  ['Overview', '/docs'],
  ['Why this needs to exist', '/docs/why-now'],
  ['What we need to do', '/docs/what-has-to-change'],
  ['What app builders get', '/docs/app-builders'],
  ['What a wallet can add', '/docs/extensions'],
  ['The road to Hegotá', '/docs/deliverables'],
]

const MORE = [
  ['How the account works', '/docs/account-model'],
  ['Built from existing standards', '/docs/standards'],
  ['Research notes', '/research'],
  ['Open the interactive mockup', '/demo/demo.html'],
  ['Ethlabs on GitHub', 'https://github.com/ethlabs'],
]

export function Footer() {
  return (
    <footer className="foot">
      <p className="foot-note">
        PACE, the Portable Account Core for Ethereum, is an industry coordination effort stewarded by Ethlabs. The current draft is
        Ethlabs’ proposal, and nothing here is final. Every standard named in the docs links to its official text; status notes were
        checked on 21 September 2026. Product names in the interactive mockup are fictional.
      </p>
      <div>
        <h2>Docs</h2>
        <ul>
          {DOCS.map(([text, href]) => (
            <li key={href}><a href={href}>{text}</a></li>
          ))}
        </ul>
      </div>
      <div>
        <h2>More</h2>
        <ul>
          {MORE.map(([text, href]) => {
            const external = href.startsWith('http') || href.startsWith('/demo/')
            return (
              <li key={href}>
                <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{text}</a>
              </li>
            )
          })}
        </ul>
      </div>
    </footer>
  )
}
