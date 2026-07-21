import { useId } from 'react';

/**
 * Signature element: a to-scale shop-drawing of a stock unit.
 * Outer outline = the parent piece (or the piece itself if it is a root unit).
 * Hatched area = material already consumed. Filled area = this piece.
 * Dashed lines = blade passes. Colors follow the status system:
 * glass green (available/offcut), marking blue (reserved), hatch only (consumed).
 */
export default function CutDiagram({ length, width, parentLength, parentWidth, status }: {
  length: number;
  width?: number | null;
  parentLength?: number | null;
  parentWidth?: number | null;
  status: string;
}) {
  const hatchId = useId().replace(/:/g, '');
  const W = 84;
  const H = 46;

  const fill =
    status === 'reserved' ? 'rgba(43,76,126,0.18)'
    : status === 'consumed' ? 'transparent'
    : 'rgba(14,125,104,0.16)';
  const stroke =
    status === 'reserved' ? '#2B4C7E'
    : status === 'consumed' ? '#5A6A72'
    : '#0E7D68';

  const isBar = !width && !parentWidth;

  if (isBar) {
    // Linear items (bars, profiles): 1-D remaining-length indicator.
    const pl = parentLength ?? length;
    const w = Math.max(4, (length / pl) * (W - 4));
    return (
      <svg width={W} height={16} viewBox={`0 0 ${W} 16`} aria-label={`piece ${length}mm of ${pl}mm`} role="img">
        <defs>
          <pattern id={hatchId} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(90,106,114,0.45)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="2" y="4" width={W - 4} height="8" fill={parentLength ? `url(#${hatchId})` : 'none'} stroke="rgba(90,106,114,0.5)" strokeWidth="1" />
        <rect x="2" y="4" width={w} height="8" fill={status === 'consumed' ? `url(#${hatchId})` : fill} stroke={stroke} strokeWidth="1" />
        {parentLength && length < parentLength ? (
          <line x1={2 + w} y1="1" x2={2 + w} y2="15" stroke="#5A6A72" strokeWidth="1" strokeDasharray="2 2" />
        ) : null}
      </svg>
    );
  }

  const pl = parentLength ?? length;
  const pw = parentWidth ?? width ?? 1;
  const w = width ?? pw;
  const scale = Math.min((W - 4) / pl, (H - 4) / pw);
  const outerW = pl * scale;
  const outerH = pw * scale;
  const pieceW = Math.max(3, length * scale);
  const pieceH = Math.max(3, w * scale);
  const ox = (W - outerW) / 2;
  const oy = (H - outerH) / 2;
  const isPartial = pieceW < outerW - 0.5 || pieceH < outerH - 0.5;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`piece ${length} by ${w}mm${parentLength ? ` cut from ${pl} by ${pw}mm` : ''}`}>
      <defs>
        <pattern id={hatchId} width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(90,106,114,0.45)" strokeWidth="1" />
        </pattern>
      </defs>
      {/* parent sheet: consumed material hatched */}
      <rect x={ox} y={oy} width={outerW} height={outerH}
        fill={isPartial || status === 'consumed' ? `url(#${hatchId})` : 'none'}
        stroke="rgba(90,106,114,0.5)" strokeWidth="1" />
      {/* this piece, anchored bottom-left like a cutting plan */}
      {status !== 'consumed' && (
        <rect x={ox} y={oy + outerH - pieceH} width={pieceW} height={pieceH} fill="#fff" stroke="none" />
      )}
      {status !== 'consumed' && (
        <rect x={ox} y={oy + outerH - pieceH} width={pieceW} height={pieceH}
          fill={fill} stroke={stroke} strokeWidth="1.2" />
      )}
      {/* blade passes */}
      {isPartial && pieceW < outerW - 0.5 ? (
        <line x1={ox + pieceW} y1={oy} x2={ox + pieceW} y2={oy + outerH} stroke="#5A6A72" strokeWidth="1" strokeDasharray="3 2" />
      ) : null}
      {isPartial && pieceH < outerH - 0.5 ? (
        <line x1={ox} y1={oy + outerH - pieceH} x2={ox + outerW} y2={oy + outerH - pieceH} stroke="#5A6A72" strokeWidth="1" strokeDasharray="3 2" />
      ) : null}
    </svg>
  );
}
