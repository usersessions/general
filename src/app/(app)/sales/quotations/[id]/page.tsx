import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuoteActions from './quote-actions';
import StatusBadge from '@/components/status-badge';
import QuoteDetailCalculator from './quote-detail-calculator';

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: q } = await supabase
    .from('quotations')
    .select('*, client:clients(name, email, location, phone), lines:quotation_line_items(*)')
    .eq('id', id)
    .single();
  if (!q) notFound();
  const { data: totals } = await supabase.from('v_quotation_totals').select('*').eq('quotation_id', id).single();
  const { data: order } = await supabase.from('sales_orders').select('id, order_number').eq('quotation_id', id).maybeSingle();

  // Try parsing calculator state from notes column
  let calculatorState: any = null;
  if (q.notes) {
    try {
      const parsed = JSON.parse(q.notes);
      if (parsed && parsed.calculator) {
        calculatorState = parsed;
      }
    } catch (e) {
      // Plain text notes, render fallback view
    }
  }

  return (
    <>
      {calculatorState ? (
        <QuoteDetailCalculator 
          quotationId={q.id}
          calculatorState={calculatorState}
          client={q.client}
          quoteNumber={q.quote_number}
          quoteDateStr={q.created_at.slice(0, 10)}
          validUntilStr={q.valid_until}
        />
      ) : (
        <>
          <h1 className="mono">{q.quote_number}</h1>
          <p className="muted" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {q.client?.name} <StatusBadge status={q.status} />
            {q.valid_until ? <span className="mono">valid until {q.valid_until}</span> : null}
          </p>
          <div className="card">
            <table>
              <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
              <tbody>
                {(q.lines ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td>{l.description}</td><td>{l.qty}</td>
                    <td>{Number(l.unit_price).toLocaleString()}</td>
                    <td>{(Number(l.qty) * Number(l.unit_price)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totals && (
              <p className="mono" style={{ textAlign: 'right', lineHeight: 1.9 }}>
                <span className="muted">Subtotal</span> KES {Number(totals.subtotal).toLocaleString()}<br />
                <span className="muted">VAT ({q.vat_rate}%)</span> KES {Number(totals.vat_amount).toLocaleString()}<br />
                <strong>Total KES {Number(totals.total).toLocaleString()}</strong>
              </p>
            )}
          </div>
          {q.notes && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>Notes</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{q.notes}</p>
            </div>
          )}
        </>
      )}
      
      <div className="no-print" style={{ marginTop: '1.5rem' }}>
        <QuoteActions quotationId={q.id} status={q.status} orderId={order?.id ?? null} orderNumber={order?.order_number ?? null} />
      </div>
    </>
  );
}
