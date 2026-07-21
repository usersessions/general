import { createClient } from '@/lib/supabase/server';
import ClientForm from './client-form';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from('clients').select('*').order('name');
  return (
    <>
      <h1>Clients</h1>
      <div className="card">
        <h3>Add client</h3>
        <ClientForm />
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Location</th></tr></thead>
          <tbody>
            {(clients ?? []).map((c: any) => (
              <tr key={c.id}><td>{c.name}</td><td>{c.email ?? '-'}</td><td>{c.phone ?? '-'}</td><td>{c.location ?? '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
