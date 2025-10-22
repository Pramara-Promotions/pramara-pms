// web/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[proxy] error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[proxy] Request:', req.method, req.url);
            // Explicitly forward cookies
            if (req.headers.cookie) {
              console.log('[proxy] Forwarding cookies:', req.headers.cookie);
              proxyReq.setHeader('Cookie', req.headers.cookie);
            } else {
              console.log('[proxy] NO COOKIES in request');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
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