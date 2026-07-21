'use client';

import Link from 'next/link';
import { useSort } from '@/components/use-sort';
import EmptyState from '@/components/empty-state';

export default function ProductsTable({ products }: { products: any[] }) {
  const rows = products.map((p) => ({
    ...p,
    units_in_stock: Number(p.units_in_stock),
    offcuts_available: Number(p.offcuts_available),
    qty_on_hand: Number(p.qty_on_hand),
  }));
  const { sorted, toggle, arrow } = useSort(rows, 'name');

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        hint="Add your first catalogue entry, then receive a batch to create stock."
        action={<Link className="btn-primary" style={{ textDecoration: 'none' }} href="/inventory/new">Add product</Link>}
      />
    );
  }

  const TH = ({ k, label, num }: { k: string; label: string; num?: boolean }) => (
    <th className={`sortable${num ? ' num' : ''}`} onClick={() => toggle(k)}>
      {label}<span className="sort-arrow">{arrow(k)}</span>
    </th>
  );

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <TH k="name" label="Product" />
            <TH k="category" label="Category" />
            <TH k="tracking_mode" label="Tracking" />
            <TH k="units_in_stock" label="In stock" num />
            <TH k="units_reserved" label="Reserved" num />
            <TH k="offcuts_available" label="Offcuts" num />
            <TH k="qty_on_hand" label="Qty" num />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const dim = p.tracking_mode === 'dimensional';
            return (
              <tr key={p.id}>
                <td><Link href={`/inventory/${p.id}`}>{p.name}</Link></td>
                <td className="muted">{p.category}</td>
                <td className="muted">{p.tracking_mode}</td>
                <td className="num">{dim ? p.units_in_stock : '\u2014'}</td>
                <td className="num">{dim ? p.units_reserved : '\u2014'}</td>
                <td className="num">{dim ? p.offcuts_available : '\u2014'}</td>
                <td className="num">{dim ? '\u2014' : p.qty_on_hand}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
