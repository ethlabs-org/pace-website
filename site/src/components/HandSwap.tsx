import { HandSwapLoop } from './HandSwapLoop.client'

// The swapping word in the hero headline. The first word stands in the hand with a marker underline. After a few
// seconds an eraser rubs it out and a pencil writes the next word in its place, and so on round the list. The rest of
// the headline never moves: all the words sit in one grid cell, so the slot is always as wide as the longest word,
// and a shorter word is centred in it.
//
// Each swap is one step of CSS animations on transform and opacity, which the browser runs off the main thread. The
// slot's data-step picks the step; HandSwapLoop.client.tsx moves it on after a pause in which nothing runs. The
// keyframes are built below from a timeline in seconds and go on the page in one <style> tag. Every animation in a
// step lasts the whole step and holds its end state, and each step starts from the state the one before ended in.
// The page opens on step "intro", where the pencil draws the first word's underline.
//
// Writing. Each word sits in a clip box whose right edge is soft (a mask). The box starts one box width to the left,
// and the word inside it one width to the right, so the word stays put while the box's edge slides across it. The
// ink shows up letter by letter at a pace set by each letter's width, with a short lift between letters. A pencil
// rides the edge. It goes up for tall letters and down for tails. When the word is done it goes back to the start
// and draws the underline, which is revealed the same way.
//
// Erasing. An eraser scrubs across in short strokes, one long stroke forward and a shorter one back. Each letter
// fades by how long the eraser has covered it, so letters go patchy before they go, and a faint trace stays until
// the next word is written over it. The underline is cut away behind the eraser, and a few crumbs fall off.
//
// Screen readers get the first word only (the visible slot is aria-hidden). Reduced motion shows the first word,
// still. Off screen, the animations pause with the rest of the hero (data-offscreen, set by Reveal.client.tsx).

const WORDS = ['Post-Quantum', 'Private']

// Caveat Variable at weight 600: each character's advance width in em, measured in the browser.
const ADV: Record<string, number> = {
  '-': .33, A: .51, B: .52, C: .48, D: .58, E: .53, F: .46, G: .49, H: .57, I: .41, J: .31, K: .5, L: .43, M: .73,
  N: .61, O: .5, P: .47, Q: .5, R: .54, S: .49, T: .46, U: .48, V: .49, W: .72, X: .52, Y: .5, Z: .52, a: .44,
  b: .44, c: .36, d: .4, e: .33, f: .3, g: .36, h: .47, i: .19, j: .21, k: .37, l: .18, m: .57, n: .46, o: .36,
  p: .38, q: .38, r: .36, s: .35, t: .33, u: .37, v: .33, w: .52, x: .34, y: .34, z: .32,
}
const TALL = /[A-Zbdfhklt]/
const TAIL = /[gjpqy]/

// Timeline, in seconds.
const HOLD = 3.6     // the finished word stands (the pause between steps)
const LAND = .14     // the eraser drops onto the word
const STROKE = .08   // one eraser stroke
const GAP = .35      // after the eraser leaves, before the pencil starts
const LIFT = .018    // the pencil lifts between letters
const LEAD = .25     // the pencil goes back to the start of the word before it underlines
const UL = .45       // the underline stroke
const OUT = .2       // the pencil lifts away
const PACE = [1, 1.15, .9, 1.05, .85, 1.2, .95, 1.1] // per-letter writing speed, so the hand does not run like a machine

// Geometry, in em of the hand. These must match the .hs-* rules in _root.css.
const PAD_L = .1     // the clip box reaches this far left of the word
const PAD_R = .45    // and this far right, which holds the soft edge
const EDGE = .35     // the soft edge
const RUB = .4       // half the eraser's width
const FWD = 1.5      // eraser stroke forward
const BACK = .75     // eraser stroke back
const TRACE = .04    // how much of a letter the eraser leaves behind
const UL_Y = .16     // the underline, below the baseline

type Pt = { t: number; v: number[]; jump?: boolean }

