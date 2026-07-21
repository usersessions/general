import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReceiveBatchForm, IssueStockForm, UnitsTable } from './components';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  if (!product) notFound();

  const [{ data: units }, { data: batches }] = await Promise.all([
    supabase.from('stock_units').select('*').eq('product_id', id).neq('status', 'consumed').order('created_at', { ascending: false }),
    supabase.from('stock_batches_safe').select('*').eq('product_id', id).order('received_at', { ascending: false }),
  ]);

  return (
    <>
      <h1>{product.name}</h1>
      <p className="muted">{product.category} · {product.unit_type} · {product.tracking_mode}</p>

      <div className="card">
        <h3>Receive batch</h3>
        <ReceiveBatchForm productId={product.id} trackingMode={product.tracking_mode} defaultThickness={product.default_thickness_mm} />
      </div>

      {product.tracking_mode === 'count' && (
        <div className="card">
          <h3>Issue stock (FIFO)</h3>
          <IssueStockForm productId={product.id} />
        </div>
      )}

      {product.tracking_mode === 'dimensional' && (
        <div className="card">
          <h3>Stock units</h3>
          <UnitsTable units={units ?? []} />
        </div>
      )}

      <div className="card">
        <h3>Batches</h3>
        <table>
          <thead><tr><th>Received</th><th>Supplier</th><th>Qty received</th><th>Qty remaining</th></tr></thead>
          <tbody>
            {(batches ?? []).map((b: any) => (
              <tr key={b.id}>
                <td>{b.received_at}</td><td>{b.supplier_name ?? '-'}</td>
                <td>{b.qty_received}</td>
                <td>{product.tracking_mode === 'count' ? b.qty_remaining : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Unit costs are visible to finance and admin roles only.</p>
      </div>
    </>
  );
}
