import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { navForRole, type AppRole } from '@/lib/roles';

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

  const department = profile?.department as unknown as { name: string } | null;
  const sections = navForRole((profile?.role ?? 'workshop') as AppRole).filter((s) => s.href !== '/dashboard');

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">
        Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}.
      </p>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Role</div>
          <div className="kpi-value" style={{ fontSize: '1.125rem', textTransform: 'capitalize' }}>
            {profile?.role.replace('_', ' ')}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Department</div>
          <div className="kpi-value" style={{ fontSize: '1.125rem' }}>{department?.name ?? 'Unassigned'}</div>
        </div>
      </div>
      <div className="card">
        <h3>Your workspaces</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="btn-secondary" style={{ textDecoration: 'none' }}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
