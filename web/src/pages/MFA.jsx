// web/src/pages/MFA.jsx
import React, { useEffect, useState } from "react";

function withAuthHeaders(init = {}) {
  const token = sessionStorage.getItem("accessToken");
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export default function MFA() {
  const [me, setMe] = useState(null);
  const [qr, setQr] = useState(null);
  const [base32, setBase32] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/me", withAuthHeaders());
      const d = await r.json();
      setMe(d);
    })();
  }, []);

  async function startSetup() {
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", withAuthHeaders({ method: "POST" }));
      const data = await res.json();
      if (!res.ok) return setErr(data.error || "Failed to start MFA setup");
      setQr(data.qrDataUrl);
      setBase32(data.base32);
    } finally { setBusy(false); }
  }

  async function verify() {
    setErr("");
    if (!token || !base32) return setErr("Scan the QR and enter the 6-digit code.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", withAuthHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base32, token }),
      }));
      const data = await res.json();
      if (!res.ok) return setErr(data.error || "Verification failed");
      alert("MFA enabled!");
      setMe((prev) => ({ ...prev, mfaEnabled: true }));
      setQr(null); setBase32(null); setToken("");
    } finally { setBusy(false); }
  }

  async function disableMFA() {
    if (!confirm("Disable MFA for this account?")) return;
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/auth/mfa/disable", withAuthHeaders({ method: "POST" }));
      const data = await res.json();
      if (!res.ok) return setErr(data.error || "Disable failed");
      setMe((prev) => ({ ...prev, mfaEnabled: false }));
      setQr(null); setBase32(null); setToken("");
      alert("MFA disabled.");
    } finally { setBusy(false); }
  }

  if (!me) return null;

  return (
    <div style={{ maxWidth: 680, margin: "24px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h2>Two-Factor Authentication (TOTP)</h2>
      <p>Use Google Authenticator, Authy, or any TOTP app.</p>

      {me.mfaEnabled ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#166534", background: "#ecfdf5", padding: "4px 8px", borderRadius: 6 }}>
            MFA is currently <b>enabled</b>.
          </span>
          <button onClick={disableMFA} disabled={busy} style={{ padding: "6px 10px", color: "#b91c1c" }}>
            Disable MFA
          </button>
        </div>
      ) : (
        <>
          {!qr ? (
            <button onClick={startSetup} disabled={busy} style={{ padding: "8px 12px" }}>
              {busy ? "Starting…" : "Start MFA setup"}
            </button>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "center" }}>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fff" }}>
                <img src={qr} alt="Scan this QR in your authenticator app" style={{ width: 200, height: 200 }} />
              </div>
              <div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Secret (base32)</div>
                  <code style={{ fontSize: 14 }}>{base32}</code>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    style={{ padding: "8px", width: 160 }}
                  />
                  <button onClick={verify} disabled={busy} style={{ padding: "8px 12px" }}>
                    {busy ? "Verifying…" : "Verify & Enable"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {err && (
        <div style={{ marginTop: 16, color: "#991b1b", background: "#fee2e2", padding: 10, borderRadius: 8 }}>
          {err}
        </div>
      )}
    </div>
  );
}
