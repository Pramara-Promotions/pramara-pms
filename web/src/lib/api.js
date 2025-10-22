// web/src/lib/api.js
export async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  // try to read JSON only if the response is JSON
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    // try to surface a useful error message
    if (isJson) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error || body?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    } else {
      const text = await res.text().catch(() => "");
      // show a short snippet from any HTML/other body to avoid the "<!doctype" JSON error
      const snippet = text ? ` (${text.slice(0, 120).replace(/\s+/g, " ").trim()}…)` : "";
      throw new Error(`HTTP ${res.status}${snippet}`);
    }
  }

  return isJson ? res.json() : res.text();
}

export const apiGet    = (p) => apiFetch(p);
export const apiPost   = (p, body) => apiFetch(p, { method: "POST", body: JSON.stringify(body ?? {}) });
export const apiPut    = (p, body) => apiFetch(p, { method: "PUT",  body: JSON.stringify(body ?? {}) });
export const apiDelete = (p)        => apiFetch(p, { method: "DELETE" });