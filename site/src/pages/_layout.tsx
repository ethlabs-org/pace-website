import type { ReactNode } from 'react'
import { TermTips } from '../components/TermTips.client'

// Wraps every page without replacing the vocs shell. Mounts the one floating tooltip that every glossary term
// and standard id on the site uses (see plugins/rehype-terms.mjs).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TermTips />
    </>
  )
}
