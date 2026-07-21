'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ClientForm() {
  const router = useRouter();
  const supabase = createClient();
  const [f, setF] = useState({ name: '', email: '', phone: '', location: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('clients').insert({
      name: f.name, email: f.email || null, phone: f.phone || null, location: f.location || null,
    });
    if (error) { setError(error.message); return; }
    setF({ name: '', email: '', phone: '', location: '' });
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {error && <p className="error" style={{ width: '100%' }}>{error}</p>}
      <label>Name<br /><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Email<br /><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label>Phone<br /><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
      <label>Location<br /><input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
      <button className="btn-primary" type="submit">Add</button>
    </form>
  );
}
