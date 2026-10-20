'use client'

import { useEffect } from 'react'

// Drives the hero's swapping word (HandSwap.tsx). Each swap is one step of CSS animations, chosen by the slot's
// data-step. When a step's animations are done, this waits `hold` seconds with nothing running and moves the slot to
// the next step. The first step (the underline being drawn) runs from the HTML alone, so without this script the
// headline simply stays on the first word.
//
// Waiting with no animation running matters: while any transform animation runs, Chrome re-checks every
// IntersectionObserver on the page each frame, and this page always has some. Between swaps the page rests.
export function HandSwapLoop({ steps, hold }: { steps: number; hold: number }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.hand-swap')
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    let live = true
    // Each step has a clock animation on the slot itself that lasts the whole step. It sits paused while the hero is
    // off screen (data-offscreen), so a swap that starts off screen waits there and plays once it is back.
    const next = async () => {
      const clock = el.getAnimations().find((a) => (a as CSSAnimation).animationName?.startsWith('hsc'))
      await clock?.finished.catch(() => {})
      if (!live) return
      timer = window.setTimeout(() => {
        el.dataset.step = String(el.dataset.step === 'intro' ? 0 : (Number(el.dataset.step) + 1) % steps)
        next()
      }, hold * 1000)
    }
    next()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [steps, hold])
  return null
}
