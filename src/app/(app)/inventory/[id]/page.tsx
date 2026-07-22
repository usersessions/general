import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReceiveBatchForm, IssueStockForm, UnitsTable } from './components';
import EmptyState from '@/components/empty-state';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
  if (!product) notFound();

  const [{ data: units }, { data: batches }] = await Promise.all([
    supabase
      .from('stock_units')
      .select('*, parent:stock_units!parent_unit_id(length_mm, width_mm)')
      .eq('product_id', id)
      .neq('status', 'consumed')
      .order('created_at', { ascending: false }),
    supabase.from('stock_batches_safe').select('*').eq('product_id', id).order('received_at', { ascending: false }),
  ]);

  return (
    <>
      <h1>{product.name}</h1>
      <p className="muted">
        {product.category} · {product.unit_type} · {product.tracking_mode}
        {product.default_thickness_mm ? <> · default <span className="dim">{product.default_thickness_mm}mm</span></> : null}
      </p>

      <div className="card">
        <h3>Receive batch</h3>
        <ReceiveBatchForm productId={product.id} trackingMode={product.tracking_mode} defaultThickness={product.default_thickness_mm} />
      </div>

      {product.tracking_mode === 'count' && (
        <div className="card">
          <h3>Issue stock</h3>
          <p className="muted" style={{ marginTop: '-0.25rem' }}>Issued oldest batch first (FIFO).</p>
          <IssueStockForm productId={product.id} />
        </div>
      )}

      {product.tracking_mode === 'dimensional' && (
        <div className="card">
          <h3>Stock units</h3>
          {(units ?? []).length === 0 ? (
            <EmptyState title="No pieces in stock" hint="Receive a batch above to create individual stock units." />
          ) : (
            <UnitsTable units={units ?? []} />
          )}
        </div>
      )}

      <div className="card">
        <h3>Batches</h3>
        {(batches ?? []).length === 0 ? (
          <EmptyState title="No deliveries recorded" hint="Received batches appear here with their supplier and date." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Received</th><th>Supplier</th><th className="num">Qty received</th><th className="num">Qty remaining</th></tr></thead>
              <tbody>
                {(batches ?? []).map((b: any) => (
                  <tr key={b.id}>
                    <td className="mono">{b.received_at}</td>
                    <td>{b.supplier_name ?? '\u2014'}</td>
                    <td className="num">{b.qty_received}</td>
                    <td className="num">{product.tracking_mode === 'count' ? b.qty_remaining : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ fontSize: '0.75rem' }}>Unit costs are visible to finance and admin roles only.</p>
      </div>
    </>
  );
}