function layout(text: string) {
  const chars = [...text]
  const x = [0]
  for (const c of chars) x.push(x[x.length - 1] + (ADV[c] ?? .4))
  const W = x[chars.length]
  const Wc = W + PAD_L + PAD_R

  // When each letter is written, from the start of writing.
  const letters: [number, number][] = []
  let t = .04
  chars.forEach((c, j) => {
    const d = (.05 + (ADV[c] ?? .4) * .14) * PACE[j % PACE.length]
    letters.push([t, t + d])
    t += d + LIFT
  })
  const writeDur = t - LIFT + .08

  // The eraser's path: where its centre is at the end of each stroke, from the start of erasing. It lands on the
  // first letters, rubs back over the start, works across, and rubs back over the end once more.
  const end = W + RUB * .75
  const path = [RUB * .6, -RUB * .75]
  for (let e = -RUB * .75; e < end; ) {
    e = Math.min(e + FWD, end)
    path.push(e)
    if (e < end) path.push((e -= BACK))
  }
  path.push(end - BACK * .8, end)
  const strokes = path.map((e, s) => ({ t: s * STROKE, e }))
  const eraseDur = strokes[strokes.length - 1].t

  // How much of each letter is left at the end of each stroke. A letter fades by how long the eraser covers it.
  const eAt = (t: number) => {
    const k = strokes.findIndex((s) => s.t >= t)
    if (k <= 0) return strokes[0].e
    const a = strokes[k - 1], b = strokes[k]
    return a.e + (b.e - a.e) * (t - a.t) / (b.t - a.t)
  }
  const rub = chars.map((_, j) => {
    const lo = x[j], hi = x[j + 1]
    let o = 1
    const out = [1]
    for (let k = 1; k < strokes.length; k++) {
      for (let s = strokes[k - 1].t; s < strokes[k].t; s += .005) {
        const e = eAt(s + .0025)
        const cover = Math.max(0, Math.min(hi, e + RUB) - Math.max(lo, e - RUB)) / (hi - lo)
        o *= Math.exp(-50 * cover * .005)
      }
      out.push(k === strokes.length - 1 ? TRACE : TRACE + (1 - TRACE) * o)
    }
    return out
  })

  // A few crumbs, shed at some of the strokes.
  const crumbs = [.2, .45, .65, .9].map((f, k) => {
    const hit = strokes[Math.max(1, Math.round(f * (strokes.length - 1)))]
    return { t: hit.t, left: Math.max(0, Math.min(1, hit.e / W)) * 100, dx: k % 2 ? .12 : -.1 }
  })

  // The clip box's progress when the soft edge's midpoint is at x.
  const pX = (x: number) => (x + PAD_L + EDGE / 2) / Wc

  return { text, chars, x, W, Wc, pX, letters, writeDur, strokes, eraseDur, rub, crumbs }
}

type Word = ReturnType<typeof layout>

const r = (n: number, d = 3) => +n.toFixed(d)
const ease = (u: number) => 1 - (1 - u) ** 1.6
const tx = (v: number[]) => `transform:translateX(${r(v[0], 2)}%)`

// Keyframes for one step of D seconds. The points are in time order; the value holds before the first and after the
// last, and moves in a straight line between them (the animations run linear). A point marked jump holds its value
// until the next point and then snaps to it.
function keyframes(name: string, D: number, pts: Pt[], fmt: (v: number[]) => string) {
  const all = [...pts]
  if (all[0].t > 0) all.unshift({ t: 0, v: all[0].v })
  if (all[all.length - 1].t < D) all.push({ t: D, v: all[all.length - 1].v })
  // Drop points that sit on the straight line between their neighbours.
  const lean = all.filter((p, i) => {
    if (i === 0 || i === all.length - 1 || p.jump || all[i - 1].jump) return true
    const a = all[i - 1], b = all[i + 1]
    if (b.t === a.t) return false
    return p.v.some((v, n) => Math.abs(a.v[n] + (b.v[n] - a.v[n]) * (p.t - a.t) / (b.t - a.t) - v) > .002)
  })
  const body = lean
    .map((p) => `${r(p.t / D * 100)}%{${fmt(p.v)}${p.jump ? ';animation-timing-function:step-end' : ''}}`)
    .join('')
  return `@keyframes ${name}{${body}}`
}

