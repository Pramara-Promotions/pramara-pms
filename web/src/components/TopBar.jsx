// web/src/components/TopBar.jsx
import React from "react";

export default function TopBar() {
  async function logout() {
    const rt = sessionStorage.getItem("refreshToken");
    if (rt) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    window.location.href = "/login";
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid #e5e7eb",
        marginBottom: 12,
        position: "sticky",
        top: 0,
        background: "#fff",
        zIndex: 10,
      }}
    >
      <button
        onClick={() => (window.location.href = "/dashboard")}
        style={{ fontWeight: 700, background: "transparent", border: 0, cursor: "pointer" }}
      >
        Pramara PMS
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => (window.location.href = "/account")}>Account</button>
        <button onClick={() => (window.location.href = "/mfa")}>MFA</button>
        <button onClick={logout} style={{ color: "#b91c1c" }}>
          Logout
        </button>
      </div>
    </div>
  );
}
