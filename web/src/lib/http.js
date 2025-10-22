// web/src/lib/http.js
const env = (import.meta && import.meta.env) || {};

// In development, use relative URLs to go through Vite proxy
// In production, use the configured API base
const isDev = env.MODE === 'development' || !env.PROD;
const rawBase = isDev ? "" : (env.VITE_API_BASE || env.VITE_API_URL || "");
const normalizedBase = String(rawBase).replace(/\/$/, "");
const API_BASE = normalizedBase.endsWith("/api") ? normalizedBase : normalizedBase ? `${normalizedBase}/api` : "";
const ABS_URL = /^https?:\/\//i;

function resolveUrl(path) {
  if (ABS_URL.test(path)) return path;
  const cleaned =
    path === "/api"
      ? "/"
      : path.startsWith("/api/")
        ? path.slice(4)
        : path;
  const suffix = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  
  // In dev mode with no API_BASE, return relative path for Vite proxy
  if (!API_BASE) {
    return `/api${suffix}`;
  }
  return `${API_BASE}${suffix}`;
}

export async function http(path, init = {}) {
  const url = resolveUrl(path);
  
  // Always include credentials to send/receive cookies
  const fetchInit = {
    ...init,
    credentials: "include",  // Force include, don't use fallback
  };

  console.log('[http] Fetching:', url, 'with credentials:', fetchInit.credentials);
  const res = await fetch(url, fetchInit);
  console.log('[http] Response status:', res.status, 'for', url);
  return res;
}
