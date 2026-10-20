import { SHOTS } from './shots.gen'
import { HeroOrbit } from './HeroOrbit.client'
import { EthlabsLogo } from './EthlabsLogo'
import { GhostPhone, Note } from './Sketch'
import { Join } from './Join'

// The landing hero, centred: who stewards PACE, then the promise, then the product under it. The stage is three captures from the interactive mockup:
// the first wallet (Keel) in the middle showing a swap, a second wallet (Lantern) behind it on the left showing the
// same account, and the hardware wallet on the right reading the swap out in words. Together they are the outcome
// the page sells. The steward line on top is a printed ticket that links to ethlabs.org: the body carries a live dot,
// "Stewarded by" and the Ethlabs wordmark, and a tear-off stub carries the arrow.
//
// The text stands still. "Portable" is in the hand, with a mint underline that draws itself once. Opposite Lantern,
// behind Keel, stands a wallet that is only drawn in construction lines so far, with a note asking whose it will be.

function Img({ id, className, sizes }: { id: string; className: string; sizes: string }) {
  const s = SHOTS[id]
  return (
    <img
      className={className}
      src={s.src}
      srcSet={`${s.src} ${s.width}w, ${s.src2x} ${s.width * 2}w`}
      sizes={sizes}
      width={s.width}
      height={s.height}
      alt=""
    />
  )
}

export function Hero() {
  return (
    <header className="hero">
      <div className="hero-copy">
        <a className="hero-steward" href="https://ethlabs.org" target="_blank" rel="noreferrer">
          <span className="tk tk-body">
            <span className="steward-dot" aria-hidden="true" />
            <span className="steward-by">Stewarded by</span>
            <EthlabsLogo className="ethlabs-logo" />
          </span>
          <span className="tk tk-stub" aria-hidden="true">
            <svg className="steward-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </a>
        {/* The diamond is ethereum.org's own eth-diamond-black.png (public/images/assets in ethereum-org-website). */}
        <h1>
          The{' '}
          <em className="scribble">
            Portable
            <svg className="scribble-line" viewBox="0 0 320 24" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength="1" d="M5 15C62 9 128 6 196 7.5c44 1 86 3.5 118 7.5M52 19.5c70-5 150-6.5 226-3" />
            </svg>
          </em>{' '}
          Account Core for{' '}
          <span className="eth-word"><img className="eth-mark" src="/eth-diamond.png" width="800" height="1303" alt="" />Ethereum</span>
        </h1>
        <p className="hero-lede">
          The Hegotá upgrade adds a new account type to Ethereum, and every wallet has to rebuild for it. PACE is an
          industry effort to agree on the core of that account: one spec every wallet implements and a few contracts
          they all share. Your account then opens in any wallet, and any hardware wallet can read what you sign.
        </p>
        <div className="hero-cta">
          <Join />
          <a className="btn ghost" href="/demo/demo.html" target="_blank" rel="noreferrer">
            Try the interactive mockup
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h10v10M7 17L17 7" /></svg>
          </a>
          <a className="btn ghost" href="/docs">Read the docs</a>
        </div>
      </div>
      <div className="hero-stage" aria-hidden="true">
        <HeroOrbit />
        <GhostPhone className="hs-ghost" />
        <Note arrow="down-left" className="hs-note-ghost">your wallet next?</Note>
        <Img id="lantern" className="hs-back" sizes="240px" />
        <Img id="batch-sheet" className="hs-front" sizes="240px" />
        <Img id="hw-guaranteed" className="hs-hw" sizes="300px" />
      </div>
    </header>
  )
}
