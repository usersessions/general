// Receivables aging: horizontal bars, no chart library. Server-renderable SVG.
const COLORS = ['#0E7D68', '#B07A1F', '#B3402E', '#7C2D1E'];

export default function AgingChart({ buckets }: { buckets: { label: string; value: number }[] }) {
  const max = Math.max(...buckets.map((b) => b.value), 1);
  const rowH = 30;
  const labelW = 110;
  const valueW = 110;
  const barW = 320;
  const W = labelW + barW + valueW;
  const H = buckets.length * rowH;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMid meet" role="img" aria-label="Receivables aging">
      {buckets.map((b, i) => {
        const w = Math.max(b.value > 0 ? 3 : 0, (b.value / max) * barW);
        const y = i * rowH;
        return (
          <g key={b.label}>
            <text x="0" y={y + 19} fontSize="11" fill="#5A6A72" fontFamily="var(--body)">{b.label}</text>
            <rect x={labelW} y={y + 8} width={barW} height="14" fill="rgba(90,106,114,0.08)" rx="2" />
            <rect x={labelW} y={y + 8} width={w} height="14" fill={COLORS[i] ?? COLORS[3]} rx="2" />
            <text x={labelW + barW + 10} y={y + 19} fontSize="11.5" fill="#1F282E"
              fontFamily="var(--mono)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {'KES ' + b.value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
