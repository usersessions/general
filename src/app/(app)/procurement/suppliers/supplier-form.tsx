'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SupplierForm() {
  const router = useRouter();
  const supabase = createClient();
  const [f, setF] = useState({ name: '', contact_person: '', phone: '', email: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('suppliers').insert({
      name: f.name, contact_person: f.contact_person || null, phone: f.phone || null, email: f.email || null,
    });
    if (error) { setError(error.message); return; }
    setF({ name: '', contact_person: '', phone: '', email: '' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
      <label>Name<br /><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Contact person<br /><input value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} /></label>
      <label>Phone<br /><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
      <label>Email<br /><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <button className="btn-primary" type="submit">Add</button>
    </form>
  );
}