// One step's CSS: a keyframes block per animated part, and the rules that put them on the parts.
function step(id: string, D: number) {
  const css = [`@keyframes hsc${id}{0%{opacity:1}100%{opacity:1}}`, `.hand-swap[data-step="${id}"]{--hs-d:${r(D)}s;animation-name:hsc${id}}`]
  const add = (i: number, part: string, pts: Pt[], fmt: (v: number[]) => string) => {
    const name = `hs${id}w${i}${part.replace(/[^a-z0-9]/g, '')}`
    css.push(keyframes(name, D, pts, fmt), `.hand-swap[data-step="${id}"] .hs-w${i} ${part}{animation-name:${name}}`)
  }
  return { css, add }
}

// The pencil draws the underline from start to finish; `at` is when it starts.
function underline(at: number) {
  return [0, .25, .5, .75, 1].map((u) => ({ t: at + UL * u, p: ease(u) }))
}

// The pencil's height along the underline, then lifting away.
function tipOnLine(at: number): Pt[] {
  return [
    { t: at, v: [UL_Y, 1] },
    { t: at + UL / 2, v: [UL_Y + .03, 1] },
    { t: at + UL, v: [UL_Y, 1] },
    { t: at + UL + OUT, v: [UL_Y - .3, 0] },
  ]
}

const pen = (v: number[]) => `transform:translateY(${r(v[0])}em);opacity:${r(v[1])}`

// The page opens on this: the first word is written, and the pencil draws its underline.
function intro(w: Word) {
  const at = .3
  const D = at + UL + OUT + .05
  const { css, add } = step('intro', D)
  const line = underline(at)
  add(0, '.hs-ul', line.map(({ t, p }) => ({ t, v: [(p - 1) * 100] })), tx)
  add(0, '.hs-ul-ink', line.map(({ t, p }) => ({ t, v: [(1 - p) * 100] })), tx)
  add(0, '.hs-pen', line.map(({ t, p }) => ({ t, v: [p] })), (v) => tx([(v[0] - 1) * 100]))
  add(0, '.hs-pencil', [{ t: at - .16, v: [UL_Y - .3, 0] }, ...tipOnLine(at)], pen)
  return css
}

