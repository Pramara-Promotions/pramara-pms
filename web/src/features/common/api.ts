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

  // Email Accounts (Inbound) — UI-managed
  listAccounts() {
    return apiFetch<any[]>("/admin/email-accounts");
  },
  createAccount(payload: any) {
    return apiFetch<{ ok: boolean; id: string }>("/admin/email-accounts", { method: "POST", json: payload });
  },
  updateAccount(id: string, payload: any) {
    return apiFetch<{ ok: boolean }>(`/admin/email-accounts/${id}`, { method: "PUT", json: payload });
  },
  deleteAccount(id: string) {
    return apiFetch<{ ok: boolean }>(`/admin/email-accounts/${id}`, { method: "DELETE" });
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

/* ------------ Tasks API ------------- */

export const TasksAPI = {
  list(params?: { projectId?: number }) {
    const qs = params?.projectId ? `?projectId=${params.projectId}` : '';
    return apiFetch<any[]>(`/tasks${qs}`);
  },
  create(payload: {
    projectId?: number;
    name: string;
    section?: 'Pre-Prod'|'Production'|'QC'|'Dispatch';
    status?: 'green'|'amber'|'red';
    assignee?: string;
    due?: string; // YYYY-MM-DD
    priority?: 'Low'|'Med'|'High';
    tags?: string[];
  }) {
    return apiFetch<any>(`/tasks`, { method: 'POST', json: payload });
  },
  update(id: string, patch: Partial<{
    name: string;
    section: 'Pre-Prod'|'Production'|'QC'|'Dispatch';
    status: 'green'|'amber'|'red';
    assignee: string|null;
    due: string|null;
    priority: 'Low'|'Med'|'High';
    tags: string[];
    attachments: number;
  }>) {
    return apiFetch<any>(`/tasks/${id}`, { method: 'PATCH', json: patch });
  },
  delete(id: string) {
    return apiFetch<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' });
  },
  reorder(section: 'Pre-Prod'|'Production'|'QC'|'Dispatch', idsInOrder: string[]) {
    return apiFetch<{ ok: boolean }>(`/tasks/reorder`, { method: 'POST', json: { section, idsInOrder } });
  }
};

/* ------------ QC API ------------- */

export const QCAPI = {
  // Templates
  listTemplates(params?: { projectId?: number; stationId?: number; projectSkuId?: number }) {
    const q = new URLSearchParams();
    if (params?.projectId) q.set('projectId', String(params.projectId));
    if (params?.stationId) q.set('stationId', String(params.stationId));
    if (params?.projectSkuId) q.set('projectSkuId', String(params.projectSkuId));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/qc/templates${qs}`);
  },
  createTemplate(payload: any) {
    return apiFetch<any>(`/qc/templates`, { method: 'POST', json: payload });
  },
  updateTemplate(id: string, patch: any) {
    return apiFetch<any>(`/qc/templates/${id}`, { method: 'PUT', json: patch });
  },
  addTemplateItem(id: string, item: any) {
    return apiFetch<any>(`/qc/templates/${id}/items`, { method: 'POST', json: item });
  },
  updateItem(id: string, patch: any) {
    return apiFetch<any>(`/qc/items/${id}`, { method: 'PATCH', json: patch });
  },
  deleteItem(id: string) {
    return apiFetch<{ ok: boolean }>(`/qc/items/${id}`, { method: 'DELETE' });
  },

  // Presign for photo upload
  presignPhoto(payload: { projectId: number; filename: string; contentType?: string; sizeBytes?: number }) {
    return apiFetch<{ putUrl: string; key: string }>(`/qc/presign`, { method: 'POST', json: payload });
  },

  // Submissions
  submit(payload: any) {
    return apiFetch<any>(`/qc/submissions`, { method: 'POST', json: payload });
  },
  listSubmissions(params?: { projectId?: number; stationId?: number; from?: string; to?: string }) {
    const q = new URLSearchParams();
    if (params?.projectId) q.set('projectId', String(params.projectId));
    if (params?.stationId) q.set('stationId', String(params.stationId));
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/qc/submissions${qs}`);
  },
  getSubmission(id: string) {
    return apiFetch<any>(`/qc/submissions/${id}`);
  },
};