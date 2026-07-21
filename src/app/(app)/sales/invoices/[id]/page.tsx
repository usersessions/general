import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import InvoiceActions from './invoice-actions';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from('sales_invoices')
    .select('*, client:clients(name, email), lines:invoice_line_items(*)')
    .eq('id', id)
    .single();
  if (!inv) notFound();
  const { data: totals } = await supabase.from('v_invoice_totals').select('*').eq('invoice_id', id).single();

  return (
    <>
      <h1>{inv.invoice_number}</h1>
      <p className="muted">
        {inv.client?.name} · {inv.status}
        {inv.due_date ? ` · due ${inv.due_date}` : ''}
      </p>
      <div className="card">
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
          <tbody>
            {(inv.lines ?? []).map((l: any) => (
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
            VAT ({inv.vat_rate}%): KES {Number(totals.vat_amount).toLocaleString()}<br />
            <strong>Total: KES {Number(totals.total).toLocaleString()}</strong><br />
            Paid: KES {Number(inv.amount_paid).toLocaleString()}
          </p>
        )}
      </div>
      <InvoiceActions invoiceId={inv.id} status={inv.status} />
    </>
  );
}
