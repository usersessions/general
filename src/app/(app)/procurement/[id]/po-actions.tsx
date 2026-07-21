'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PoActions({ poId, status, canApprove }: {
  poId: string; status: string; canApprove: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true); setError(null);
    const { error } = await supabase.from('purchase_orders').update({ status: next }).eq('id', poId);
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function receive() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('receive_purchase_order', { p_po_id: poId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {status === 'draft' && (
          <button className="btn-primary" disabled={busy} onClick={() => setStatus('pending_approval')}>Submit for approval</button>
        )}
        {status === 'pending_approval' && canApprove && (
          <>
            <button className="btn-primary" disabled={busy} onClick={() => setStatus('approved')}>Approve</button>
            <button className="btn-secondary" disabled={busy} onClick={() => setStatus('rejected')}>Reject</button>
          </>
        )}
        {status === 'pending_approval' && !canApprove && (
          <p className="muted">Awaiting finance/admin approval.</p>
        )}
        {status === 'approved' && (
          <button className="btn-primary" disabled={busy} onClick={receive}>Receive into stock</button>
        )}
        {['draft', 'pending_approval', 'approved'].includes(status) && (
          <button className="btn-secondary" disabled={busy} onClick={() => setStatus('cancelled')}>Cancel PO</button>
        )}
      </div>
    </div>
  );
}
