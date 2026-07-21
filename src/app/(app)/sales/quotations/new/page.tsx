'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Line = { description: string; qty: string; unit_price: string };

export default function NewQuotationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ description: '', qty: '1', unit_price: '' }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_price) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { data: q, error } = await supabase
      .from('quotations')
      .insert({ client_id: clientId, valid_until: validUntil || null, notes: notes || null })
      .select('id')
      .single();
    if (error || !q) { setError(error?.message ?? 'Failed'); return; }
    const items = lines.filter((l) => l.description).map((l) => ({
      quotation_id: q.id, description: l.description, qty: Number(l.qty), unit_price: Number(l.unit_price),
    }));
    if (items.length > 0) {
      const { error: lineErr } = await supabase.from('quotation_line_items').insert(items);
      if (lineErr) { setError(lineErr.message); return; }
    }
    router.push(`/sales/quotations/${q.id}`);
  }

  return (
    <>
      <h1>New quotation</h1>
      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
        {error && <p className="error">{error}</p>}
        <label>Client<br />
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select client...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Valid until<br /><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></label>
        <h3>Line items</h3>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input placeholder="Description (e.g. 6mm toughened glass 1200×900)" value={l.description}
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} style={{ flex: 3, minWidth: 260 }} />
            <input placeholder="Qty" type="number" step="0.01" value={l.qty}
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} style={{ width: 80 }} />
            <input placeholder="Unit price (KES)" type="number" step="0.01" value={l.unit_price}
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unit_price: e.target.value } : x)))} style={{ width: 140 }} />
          </div>
        ))}
        <div>
          <button type="button" className="btn-secondary" onClick={() => setLines([...lines, { description: '', qty: '1', unit_price: '' }])}>+ Line</button>
        </div>
        <label>Notes<br /><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: '100%', font: 'inherit', padding: '0.45rem', border: '1px solid var(--border)', borderRadius: 6 }} /></label>
        <p><strong>Subtotal: KES {subtotal.toLocaleString()}</strong> (+16% VAT = KES {(subtotal * 1.16).toLocaleString()})</p>
        <button className="btn-primary" type="submit">Create quotation</button>
      </form>
    </>
  );
}
