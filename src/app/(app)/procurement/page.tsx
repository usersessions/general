import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function ProcurementPage() {
  const supabase = await createClient();
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('id, po_number, status, created_at, supplier:suppliers(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <h1>Procurement</h1>
      <p>
        <Link href="/procurement/new">+ New purchase order</Link>
        {' · '}
        <Link href="/procurement/suppliers">Suppliers</Link>
      </p>
      <div className="card">
        <table>
          <thead><tr><th>PO</th><th>Supplier</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {(pos ?? []).map((po: any) => (
              <tr key={po.id}>
                <td><Link href={`/procurement/${po.id}`}>{po.po_number}</Link></td>
                <td>{po.supplier?.name}</td><td>{po.status}</td><td>{po.created_at.slice(0, 10)}</td>
              </tr>
            ))}
            {(pos ?? []).length === 0 && <tr><td colSpan={4} className="muted">No purchase orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
