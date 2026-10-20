import type { CSSProperties } from 'react'

// `Todo` is drawn as a sheet, like the roadmap: a strip on top with the title and the legend, then one ruled layer
// per place the change lands, from what apps and devices read down to the protocol. Each layer has its name and a
// short caption in a label column, and one cell per item. The landing keeps each item to its title and who makes the
// change; the docs page it links to has the detail. A dot in front of the title says who builds it: filled for work
// we build ourselves, ringed in blue pencil for work another team ships and we push for. `who` sits under the title in small mono, and `hand` is an
// optional handwritten status line, used only for facts we can point at.
export type Task = { title: string; who: string; ours?: boolean; hand?: string }
export type Layer = { label: string; caption: string; items: Task[] }

export function Todo({ title, layers }: { title: string; layers: Layer[] }) {
  const cols = Math.max(3, ...layers.map((l) => l.items.length))
  return (
    <figure className="work-sheet" style={{ '--cols': cols } as CSSProperties}>
      <figcaption className="work-head">
        <span>{title}</span>
        <span className="work-key" aria-hidden="true">
          <span className="ours">We build it</span>
          <span className="push">Another team ships it, we push</span>
        </span>
      </figcaption>
      <div className="work-layers">
        {layers.map((l) => (
          <section className="work-band" key={l.label}>
            <header className="work-label">
              <p className="work-name">{l.label}</p>
              <p className="work-caption">{l.caption}</p>
            </header>
            <ol className="work-cells" style={{ '--n': l.items.length } as CSSProperties}>
              {l.items.map((t) => (
                <li className={t.ours ? 'ours' : 'push'} key={t.title}>
                  <h3><span className="work-ball" aria-hidden="true" />{t.title}</h3>
                  {t.hand && <p className="work-hand">{t.hand}</p>}
                  <p className="work-who">{t.who}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </figure>
  )
}
