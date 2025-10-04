// web/src/pages/Account.jsx
import { useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
import { Row } from "../components/Row.jsx";
import { api } from "../lib/api.js";

export default function Account() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaBase32, setMfaBase32] = useState(null);
  const [mfaToken, setMfaToken] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- Load user + sessions ----
  async function load() {
    const me = await api("/api/me");
    if (me.ok) setUser(await me.json());
    const s = await api("/api/sessions/me");
    if (s.ok) setSessions(await s.json());
  }

  useEffect(() => {
    load();
  }, []);

  // ---- MFA setup ----
  async function startMfa() {
    const r = await api("/api/auth/mfa/setup", { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      setMfaQR(d.qrDataUrl);
      setMfaBase32(d.base32);
    } else alert("MFA setup failed");
  }

  async function verifyMfa(e) {
    e.preventDefault();
    const r = await api("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base32: mfaBase32, token: mfaToken }),
    });
    if (r.ok) {
      alert("MFA enabled!");
      setMfaQR(null);
      setMfaBase32(null);
      setMfaToken("");
      load();
    } else alert("Invalid token");
  }

  // ---- Session revoke ----
  async function revoke(id) {
    if (!confirm("Sign this device out?")) return;
    const r = await api(`/api/sessions/${id}`, { method: "DELETE" });
    if (r.ok) setSessions((s) => s.filter((x) => x.id !== id));
  }

  async function revokeAll() {
    if (!confirm("Sign out of all sessions?")) return;
    const r = await api("/api/sessions", { method: "DELETE" });
    if (r.ok) {
      alert("All sessions cleared; please log in again");
      sessionStorage.clear();
      window.location.href = "/login";
    }
  }

  // ---- UI ----
  if (!user)
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading account...
      </div>
    );

  return (
    <div className="account-page" style={{ padding: 24, display: "grid", gap: 20 }}>
      <Card title="Profile">
        <Row
          left={
            <div>
              <div style={{ fontWeight: 600 }}>{user.email}</div>
              <div style={{ color: "#64748b", fontSize: 14 }}>
                Roles: {user.roles?.join(", ") || "None"}
              </div>
            </div>
          }
          right={<div>{user.permissions?.length || 0} permissions</div>}
        />
      </Card>

      <Card title="Multi-Factor Authentication">
        {user.mfaSecret ? (
          <div>
            <p>MFA is <b>enabled</b> for this account.</p>
            <p style={{ color: "#64748b", fontSize: 14 }}>
              To disable, contact an administrator.
            </p>
          </div>
        ) : mfaQR ? (
          <form onSubmit={verifyMfa} style={{ display: "grid", gap: 12, maxWidth: 280 }}>
            <img src={mfaQR} alt="QR code" width="200" />
            <code style={{ background: "#f1f5f9", padding: 4 }}>{mfaBase32}</code>
            <input
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              placeholder="Enter 6-digit code"
              inputMode="numeric"
              maxLength={6}
            />
            <button type="submit">Verify</button>
          </form>
        ) : (
          <button onClick={startMfa}>Enable MFA</button>
        )}
      </Card>

      <Card title="Active Sessions">
        {sessions.length === 0 ? (
          <div style={{ color: "#64748b" }}>No sessions found.</div>
        ) : (
          sessions.map((s) => (
            <Row
              key={s.id}
              left={
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {s.userAgent?.slice(0, 50) || "Unknown device"}
                  </div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    {s.ip || "No IP"} · Created{" "}
                    {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>
              }
              right={<button onClick={() => revoke(s.id)}>Revoke</button>}
            />
          ))
        )}
        {sessions.length > 1 && (
          <button style={{ marginTop: 10 }} onClick={revokeAll}>
            Sign out of all devices
          </button>
        )}
      </Card>
    </div>
  );
}
