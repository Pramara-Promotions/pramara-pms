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
    port: 5173,
    proxy: {
      "^/api/.*": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[proxy] ERROR:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[proxy] >>> Forwarding:', req.method, req.url, 'to http://localhost:4000');
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[proxy] <<< Response:', proxyRes.statusCode, 'from', req.method, req.url);
          });
        },
      },
    },
  },
});