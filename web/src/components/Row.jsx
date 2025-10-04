export function Row({ left, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
