import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import PayForm from './pay-form';

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data: invoice } = await supabase
    .from('sales_invoices')
    .select('id, invoice_number, status, amount_paid, client:clients(name)')
    .eq('payment_token', token)
    .single();
  if (!invoice) notFound();

  const { data: totals } = await supabase.from('v_invoice_totals').select('total').eq('invoice_id', invoice.id).single();
  const balance = Number(totals?.total ?? 0) - Number(invoice.amount_paid);
  const client = invoice.client as unknown as { name: string } | null;

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>I&amp;S General Supplies Ltd</h1>
        <p>
          Invoice <strong>{invoice.invoice_number}</strong><br />
          {client?.name}
        </p>
        {balance <= 0 || invoice.status === 'paid' ? (
          <p>This invoice has been fully paid. Thank you!</p>
        ) : !['issued', 'partially_paid'].includes(invoice.status) ? (
          <p>This invoice is not currently payable. Please contact us.</p>
        ) : (
          <>
            <p>Balance due: <strong>KES {balance.toLocaleString()}</strong></p>
            <PayForm token={token} />
          </>
        )}
      </div>
    </main>
  );
}
