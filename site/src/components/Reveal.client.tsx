'use client'

import { useEffect } from 'react'

// Landing-page motion that needs a script. Mounted once, from index.mdx.
//
// 1. Reveal on scroll. Blocks rise and fade in the first time they enter the screen. Items in a row (feature cards,
//    eras, risks, milestones, the two Gap panels) get a stagger index, so a row comes in left to right. Section
//    rules draw across when their section arrives. Anything already on screen when the script runs is marked as
//    shown before the hiding class goes on, so nothing above the fold blinks. Without the script, or with reduced
//    motion, every block is simply there.
// 2. The halftone on the feature plates follows the pointer: the plate gets --mx/--my in px and the CSS mask centres
//    on it.
// 3. Looping decorations pause while their block is off screen: the block gets data-offscreen and the CSS sets
//    animation-play-state: paused under it. A running animation keeps the browser drawing frames even where nobody
//    can see it. The Gap's sparks and pulses run a few rounds and stop, so the diagram rests while it is read. Their
//    CSS animation is only set under data-inview, which goes on as a block enters the screen and off as it leaves,
//    so they start again from the top each time it comes back. The credits band is the only loop that keeps going.
const BLOCKS = [
  '.sec > h2',
  '.sec-rail',
  '.sec-body > :not(.showcase, .eras, .risks, .road-sheet, .gap)',
  '.credits-head', '.credits-fixed', '.credits-band',
  '.closer',
].join(',')
const ROWS = ['.showcase > .sc', '.eras > .era', '.risks > li', '.road > .road-step', '.gap > .gap-panel'].join(',')
const LINES = '.sec'
const MOTION = '.hero, .credits, .sec, .closer'

export function Reveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    const fold = window.innerHeight * 0.92
    const seen = (el: Element) => el.getBoundingClientRect().top < fold
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('rv-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    const mark = (el: HTMLElement, attr: string, i = 0) => {
      el.setAttribute(attr, '')
      if (i) el.style.setProperty('--rv-i', String(i))
      if (seen(el)) el.classList.add('rv-in')
      else io.observe(el)
    }
    document.querySelectorAll<HTMLElement>(BLOCKS).forEach((el) => mark(el, 'data-rv'))
    document.querySelectorAll<HTMLElement>(ROWS).forEach((el) => mark(el, 'data-rv', Math.min([...el.parentElement!.children].indexOf(el), 6)))
    document.querySelectorAll<HTMLElement>(LINES).forEach((el) => mark(el, 'data-rv-line'))
    root.classList.add('rv-on')

    const idle = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.toggleAttribute('data-offscreen', !e.isIntersecting)
          e.target.toggleAttribute('data-inview', e.isIntersecting)
        }
      },
      { rootMargin: '0px' },
    )
    document.querySelectorAll(MOTION).forEach((el) => idle.observe(el))

    const move = (e: PointerEvent) => {
      const plate = (e.target as Element | null)?.closest?.<HTMLElement>('.sc-plate')
      if (!plate) return
      const r = plate.getBoundingClientRect()
      plate.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`)
      plate.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`)
    }
    document.addEventListener('pointermove', move, { passive: true })

    return () => {
      io.disconnect()
      idle.disconnect()
      document.querySelectorAll('[data-offscreen], [data-inview]').forEach((el) => { el.removeAttribute('data-offscreen'); el.removeAttribute('data-inview') })
      document.removeEventListener('pointermove', move)
      root.classList.remove('rv-on')
    }
  }, [])
  return null
}
