// Minimal fetch wrapper used across the app (no axios).
// It ALWAYS calls the backend under /api/* and sends cookies.

type Json = Record<string, unknown> | unknown[];

const API_HOST = `${window.location.protocol}//${window.location.hostname}:4000`;
const API_BASE = `${API_HOST}/api`;           // <-- important: includes /api

function join(base: string, path: string) {
  // Prevent // when caller passes "/me", "/auth/login", etc.
  if (!path) return base;
  if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
  if (!base.endsWith("/") && !path.startsWith("/")) return `${base}/${path}`;
  return base + path;
}

export async function apiFetch<T = any>(
  path: string,
  opts: {
    method?: string;
    json?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };

  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  const url = join(API_BASE, path);
  const res = await fetch(url, {
    method: opts.method ?? (opts.json ? "POST" : "GET"),
    credentials: "include", // send/receive cookies
    headers,
    body,
  });

  // Try to parse JSON; if not JSON, throw text as error
  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? (data as any).error
        : text) || `HTTP ${res.status}`;
    throw new Error(String(message));
  }

  return data as T;
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* ------------ Auth-specific helpers ------------- */

export const AuthAPI = {
  // POST /api/auth/login
  login(payload: { email: string; password: string; totp?: string }) {
    return apiFetch<{ token?: string; user?: any }>("/auth/login", {
      json: payload,
    });
  },

  // GET /api/me
  me() {
    return apiFetch<any>("/me");
  },

  // POST /api/auth/logout
  logout() {
    return apiFetch<void>("/auth/logout", { method: "POST" });
  },
};

export default apiFetch;