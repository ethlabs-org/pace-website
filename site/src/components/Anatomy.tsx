// What one transaction from this account actually does, in order, split at the moment it leaves the wallet.
// Plain words in the step, the frame or the standard it maps to in the tag under it, so a reader can skip
// either half. The numbers run across both phases, so step 10 can point back at step 3. They are padded to two
// digits so the titles in both columns start on the same vertical line.
export type Step = { title: string; body: string; tag: string }
export type Phase = { label: string; note: string; tint: 'mint' | 'sky'; steps: Step[] }

export function Anatomy({ phases }: { phases: Phase[] }) {
  let n = 0
  const numbered = phases.map((p) => ({ ...p, steps: p.steps.map((s) => ({ ...s, n: ++n })) }))
  return (
    <div className="anat">
      {numbered.map((p) => (
        <section className={`anat-phase tint-${p.tint}`} key={p.label}>
          <h3>{p.label}</h3>
          <p className="anat-note">{p.note}</p>
          <ol className="anat-list">
            {p.steps.map((s) => (
              <li className="anat-step" key={s.title}>
                <span className="anat-n">{String(s.n).padStart(2, '0')}</span>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
                <span className="anat-tag">{s.tag}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
