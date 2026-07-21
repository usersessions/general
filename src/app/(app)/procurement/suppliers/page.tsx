import { createClient } from '@/lib/supabase/server';
import SupplierForm from './supplier-form';

export default async function SuppliersPage() {
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from('suppliers').select('*').order('name');
  return (
    <>
      <h1>Suppliers</h1>
      <div className="card">
        <h3>Add supplier</h3>
        <SupplierForm />
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th></tr></thead>
          <tbody>
            {(suppliers ?? []).map((s: any) => (
              <tr key={s.id}><td>{s.name}</td><td>{s.contact_person ?? '-'}</td><td>{s.phone ?? '-'}</td><td>{s.email ?? '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
