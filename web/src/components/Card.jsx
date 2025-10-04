export function Card({ title, children }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      padding: 16,
      display: "grid",
      gap: 12,
    }}>
      {title && <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>}
      <div>{children}</div>
    </div>
  );
}
