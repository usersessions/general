'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = ['', 'glass', 'aluminium', 'upvc', 'hardware', 'consumable'];

export default function OffcutSearchPage() {
  const supabase = createClient();
  const [f, setF] = useState({ category: '', thickness: '', minLength: '', minWidth: '' });
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let q = supabase
      .from('stock_units')
      .select('*, product:products!inner(name, category)')
      .eq('status', 'offcut');
    if (f.category) q = q.eq('products.category', f.category);
    if (f.thickness) q = q.eq('thickness_mm', Number(f.thickness));
    if (f.minLength) q = q.gte('length_mm', Number(f.minLength));
    if (f.minWidth) q = q.gte('width_mm', Number(f.minWidth));
    const { data, error } = await q.order('length_mm');
    if (error) { setError(error.message); return; }
    setResults(data ?? []);
  }

  return (
    <>
      <h1>Offcut search</h1>
      <p className="muted">Check for a usable remnant before cutting fresh stock.</p>
      <form className="card" onSubmit={search} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
        <label>Category<br />
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'any'}</option>)}
          </select>
        </label>
        <label>Thickness (mm)<br /><input type="number" value={f.thickness} onChange={(e) => setF({ ...f, thickness: e.target.value })} style={{ width: 110 }} /></label>
        <label>Min length (mm)<br /><input type="number" value={f.minLength} onChange={(e) => setF({ ...f, minLength: e.target.value })} style={{ width: 110 }} /></label>
        <label>Min width (mm)<br /><input type="number" value={f.minWidth} onChange={(e) => setF({ ...f, minWidth: e.target.value })} style={{ width: 110 }} /></label>
        <button className="btn-primary" type="submit">Search</button>
      </form>
      {results && (
        <div className="card">
          <table>
            <thead><tr><th>Product</th><th>Dimensions (mm)</th><th>Unit ID</th></tr></thead>
            <tbody>
              {results.map((u) => (
                <tr key={u.id}>
                  <td>{u.product?.name}</td>
                  <td>{u.length_mm}{u.width_mm ? ` × ${u.width_mm}` : ''}{u.thickness_mm ? ` × ${u.thickness_mm}` : ''}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{u.id}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={3} className="muted">No matching offcuts.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
