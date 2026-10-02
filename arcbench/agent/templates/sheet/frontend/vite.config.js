import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendPort = Number(process.env.ARC_WEB_PORT || 3000)

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
    },
  },
  preview: {
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
    },
  },
})
