'use client'

import { useEffect, useRef } from 'react'

// The hero backdrop: the Ethereum diamond as a glass wireframe behind the devices. It turns about 40 degrees once
// when the page opens, and after that it turns only as the page scrolls, so a page left alone costs
// nothing. (It used to turn on a clock, and redrawing it 30 times a second was most of what the page cost at rest.)
//
// The solid is the real logo in 3D. Heights come from ethereum.org's eth-diamond-black.png (800 x 1303, centre at
// y = 651, 400 px to a unit): apex 0, equator 662, lower tip of the upper piece 898, rim of the lower piece 740,
// the V of the lower piece 975, bottom 1303. The equator and the rim are squares of radius 1, as in the logo.
// Everything is drawn from one pure function, so the server renders a still frame and the client animates it.

type V3 = [number, number, number]
const Y = { apex: -1.63, eq: 0.03, low: 0.62, rim: 0.22, vee: 0.81, bottom: 1.63 }
const ring = (y: number): V3[] => [[1, y, 0], [0, y, 1], [-1, y, 0], [0, y, -1]]
const EQ = ring(Y.eq)
const RIM = ring(Y.rim)
const APEX: V3 = [0, Y.apex, 0], LOW: V3 = [0, Y.low, 0], VEE: V3 = [0, Y.vee, 0], BOTTOM: V3 = [0, Y.bottom, 0]
const around = (tip: V3, r: V3[]) => r.map((p, i) => [tip, p, r[(i + 1) % 4]] as V3[])
const FACES: V3[][] = [...around(APEX, EQ), ...around(LOW, EQ), ...around(VEE, RIM), ...around(BOTTOM, RIM)]
const EDGES: [V3, V3][] = [
  ...EQ.map((p) => [APEX, p] as [V3, V3]), ...EQ.map((p) => [LOW, p] as [V3, V3]), ...EQ.map((p, i) => [p, EQ[(i + 1) % 4]] as [V3, V3]),
  ...RIM.map((p) => [VEE, p] as [V3, V3]), ...RIM.map((p) => [BOTTOM, p] as [V3, V3]), ...RIM.map((p, i) => [p, RIM[(i + 1) % 4]] as [V3, V3]),
]
const S = 240          // units to viewBox px
const TILT = -0.3      // look down on the equator a little, so it reads as 3D
const DEPTH = 6        // perspective distance, in units
const REST = 0.55                 // the still's angle, in radians
const INTRO = 0.7                 // how far it turns when the page opens
const INTRO_MS = 2400
const PER_PX = 0.004              // radians per pixel scrolled

function view([x, y, z]: V3, turn: number): V3 {
  const c = Math.cos(turn), s = Math.sin(turn)
  const x1 = x * c + z * s, z1 = -x * s + z * c
  const ct = Math.cos(TILT), st = Math.sin(TILT)
  return [x1, y * ct - z1 * st, y * st + z1 * ct]
}
function project([x, y, z]: V3): [number, number, number] {
  const k = DEPTH / (DEPTH - z)
  return [x * k * S, y * k * S, z]
}

type P2 = [number, number]

// The solid turned to an angle and projected: each face as three points with its glass alpha, each edge as two points.
function geometry(turn: number) {
  const faces = FACES.map((f) => {
    const v = f.map((p) => view(p, turn))
    const a = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]]
    const b = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]]
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    const len = Math.hypot(n[0], n[1], n[2]) || 1
    // Light from the upper left and slightly in front. The sign is ignored, so both sides of the glass catch it.
    const lit = Math.abs((n[0] * -0.5 + n[1] * -0.6 + n[2] * 0.62) / len)
    return { pts: v.map((p) => project(p).slice(0, 2) as P2), alpha: 0.015 + 0.11 * lit * lit }
  })
  const edges = EDGES.map(([p, q]) => [project(view(p, turn)).slice(0, 2) as P2, project(view(q, turn)).slice(0, 2) as P2])
  return { faces, edges }
}

// The same frame as SVG attributes, for the still the server renders.
function frame(turn: number) {
  const g = geometry(turn)
  const xy = (p: P2) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`
  return {
    faces: g.faces.map((f) => ({ points: f.pts.map(xy).join(' '), alpha: f.alpha.toFixed(3) })),
    edges: g.edges.map(([p, q]) => `M${xy(p)}L${xy(q)}`).join(''),
  }
}

// The server renders the still as SVG, so the diamond is there before any script and without one. The client then
// draws on a canvas laid over it and hides the SVG: rewriting SVG attributes costs a style pass, a layout and a
// paint, a canvas only paints. The canvas is a quarter wider than the SVG box because the solid's tips reach past
// the viewBox (the SVG shows them through overflow: visible; a canvas would clip them). It draws on animation frames
// during the opening turn, then once per frame of scrolling, and only while the hero is on screen.
const PAD = 1.25   // canvas size relative to the SVG box
export function HeroOrbit() {
  const root = useRef<SVGSVGElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const still = frame(REST)

  useEffect(() => {
    const svg = root.current, canvas = cv.current
    if (!svg || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // The ink is the page's mint, read from the SVG so it follows the theme; re-read when the theme changes.
    let ink = ''
    const readInk = () => { ink = getComputedStyle(svg.querySelector('.orbit-face')!).fill }
    readInk()
    const themeWatch = new MutationObserver(readInk)
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] })
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(w * dpr)
    }
    fit()
    const ro = new ResizeObserver(() => { fit(); if (!raf) raf = requestAnimationFrame((now) => { raf = 0; paint(now) }) })
    ro.observe(canvas)

    let raf = 0, visible = true
    const start = performance.now()
    const angle = (now: number) => {
      const p = Math.min(1, (now - start) / INTRO_MS)
      return REST + INTRO * (1 - (1 - p) ** 3) + window.scrollY * PER_PX
    }
    const paint = (now: number) => {
      const g = geometry(angle(now))
      const k = canvas.width / (800 * PAD)   // viewBox units to canvas pixels
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2)
      ctx.fillStyle = ink
      ctx.strokeStyle = ink
      for (const f of g.faces) {
        ctx.globalAlpha = f.alpha
        ctx.beginPath()
        ctx.moveTo(f.pts[0][0], f.pts[0][1]); ctx.lineTo(f.pts[1][0], f.pts[1][1]); ctx.lineTo(f.pts[2][0], f.pts[2][1])
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 0.55
      ctx.lineWidth = canvas.width / canvas.clientWidth / k   // one CSS pixel
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (const [p, q] of g.edges) { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]) }
      ctx.stroke()
      svg.style.visibility = 'hidden'
    }
    // The opening turn runs on animation frames until it ends; after that, only scrolling asks for a frame.
    const intro = (now: number) => {
      paint(now)
      raf = visible && now - start < INTRO_MS ? requestAnimationFrame(intro) : 0
    }
    const onScroll = () => {
      if (!visible || raf) return
      raf = requestAnimationFrame((now) => { raf = 0; paint(now) })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(intro)
    })
    io.observe(canvas)
    return () => {
      io.disconnect(); ro.disconnect(); themeWatch.disconnect(); cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      svg.style.visibility = ''
    }
  }, [])

  return (
    <>
      <svg ref={root} className="orbit" viewBox="-400 -400 800 800" aria-hidden="true">
        {still.faces.map((f, i) => <polygon key={i} className="orbit-face" points={f.points} fillOpacity={f.alpha} />)}
        <path className="orbit-edge" d={still.edges} />
      </svg>
      <canvas ref={cv} className="orbit orbit-canvas" aria-hidden="true" />
    </>
  )
}
