import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In the browser, J2 calls go through this proxy so the session cookie is same-origin.
const J2 = process.env.J2_URL ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': J2,
      '/auth': J2,
      '/media': J2,
    },
  },
})
