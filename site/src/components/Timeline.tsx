// A dated timeline as SVG: one axis from `from` to `to`, a dot per event, labels alternating above and below.
// Dates are ISO strings (YYYY-MM-DD or YYYY-MM or YYYY). `kind`: done (default), next (expected), fork, today.
export type TimelineEvent = { date: string; label: string; kind?: 'done' | 'next' | 'fork' | 'today' }

function toTime(d: string) {
  const [y, m = '1', day = '1'] = d.split('-')
  return Date.UTC(Number(y), Number(m) - 1, Number(day))
}
function fmt(d: string) {
  const parts = d.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${months[Number(parts[1]) - 1]} ${parts[0]}`
  return `${Number(parts[2])} ${months[Number(parts[1]) - 1]} ${parts[0]}`
}

export function Timeline({ title, events, from, to, today, note }: { title?: string; events: TimelineEvent[]; from: string; to: string; today?: string; note?: string }) {
  const W = 960, L = 28, R = 28
  const t0 = toTime(from), t1 = toTime(to)
  const x = (d: string) => L + ((toTime(d) - t0) / (t1 - t0)) * (W - L - R)
  const years: number[] = []
  for (let y = new Date(t0).getUTCFullYear(); y <= new Date(t1).getUTCFullYear(); y++) years.push(y)
  const sorted = [...events].sort((a, b) => toTime(a.date) - toTime(b.date))
  // Label placement: lanes alternate above and below the axis and move outward. A label takes the first lane
  // whose previous label ends before this one starts (widths estimated from the text length).
  // CH overestimates on purpose. Underestimating the width pushes a long label past the viewBox edge, where the
  // scroll container clips it, so err wide.
  const CH = 7.1, GAP = 14
  const laneEnd: number[] = []
  const placed = sorted.map((e) => {
    const xx = x(e.date)
    const w = Math.max(e.label.length, fmt(e.date).length) * CH
    const anchor = xx < L + w / 2 ? 'start' : xx > W - R - w / 2 ? 'end' : 'middle'
    // The label hangs off its own anchor point, so clamp that point to keep the whole label inside the viewBox.
    const lead = anchor === 'start' ? 0 : anchor === 'end' ? w : w / 2
    const tx = Math.min(Math.max(xx, lead), W - (w - lead))
    const x0 = tx - lead
    let lane = 0
    while (laneEnd[lane] != null && laneEnd[lane] + GAP > x0) lane++
    laneEnd[lane] = x0 + w
    return { ...e, xx, tx, anchor, lane }
  })
  const maxLane = Math.max(...placed.map((p) => p.lane))
  const tiers = Math.floor(maxLane / 2) + 1 // lanes 0,2,4… go above; 1,3,5… go below
  const STEP = 34
  const Y = 24 + tiers * STEP
  const H = Y + tiers * STEP + 40
  const xToday = today ? x(today) : null
  return (
    <div className="chart">
      {title && <p className="chart-title">{title}</p>}
      <div className="timeline">
        {/* The SVG is one image to a screen reader, so the events have to be readable as text somewhere. The
            list below is visually hidden and carries the same dates and labels in order. */}
        <ul className="sr-only">
          {sorted.map((e) => (
            <li key={e.date + e.label}>{fmt(e.date)}: {e.label}{e.kind === 'next' ? ' (expected)' : ''}</li>
          ))}
        </ul>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title || 'Timeline'}: ${sorted.map((e) => `${fmt(e.date)} ${e.label}`).join(', ')}`}>
          {xToday != null ? (
            <>
              <line className="axis" x1={L} x2={xToday} y1={Y} y2={Y} />
              <line className="axis-future" x1={xToday} x2={W - R} y1={Y} y2={Y} />
            </>
          ) : (
            <line className="axis" x1={L} x2={W - R} y1={Y} y2={Y} />
          )}
          {years.map((y) => {
            const xx = x(String(y))
            if (xx < L || xx > W - R) return null
            return (
              <g key={y}>
                <line className="tick" x1={xx} x2={xx} y1={Y - 6} y2={Y + 6} />
                <text className="year" x={xx} y={H - 12} textAnchor="middle">{y}</text>
              </g>
            )
          })}
          {placed.map((e) => {
            const up = e.lane % 2 === 0
            const tier = Math.floor(e.lane / 2)
            const ly = up ? Y - 22 - tier * STEP : Y + 34 + tier * STEP
            return (
              <g key={e.date + e.label}>
                <line className="stem" x1={e.xx} x2={e.xx} y1={Y} y2={up ? ly + 6 : ly - 20} />
                <circle className={`dot ${e.kind || ''}`} cx={e.xx} cy={Y} r={6} />
                <text className="label" x={e.tx} y={up ? ly - 8 : ly - 6} textAnchor={e.anchor}>{e.label}</text>
                <text className="date" x={e.tx} y={up ? ly + 4 : ly + 8} textAnchor={e.anchor}>{fmt(e.date)}</text>
              </g>
            )
          })}
        </svg>
      </div>
      {note && <p className="chart-note">{note}</p>}
    </div>
  )
}
