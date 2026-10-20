import type { ReactNode } from 'react'

// What app builders deal with today and with PACE, drawn in the same two panels as the Gap diagram. On the left
// every kind of account branches off into its own path, so the list hangs off a forked line in the Gap's red. On the
// right every step sits on one mint line. Text between backticks renders as code, and a standard's number such as
// ERC-7710 never breaks at its hyphen.
export type PathRow = { label: string; detail: string }
export type PathSide = { title: string; rows: PathRow[]; note: string }

const ids = (text: string, key: number): ReactNode[] =>
  text.split(/((?:EIP|ERC)-\d+)/).map((part, i) => (i % 2 ? <span className="nowrap" key={`${key}-${i}`}>{part}</span> : part))

const code = (text: string): ReactNode[] =>
  text.split('`').flatMap((part, i) => (i % 2 ? [<code key={i}>{part}</code>] : ids(part, i)))

function Panel({ side, kind }: { side: PathSide; kind: 'split' | 'shared' }) {
  return (
    <div className={`gap-panel ${kind}`}>
      <p className="gap-head"><span className="gap-dot" />{side.title}</p>
      <div className="gap-body">
        <ul className="paths-list">
          {side.rows.map((r) => (
            <li key={r.label}>
              <p className="paths-label">{r.label}</p>
              <p className="paths-detail">{code(r.detail)}</p>
            </li>
          ))}
        </ul>
      </div>
      <p className="gap-note">{side.note}</p>
    </div>
  )
}

export function Paths({ today, pace }: { today: PathSide; pace: PathSide }) {
  return (
    <div className="gap paths">
      <Panel side={today} kind="split" />
      <Panel side={pace} kind="shared" />
    </div>
  )
}
