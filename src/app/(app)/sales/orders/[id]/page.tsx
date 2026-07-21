import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderActions from './order-actions';
import StatusBadge from '@/components/status-badge';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from('sales_orders')
    .select('*, client:clients(name), quotation:quotations(quote_number)')
    .eq('id', id)
    .single();
  if (!order) notFound();

  const [{ data: reservations }, { data: invoices }] = await Promise.all([
    supabase.from('sales_order_reservations').select('id, stock_unit:stock_units(id, length_mm, width_mm, thickness_mm, status, product:products(name))').eq('sales_order_id', id),
    supabase.from('sales_invoices').select('id, invoice_number, status').eq('sales_order_id', id),
  ]);

  return (
    <>
      <h1 className="mono">{order.order_number}</h1>
      <p className="muted" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {order.client?.name} <StatusBadge status={order.status} />
        {order.quotation ? <span className="mono">from {order.quotation.quote_number}</span> : null}
      </p>
      <div className="card">
        <h3>Reserved stock units</h3>
        <table>
          <thead><tr><th>Product</th><th>Dimensions (mm)</th><th>Status</th></tr></thead>
          <tbody>
            {(reservations ?? []).map((r: any) => (
              <tr key={r.id}>
                <td>{r.stock_unit?.product?.name}</td>
                <td>{r.stock_unit?.length_mm}{r.stock_unit?.width_mm ? ` × ${r.stock_unit.width_mm}` : ''}</td>
                <td>{r.stock_unit?.status}</td>
              </tr>
            ))}
            {(reservations ?? []).length === 0 && <tr><td colSpan={3} className="muted">No units reserved yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <OrderActions orderId={order.id} status={order.status} />
      {(invoices ?? []).length > 0 && (
        <div className="card">
          <h3>Invoices</h3>
          {(invoices ?? []).map((i: any) => (
            <p key={i.id}><Link href={`/sales/invoices/${i.id}`}>{i.invoice_number}</Link> · {i.status}</p>
          ))}
        </div>
      )}
    </>
  );
}
