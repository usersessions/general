'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ReceiveBatchForm({ productId, trackingMode, defaultThickness }: {
  productId: string; trackingMode: string; defaultThickness: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [f, setF] = useState({ supplier: '', cost: '', qty: '1', length: '', width: '', thickness: defaultThickness ? String(defaultThickness) : '' });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.rpc('receive_batch', {
      p_product_id: productId,
      p_supplier_name: f.supplier || null,
      p_unit_cost: Number(f.cost),
      p_qty: Number(f.qty),
      p_length_mm: f.length ? Number(f.length) : null,
      p_width_mm: f.width ? Number(f.width) : null,
      p_thickness_mm: f.thickness ? Number(f.thickness) : null,
    });
    if (error) { setError(error.message); return; }
    setF({ ...f, supplier: '', cost: '', qty: '1' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
      <label>Supplier<br /><input value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></label>
      <label>Unit cost (KES)<br /><input required type="number" step="0.01" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} style={{ width: 110 }} /></label>
      <label>Qty<br /><input required type="number" min="1" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} style={{ width: 70 }} /></label>
      {trackingMode === 'dimensional' && (
        <>
          <label>Length (mm)<br /><input required type="number" value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} style={{ width: 100 }} /></label>
          <label>Width (mm)<br /><input type="number" value={f.width} onChange={(e) => setF({ ...f, width: e.target.value })} style={{ width: 100 }} /></label>
          <label>Thickness (mm)<br /><input type="number" value={f.thickness} onChange={(e) => setF({ ...f, thickness: e.target.value })} style={{ width: 100 }} /></label>
        </>
      )}
      <button className="btn-primary" type="submit">Receive</button>
    </form>
  );
}

export function IssueStockForm({ productId }: { productId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [qty, setQty] = useState('1');
  const [jobRef, setJobRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.rpc('issue_stock', {
      p_product_id: productId, p_qty: Number(qty), p_job_reference: jobRef || null,
    });
    if (error) { setError(error.message); return; }
    setQty('1'); setJobRef('');
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
      <label>Qty<br /><input required type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 70 }} /></label>
      <label>Job reference<br /><input value={jobRef} onChange={(e) => setJobRef(e.target.value)} /></label>
      <button className="btn-primary" type="submit">Issue</button>
    </form>
  );
}

type Cut = { length_mm: string; width_mm: string };

export function UnitsTable({ units }: { units: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [cuttingId, setCuttingId] = useState<string | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([{ length_mm: '', width_mm: '' }]);
  const [jobRef, setJobRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function confirmCut(unitId: string) {
    setError(null);
    const offcuts = cuts
      .filter((c) => c.length_mm)
      .map((c) => ({ length_mm: Number(c.length_mm), width_mm: c.width_mm ? Number(c.width_mm) : null }));
    const { error } = await supabase.rpc('perform_cut', {
      p_unit_id: unitId, p_offcuts: offcuts, p_job_reference: jobRef || null,
    });
    if (error) { setError(error.message); return; }
    setCuttingId(null); setCuts([{ length_mm: '', width_mm: '' }]); setJobRef('');
    router.refresh();
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Dimensions (mm)</th><th>Status</th><th>Offcut of</th><th></th></tr></thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td>{u.length_mm}{u.width_mm ? ` × ${u.width_mm}` : ''}{u.thickness_mm ? ` × ${u.thickness_mm}` : ''}</td>
              <td>{u.status}</td>
              <td>{u.parent_unit_id ? 'yes' : '-'}</td>
              <td>
                {['in_stock', 'offcut'].includes(u.status) && (
                  cuttingId === u.id ? (
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {cuts.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
                          <input placeholder="offcut length mm" type="number" value={c.length_mm}
                            onChange={(e) => setCuts(cuts.map((x, j) => (j === i ? { ...x, length_mm: e.target.value } : x)))} style={{ width: 130 }} />
                          <input placeholder="offcut width mm" type="number" value={c.width_mm}
                            onChange={(e) => setCuts(cuts.map((x, j) => (j === i ? { ...x, width_mm: e.target.value } : x)))} style={{ width: 130 }} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button type="button" className="btn-secondary" onClick={() => setCuts([...cuts, { length_mm: '', width_mm: '' }])}>+ offcut</button>
                        <input placeholder="job reference" value={jobRef} onChange={(e) => setJobRef(e.target.value)} style={{ width: 130 }} />
                        <button type="button" className="btn-primary" onClick={() => confirmCut(u.id)}>Confirm cut</button>
                        <button type="button" className="btn-secondary" onClick={() => setCuttingId(null)}>Cancel</button>
                      </div>
                      <p className="muted" style={{ margin: 0 }}>Leave offcut rows empty if the whole piece was used.</p>
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
    </>
  );
}
