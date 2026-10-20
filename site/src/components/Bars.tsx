// Horizontal bars, one per row, with the value printed at the end. `scale: 'log'` keeps tiny and huge values on one
// chart; the label says so. `soft` rows are drawn in the lighter tint (for a "not yet" or "target" value).
export type BarRow = { label: string; value: number; display?: string; sub?: string; soft?: boolean }

export function Bars({ title, rows, scale = 'linear', unit, note }: { title?: string; rows: BarRow[]; scale?: 'linear' | 'log'; unit?: string; note?: string }) {
  const vals = rows.map((r) => r.value)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const pct = (v: number) => {
    if (scale === 'log') {
      const lo = Math.log10(Math.max(1, min) / 2)
      return Math.max(2, ((Math.log10(Math.max(1, v)) - lo) / (Math.log10(max) - lo)) * 100)
    }
    return Math.max(1, (v / max) * 100)
  }
  const show = (r: BarRow) => r.display ?? `${r.value.toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`
  return (
    <div className="chart">
      {title && <p className="chart-title">{title}{scale === 'log' ? ' · log scale' : ''}</p>}
      {/* A list, not a table. The row wrapper uses display:contents so the three cells land in the parent grid,
          and display:contents removes the element from the accessibility tree in several screen readers, which
          took the ARIA table roles with it. Each row carries its own label and value as plain text instead. */}
      <ul className="bars" aria-label={title}>
        {rows.map((r) => (
          <li key={r.label} style={{ display: 'contents' }}>
            <span className="bar-label">{r.label}</span>
            <span className="bar-track" aria-hidden="true"><span className={`bar-fill${r.soft ? ' soft' : ''}`} style={{ width: `${pct(r.value)}%` }} /></span>
            <span className="bar-value">{show(r)}</span>
            {r.sub && <span className="bar-sub">{r.sub}</span>}
          </li>
        ))}
      </ul>
      {note && <p className="chart-note">{note}</p>}
    </div>
  )
}
