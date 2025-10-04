// web/src/components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";

export function Sidebar() {
  const navigate = useNavigate();

  function logout() {
    sessionStorage.clear();
    navigate("/login");
    // optional: force reload
    // window.location.href = "/login";
  }

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "10px 12px",
    borderRadius: 8,
    color: isActive ? "#1f2937" : "#374151",
    background: isActive ? "#e5e7eb" : "transparent",
    textDecoration: "none",
    fontWeight: isActive ? 600 : 500,
  });

  return (
    <aside
      style={{
        width: 220,
        borderRight: "1px solid #e5e7eb",
        padding: 12,
        background: "#fafafa",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 12,
        minHeight: "100vh",
      }}
    >
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Pramara PMS</div>
        <div style={{ color: "#6b7280", fontSize: 12 }}>Phase 1</div>
      </div>

      <nav style={{ display: "grid", gap: 6 }}>
        <NavLink to="/" end style={linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/account" style={linkStyle}>
          Account
        </NavLink>
      </nav>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          onClick={logout}
          style={{
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            background: "#fff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          Logout
        </button>
        <a
          href="http://localhost:4000/health"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            color: "#6b7280",
            textDecoration: "none",
            fontSize: 12,
          }}
          title="Backend health check"
        >
          API Health ↗
        </a>
      </div>
    </aside>
  );
}
