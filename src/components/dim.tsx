// Dimension token: shop-drawing style, mono, thin multiplication signs.
// Unit (mm) lives in the column header, never repeated per cell.
export default function Dim({ l, w, t }: { l: number; w?: number | null; t?: number | null }) {
  return (
    <span className="dim">
      {l.toLocaleString()}
      {w ? <> {'\u00d7'} {w.toLocaleString()}</> : null}
      {t ? <> {'\u00d7'} {t}</> : null}
    </span>
  );
}
