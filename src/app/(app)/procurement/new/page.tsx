'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Item = { product_id: string; qty: string; unit_cost: string; length_mm: string; width_mm: string; thickness_mm: string };
const emptyItem: Item = { product_id: '', qty: '1', unit_cost: '', length_mm: '', width_mm: '', thickness_mm: '' };

export default function NewPoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Item[]>([{ ...emptyItem }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('suppliers').select('id, name').order('name').then(({ data }) => setSuppliers(data ?? []));
    supabase.from('products').select('id, name, tracking_mode').order('name').then(({ data }) => setProducts(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productMode = (id: string) => products.find((p) => p.id === id)?.tracking_mode;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert({ supplier_id: supplierId, notes: notes || null })
      .select('id')
      .single();
    if (error || !po) { setError(error?.message ?? 'Failed'); return; }
    const rows = items.filter((i) => i.product_id).map((i) => ({
      purchase_order_id: po.id,
      product_id: i.product_id,
      qty: Number(i.qty),
      unit_cost: Number(i.unit_cost),
      length_mm: i.length_mm ? Number(i.length_mm) : null,
      width_mm: i.width_mm ? Number(i.width_mm) : null,
      thickness_mm: i.thickness_mm ? Number(i.thickness_mm) : null,
    }));
    if (rows.length > 0) {
      const { error: itemErr } = await supabase.from('purchase_order_items').insert(rows);
      if (itemErr) { setError(itemErr.message); return; }
    }
    router.push(`/procurement/${po.id}`);
  }

  return (
    <>
      <h1>New purchase order</h1>
      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
        {error && <p className="error">{error}</p>}
        <label>Supplier<br />
          <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select supplier...</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <h3>Items</h3>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select value={it.product_id} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, product_id: e.target.value } : x)))} style={{ minWidth: 200 }}>
              <option value="">Product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Qty" type="number" min="1" value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} style={{ width: 70 }} />
            <input placeholder="Unit cost" type="number" step="0.01" value={it.unit_cost} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, unit_cost: e.target.value } : x)))} style={{ width: 110 }} />
            {productMode(it.product_id) === 'dimensional' && (
              <>
                <input placeholder="Length mm" type="number" value={it.length_mm} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, length_mm: e.target.value } : x)))} style={{ width: 100 }} />
                <input placeholder="Width mm" type="number" value={it.width_mm} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, width_mm: e.target.value } : x)))} style={{ width: 100 }} />
                <input placeholder="Thickness mm" type="number" value={it.thickness_mm} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, thickness_mm: e.target.value } : x)))} style={{ width: 110 }} />
              </>
            )}
          </div>
        ))}
        <div><button type="button" className="btn-secondary" onClick={() => setItems([...items, { ...emptyItem }])}>+ Item</button></div>
        <label>Notes<br /><input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%' }} /></label>
        <button className="btn-primary" type="submit">Create draft PO</button>
      </form>
    </>
  );
}
