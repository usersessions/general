'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function QuoteActions({ quotationId, status, orderId, orderNumber }: {
  quotationId: string; status: string; orderId: string | null; orderNumber: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendEmail() {
    setBusy(true); setError(null); setMsg(null);
    const res = await fetch(`/api/quotations/${quotationId}/send`, { method: 'POST' });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setError(body.error ?? 'Send failed'); return; }
    setMsg('Quotation emailed to client.');
    router.refresh();
  }

  async function accept() {
    setBusy(true); setError(null);
    const { data, error } = await supabase.rpc('accept_quotation', { p_quotation_id: quotationId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push(`/sales/orders/${data}`);
  }

  async function reject() {
    setBusy(true); setError(null);
    const { error } = await supabase.from('quotations').update({ status: 'rejected' }).eq('id', quotationId);
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      {msg && <p>{msg}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }} href={`/api/quotations/${quotationId}/pdf`} target="_blank">Download PDF</a>
        <button className="btn-primary" disabled={busy} onClick={sendEmail}>Email to client</button>
        {['draft', 'sent'].includes(status) && (
          <>
            <button className="btn-primary" disabled={busy} onClick={accept}>Client accepted (create order)</button>
            <button className="btn-secondary" disabled={busy} onClick={reject}>Mark rejected</button>
          </>
        )}
        {orderId && <Link href={`/sales/orders/${orderId}`}>Order {orderNumber}</Link>}
      </div>
    </div>
  );
}
