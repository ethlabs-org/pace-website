import { SHOTS } from './shots.gen'

// What users get, one short section per theme. The rail carries the theme's icon, its name and the gist in a
// sentence or two. The body is a row of features, each a mockup screen on the theme's tinted plate with a name and a
// line or two under it. Phones and browser captures rise out of the bottom of the plate and are cropped there; the
// hardware wallet is small enough to sit whole. The tint comes from the section's `tint-*` class. A pencil outline
// (sc-frame) is traced round each plate on the landing's sketch layer. Icons are Lucide
// paths inlined, so nothing is fetched.
const ICONS = {
  face: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  atom: 'M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.52-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.52 4.52 9.87 6.54 11.9 4.5ZM15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z',
  shield: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2l4-4',
  scanText: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8h8M7 12h10M7 16h6',
  eyeOff: 'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49M14.084 14.158a3 3 0 0 1-4.242-4.242M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143M2 2l20 20',
}

export function ThemeIcon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className="theme-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path pathLength="1" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d={ICONS[name]} /></svg>
    </span>
  )
}

// `tag` says where a feature comes from: the shared core every wallet supports ('core'), or something a wallet
// adds on top ('ext'). It sits as a small dot label above the name.
export type Feature = { shot: string; kind?: 'phone' | 'hw' | 'browser'; title: string; body: string; tag?: 'core' | 'ext' }

const TAGS = { core: 'In PACE', ext: 'Wallet extension' }

export function Showcase({ items }: { items: Feature[] }) {
  return (
    <div className="showcase">
      {items.map((f) => {
        const s = SHOTS[f.shot]
        const kind = f.kind || 'phone'
        return (
          <article className="sc" key={f.title}>
            <a className={`sc-plate sc-${kind}`} href={s.src2x} target="_blank" rel="noreferrer" title="Open full size">
              <img
                src={s.src}
                srcSet={`${s.src} ${s.width}w, ${s.src2x} ${s.width * 2}w`}
                sizes="200px"
                width={s.width}
                height={s.height}
                alt=""
                loading="lazy"
              />
            </a>
            <span className="sc-frame" aria-hidden="true" />
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </article>
        )
      })}
    </div>
  )
}
