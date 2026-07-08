import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' + hash routing keeps every deep link working on any static
// host, including GitHub Pages project subpaths.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
