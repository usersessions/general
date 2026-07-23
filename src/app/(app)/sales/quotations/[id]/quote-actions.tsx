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
    const { data: orderId, error: accErr } = await supabase.rpc('accept_quotation', { p_quotation_id: quotationId });
    if (accErr) { setError(accErr.message); setBusy(false); return; }

    // Auto-allocate stock if this was a calculator quotation
    const { data: q } = await supabase.from('quotations').select('notes').eq('id', quotationId).single();
    if (q?.notes) {
      try {
        const state = JSON.parse(q.notes);
        if (state.calculator) {
          const reqs: any[] = [];
          
          const processItems = (items: any[], multiplier: number) => {
            if (!items) return;
            items.forEach((it: any) => {
              if (it.product_id && it.qty > 0) {
                const u = (it.unit || '').toLowerCase();
                let length_mm = null;
                let finalQty = it.qty * multiplier;
                
                // If it's a length-based unit, assume we need 1 piece of the total length per window/door
                if (['ft', 'feet'].includes(u)) { length_mm = it.qty * 304.8; finalQty = multiplier; }
                else if (['m', 'meter', 'meters'].includes(u)) { length_mm = it.qty * 1000; finalQty = multiplier; }
                else if (['in', 'inch'].includes(u)) { length_mm = it.qty * 25.4; finalQty = multiplier; }
                else if (u === 'mm') { length_mm = it.qty; finalQty = multiplier; }
                else if (['sqft', 'sqm'].includes(u)) {
                   // Glass is usually dimensional with area, but for auto-allocation we might treat it as count or standard piece
                   // If it's area, we can't easily auto-cut it without width/height. We'll pass it without length_mm
                }

                reqs.push({
                  product_id: it.product_id,
                  qty: finalQty,
                  length_mm: length_mm ? Math.round(length_mm) : null
                });
              }
            });
          };

          processItems(state.windowItems, state.windowQty || 1);
          processItems(state.doorItems, state.doorQty || 1);
          processItems(state.customItems, 1);

          if (reqs.length > 0) {
            const { error: allocErr } = await supabase.rpc('auto_process_sales_order', { p_order_id: orderId, p_items: reqs });
            if (allocErr) {
              console.error('Allocation error:', allocErr);
              // We won't block the redirect, but could show a warning
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse quote notes for allocation', e);
      }
    }

    setBusy(false);
    router.push(`/sales/orders/${orderId}`);
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
