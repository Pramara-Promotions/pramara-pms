// Minimal fetch wrapper used across the app (no axios).
// It ALWAYS calls the backend under /api/* and sends cookies.

type Json = Record<string, unknown> | unknown[];

// Use relative URL so Vite proxy handles the request
const API_BASE = `/api`;           // <-- important: includes /api

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
    return apiFetch<{ 
      token?: string; 
      user?: any; 
      ok?: boolean;
      requiresMfa?: boolean;
      tempToken?: string;
      message?: string;
      mustChangePassword?: boolean;
    }>("/auth/login", {
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

/* ------------ MFA API ------------- */

export const MFAAPI = {
  // POST /api/mfa/setup - Start MFA setup
  setup() {
    return apiFetch<{
      secret: string;
      qrCode: string;
      backupCodes: string[];
      otpauthUrl: string;
    }>("/mfa/setup", { method: "POST" });
  },

  // POST /api/mfa/verify - Verify and enable MFA
  verify(payload: { token: string; backupCodes: string[] }) {
    return apiFetch<{
      ok: boolean;
      message: string;
      enabledAt: string;
    }>("/mfa/verify", { json: payload });
  },

  // POST /api/mfa/disable - Disable MFA
  disable(password: string) {
    return apiFetch<{
      ok: boolean;
      message: string;
    }>("/mfa/disable", { json: { password } });
  },

  // POST /api/mfa/verify-login - Verify MFA during login
  verifyLogin(payload: { 
    tempToken: string; 
    totpToken: string; 
    trustDevice?: boolean 
  }) {
    return apiFetch<{
      ok: boolean;
      token: string;
      user: any;
    }>("/mfa/verify-login", { json: payload });
  },
};

/* ------------ Admin Email API ------------- */

export const EmailAdminAPI = {
  // GET /api/admin/email-settings
  getSettings() {
    return apiFetch<{
      emailOutboundEnabled: boolean;
      emailTrainingMode: boolean;
      emailInboundEnabled: boolean;
    }>("/admin/email-settings");
  },

  // PUT /api/admin/email-settings
  updateSettings(payload: {
    emailOutboundEnabled?: boolean;
    emailTrainingMode?: boolean;
    emailInboundEnabled?: boolean;
  }) {
    return apiFetch<{
      ok: boolean;
      message: string;
    }>("/admin/email-settings", { 
      method: "PUT",
      json: payload 
    });
  },

  // GET /api/admin/email-inbound/status
  getInboundStatus() {
    return apiFetch<{ enabled: boolean; imapConfigured: boolean; connected: boolean; polling: boolean }>(
      "/admin/email-inbound/status"
    );
  },

  // PUT /api/admin/users/:id/email-permissions
  updateUserPermissions(userId: number, payload: {
    emailOutboundEnabled?: boolean;
    emailInboundEnabled?: boolean;
    emailOverrideSystem?: boolean;
  }) {
    return apiFetch<any>(`/admin/users/${userId}/email-permissions`, {
      method: "PUT",
      json: payload
    });
  },
};

export default apiFetch;