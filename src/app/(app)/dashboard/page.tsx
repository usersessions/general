import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, department:departments(name)')
    .eq('id', user!.id)
    .single();

  const department = profile?.department as { name: string } | null;

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}.
      </p>
      <div className="cards">
        <div className="card">
          <h3>Role</h3>
          <p>{profile?.role.replace('_', ' ')}</p>
        </div>
        <div className="card">
          <h3>Department</h3>
          <p>{department?.name ?? 'Unassigned'}</p>
        </div>
      </div>
      <div className="card">
        <p className="muted">
          Module dashboards (stock levels, receivables, attendance) arrive with their
          respective phases.
        </p>
      </div>
    </>
  );
}
