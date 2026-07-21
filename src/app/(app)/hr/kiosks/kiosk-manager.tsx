'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function KioskManager({ kiosks }: { kiosks: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function addKiosk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('kiosk_devices').insert({ name });
    if (error) { setError(error.message); return; }
    setName('');
    router.refresh();
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from('kiosk_devices').update({ active: !active }).eq('id', id);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      <form onSubmit={addKiosk} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input required placeholder="e.g. Workshop tablet" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary">Add kiosk</button>
      </form>
      <table>
        <thead><tr><th>Name</th><th>Device key</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {kiosks.map((k) => (
            <tr key={k.id}>
              <td>{k.name}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{k.device_key}</td>
              <td>{k.active ? 'yes' : 'no'}</td>
              <td><button className="btn-secondary" onClick={() => toggle(k.id, k.active)}>{k.active ? 'Deactivate' : 'Activate'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
