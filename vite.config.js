import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Vite entry is vite.html (npm run dev, then open /vite.html). index.html is the no-build entry, so a plain
// static server opens the mockup at its root.
export default defineConfig({ plugins: [react()], server: { open: '/vite.html' }, build: { rollupOptions: { input: 'vite.html' } } });
