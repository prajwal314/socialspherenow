import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Exclude Vercel serverless functions from the build
      external: ['jsonwebtoken'],
    },
  },
  // Exclude api folder from Vite processing (it's for Vercel serverless functions)
  server: {
    watch: {
      ignored: ['**/api/**'],
    },
  },
  // Don't process the api folder
  optimizeDeps: {
    exclude: ['jsonwebtoken'],
  },
})

