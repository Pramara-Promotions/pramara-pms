// web/src/pages/Login.jsx
import React, { useState, useEffect } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");      // optional TOTP code (if MFA enabled)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // if already logged in, go to dashboard
  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (token) window.location.href = "/dashboard";
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { email, password };
      if (totp) payload.totp = totp; // include only if user typed it

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      // store BOTH tokens (needed for auto-refresh)
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("refreshToken", data.refreshToken);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "20vh auto 0", padding: 24, fontFamily: "system-ui, Arial" }}>
      <h2 style={{ marginTop: 0 }}>Sign in</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* TOTP is optional; leave blank if user doesn't have MFA */}
        <input
          placeholder="TOTP (if MFA enabled)"
          value={totp}
          onChange={(e) => setTotp(e.target.value)}
          inputMode="numeric"
          maxLength={6}
        />

        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 12, color: "#991b1b", background: "#fee2e2", padding: 10, borderRadius: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
