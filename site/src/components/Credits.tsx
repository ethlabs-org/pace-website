// Acknowledgements under the hero: a centred title, then the two standards everything rests on as a fixed row, then
// a thin band with the rest that runs the width of the screen and slides sideways forever. Both use the same item:
// the name and number on top and the authors under them, left-aligned so the lines move as one. The band's list is
// drawn twice, side by side, and the track slides left by exactly one copy, so the loop has no seam. It pauses on
// hover so a name can be read; with reduced motion it stands still and scrolls by hand instead.
//
// Authors are set short: a first and last name becomes an initial and the last name (V. Buterin), a single handle
// stays as it is (lightclient). A list that is still long after that is split into two lines of about equal length.
// The full names stay in the source and in the tooltip.
import { Note } from './Sketch'

export type Credit = { name: string; id: string; authors: string }

const LONG = 60   // characters; a shortened list longer than this goes on two lines

const short = (name: string) => {
  const parts = name.trim().split(/\s+/)
  // A no-break space ties the initial to the last name, so a wrap never splits one person.
  return parts.length > 1 ? `${parts[0][0]}.\u00a0${parts.slice(1).join('\u00a0')}` : parts[0]
}

// Split a list of names into two lines whose lengths are as close as possible.
function lines(authors: string): string[] {
  const names = authors.split(',').map(short)
  const text = names.join(', ')
  if (text.length <= LONG || names.length < 2) return [text]
  let best = 1, diff = Infinity
  for (let k = 1; k < names.length; k++) {
    const d = Math.abs(names.slice(0, k).join(', ').length - names.slice(k).join(', ').length)
    if (d < diff) { diff = d; best = k }
  }
  return [names.slice(0, best).join(', ') + ',', names.slice(best).join(', ')]
}

// `note` is a handwritten aside beside the title.
export function Credits({ title, core, items, note }: { title: string; core: Credit[]; items: Credit[]; note?: string }) {
  const item = (c: Credit) => (
    <li key={c.id}>
      <p>{c.name}<span>{c.id}</span></p>
      <p title={c.authors}>{lines(c.authors).map((l) => <span className="credits-line" key={l}>{l}</span>)}</p>
    </li>
  )
  const list = (copy: boolean) => (
    <ul className="credits-list" aria-hidden={copy || undefined}>{items.map(item)}</ul>
  )
  return (
    <div className="credits" data-noterms>
      <div className="credits-head">
        <h2>{title}</h2>
        {note && <Note arrow="left" className="credits-note">{note}</Note>}
      </div>
      <ul className="credits-list credits-fixed">{core.map(item)}</ul>
      <div className="credits-band" role="region" aria-label={title}>
        <div className="credits-track">
          {list(false)}
          {list(true)}
        </div>
      </div>
    </div>
  )
}