// Word i is rubbed out and word j written in its place.
function swap(id: string, i: number, a: Word, j: number, b: Word) {
  const es = LAND
  const ee = es + a.eraseDur
  const ws = ee + GAP
  const we = ws + b.writeDur
  const ul = we + LEAD
  const D = ul + UL + OUT + .05
  const { css, add } = step(id, D)

  // Word i. Its letters go by what the rubbing leaves, then a trace until word j is written, then the clip box hides
  // them and they come back whole, ready for next time.
  a.rub.forEach((o, k) => {
    const pts: Pt[] = a.strokes.map((s, n) => ({ t: es + s.t, v: [o[n]] }))
    pts.push({ t: ws, v: [TRACE] }, { t: we, v: [0] }, { t: we + .03, v: [0], jump: true }, { t: we + .05, v: [1] })
    add(i, `.hs-ink > :nth-child(${k + 1})`, pts, (v) => `opacity:${r(v[0])}`)
  })
  const hideA: Pt[] = [{ t: we, v: [1], jump: true }, { t: we + .02, v: [0] }]
  add(i, '.hs-clip', hideA, (v) => tx([(v[0] - 1) * 100]))
  add(i, '.hs-ink', hideA, (v) => tx([(1 - v[0]) * 100]))

  // Its underline is cut away from the left behind the eraser. In %: 0 shown, 100 hidden to the right, then -100
  // hidden to the left, where the next underline starts from.
  const cutAt = (e: number) => Math.max(0, Math.min(1, (e - RUB / 2 + PAD_L) / a.Wc)) * 100
  const cut: Pt[] = [{ t: es - .1, v: [0] }]
  let max = -Infinity
  a.strokes.forEach((s, k) => {
    if (s.e <= max) return
    const prev = a.strokes[k - 1]
    // The moment the eraser passes its furthest point so far, on the way to this one.
    if (prev && prev.e < max) cut.push({ t: es + prev.t + (s.t - prev.t) * (max - prev.e) / (s.e - prev.e), v: [cutAt(max)] })
    max = s.e
    cut.push({ t: es + s.t, v: [cutAt(max)] })
  })
  cut.push({ t: ee, v: [100] }, { t: ee + .1, v: [100], jump: true }, { t: ee + .12, v: [-100] })
  add(i, '.hs-ul', cut, tx)
  add(i, '.hs-ul-ink', cut, (v) => tx([-v[0]]))

  // The eraser's track: its centre, as a share of the word's width. The eraser itself drops in, rocks with each
  // stroke, and lifts away.
  const first = a.strokes[0].e, last = a.strokes[a.strokes.length - 1].e
  add(i, '.hs-er', [{ t: 0, v: [first] }, ...a.strokes.map((s) => ({ t: es + s.t, v: [s.e] })), { t: ee + .16, v: [last] }], (v) => tx([v[0] / a.W * 100]))
  const rock: Pt[] = [{ t: 0, v: [-.4, -24, 0] }]
  a.strokes.forEach((s, k) => rock.push({ t: es + s.t, v: k === 0 ? [0, -12, 1] : k % 2 ? [.03, -15, 1] : [-.02, -9, 1] }))
  rock.push({ t: ee + .16, v: [-.4, -20, 0] })
  add(i, '.hs-eraser', rock, (v) => `transform:translateY(${r(v[0])}em) rotate(${r(v[1], 1)}deg);opacity:${r(v[2])}`)
  a.crumbs.forEach((c, k) => {
    const t0 = es + c.t
    add(i, `.hs-k${k}`, [{ t: t0 - .01, v: [0, 0, 0] }, { t: t0, v: [0, 0, 1] }, { t: t0 + .5, v: [c.dx, .5, 0] }], (v) => `transform:translate(${r(v[0])}em,${r(v[1])}em);opacity:${r(v[2])}`)
  })

  // Word j: written letter by letter, then underlined. The clip box's progress p runs from 0 (hidden) to 1.
  const write: Pt[] = [{ t: ws, v: [0] }, { t: ws + b.letters[0][0], v: [b.pX(0)] }]
  b.letters.forEach(([, end], k) => {
    write.push({ t: ws + end, v: [b.pX(b.x[k + 1])] })
    if (k < b.letters.length - 1) write.push({ t: ws + b.letters[k + 1][0], v: [b.pX(b.x[k + 1])] })
  })
  add(j, '.hs-clip', [...write, { t: we, v: [1] }], (v) => tx([(v[0] - 1) * 100]))
  add(j, '.hs-ink', [...write, { t: we, v: [1] }], (v) => tx([(1 - v[0]) * 100]))
  const line = underline(ul)
  add(j, '.hs-ul', line.map(({ t, p }) => ({ t, v: [(p - 1) * 100] })), tx)
  add(j, '.hs-ul-ink', line.map(({ t, p }) => ({ t, v: [(1 - p) * 100] })), tx)

  // The pencil's track moves like the clip box, so its tip sits on the edge of the ink; then it goes back and follows
  // the underline.
  const track: Pt[] = [{ t: ws - .16, v: [b.pX(0)] }, ...write.slice(1), { t: we, v: [b.pX(b.W)] }, ...line.map(({ t, p }) => ({ t, v: [p] }))]
  add(j, '.hs-pen', track, (v) => tx([(v[0] - 1) * 100]))
  const tip: Pt[] = [{ t: ws - .16, v: [-.35, 0] }, { t: ws + .02, v: [0, 1] }]
  b.letters.forEach(([s, e], k) => {
    const c = b.chars[k]
    const peak = c === '-' ? -.1 : TALL.test(c) ? -.3 : TAIL.test(c) ? .14 : -.14
    tip.push({ t: ws + s, v: [0, 1] }, { t: ws + (s + e) / 2, v: [peak, 1] }, { t: ws + e, v: [.02, 1] })
  })
  tip.push({ t: we, v: [0, 1] }, { t: (we + ul) / 2, v: [-.28, 1] }, ...tipOnLine(ul))
  add(j, '.hs-pencil', tip, pen)

  return css
}

