'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc('issue_invoice', { p_invoice_id: invoiceId });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function sendEmail() {
    setBusy(true); setError(null); setMsg(null);
    const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) { setError(body.error ?? 'Send failed'); return; }
    setMsg('Invoice emailed to client.');
  }

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      {msg && <p>{msg}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }} href={`/api/invoices/${invoiceId}/pdf`} target="_blank">Download PDF</a>
        {status === 'draft' && <button className="btn-primary" disabled={busy} onClick={issue}>Issue invoice</button>}
        {status !== 'draft' && <button className="btn-primary" disabled={busy} onClick={sendEmail}>Email to client</button>}
      </div>
    </div>
  );
}
