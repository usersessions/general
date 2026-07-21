import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/status-badge';
import EmptyState from '@/components/empty-state';

export default async function ProcurementPage() {
  const supabase = await createClient();
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('id, po_number, status, created_at, supplier:suppliers(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Procurement</h1>
          <p className="muted">Draft → approval (finance) → received into stock.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn-secondary" style={{ textDecoration: 'none' }} href="/procurement/suppliers">Suppliers</Link>
          <Link className="btn-primary" style={{ textDecoration: 'none' }} href="/procurement/new">New purchase order</Link>
        </div>
      </div>
      <div className="card">
        {(pos ?? []).length === 0 ? (
          <EmptyState title="No purchase orders yet" hint="Create a draft PO; finance approves it before receiving."
            action={<Link className="btn-primary" style={{ textDecoration: 'none' }} href="/procurement/new">New purchase order</Link>} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>PO</th><th>Supplier</th><th>Status</th><th className="num">Created</th></tr></thead>
              <tbody>
                {(pos ?? []).map((po: any) => (
                  <tr key={po.id}>
                    <td className="mono"><Link href={`/procurement/${po.id}`}>{po.po_number}</Link></td>
                    <td>{po.supplier?.name}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td className="num">{po.created_at.slice(0, 10)}</td>
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
