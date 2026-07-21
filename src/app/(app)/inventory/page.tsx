import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('v_product_stock').select('*').order('name');

  return (
    <>
      <h1>Inventory</h1>
      <p>
        <Link href="/inventory/new">+ Add product</Link>
        {' · '}
        <Link href="/inventory/offcuts">Search offcuts</Link>
      </p>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Tracking</th>
              <th>In stock</th><th>Reserved</th><th>Offcuts</th><th>Qty (count)</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id}>
                <td><Link href={`/inventory/${p.id}`}>{p.name}</Link></td>
                <td>{p.category}</td>
                <td>{p.tracking_mode}</td>
                <td>{p.tracking_mode === 'dimensional' ? p.units_in_stock : '-'}</td>
                <td>{p.tracking_mode === 'dimensional' ? p.units_reserved : '-'}</td>
                <td>{p.tracking_mode === 'dimensional' ? p.offcuts_available : '-'}</td>
                <td>{p.tracking_mode === 'count' ? p.qty_on_hand : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
