import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuoteActions from './quote-actions';

export default async function QuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: q } = await supabase
    .from('quotations')
    .select('*, client:clients(name, email, location), lines:quotation_line_items(*)')
    .eq('id', id)
    .single();
  if (!q) notFound();
  const { data: totals } = await supabase.from('v_quotation_totals').select('*').eq('quotation_id', id).single();
  const { data: order } = await supabase.from('sales_orders').select('id, order_number').eq('quotation_id', id).maybeSingle();

  return (
    <>
      <h1>{q.quote_number}</h1>
      <p className="muted">{q.client?.name} · {q.status}{q.valid_until ? ` · valid until ${q.valid_until}` : ''}</p>
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
          <p style={{ textAlign: 'right' }}>
            Subtotal: KES {Number(totals.subtotal).toLocaleString()}<br />
            VAT ({q.vat_rate}%): KES {Number(totals.vat_amount).toLocaleString()}<br />
            <strong>Total: KES {Number(totals.total).toLocaleString()}</strong>
          </p>
        )}
      </div>
      <QuoteActions quotationId={q.id} status={q.status} orderId={order?.id ?? null} orderNumber={order?.order_number ?? null} />
    </>
  );
}
