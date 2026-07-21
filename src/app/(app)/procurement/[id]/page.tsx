import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PoActions from './po-actions';

export default async function PoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(name), items:purchase_order_items(*, product:products(name, tracking_mode))')
    .eq('id', id)
    .single();
  if (!po) notFound();
  const { data: totals } = await supabase.from('v_po_totals').select('total').eq('purchase_order_id', id).single();

  const { data: me } = await supabase.from('profiles').select('role').eq('id', (await supabase.auth.getUser()).data.user!.id).single();
  const canApprove = ['finance', 'admin', 'super_admin'].includes(me?.role ?? '');

  return (
    <>
      <h1>{po.po_number}</h1>
      <p className="muted">{po.supplier?.name} · {po.status}</p>
      <div className="card">
        <table>
          <thead><tr><th>Product</th><th>Dimensions (mm)</th><th>Qty</th><th>Unit cost</th><th>Total</th></tr></thead>
          <tbody>
            {(po.items ?? []).map((it: any) => (
              <tr key={it.id}>
                <td>{it.product?.name}</td>
                <td>{it.length_mm ? `${it.length_mm}${it.width_mm ? ` × ${it.width_mm}` : ''}${it.thickness_mm ? ` × ${it.thickness_mm}` : ''}` : '-'}</td>
                <td>{it.qty}</td>
                <td>{Number(it.unit_cost).toLocaleString()}</td>
                <td>{(it.qty * Number(it.unit_cost)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ textAlign: 'right' }}><strong>Total: KES {Number(totals?.total ?? 0).toLocaleString()}</strong></p>
      </div>
      <PoActions poId={po.id} status={po.status} canApprove={canApprove} />
    </>
  );
}
