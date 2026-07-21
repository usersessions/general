import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function SalesPage() {
  const supabase = await createClient();
  const [{ data: quotations }, { data: orders }, { data: invoices }] = await Promise.all([
    supabase.from('quotations').select('id, quote_number, status, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(25),
    supabase.from('sales_orders').select('id, order_number, status, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(25),
    supabase.from('sales_invoices').select('id, invoice_number, status, amount_paid, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(25),
  ]);

  return (
    <>
      <h1>Sales</h1>
      <p>
        <Link href="/sales/quotations/new">+ New quotation</Link>
        {' · '}
        <Link href="/sales/clients">Clients</Link>
      </p>
      <div className="card">
        <h3>Quotations</h3>
        <table>
          <thead><tr><th>Number</th><th>Client</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {(quotations ?? []).map((q: any) => (
              <tr key={q.id}>
                <td><Link href={`/sales/quotations/${q.id}`}>{q.quote_number}</Link></td>
                <td>{q.client?.name}</td><td>{q.status}</td><td>{q.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Sales orders</h3>
        <table>
          <thead><tr><th>Number</th><th>Client</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {(orders ?? []).map((o: any) => (
              <tr key={o.id}>
                <td><Link href={`/sales/orders/${o.id}`}>{o.order_number}</Link></td>
                <td>{o.client?.name}</td><td>{o.status}</td><td>{o.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Invoices</h3>
        <table>
          <thead><tr><th>Number</th><th>Client</th><th>Status</th><th>Paid (KES)</th><th>Created</th></tr></thead>
          <tbody>
            {(invoices ?? []).map((i: any) => (
              <tr key={i.id}>
                <td><Link href={`/sales/invoices/${i.id}`}>{i.invoice_number}</Link></td>
                <td>{i.client?.name}</td><td>{i.status}</td><td>{Number(i.amount_paid).toLocaleString()}</td><td>{i.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
