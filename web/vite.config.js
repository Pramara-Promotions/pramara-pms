// web/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// __dirname replacement for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,  // Don't rewrite path
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[proxy] error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[proxy] Request:', req.method, req.url);
            // Explicitly forward cookies
            if (req.headers.cookie) {
              console.log('[proxy] Forwarding cookies:', req.headers.cookie);
              proxyReq.setHeader('Cookie', req.headers.cookie);
            } else {
              console.log('[proxy] NO COOKIES in request');
            }
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[proxy] Response:', proxyRes.statusCode, 'for', req.url);
            if (proxyRes.headers['set-cookie']) {
              console.log('[proxy] Backend sent Set-Cookie:', proxyRes.headers['set-cookie']);
            }
          });
        },
      },
    },
  },
});