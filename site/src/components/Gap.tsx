// Why PACE has to exist, drawn as the two ways Hegotá can go. Both panels have the same three rows: the
// wallets, the accounts they ship, and the apps, hardware wallets and explorers that have to support those
// accounts. On the left each wallet ships its own account, so every consumer is wired to every account and the
// wires cross. On the right the wallets share one account and each consumer is wired to it once. A line under each
// panel says what that means. `Risks` is the list under the diagram: what the left panel costs, one entry per group.
//
// The motion carries the same point. Short pulses run down the wires: on the right all three move in step, on the
// left each crossing wire runs on its own clock, so the tangle looks busy. The three accounts on the left each get
// their own tint and shape, so they read as three different things. Icons are Lucide paths inlined.
import type { CSSProperties } from 'react'

const ICONS = {
  wallet: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  apps: 'M4 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM15 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM15 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1ZM4 14h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z',
  device: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM7 8h10v5H7ZM9 16.5h.01M15 16.5h.01',
  search: 'M11 3a8 8 0 1 0 0 16a8 8 0 1 0 0-16M21 21l-4.3-4.3',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  shieldAlert: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM12 8v4M12 16h.01',
}
type Icon = keyof typeof ICONS

function Glyph({ name, className }: { name: Icon; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d={ICONS[name]} />
    </svg>
  )
}

type Side = { title: string; note: string }
type Node = { name: string; icon: Icon }

// One shape and one tint per account on the left, so the three read as three different things.
const SHAPES = [
  <circle key="c" cx="8" cy="8" r="5.25" />,
  <rect key="s" x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" />,
  <path key="t" d="M8 2.5L13.75 13.25H2.25Z" />,
]
const TINTS = ['sky', 'sand', 'lilac']

const cols = (n: number) => ({ '--n': n }) as CSSProperties

// Straight wires, one per column centre. The dot marks the end that touches the shared account. A tall run is as
// high as the tangle, so the bottom rows of the two panels line up side by side, and it carries the pulses.
function Wires({ n, dot, tall }: { n: number; dot?: 'start' | 'end'; tall?: boolean }) {
  const cls = ['gap-wires', dot && `dot-${dot}`, tall && 'tall'].filter(Boolean).join(' ')
  return (
    <div className={cls} style={cols(n)} aria-hidden="true">
      {Array.from({ length: n }, (_, k) => <i key={k}>{tall && <b className="gap-pulse" />}</i>)}
    </div>
  )
}

// Every column above wired to every column below. The SVG stretches to the row, so the strokes do not scale. On top,
// one small spark per wire runs from its account down to the row below, each on its own clock. A spark is a box the
// size of the whole tangle with the dot at the wire's top end; the box slides by the wire's run (--dx, as a share of
// the width) and the full height, so the dot follows the wire. Sliding a box is a transform, which the browser runs on
// the GPU; the first version animated each wire's dash offset, which repainted the tangle on every frame.
function Tangle({ from, to }: { from: number; to: number }) {
  const x = (i: number, n: number) => ((i + 0.5) / n) * 100
  const wires = Array.from({ length: from }, (_, i) => Array.from({ length: to }, (_, j) => [i, j])).flat()
  return (
    <div className="gap-tangle-wrap" aria-hidden="true">
      <svg className="gap-tangle" viewBox="0 0 100 100" preserveAspectRatio="none">
        {wires.map(([i, j]) => (
          <line key={`w${i}${j}`} x1={x(i, from)} y1="0" x2={x(j, to)} y2="100" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {wires.map(([i, j], k) => (
        <span
          key={`s${i}${j}`}
          className="gap-spark"
          style={{
            '--x': `${x(i, from).toFixed(2)}%`,
            '--dx': `${(x(j, to) - x(i, from)).toFixed(2)}%`,
            animationDelay: `${((k * 0.73) % 2.9).toFixed(2)}s`,
            animationDuration: `${(2.6 + ((k * 0.41) % 1.4)).toFixed(2)}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

function NodeRow({ items, className }: { items: Node[]; className?: string }) {
  return (
    <ul className="gap-row" style={cols(items.length)}>
      {items.map((w) => (
        <li className={className ? `gap-node ${className}` : 'gap-node'} key={w.name}>
          <Glyph name={w.icon} className="gap-icon" />
          <span>{w.name}</span>
        </li>
      ))}
    </ul>
  )
}

export function Gap({ wallets, accounts, consumers, split, shared }: {
  wallets: string[]
  accounts: string[]
  consumers: Node[]
  split: Side
  shared: Side & { account: string }
}) {
  const n = wallets.length
  const m = consumers.length
  const walletRow = <NodeRow items={wallets.map((name) => ({ name, icon: 'wallet' as Icon }))} />
  const consumerRow = <NodeRow items={consumers} className="use" />

  return (
    <div className="gap">
      <div className="gap-panel split">
        <p className="gap-head"><span className="gap-dot" />{split.title}</p>
        <div className="gap-body">
          {walletRow}
          <Wires n={n} />
          <ul className="gap-row" style={cols(n)}>
            {accounts.map((a, i) => (
              <li className={`gap-node acct tint-${TINTS[i % TINTS.length]}`} key={a}>
                <svg className="gap-glyph" viewBox="0 0 16 16" aria-hidden="true">{SHAPES[i % SHAPES.length]}</svg>
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <Tangle from={n} to={m} />
          {consumerRow}
        </div>
        <p className="gap-note">{split.note}</p>
      </div>
      <div className="gap-panel shared">
        <p className="gap-head"><span className="gap-dot" />{shared.title}</p>
        <div className="gap-body">
          {walletRow}
          <Wires n={n} dot="end" />
          <p className="gap-shared">
            <img className="gap-eth" src="/eth-diamond.png" width="800" height="1303" alt="" />
            {shared.account}
          </p>
          <Wires n={m} dot="start" tall />
          {consumerRow}
        </div>
        <p className="gap-note">{shared.note}</p>
      </div>
    </div>
  )
}

export type Risk = { who: string; icon: Icon; title: string; body: string }

export function Risks({ items }: { items: Risk[] }) {
  return (
    <ul className="risks">
      {items.map((r) => (
        <li key={r.who}>
          <p className="risk-who"><Glyph name={r.icon} className="risk-icon" />{r.who}</p>
          <h3>{r.title}</h3>
          <p>{r.body}</p>
        </li>
      ))}
    </ul>
  )
}
