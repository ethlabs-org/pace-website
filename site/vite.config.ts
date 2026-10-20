import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vocs } from 'vocs/vite'

// The site runs Vite directly (vite dev / vite build) so this file is read; the vocs CLI ignores it.
// Vocs itself is excluded from dependency pre-bundling, so the Mermaid runtime it loads lazily has to be listed
// here, or its CommonJS dependency (dayjs) fails to import in the dev server.
export default defineConfig({
  plugins: [react(), vocs()],
  optimizeDeps: { include: ['mermaid'] },
})
