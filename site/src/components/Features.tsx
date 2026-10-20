// Goal cells for the landing page: a title, two or three lines, and the standards the goal rests on. Each cell is
// a link to the docs page that explains it. No icons: the grid is ruled like a table, and the title does the work
// an icon chip used to do.
export type Feature = { title: string; body: string; id: string; to: string }

export function Features({ items }: { items: Feature[] }) {
  return (
    <div className="features">
      {items.map((f) => (
        <a className="feature" href={f.to} key={f.title}>
          <h3>
            {f.title}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M5 12h14m-6-6l6 6l-6 6" /></svg>
          </h3>
          <p>{f.body}</p>
          <span className="feature-id">{f.id}</span>
        </a>
      ))}
    </div>
  )
}
