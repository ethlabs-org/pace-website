import { SHOTS } from './shots.gen'

// A screenshot of the interactive mockup, converted by scripts/shots-index.mjs. `id` is the
// file name in src/assets/shots. `kind` sets the frame: phone (narrow), browser (wide), hw (the Anchor device).
// `n` numbers the caption, for a Row that tells a story in steps.
const SIZES: Record<string, string> = {
  phone: '(max-width: 640px) 240px, 300px',
  browser: '(max-width: 640px) 100vw, 520px',
  hw: '(max-width: 640px) 100vw, 360px',
}

export function Shot({ id, kind = 'phone', caption, alt, n }: { id: string; kind?: 'phone' | 'browser' | 'hw'; caption?: string; alt?: string; n?: number }) {
  const s = SHOTS[id]
  if (!s) throw new Error(`No screenshot named ${id}. Add src/assets/shots/${id}.png, then run npm run shots:index.`)
  return (
    <figure className={`shot shot-${kind}`}>
      <a className="shot-zoom" href={s.src2x} target="_blank" rel="noreferrer" title="Open full size">
        <img
          src={s.src}
          srcSet={`${s.src} ${s.width}w, ${s.src2x} ${s.width * 2}w`}
          sizes={SIZES[kind]}
          width={s.width}
          height={s.height}
          alt={alt || caption || id}
          loading="lazy"
        />
      </a>
      {caption && (
        <figcaption>
          {n != null && <span className="shot-n">{String(n).padStart(2, '0')}</span>}
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// Two or three screenshots side by side on one stage. On phones they stack. `className="story"` lays three
// shots out as numbered steps in fixed columns.
export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className ? `row ${className}` : 'row'}>{children}</div>
}
