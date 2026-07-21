export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ width: 180, height: 22 }} />
      <div className="skeleton" style={{ width: 260, marginTop: 10 }} />
      <div className="card">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ marginBottom: 12, width: `${92 - i * 6}%` }} />
        ))}
      </div>
    </div>
  );
}