const words = WORDS.map(layout)
const CSS = [
  ...intro(words[0]),
  ...words.flatMap((w, i) => swap(String(i), i, w, (i + 1) % words.length, words[(i + 1) % words.length])),
].join('\n')

// A pencil drawn at a slant, tip at the bottom-left corner of its box.
function Pencil() {
  return (
    <svg className="hs-pencil" viewBox="0 4 68 106" aria-hidden="true" focusable="false">
      <path className="hs-pc-cap" d="M48.97 15.75L54.12 7.17Q61.75 7.09 65.27 13.87L60.12 22.44Z" />
      <path className="hs-pc-band" d="M44.86 22.61L48.97 15.75L60.12 22.44L56 29.3Z" />
      <path className="hs-pc-body" d="M6.78 86.07L44.86 22.61L56 29.3L17.92 92.76Z" />
      <path className="hs-pc-facet" d="M10.46 88.29L48.54 24.83M14.24 90.55L52.32 27.09" />
      <path className="hs-pc-wood" d="M6.78 86.07L17.92 92.76L5.23 104.97L1.97 103.02Z" />
      <path className="hs-pc-lead" d="M1.97 103.02L5.23 104.97L0 110Z" />
    </svg>
  )
}

// A block eraser in a card sleeve, upright; the animation tilts it.
function Eraser() {
  return (
    <svg className="hs-eraser" viewBox="0 0 80 44" aria-hidden="true" focusable="false">
      <rect className="hs-er-rubber" x="2" y="2" width="76" height="40" rx="7" />
      <path className="hs-er-sleeve" d="M28 2H71A7 7 0 0 1 78 9V35A7 7 0 0 1 71 42H28Z" />
      <path className="hs-er-line" d="M36 13H68M36 22H60" />
    </svg>
  )
}

// The underline: two marker strokes, stretched to the word.
const UNDERLINE = 'M5 15C62 9 128 6 196 7.5c44 1 86 3.5 118 7.5M52 19.5c70-5 150-6.5 226-3'

export function HandSwap() {
  return (
    <>
      <style href="hand-swap" precedence="medium">{CSS}</style>
      <span className="sr-only">{WORDS[0]}</span>
      <em className="hand-swap" data-step="intro" aria-hidden="true">
        {words.map((w, i) => (
          <span key={w.text} className={`hs-word hs-w${i}`}>
            <span className="hs-clip">
              <span className="hs-ink">
                {w.chars.map((c, k) => <span key={k}>{c}</span>)}
              </span>
            </span>
            <span className="hs-ul">
              <span className="hs-ul-ink">
                <svg viewBox="0 0 320 24" preserveAspectRatio="none"><path d={UNDERLINE} /></svg>
              </span>
            </span>
            {w.crumbs.map((c, k) => <span key={k} className={`hs-crumb hs-k${k}`} style={{ left: `${r(c.left, 2)}%` }} />)}
            <span className="hs-er"><Eraser /></span>
            <span className="hs-pen"><Pencil /></span>
          </span>
        ))}
      </em>
      <HandSwapLoop steps={words.length} hold={HOLD} />
    </>
  )
}
