import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/status-badge';
import EmptyState from '@/components/empty-state';

export default async function SalesPage() {
  const supabase = await createClient();
  const [{ data: quotations }, { data: orders }, { data: invoices }] = await Promise.all([
    supabase.from('quotations').select('id, quote_number, status, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(25),
    supabase.from('sales_orders').select('id, order_number, status, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(25),
    supabase.from('sales_invoices').select('id, invoice_number, status, amount_paid, created_at, client:clients(name)').order('created_at', { ascending: false }).limit(25),
  ]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Sales</h1>
          <p className="muted">Quotation → order → invoice → payment.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn-secondary" style={{ textDecoration: 'none' }} href="/sales/clients">Clients</Link>
          <Link className="btn-primary" style={{ textDecoration: 'none' }} href="/sales/quotations/new">New quotation</Link>
        </div>
      </div>

      <div className="card">
        <h3>Quotations</h3>
        {(quotations ?? []).length === 0 ? (
          <EmptyState title="No quotations yet" hint="Create a quotation to start the pipeline."
            action={<Link className="btn-primary" style={{ textDecoration: 'none' }} href="/sales/quotations/new">New quotation</Link>} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Number</th><th>Client</th><th>Status</th><th className="num">Created</th></tr></thead>
              <tbody>
                {(quotations ?? []).map((q: any) => (
                  <tr key={q.id}>
                    <td className="mono"><Link href={`/sales/quotations/${q.id}`}>{q.quote_number}</Link></td>
                    <td>{q.client?.name}</td>
                    <td><StatusBadge status={q.status} /></td>
                    <td className="num">{q.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Sales orders</h3>
        {(orders ?? []).length === 0 ? (
          <EmptyState title="No orders yet" hint="Orders are created when a client accepts a quotation." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Number</th><th>Client</th><th>Status</th><th className="num">Created</th></tr></thead>
              <tbody>
                {(orders ?? []).map((o: any) => (
                  <tr key={o.id}>
                    <td className="mono"><Link href={`/sales/orders/${o.id}`}>{o.order_number}</Link></td>
                    <td>{o.client?.name}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{o.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Invoices</h3>
        {(invoices ?? []).length === 0 ? (
          <EmptyState title="No invoices yet" hint="Generate an invoice from a delivered sales order." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Number</th><th>Client</th><th>Status</th><th className="num">Paid (KES)</th><th className="num">Created</th></tr></thead>
              <tbody>
                {(invoices ?? []).map((i: any) => (
                  <tr key={i.id}>
                    <td className="mono"><Link href={`/sales/invoices/${i.id}`}>{i.invoice_number}</Link></td>
                    <td>{i.client?.name}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="num">{Number(i.amount_paid).toLocaleString()}</td>
                    <td className="num">{i.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
