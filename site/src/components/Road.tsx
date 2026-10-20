// The road to Hegotá, drawn as a detail on a drawing sheet. One rail runs through a numbered balloon per milestone,
// and each milestone's text hangs off its balloon on a leader line, above and below the rail in turn, so every step
// gets two columns of room. Done is a filled balloon, the step in progress is ringed, and everything after is drawn
// in blue pencil, so where the work stands is visible before anything is read. A strip across the top of the sheet
// carries the title and the legend. On a narrow sheet the rail turns vertical: balloons down the left, text
// beside them. When the sheet scrolls in, the rail draws across, each balloon lands in turn and its leader grows out
// of it (the stagger index comes from Reveal.client.tsx).
import type { CSSProperties } from 'react'
import { Note } from './Sketch'

// A milestone can carry a handwritten note by its balloon (the current one says where the work stands).
export type Milestone = { status: 'done' | 'now' | 'next'; when: string; title: string; body: string; note?: string }

export function Road({ steps, title }: { steps: Milestone[]; title: string }) {
  // The rail is inked up to the first step that is not done.
  const open = steps.findIndex((s) => s.status !== 'done')
  const vars = { '--n': steps.length, '--cols': steps.length + 1, '--reached': open < 0 ? steps.length - 1 : open }
  return (
    <figure className="road-sheet">
      <figcaption className="road-head">
        <span className="road-title">{title}</span>
        <span className="road-key" aria-hidden="true">
          <span className="done">Done</span>
          <span className="now">In progress</span>
          <span className="next">Planned</span>
        </span>
      </figcaption>
      <ol className="road" style={vars as CSSProperties}>
        {steps.map((s, i) => (
          <li
            className={`road-step ${s.status} ${i % 2 ? 'below' : 'above'}`}
            style={{ '--col': i + 1 } as CSSProperties}
            key={s.title}
          >
            <span className="road-dot" aria-hidden="true">{i + 1}</span>
            {s.note && <Note arrow="up-right" className="road-note">{s.note}</Note>}
            <p className="road-when">{s.when}</p>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </figure>
  )
}
