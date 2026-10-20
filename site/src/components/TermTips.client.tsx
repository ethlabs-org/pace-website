'use client'

import { useEffect } from 'react'

// One floating tooltip for every [data-tip] element (glossary terms and standard ids). Hover or focus shows it; on
// touch, a tap on a term toggles it. Escape hides it. The tip follows the element on scroll.
export function TermTips() {
  useEffect(() => {
    const tip = document.createElement('div')
    tip.id = 'term-tip'
    tip.setAttribute('role', 'tooltip')
    tip.hidden = true
    document.body.appendChild(tip)
    let current: Element | null = null

    function show(el: Element) {
      current = el
      tip.textContent = el.getAttribute('data-tip')
      tip.hidden = false
      const r = el.getBoundingClientRect()
      const w = Math.min(360, window.innerWidth - 24)
      tip.style.width = `${w}px`
      let x = r.left + r.width / 2 - w / 2
      x = Math.max(12, Math.min(x, window.innerWidth - w - 12))
      const h = tip.offsetHeight
      const above = r.top > h + 16
      tip.style.left = `${x}px`
      tip.style.top = `${(above ? r.top - h - 8 : r.bottom + 8) + window.scrollY}px`
      tip.classList.toggle('below', !above)
      tip.style.setProperty('--ax', `${r.left + r.width / 2 - x}px`)
    }
    function hide() {
      current = null
      tip.hidden = true
    }
    const closest = (t: EventTarget | null) => (t instanceof Element ? t.closest('[data-tip]') : null)
    const onOver = (e: MouseEvent) => {
      const el = closest(e.target)
      if (el && el !== current) show(el)
    }
    const onOut = (e: MouseEvent) => {
      const el = closest(e.target)
      if (el && el === current && !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) hide()
    }
    const onFocusIn = (e: FocusEvent) => {
      const el = closest(e.target)
      if (el) show(el)
    }
    const onFocusOut = (e: FocusEvent) => {
      if (closest(e.target)) hide()
    }
    const onTouch = (e: TouchEvent) => {
      const el = closest(e.target)
      if (!el) {
        hide()
        return
      }
      if (el.tagName === 'ABBR') {
        e.preventDefault()
        current === el ? hide() : show(el)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    const onScroll = () => {
      if (current) show(current)
    }
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('touchstart', onTouch, { passive: false })
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('touchstart', onTouch)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      tip.remove()
    }
  }, [])
  return null
}
