import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductsTable from './products-table';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: products } = await supabase.from('v_product_stock').select('*').order('name');

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Inventory</h1>
          <p className="muted">Sheets, profiles and consumables. Dimensions in mm.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn-secondary" style={{ textDecoration: 'none' }} href="/inventory/offcuts">Search offcuts</Link>
          <Link className="btn-primary" style={{ textDecoration: 'none' }} href="/inventory/new">Add product</Link>
        </div>
      </div>
      <div className="card">
        <ProductsTable products={products ?? []} />
      </div>
    </>
  );
}
