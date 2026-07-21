'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = ['glass', 'aluminium', 'upvc', 'hardware', 'consumable'];

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    name: '', category: 'glass', unit_type: 'sheet',
    tracking_mode: 'dimensional', default_thickness_mm: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('products').insert({
      name: form.name,
      category: form.category,
      unit_type: form.unit_type,
      tracking_mode: form.tracking_mode,
      default_thickness_mm: form.default_thickness_mm ? Number(form.default_thickness_mm) : null,
    });
    if (error) { setError(error.message); return; }
    router.push('/inventory');
    router.refresh();
  }

  return (
    <>
      <h1>Add product</h1>
      <form className="card" onSubmit={submit} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
        {error && <p className="error">{error}</p>}
        <label>Name<br />
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
        </label>
        <label>Category<br />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Unit type (sheet, bar, pcs, tube...)<br />
          <input required value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })} />
        </label>
        <label>Tracking mode<br />
          <select value={form.tracking_mode} onChange={(e) => setForm({ ...form, tracking_mode: e.target.value })}>
            <option value="dimensional">dimensional (per-piece, cuttable)</option>
            <option value="count">count (simple quantity)</option>
          </select>
        </label>
        {form.tracking_mode === 'dimensional' && (
          <label>Default thickness (mm, optional)<br />
            <input type="number" value={form.default_thickness_mm} onChange={(e) => setForm({ ...form, default_thickness_mm: e.target.value })} />
          </label>
        )}
        <button className="btn-primary" type="submit">Create product</button>
      </form>
    </>
  );
}
