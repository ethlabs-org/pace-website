// Three attempts at a new kind of account on one rail: when, which standard, what it did, and what happened to accounts.
// The last one is the one still open, so it is drawn as the live card: tinted, with a "This time" label.
export type Era = { when: string; id: string; title: string; body: string; current?: boolean }

export function Eras({ items }: { items: Era[] }) {
  return (
    <ol className="eras">
      {items.map((e) => (
        <li className={e.current ? 'era current' : 'era'} key={e.id}>
          <span className="era-dot" aria-hidden="true" />
          <p className="era-when">
            {e.when} <span>{e.id}</span>
            {e.current && <em>This time</em>}
          </p>
          <h3>{e.title}</h3>
          <p>{e.body}</p>
        </li>
      ))}
    </ol>
  )
}
