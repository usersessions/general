'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import CutDiagram from '@/components/cut-diagram';
import Dim from '@/components/dim';
import EmptyState from '@/components/empty-state';

const CATEGORIES = ['', 'glass', 'aluminium', 'upvc', 'hardware', 'consumable'];

export default function OffcutSearchPage() {
  const supabase = createClient();
  const [f, setF] = useState({ category: '', thickness: '', minLength: '', minWidth: '' });
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    let q = supabase
      .from('stock_units')
      .select('*, product:products!inner(name, category), parent:stock_units!stock_units_parent_unit_id_fkey(length_mm, width_mm)')
      .eq('status', 'offcut');
    if (f.category) q = q.eq('products.category', f.category);
    if (f.thickness) q = q.eq('thickness_mm', Number(f.thickness));
    if (f.minLength) q = q.gte('length_mm', Number(f.minLength));
    if (f.minWidth) q = q.gte('width_mm', Number(f.minWidth));
    const { data, error } = await q.order('length_mm');
    setBusy(false);
    if (error) { setError(error.message); return; }
    setResults(data ?? []);
  }

  return (
    <>
      <h1>Offcut search</h1>
      <p className="muted">Check for a usable remnant before cutting fresh stock.</p>
      <form className="card" onSubmit={search} style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {error && <p className="flash-err" style={{ width: '100%' }}>{error}</p>}
        <label>Category<br />
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'any'}</option>)}
          </select>
        </label>
        <label>Thickness (mm)<br /><input type="number" min="1" value={f.thickness} onChange={(e) => setF({ ...f, thickness: e.target.value })} style={{ width: 104 }} /></label>
        <label>Min length (mm)<br /><input type="number" min="1" value={f.minLength} onChange={(e) => setF({ ...f, minLength: e.target.value })} style={{ width: 104 }} /></label>
        <label>Min width (mm)<br /><input type="number" min="1" value={f.minWidth} onChange={(e) => setF({ ...f, minWidth: e.target.value })} style={{ width: 104 }} /></label>
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Searching\u2026' : 'Search offcuts'}</button>
      </form>
      {results && (
        <div className="card">
          {results.length === 0 ? (
            <EmptyState title="No matching offcuts" hint="Widen the dimensions, or cut from fresh stock and log the remnant here." />
          ) : (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Piece</th><th>Product</th><th>Dimensions (mm)</th><th>Cut from</th><th>Unit ID</th></tr></thead>
                <tbody>
                  {results.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <CutDiagram length={u.length_mm} width={u.width_mm}
                          parentLength={u.parent?.length_mm} parentWidth={u.parent?.width_mm} status="offcut" />
                      </td>
                      <td>{u.product?.name}</td>
                      <td><Dim l={u.length_mm} w={u.width_mm} t={u.thickness_mm} /></td>
                      <td className="muted">{u.parent ? <Dim l={u.parent.length_mm} w={u.parent.width_mm} /> : '\u2014'}</td>
                      <td className="mono" style={{ fontSize: '0.6875rem' }}>{u.id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
