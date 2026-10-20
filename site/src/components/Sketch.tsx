import type { ReactNode } from 'react'

// The landing's sketch layer.
//
// SketchDefs is a hidden SVG with the wobble filters the CSS points at (filter: url(#sk-a)). Each one warps whatever
// it is applied to with a low-frequency noise field, so a straight CSS border comes out like a line drawn by hand.
// sk-a and sk-b are the same wobble with different noise, so a box can carry two strokes that do not coincide, like
// pencil going round twice. sk-line and sk-vline are for one- or two-pixel lines: their filter region reaches far
// past the line's own thin box, or the wobble would be clipped flat. Mount it once, on the landing only; the CSS that
// uses these ids is scoped to the landing too, because a filter that points at a missing id hides the element in some
// browsers.
//
// Note is a handwritten margin note with a doodled arrow, placed absolutely by its className. It repeats something
// the page already says, so it is hidden from screen readers.
//
// GhostPhone is a wallet drawn only in construction lines, and TitleBlock the closing band's drawing title block
// (both below).
export function SketchDefs() {
  // One noise octave keeps the wobble smooth: a line bows gently instead of fraying. A line only moves across its
  // own direction (axis), because moving pixels along a thin line pulls it apart into dashes; the colour matrix pins
  // the other channel at .5, which the displacement map reads as "no shift".
  const wobble = (id: string, seed: number, freq: string, scale: number, region: { x: string; y: string; w: string; h: string }, axis?: 'x' | 'y') => (
    <filter id={id} x={region.x} y={region.y} width={region.w} height={region.h} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={1} seed={seed} result="n" />
      <feColorMatrix
        in="n"
        type="matrix"
        values={axis === 'y' ? '0 0 0 0 .5 0 1 0 0 0 0 0 0 0 0 0 0 0 0 1' : axis === 'x' ? '1 0 0 0 0 0 0 0 0 .5 0 0 0 0 0 0 0 0 0 1' : '1 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 1'}
        result="m"
      />
      <feDisplacementMap in="SourceGraphic" in2="m" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  )
  const box = { x: '-8%', y: '-8%', w: '116%', h: '116%' }
  return (
    <svg className="sketch-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {wobble('sk-a', 3, '0.014', 5, box)}
        {wobble('sk-b', 17, '0.018', 5, box)}
        {wobble('sk-line', 8, '0.006', 6, { x: '-1%', y: '-700%', w: '102%', h: '1500%' }, 'y')}
        {wobble('sk-vline', 12, '0.02', 4, { x: '-700%', y: '-4%', w: '1500%', h: '108%' }, 'x')}
        {/* Small circles, like the roadmap's balloons: a finer noise, or a 28px ring just shifts whole. */}
        {wobble('sk-c', 5, '0.06', 3, { x: '-30%', y: '-30%', w: '160%', h: '160%' })}
      </defs>
    </svg>
  )
}

// Arrows are drawn in the box they sit in; the tip is the end of the first stroke, the two short strokes are the
// head. Each variant says which way the tip points.
const ARROWS = {
  'down-left': { box: '0 0 72 56', d: 'M66 6C52 8 38 16 28 30C21 40 15 47 8 50M8 50l3.5-11M8 50l11.5 0.5' },
  'down-right': { box: '0 0 72 56', d: 'M6 6C20 8 34 16 44 30C51 40 57 47 64 50M64 50l-3.5-11M64 50l-11.5 0.5' },
  'up-right': { box: '0 0 72 56', d: 'M6 50C20 48 34 40 44 26C51 16 57 9 64 6M64 6l-3.5 11M64 6l-11.5-0.5' },
  down: { box: '0 0 40 56', d: 'M26 4C36 18 10 24 17 48M17 48l-7-8.5M17 48l8.5-7' },
  left: { box: '0 0 76 40', d: 'M72 26C58 10 32 32 8 18M8 18l9.5-5M8 18l7 8.5' },
  right: { box: '0 0 76 40', d: 'M4 26C18 10 44 32 68 18M68 18l-9.5-5M68 18l-7 8.5' },
}
export type Arrow = keyof typeof ARROWS

export function Note({ children, arrow, className = '' }: { children: ReactNode; arrow: Arrow; className?: string }) {
  const a = ARROWS[arrow]
  return (
    <span className={`note note-${arrow} ${className}`} aria-hidden="true">
      <span className="note-text">{children}</span>
      <svg className="note-arrow" viewBox={a.box}><path d={a.d} /></svg>
    </span>
  )
}

// A phone that has not been built yet: the outline of a wallet drawn in construction lines, with placeholder blocks
// where its screen would be, and a centre line through it. It stands on the hero stage next to the real captures,
// the place a next wallet would take. Same proportions as the phone captures (426 x 880). Decoration only.
export function GhostPhone({ className = '' }: { className?: string }) {
  return (
    <svg className={`ghost-phone ${className}`} viewBox="0 0 426 880" aria-hidden="true" focusable="false">
      <rect className="gh-body" x="1" y="1" width="424" height="878" rx="46" />
      <rect className="gh-screen" x="18" y="18" width="390" height="844" rx="32" />
      <rect className="gh-solid" x="158" y="34" width="110" height="30" rx="15" />
      <circle className="gh-part" cx="58" cy="124" r="16" />
      <path className="gh-part" d="M88 116h120M88 134h72" />
      <path className="gh-part" d="M40 196h312M40 222h220" />
      <rect className="gh-part" x="40" y="262" width="346" height="232" rx="18" />
      <circle className="gh-part" cx="74" cy="306" r="12" /><path className="gh-part" d="M100 300h150M100 314h90M300 306h60" />
      <circle className="gh-part" cx="74" cy="378" r="12" /><path className="gh-part" d="M100 372h130M100 386h110M300 378h60" />
      <circle className="gh-part" cx="74" cy="450" r="12" /><path className="gh-part" d="M100 444h160M100 458h70M300 450h60" />
      <path className="gh-part" d="M40 540h346M40 566h260M40 592h300" />
      <rect className="gh-part" x="40" y="752" width="346" height="56" rx="28" />
      <path className="gh-solid" d="M163 842h100" />
      <path className="gh-axis" d="M213 -36V916" />
    </svg>
  )
}

// The title block in the corner of a drawing sheet: what the drawing is, its status and who drew it. A row with
// `open` instead of a value is a field nobody has filled in yet; it shows an empty ruled line with the `open` text
// handwritten on it. `stamp` is a rubber stamp pressed over the block's corner.
export type TitleRow = { label: string; value?: ReactNode; open?: string }

export function TitleBlock({ rows, stamp }: { rows: TitleRow[]; stamp?: string }) {
  return (
    <div className="tblock">
      <dl>
        {rows.map((r) => (
          <div className={r.open ? 'tb-row tb-open' : 'tb-row'} key={r.label}>
            <dt>{r.label}</dt>
            <dd>{r.open ? <span className="tb-hand">{r.open}</span> : r.value}</dd>
          </div>
        ))}
      </dl>
      {stamp && <span className="tb-stamp" aria-hidden="true">{stamp}</span>}
    </div>
  )
}
