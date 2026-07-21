'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function OrderActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState({ minLength: '', minWidth: '', thickness: '' });
  const [candidates, setCandidates] = useState<any[] | null>(null);

  async function findUnits(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let q = supabase
      .from('stock_units')
      .select('*, product:products(name)')
      .in('status', ['in_stock', 'offcut']);
    if (search.minLength) q = q.gte('length_mm', Number(search.minLength));
    if (search.minWidth) q = q.gte('width_mm', Number(search.minWidth));
    if (search.thickness) q = q.eq('thickness_mm', Number(search.thickness));
    const { data, error } = await q.order('status', { ascending: false }).limit(30); // offcuts first
    if (error) { setError(error.message); return; }
    setCandidates(data ?? []);
  }

  async function reserve(unitId: string) {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('reserve_stock_unit', { p_order_id: orderId, p_unit_id: unitId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setCandidates((c) => (c ?? []).filter((u) => u.id !== unitId));
    router.refresh();
  }

  async function deliver() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('deliver_order', { p_order_id: orderId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function createInvoice() {
    setBusy(true); setError(null);
    const { data, error } = await supabase.rpc('create_invoice_from_order', { p_order_id: orderId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push(`/sales/invoices/${data}`);
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      {['open', 'in_progress'].includes(status) && (
        <>
          <h3>Reserve stock (offcuts shown first)</h3>
          <form onSubmit={findUnits} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label>Min length (mm)<br /><input type="number" value={search.minLength} onChange={(e) => setSearch({ ...search, minLength: e.target.value })} style={{ width: 110 }} /></label>
            <label>Min width (mm)<br /><input type="number" value={search.minWidth} onChange={(e) => setSearch({ ...search, minWidth: e.target.value })} style={{ width: 110 }} /></label>
            <label>Thickness (mm)<br /><input type="number" value={search.thickness} onChange={(e) => setSearch({ ...search, thickness: e.target.value })} style={{ width: 110 }} /></label>
            <button className="btn-secondary" type="submit">Find units</button>
          </form>
          {candidates && (
            <table style={{ marginTop: '0.75rem' }}>
              <thead><tr><th>Product</th><th>Dimensions (mm)</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {candidates.map((u) => (
                  <tr key={u.id}>
                    <td>{u.product?.name}</td>
                    <td>{u.length_mm}{u.width_mm ? ` × ${u.width_mm}` : ''}{u.thickness_mm ? ` × ${u.thickness_mm}` : ''}</td>
                    <td>{u.status}</td>
                    <td><button className="btn-primary" disabled={busy} onClick={() => reserve(u.id)}>Reserve</button></td>
                  </tr>
                ))}
                {candidates.length === 0 && <tr><td colSpan={4} className="muted">No available units match.</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {['open', 'in_progress'].includes(status) && (
          <button className="btn-primary" disabled={busy} onClick={deliver}>Mark delivered (consume reserved stock)</button>
        )}
        <button className="btn-secondary" disabled={busy} onClick={createInvoice}>Generate invoice</button>
      </div>
    </div>
  );
}
