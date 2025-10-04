import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // 👈 listen on 0.0.0.0 (LAN)
    port: 5173,         // (optional) fix the port
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // stays localhost (proxy runs on your PC)
        changeOrigin: true,
      },
    },
  },
})
