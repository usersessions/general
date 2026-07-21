'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CutDiagram from '@/components/cut-diagram';
import Dim from '@/components/dim';
import StatusBadge from '@/components/status-badge';
import { useSort } from '@/components/use-sort';

export function ReceiveBatchForm({ productId, trackingMode, defaultThickness }: {
  productId: string; trackingMode: string; defaultThickness: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [f, setF] = useState({ supplier: '', cost: '', qty: '1', length: '', width: '', thickness: defaultThickness ? String(defaultThickness) : '' });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setOk(null);
    const { error } = await supabase.rpc('receive_batch', {
      p_product_id: productId,
      p_supplier_name: f.supplier || null,
      p_unit_cost: Number(f.cost),
      p_qty: Number(f.qty),
      p_length_mm: f.length ? Number(f.length) : null,
      p_width_mm: f.width ? Number(f.width) : null,
      p_thickness_mm: f.thickness ? Number(f.thickness) : null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOk(`Batch received: ${f.qty} \u00d7 ${trackingMode === 'dimensional' ? `${f.length}${f.width ? ` \u00d7 ${f.width}` : ''} mm` : 'pcs'}`);
    setF({ ...f, supplier: '', cost: '', qty: '1' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {error && <p className="flash-err" style={{ width: '100%' }}>{error}</p>}
      {ok && <p className="flash-ok" style={{ width: '100%' }}>{ok}</p>}
      <label>Supplier<br /><input value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></label>
      <label className="req">Unit cost (KES)<br /><input required type="number" step="0.01" min="0" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} style={{ width: 120 }} /></label>
      <label className="req">Qty<br /><input required type="number" min="1" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} style={{ width: 72 }} /></label>
      {trackingMode === 'dimensional' && (
        <>
          <label className="req">Length (mm)<br /><input required type="number" min="1" value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} style={{ width: 104 }} /></label>
          <label>Width (mm)<br /><input type="number" min="1" value={f.width} onChange={(e) => setF({ ...f, width: e.target.value })} style={{ width: 104 }} /></label>
          <label>Thickness (mm)<br /><input type="number" min="1" value={f.thickness} onChange={(e) => setF({ ...f, thickness: e.target.value })} style={{ width: 104 }} /></label>
        </>
      )}
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Receiving\u2026' : 'Receive batch'}</button>
    </form>
  );
}

export function IssueStockForm({ productId }: { productId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [qty, setQty] = useState('1');
  const [jobRef, setJobRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setOk(null);
    const { error } = await supabase.rpc('issue_stock', {
      p_product_id: productId, p_qty: Number(qty), p_job_reference: jobRef || null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setOk(`Issued ${qty} pcs${jobRef ? ` to ${jobRef}` : ''}`);
    setQty('1'); setJobRef('');
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {error && <p className="flash-err" style={{ width: '100%' }}>{error}</p>}
      {ok && <p className="flash-ok" style={{ width: '100%' }}>{ok}</p>}
      <label className="req">Qty<br /><input required type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 72 }} /></label>
      <label>Job reference<br /><input value={jobRef} onChange={(e) => setJobRef(e.target.value)} /></label>
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Issuing\u2026' : 'Issue stock'}</button>
    </form>
  );
}

type Cut = { length_mm: string; width_mm: string };

export function UnitsTable({ units }: { units: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const rows = units.map((u) => ({ ...u, area: u.length_mm * (u.width_mm ?? 1) }));
  const { sorted, toggle, arrow } = useSort(rows, 'status');
  const [cuttingId, setCuttingId] = useState<string | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([{ length_mm: '', width_mm: '' }]);
  const [jobRef, setJobRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmCut(unitId: string) {
    setBusy(true); setError(null);
    const offcuts = cuts
      .filter((c) => c.length_mm)
      .map((c) => ({ length_mm: Number(c.length_mm), width_mm: c.width_mm ? Number(c.width_mm) : null }));
    const { error } = await supabase.rpc('perform_cut', {
      p_unit_id: unitId, p_offcuts: offcuts, p_job_reference: jobRef || null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setCuttingId(null); setCuts([{ length_mm: '', width_mm: '' }]); setJobRef('');
    router.refresh();
  }

  const TH = ({ k, label }: { k: string; label: string }) => (
    <th className="sortable" onClick={() => toggle(k)}>{label}<span className="sort-arrow">{arrow(k)}</span></th>
  );

  return (
    <>
      {error && <p className="flash-err">{error}</p>}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Piece</th>
              <TH k="area" label="Dimensions (mm)" />
              <TH k="status" label="Status" />
              <th>Origin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => (
              <tr key={u.id}>
                <td>
                  <CutDiagram
                    length={u.length_mm} width={u.width_mm}
                    parentLength={u.parent?.length_mm} parentWidth={u.parent?.width_mm}
                    status={u.status}
                  />
                </td>
                <td><Dim l={u.length_mm} w={u.width_mm} t={u.thickness_mm} /></td>
                <td><StatusBadge status={u.status} /></td>
                <td className="muted">{u.parent_unit_id ? <>offcut of <Dim l={u.parent?.length_mm ?? 0} w={u.parent?.width_mm} /></> : 'full piece'}</td>
                <td>
                  {['in_stock', 'offcut'].includes(u.status) && (
                    cuttingId === u.id ? (
                      <div style={{ display: 'grid', gap: '0.5rem', minWidth: 280 }}>
                        <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>
                          Surviving offcuts after the cut. Leave empty if the whole piece is used.
                        </p>
                        {cuts.map((c, i) => (
                          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <input placeholder="Length mm" type="number" min="1" max={u.length_mm} value={c.length_mm}
                              onChange={(e) => setCuts(cuts.map((x, j) => (j === i ? { ...x, length_mm: e.target.value } : x)))} style={{ width: 110 }} />
                            {u.width_mm ? (
                              <input placeholder="Width mm" type="number" min="1" max={u.width_mm} value={c.width_mm}
                                onChange={(e) => setCuts(cuts.map((x, j) => (j === i ? { ...x, width_mm: e.target.value } : x)))} style={{ width: 110 }} />
                            ) : null}
                            {/* live cut preview */}
                            {c.length_mm ? (
                              <CutDiagram
                                length={Number(c.length_mm)} width={c.width_mm ? Number(c.width_mm) : (u.width_mm ? u.width_mm : null)}
                                parentLength={u.length_mm} parentWidth={u.width_mm}
                                status="offcut"
                              />
                            ) : null}
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button type="button" className="btn-secondary" onClick={() => setCuts([...cuts, { length_mm: '', width_mm: '' }])}>+ Offcut</button>
                          <input placeholder="Job reference" value={jobRef} onChange={(e) => setJobRef(e.target.value)} style={{ width: 130 }} />
                          <button type="button" className="btn-primary" disabled={busy} onClick={() => confirmCut(u.id)}>
                            {busy ? 'Cutting\u2026' : 'Confirm cut'}
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => setCuttingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-secondary" onClick={() => { setCuttingId(u.id); setCuts([{ length_mm: '', width_mm: '' }]); }}>Cut</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
